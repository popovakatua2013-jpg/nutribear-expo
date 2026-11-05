// Health Connect (Android): системный «банк здоровья» телефона. Шаги
// собираются системой в фоне (телефоном и привязанными часами/браслетами),
// даже когда NutriBear закрыт, и хранят историю за прошлые дни — ровно то,
// чего не умеет встроенный датчик.
//
// Как используем: раз в минуту (и при возврате в приложение) читаем
// «шаги с полуночи» и публикуем их в pedometer.js через ту же логику
// «держим максимум» — источники не спорят: побеждает большее значение
// (Health Connect обычно включает и шаги при закрытом приложении),
// а датчик телефона остаётся резервом, если HC пуст. Ручные шаги
// (extraSteps) прибавляются отдельно — см. selectTotalSteps.
//
// react-native-health-connect — нативный модуль: загружаем его лениво,
// только на Android и только из функций (в jest и на iOS/веб он не
// трогается). Разрешение «Шаги» выдаётся через окно Health Connect,
// системное ACTIVITY_RECOGNITION шагомеру оно не заменяет и не нужно.

import { Platform } from 'react-native'
import { dayKeyOf, useHistoryStore } from '@/store/useHistoryStore'

// Статусы доступности Health Connect на устройстве
export const HC_NOT_ANDROID = 'not-android' // iOS/веб — функции нет
export const HC_OK = 'ok' // можно подключать
export const HC_UNAVAILABLE = 'unavailable' // приложение не установлено
export const HC_UPDATE_REQUIRED = 'update' // провайдер устарел, нужно обновить

const DAY_MS = 24 * 60 * 60 * 1000

// ── Чистые функции (покрываются тестами) ──────────────────────────────

// Сумма шагов из массива записей Steps: биты и отрицательные — в 0
export function sumStepRecords(records) {
  if (!Array.isArray(records)) return 0
  return records.reduce((acc, r) => {
    const n = Math.round(Number(r && r.count) || 0)
    return acc + Math.max(0, n)
  }, 0)
}

// Полночь локального дня «ГГГГ-ММ-ДД» в мс; битый ключ → null
export function dayKeyStartMs(dayKey) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dayKey || ''))
  if (!m) return null
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 0, 0, 0, 0).getTime()
}

// Ключи последних n дней по возрастанию, последний — «сегодня».
// now и dayKeyFn передаются для детерминизма в тестах.
export function lastDayKeys(n, { dayKeyFn = dayKeyOf, now = new Date() } = {}) {
  const count = Math.max(0, Math.round(Number(n) || 0))
  const keys = []
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    keys.push(dayKeyFn(d))
  }
  return keys
}

// ── Нативный модуль: ленивая загрузка ────────────────────────────────

let cached = null
async function loadModule() {
  if (Platform.OS !== 'android') return null
  if (cached) return cached
  try {
    cached = await import('react-native-health-connect')
    return cached
  } catch {
    return null
  }
}

// Доступен ли Health Connect на устройстве
export async function hcAvailability() {
  const m = await loadModule()
  if (!m) return HC_NOT_ANDROID
  try {
    const status = await m.getSdkStatus()
    if (status === m.SdkAvailabilityStatus.SDK_AVAILABLE) return HC_OK
    if (status === m.SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED) {
      return HC_UPDATE_REQUIRED
    }
    return HC_UNAVAILABLE
  } catch {
    return HC_UNAVAILABLE
  }
}

// Открыть настройки/страницу Health Connect (установить/обновить провайдера)
export async function hcOpenSettings() {
  const m = await loadModule()
  if (!m) return false
  try {
    await m.openHealthConnectSettings()
    return true
  } catch {
    return false
  }
}

// Запросить разрешение «Шаги» (чтение). true — пользователь разрешил.
export async function hcRequestStepsPermission() {
  const m = await loadModule()
  if (!m) return false
  try {
    await m.initialize()
    const granted = await m.requestPermission([
      { accessType: 'read', recordType: 'Steps' },
    ])
    return (
      Array.isArray(granted) &&
      granted.some((p) => p && p.accessType === 'read' && p.recordType === 'Steps')
    )
  } catch {
    return false
  }
}

// Шаги за период [startMs, endMs): сумма записей Steps. 0 — при ошибке.
export async function hcStepsBetween(startMs, endMs) {
  const m = await loadModule()
  if (!m) return 0
  try {
    const { records } = await m.readRecords('Steps', {
      timeRangeFilter: {
        operator: 'between',
        startTime: new Date(startMs).toISOString(),
        endTime: new Date(endMs).toISOString(),
      },
    })
    return sumStepRecords(records)
  } catch {
    return 0
  }
}

// Шаги за локальный день «ГГГГ-ММ-ДД» (от полуночи до следующей)
export async function hcStepsForDayKey(dayKey) {
  const start = dayKeyStartMs(dayKey)
  if (start == null) return 0
  return hcStepsBetween(start, start + DAY_MS)
}

// Шаги с полуночи до сих пор — основная метрика для агента pedometer.js
export async function hcStepsToday() {
  const now = new Date()
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  // endTime строго «сейчас»: диапазон с запасом в будущее часть версий
  // Health Connect отклоняет — шаги молча возвращались нулём
  return hcStepsBetween(start.getTime(), now.getTime())
}

// Импорт истории: читает шаги HC за последние days ПРОШЛЫХ дней и
// записывает в дневную историю (useHistoryStore). День «сегодня» не
// трогаем — за него отвечает живой агент в pedometer.js. Дни, где в
// истории уже есть не меньшее значение, не перезаписываем.
// Возвращает количество обновлённых дней.
export async function hcImportStepsHistory({ days = 14, now = new Date() } = {}) {
  const keys = lastDayKeys(days, { now })
  const pastKeys = keys.slice(0, -1) // без «сегодня»
  let updated = 0
  for (const key of pastKeys) {
    const start = dayKeyStartMs(key)
    if (start == null) continue
    const steps = await hcStepsBetween(start, start + DAY_MS)
    if (steps <= 0) continue
    const known = useHistoryStore.getState().days[key]?.steps || 0
    if (known >= steps) continue
    useHistoryStore.getState().record(key, { steps })
    updated += 1
  }
  return updated
}

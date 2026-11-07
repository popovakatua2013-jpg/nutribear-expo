// Трекер сна: ввод «лёг/встал» и расчёты по минутам сна.
// Сон хранится в дневной истории (useHistoryStore, поле sleepMin — минуты)
// и относится к дню ПРОБУЖДЕНИЯ: «лёг вчера в 23:30, встал сегодня в 7:00» —
// запись за сегодня. Так вечер и утро одного сна попадают в одну строку
// дневника, а отчёты/теплокарта считаются по тем же правилам, что шаги и вода.
// Health Connect (SleepSession) подключим позже поверх этих же минут —
// в Expo Go нативных модулей нет, сейчас честный ручной ввод.

export const SLEEP_NORM_MIN = 420 // 7 ч — нижняя граница нормы взрослого (7–9 ч)

// 'HH:MM' | 'H:MM' → минуты от полуночи (0…1439). Некорректная строка — null
export function parseTimeToMin(str) {
  if (typeof str !== 'string') return null
  const m = str.trim().match(/^(\d{1,2}):(\d{2})$/)
  if (!m) return null
  const h = Number(m[1])
  const mm = Number(m[2])
  if (h > 23 || mm > 59) return null
  return h * 60 + mm
}

// Длительность сна в минутах по времени отхода и подъёма. Сон через
// полночь — обычный случай: «23:30 → 07:00» = 450 мин. Если «встал» не
// позже «лёг» — считаем, что ночь пересекла полночь ((wake−bed+1440)%1440).
// Равные времена или мусор — null (запись невозможна)
export function sleepMinutes(bed, wake) {
  const b = typeof bed === 'string' ? parseTimeToMin(bed) : bed
  const w = typeof wake === 'string' ? parseTimeToMin(wake) : wake
  if (!Number.isFinite(b) || !Number.isFinite(w)) return null
  if (b < 0 || b > 1439 || w < 0 || w > 1439) return null
  return (w - b + 1440) % 1440
}

// 450 → «7 ч 30 мин», 420 → «7 ч», 45 → «45 мин»
export function fmtSleep(min) {
  const v = Math.max(0, Math.round(Number(min) || 0))
  const h = Math.floor(v / 60)
  const m = v % 60
  if (h === 0) return `${m} мин`
  if (m === 0) return `${h} ч`
  return `${h} ч ${m} мин`
}

// Короткий формат для тесных подписей: 450 → «7:30», 45 → «0:45»
export function fmtSleepShort(min) {
  const v = Math.max(0, Math.round(Number(min) || 0))
  const h = Math.floor(v / 60)
  const m = v % 60
  return `${h}:${String(m).padStart(2, '0')}`
}

// Средний сон за ночь: по дням, где сон ЗАПИСАН (пустые дни среднее не
// топят — она могла начать вести сон вчера). 0 — записей нет
export function sleepAvg(rows) {
  const kept = (rows || []).filter((r) => r && r.sleepMin > 0)
  if (!kept.length) return 0
  return Math.round(kept.reduce((acc, r) => acc + r.sleepMin, 0) / kept.length)
}

// Сколько ночей периода в норме (по умолчанию ≥ 7 ч) — для футера
// «Цель: N из 7 дней». Норму берём из целей пользователя (goals.sleepMin)
export function nightsInNorm(rows, goalMin = SLEEP_NORM_MIN) {
  return (rows || []).filter((r) => r && r.sleepMin >= goalMin).length
}

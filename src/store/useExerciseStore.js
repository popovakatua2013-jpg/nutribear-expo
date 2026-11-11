// Трекинг упражнений: лог тренировок по дням + СВОИ тренировки
// пользователя (создаются с названием, иконкой и интенсивностью,
// запоминаются между сессиями — как каталог, только персональный).
// Сожжённые калории показываются в сводке, на главной и в отчётах
// «Активности»; на дневной баланс питания не влияют.

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { makeId } from '@/lib/format'
import { dayKeyOf, useHistoryStore } from './useHistoryStore'
import { KCAL_PER_STEP } from '@/lib/data/activity'
import { metFromKcal } from '@/lib/data/exercises'

// Ключ дня «ГГГГ-ММ-ДД» по локальным часам (единый с историей)
export const todayKey = dayKeyOf

// Лимит дней лога тренировок — как в дневной истории (MAX_DAYS):
// без обрезки лог рос безгранично и тормозил запись стора
const MAX_LOG_DAYS = 210

// Оставить только последние MAX_LOG_DAYS дней (ключи «ГГГГ-ММ-ДД»)
function pruneLogs(logs) {
  const keys = Object.keys(logs).sort()
  if (keys.length <= MAX_LOG_DAYS) return logs
  const next = { ...logs }
  for (const k of keys.slice(0, keys.length - MAX_LOG_DAYS)) delete next[k]
  return next
}

export const useExerciseStore = create(
  persist(
    (set) => ({
      // { '2026-10-23': [{ id, exId, name, emoji, minutes, kcal, manual? }] }
      // manual: true — калории введены пользователем вручную, не по формуле
      logs: {},
      // Свои тренировки: [{ id, name, emoji, met }] — id с префиксом custom-
      custom: [],

      addLog: (dayKey, entry) =>
        set((s) => ({
          logs: pruneLogs({
            ...s.logs,
            [dayKey]: [
              { id: makeId(), ...entry },
              ...(s.logs[dayKey] || []),
            ],
          }),
        })),

      // Изменить запись тренировки (упражнение, минуты, ккал)
      updateLog: (dayKey, id, patch) =>
        set((s) => ({
          logs: {
            ...s.logs,
            [dayKey]: (s.logs[dayKey] || []).map((e) =>
              e.id === id ? { ...e, ...patch } : e
            ),
          },
        })),

      removeLog: (dayKey, id) =>
        set((s) => ({
          logs: {
            ...s.logs,
            [dayKey]: (s.logs[dayKey] || []).filter((e) => e.id !== id),
          },
        })),

      // Запомнить свою тренировку (обновление по id, без дубликатов)
      addCustom: (ex) =>
        set((s) => ({ custom: [...s.custom.filter((c) => c.id !== ex.id), ex] })),

      // Изменить свою тренировку (название, иконка, интенсивность).
      // Записи дневника хранят копию имени/иконки — старые дни остаются как есть
      updateCustom: (id, patch) =>
        set((s) => ({
          custom: s.custom.map((c) => (c.id === id ? { ...c, ...patch } : c)),
        })),

      // Забыть свою тренировку. Записи в дневнике хранят копию названия
      // и иконки, поэтому старые дни продолжают показываться корректно.
      removeCustom: (id) =>
        set((s) => ({ custom: s.custom.filter((c) => c.id !== id) })),
    }),
    {
      name: 'nutribear-exercise-v1',
      version: 1,
      migrate: (state) => state,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ logs: s.logs, custom: s.custom }),
      // После догрузки с телефона — обрезать старые дни, накопленные
      // до появления лимита
      onRehydrateStorage: () => (state) => {
        if (state && state.logs) useExerciseStore.setState({ logs: pruneLogs(state.logs) })
      },
    }
  )
)

// Сумма сожжённых калорий за день (только тренировки)
export function dayBurned(logs, key) {
  return (logs[key] || []).reduce((sum, e) => sum + (Number(e.kcal) || 0), 0)
}

// Вся активность за день: тренировки + шаги (≈ 0.04 ккал на шаг —
// KCAL_PER_STEP, стандартная оценка для шагомера). Одна формула для
// главной и «Активности»: раньше в историю писались только тренировки,
// и шаги в сожжённых калориях терялись.
export function totalBurned(logs, key, steps) {
  return dayBurned(logs, key) + Math.round((steps || 0) * KCAL_PER_STEP)
}

// Сразу пересчитать «сожжено» дня в дневной истории после правки
// тренировок (добавили за вчера, изменили, перенесли, удалили):
// календарь, сводка дня и отчёты показывают свежее число, не дожидаясь
// архивации на следующую полночь. Шаги берём из истории дня — датчик
// телефона за прошлые дни уже не достать. Уже архивированное большее
// значение не уронить (Math.max) — сторы могут быть не догидрированы.
export function syncHistoryBurned(dayKey) {
  try {
    const logs = useExerciseStore.getState().logs
    const hist = useHistoryStore.getState().days[dayKey] || {}
    const burned = totalBurned(logs, dayKey, hist.steps || 0)
    // Дня ещё нет в истории и считать нечего — не плодим пустые записи
    // (иначе появятся нули в графиках и стрике)
    if (!useHistoryStore.getState().days[dayKey] && !burned) return
    useHistoryStore.getState().record(dayKey, {
      burned: Math.max(hist.burned || 0, Math.round(burned)),
    })
  } catch {}
}

// Калибровка «Моей тренировки» по вписанной вручную цифре калорий
// (просьба Кати 11.11: «чтобы ручная цифра запоминалась для
// "Моих тренировок", как калорий за 30 мин»). Из ручных ккал за N минут
// выводим MET тренировки и запоминаем его — следующий автоподсчёт для
// этой тренировки начнётся с откалиброванной интенсивности, а редактор
// тренировки покажет режим «ккал за 30 мин» с готовой цифрой.
// Возвращает новый MET (округлённый до сотых) или null, если менять
// ничего не нужно: тренировка не из «Моих», вес не указан, цифра даёт
// абсурдную интенсивность или совпадает с текущей (в пределах 2% —
// погрешность округления формулы).
export function calibrateCustomFromKcal(exId, kcal, minutes, weightKg) {
  const ex = useExerciseStore.getState().custom.find((c) => c.id === exId)
  if (!ex) return null
  const met = metFromKcal(kcal, weightKg, minutes)
  if (met === null || met < 1 || met > 25) return null
  const rounded = Math.round(met * 100) / 100
  const old = Number(ex.met) || 0
  if (old > 0 && Math.abs(rounded - old) / old < 0.02) return null
  useExerciseStore.setState({
    custom: useExerciseStore
      .getState()
      .custom.map((c) => (c.id === exId ? { ...c, met: rounded } : c)),
  })
  return rounded
}

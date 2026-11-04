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

// Ключ дня «ГГГГ-ММ-ДД» по локальным часам (единый с историей)
export const todayKey = dayKeyOf

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
          logs: {
            ...s.logs,
            [dayKey]: [
              { id: makeId(), ...entry },
              ...(s.logs[dayKey] || []),
            ],
          },
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

      // Забыть свою тренировку. Записи в дневнике хранят копию названия
      // и иконки, поэтому старые дни продолжают показываться корректно.
      removeCustom: (id) =>
        set((s) => ({ custom: s.custom.filter((c) => c.id !== id) })),
    }),
    {
      name: 'nutribear-exercise-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ logs: s.logs, custom: s.custom }),
    }
  )
)

// Сумма сожжённых калорий за день (только тренировки)
export function dayBurned(logs, key) {
  return (logs[key] || []).reduce((sum, e) => sum + (e.kcal || 0), 0)
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

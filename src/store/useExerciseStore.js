// Трекинг упражнений: лог тренировок по дням.
// Сожжённые калории показываются в сводке и отчётах «Активности»;
// на дневной баланс питания не влияют.

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { makeId } from '@/lib/format'
import { dayKeyOf } from './useHistoryStore'

// Ключ дня «ГГГГ-ММ-ДД» по локальным часам (единый с историей)
export const todayKey = dayKeyOf

export const useExerciseStore = create(
  persist(
    (set) => ({
      logs: {}, // { '2026-10-23': [{ id, exId, name, emoji, minutes, kcal }] }

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
    }),
    {
      name: 'nutribear-exercise-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ logs: s.logs }),
    }
  )
)

// Сумма сожжённых калорий за день
export function dayBurned(logs, key) {
  return (logs[key] || []).reduce((sum, e) => sum + (e.kcal || 0), 0)
}

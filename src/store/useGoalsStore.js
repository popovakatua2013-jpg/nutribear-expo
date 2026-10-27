// Редактируемые цели пользователя: калории, вода, шаги, активность.
// По умолчанию — пресет «Поддержка»; меняются в блоке «Ваши цели».

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { GOALS } from '@/lib/data/goals'

export const DEFAULT_GOALS = {
  kcal: 2180, // ккал в день
  waterMl: 2000, // вода в день, мл
  steps: 7000, // шаги в день
  minutes: 60, // активность в день, минут
}

export const useGoalsStore = create(
  persist(
    (set) => ({
      goals: DEFAULT_GOALS,

      // Точечное редактирование любой цели
      setGoals: (patch) =>
        set((state) => ({ goals: { ...state.goals, ...patch } })),

      // Пресет цели питания меняет норму калорий (вода/шаги/минуты — как были)
      applyPreset: (goalId) => {
        const preset = GOALS.find((g) => g.id === goalId) || GOALS[1]
        const kcal = Object.values(preset.targets).reduce((s, n) => s + n, 0)
        set((state) => ({ goals: { ...state.goals, kcal } }))
      },

      reset: () => set({ goals: DEFAULT_GOALS }),
    }),
    {
      name: 'nutribear-goals-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ goals: state.goals }),
    }
  )
)

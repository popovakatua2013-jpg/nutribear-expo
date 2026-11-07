// Редактируемые цели пользователя: калории, вода, шаги, активность,
// сожжённые калории, сон. По умолчанию — пресет «Поддержка»; меняются
// долгим тапом по карточкам на главной и в сводке «Съедено».

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { GOALS } from '@/lib/data/goals'

export const DEFAULT_GOALS = {
  kcal: 2180, // ккал в день
  waterMl: 2000, // вода в день, мл
  steps: 7000, // шаги в день
  minutes: 60, // активность в день, минут
  burnKcal: 300, // сжечь за день, ккал (тренировки + шаги)
  sleepMin: 420, // сон за ночь, минут (норма взрослого 7–9 ч) — цель карточки «Сон» и теплокарты
  // Режим остатка калорий в сводке «Съедено за сегодня» (переключатель
  // в «Ещё → Дневник питания»): false (по умолчанию, отзыв Кати:
  // «строгий остаток по умолчанию») — остаток = цель − съедено,
  // сожжённое не возвращается; true — «с учётом сожжённых»:
  // остаток = цель − съедено + сожжено (формула remainderOf)
  countBurned: false,
  // Свои нормы нутриентов, г/день (0 — считать автоматически от цели
  // по калориям: тарелка 20/30/50 %, клетчатка 25 г). Редактируются
  // карандашиком в строке нутриентов сводки «Съедено за сегодня»
  macroNorms: { p: 0, f: 0, c: 0, fib: 0 },
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
      version: 1,
      migrate: (state) => state, // схема меняется — здесь появится миграция
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ goals: state.goals }),
      // Слияние по полям: новые цели (например, burnKcal) появляются
      // и у тех, кто сохранял цели раньше — иначе у старых пользователей
      // хранилище бы их затирало до undefined
      merge: (persisted, current) => ({
        ...current,
        ...persisted,
        goals: { ...current.goals, ...(persisted?.goals || {}) },
      }),
    }
  )
)

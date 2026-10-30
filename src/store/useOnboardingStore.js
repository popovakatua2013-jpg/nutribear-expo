// Стор онбординга: ответы анкеты, рассчитанный план, аккаунт,
// разрешения и переключатели синхронизации. После завершения
// (status = 'done') онбординг больше не показывается.

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

export const DEFAULT_ANSWERS = {
  units: 'metric', // metric (кг/см) | imperial (фунты/дюймы)
  sex: 'female',
  age: '',
  heightCm: '',
  weightKg: '',
  goalId: null, // lose | maintain | gain
  targetWeightKg: '',
  pace: 0.5, // кг в неделю
  why: [], // здоровье / уверенность / событие / энергия
  activity: null, // id из ACTIVITY_LEVELS
  stepsDay: '5-8',
  workouts: '0',
  dietType: 'classic',
  allergies: [],
  mealsDay: '3+2',
  cooking: 'home',
  night: 'no',
  stress: 'no',
  waterDay: '6-8',
  alcohol: 'no',
  dietsTried: 'no',
  sleep: 'good',
  special: [], // особые состояния (флаги, без медицинских советов)
}

const DEFAULT_STATE = {
  status: 'idle', // idle → done
  step: 0,
  answers: DEFAULT_ANSWERS,
  plan: null, // сохранённый план из «раскрытия»
  account: { email: '', provider: '' }, // регистрация в конце (мок)
  permissions: { push: 'unknown', health: false, camera: 'unknown' },
  sync: { gfit: false, ahealth: false, pedometer: true },
  openBreakfast: false, // активация: открыть «Добавить завтрак» один раз
}

export const useOnboardingStore = create(
  persist(
    (set) => ({
      ...DEFAULT_STATE,

      patchAnswers: (patch) =>
        set((s) => ({ answers: { ...s.answers, ...patch } })),

      setStep: (step) => set({ step }),

      savePlan: (plan) => set({ plan }),

      setAccount: (patch) =>
        set((s) => ({ account: { ...s.account, ...patch } })),

      setPermission: (key, value) =>
        set((s) => ({ permissions: { ...s.permissions, [key]: value } })),

      toggleSync: (key) =>
        set((s) => ({ sync: { ...s.sync, [key]: !s.sync[key] } })),

      // Завершение онбординга (после активации)
      finish: (patch = {}) => set({ status: 'done', ...patch }),

      // Одноразовый флаг «открыть добавление завтрака» прочитан
      consumeOpenBreakfast: () => set({ openBreakfast: false }),

      // Полный сброс (GDPR-удаление данных) — онбординг начнётся заново
      reset: () => set({ ...DEFAULT_STATE }),
    }),
    {
      name: 'nutribear-onboarding-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        status: s.status,
        step: s.step,
        answers: s.answers,
        plan: s.plan,
        account: s.account,
        permissions: s.permissions,
        sync: s.sync,
        openBreakfast: s.openBreakfast,
      }),
    }
  )
)

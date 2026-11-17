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
  goalId: null, // lose | cut | maintain | gain
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
  // 152-ФЗ: согласия на обработку ПДн. Показываются на экране
  // ConsentScreen ПЕРВЫМ (раньше онбординга). Пока consentAccepted
  // не true — доступ к приложению невозможен. Все 4 согласия
  // отмечаются отдельными чекбоксами. После «Стереть все данные»
  // (reset) consent сбрасывается → экран показывается заново.
  consent: { pd: false, health: false, crossBorder: false, policy: false },
  consentAccepted: false,
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

      // 152-ФЗ: переключение одного согласия (чекбокса) на экране
      // ConsentScreen. key ∈ {pd, health, crossBorder, policy}.
      // Все 4 должны быть true, чтобы кнопка «Продолжить» стала
      // активной (проверка в самом ConsentScreen).
      toggleConsent: (key) =>
        set((s) => ({
          consent: { ...s.consent, [key]: !s.consent?.[key] },
        })),

      // 152-ФЗ: пользователь отметил все 4 согласия и нажал
      // «Продолжить». После этого ConsentScreen больше не показывается
      // (до reset / «Стереть все данные»).
      setConsentAccepted: (value) => set({ consentAccepted: value }),

      // Завершение онбординга (после активации). Окно «Добавить приём
      // пищи» после онбординга не открывается — сразу главная (отзыв
      // Кати), поэтому одноразовый флаг openBreakfast удалён
      finish: (patch = {}) => set({ status: 'done', ...patch }),

      // Полный сброс (GDPR-удаление данных) — онбординг начнётся заново
      reset: () => set({ ...DEFAULT_STATE }),
    }),
    {
      name: 'nutribear-onboarding-v1',
      version: 2,
      // v1 → v2: добавили поля consent и consentAccepted (152-ФЗ).
      // Старым пользователям (без этих полей) проставляем значения
      // по умолчанию — consentAccepted=false → при следующем запуске
      // покажется ConsentScreen. Это правильно по закону: согласие
      // должно быть получено явно.
      migrate: (state, fromVersion) => {
        if (!state) return state
        const next = { ...state }
        if (!next.consent) {
          next.consent = {
            pd: false,
            health: false,
            crossBorder: false,
            policy: false,
          }
        }
        if (next.consentAccepted === undefined) {
          next.consentAccepted = false
        }
        return next
      },
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        status: s.status,
        step: s.step,
        answers: s.answers,
        plan: s.plan,
        account: s.account,
        permissions: s.permissions,
        sync: s.sync,
        consent: s.consent,
        consentAccepted: s.consentAccepted,
      }),
    }
  )
)

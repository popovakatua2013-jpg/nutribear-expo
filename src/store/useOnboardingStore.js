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
  // 152-ФЗ: согласия на обработку ПДн. Отмечаются чекбоксами на
  // ПЕРВОМ шаге онбординга (ConsentBlock под выбором цели — отзыв
  // Кати 19.11: отдельная страница ОПД перед входом убрана; по
  // закону согласие нужно ДО сбора данных, поэтому первый шаг, а не
  // пятый). Все 4 должны быть true, чтобы «Далее» стало активной.
  // Старые установки, завершившие онбординг до введения согласий,
  // один раз видят компактный LegacyConsentScreen (шлюз в _layout).
  // После «Стереть все данные» (reset) consent сбрасывается — блок
  // снова показывается на первом шаге.
  consent: { pd: false, health: false, crossBorder: false, policy: false },
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

      // 152-ФЗ: переключение одного согласия (чекбокса) в блоке
      // ConsentBlock. key ∈ {pd, health, crossBorder, policy}.
      // Все 4 должны быть true, чтобы кнопка «Далее» на первом шаге
      // стала активной (проверка в WelcomeStep через useAllConsent).
      toggleConsent: (key) =>
        set((s) => ({
          consent: { ...s.consent, [key]: !s.consent?.[key] },
        })),

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
      // v1 → v2: добавили поле consent (152-ФЗ). Старым пользователям
      // (без этих полей) проставляем значения по умолчанию — все
      // согласия false → у завершивших онбординг при следующем запуске
      // один раз покажется LegacyConsentScreen, у идущих онбординг —
      // блок согласий на первом шаге. Это правильно по закону: согласие
      // должно быть получено явно. Поле consentAccepted удалено:
      // единственный источник истины — сами 4 чекбокса consent.
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
      }),
    }
  )
)

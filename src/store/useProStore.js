// Флаг Premium: пока макет — активация локальная (демо), настоящая оплата
// подключится через RevenueCat после EAS-сборки (internal/paywall-revenuecat.md,
// entitlement `premium`). Продукты те же: trial 3 дня / месяц 299 ₽ / год 1 490 ₽.
//
// Состояние покупки НЕ сбрасывается «Стереть все данные» — это покупка,
// а не игровой прогресс.

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

// Сроки планов (аудит 12.11: раньше месяц/год не имели срока —
// время активации хранилось, но проверялся только триал). До RevenueCat
// активация локальная (демо), но таймер планов честный, чтобы после
// подключения оплаты логика не менялась: месяц и год отсчитываются
// от activatedAt и истекают сами
const TRIAL_MS = 3 * 24 * 60 * 60 * 1000
const MONTH_MS = 31 * 24 * 60 * 60 * 1000
const YEAR_MS = 366 * 24 * 60 * 60 * 1000

const PLAN_MS = { trial: TRIAL_MS, month: MONTH_MS, year: YEAR_MS }

export const PRO_PLANS = [
  { id: 'trial', title: 'Триал 3 дня', price: 'Бесплатно', note: 'все функции Premium' },
  { id: 'month', title: 'Месяц', price: '299 ₽', note: '' },
  { id: 'year', title: 'Год', price: '1 490 ₽', note: 'скидка 50%', best: true },
]

export const useProStore = create(
  persist(
    (set) => ({
      pro: false,
      plan: null, // 'trial' | 'month' | 'year'
      activatedAt: null,

      activate: (plan) => set({ pro: true, plan, activatedAt: Date.now() }),
      deactivate: () => set({ pro: false, plan: null, activatedAt: null }),

      // Проверить срок плана при старте приложения: триал — 3 дня,
      // месяц — 31 день, год — 366 дней (запас на високосный).
      // Истёкший план гасится: pro=false, план сбрасывается
      refresh: () =>
        set((s) => {
          if (!s.pro || !s.activatedAt) return {}
          const ms = PLAN_MS[s.plan]
          if (!ms) return {}
          return Date.now() - s.activatedAt > ms
            ? { pro: false, plan: null, activatedAt: null }
            : {}
        }),
    }),
    {
      name: 'nutribear-pro-v1',
      version: 1,
      migrate: (state) => state,
      storage: createJSONStorage(() => AsyncStorage),
      // Срок триала проверяем сразу после догрузки: только здесь
      // activatedAt приходит из хранилища, при простом вызове на старте
      // стор ещё пуст и проверка прошла бы мимо
      onRehydrateStorage: () => (state) => {
        try {
          state?.refresh?.()
        } catch {}
      },
    }
  )
)

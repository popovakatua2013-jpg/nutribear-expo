// Флаг Premium: активация — триал или код активации (src/lib/promo-codes.js);
// оплата проходит на странице оплаты (PAY_PAGE_URL), деньги мимо приложения.
// Позже возможен переход на RevenueCat (internal/paywall-revenuecat.md,
// entitlement `premium`). Продукты те же: trial 3 дня / месяц 299 ₽ / год 1 490 ₽.
//
// Состояние покупки НЕ сбрасывается «Стереть все данные» — это покупка,
// а не игровой прогресс.

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

// Сроки планов (аудит 12.11: раньше месяц/год не имели срока —
// время активации хранилось, но проверялся только триал). Активация
// локальная (оплата на странице оплаты, в приложение не попадает),
// но таймер планов честный: месяц и год отсчитываются
// от activatedAt и истекают сами
const TRIAL_MS = 3 * 24 * 60 * 60 * 1000
const MONTH_MS = 31 * 24 * 60 * 60 * 1000
const YEAR_MS = 366 * 24 * 60 * 60 * 1000

// Промо-план (активация по коду, решение Кати 19.11): Premium на год
// за код активации. Код не показывается покупкой в карточке — в PRO_PLANS
// его нет, активация только через isValidPromoCode (src/lib/promo-codes.js)
const PLAN_MS = { trial: TRIAL_MS, month: MONTH_MS, year: YEAR_MS, promo: YEAR_MS }

export const PRO_PLANS = [
  { id: 'trial', title: 'Триал 3 дня', price: 'Бесплатно', note: 'все функции Premium' },
  { id: 'month', title: 'Месяц', price: '299 ₽', note: '' },
  { id: 'year', title: 'Год', price: '1 490 ₽', note: 'скидка 50%', best: true },
]

export const useProStore = create(
  persist(
    (set) => ({
      pro: false,
      plan: null, // 'trial' | 'month' | 'year' | 'promo'
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

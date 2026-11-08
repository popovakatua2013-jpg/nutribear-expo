// Флаг Premium: пока макет — активация локальная (демо), настоящая оплата
// подключится через RevenueCat после EAS-сборки (docs/paywall-revenuecat.md,
// entitlement `premium`). Продукты те же: trial 3 дня / месяц 299 ₽ / год 1 490 ₽.
//
// Состояние покупки НЕ сбрасывается «Стереть все данные» — это покупка,
// а не игровой прогресс.

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

// Триал — 3 дня с момента активации (отзыв Кати: «Триал — 3 дня»)
const TRIAL_MS = 3 * 24 * 60 * 60 * 1000

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

      // Проверить срок триала при старте приложения: раньше «3 дня»
      // включались навсегда — время активации хранилось, но нигде
      // не проверялось. Месяц/год не трогаем (до RevenueCat они тоже
      // бессрочные — проверка оплаты появится вместе с оплатой)
      refresh: () =>
        set((s) =>
          s.pro && s.plan === 'trial' && s.activatedAt && Date.now() - s.activatedAt > TRIAL_MS
            ? { pro: false, plan: null, activatedAt: null }
            : {}
        ),
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

// Флаг Premium: пока макет — активация локальная (демо), настоящая оплата
// подключится через RevenueCat после EAS-сборки (docs/paywall-revenuecat.md,
// entitlement `premium`). Продукты те же: trial 7 дней / месяц 299 ₽ / год 1 490 ₽.
//
// Состояние покупки НЕ сбрасывается «Стереть все данные» — это покупка,
// а не игровой прогресс.

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

export const PRO_PLANS = [
  { id: 'trial', title: 'Триал 7 дней', price: 'Бесплатно', note: 'все функции Premium' },
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
    }),
    {
      name: 'nutribear-pro-v1',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
)

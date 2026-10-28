// Рекорд серии «дней подряд» и отметка, за какой рекорд монеты уже
// начислены. Отдельный persist-стор: не трогаем существующие сторы.

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

// Бонус за новый личный рекорд: 10 монеток за каждый день свыше прежнего
export const COIN_PER_DAY = 10

export const useStreakStore = create(
  persist(
    (set, get) => ({
      best: 0, // лучший результат за всё время
      paidFor: 0, // рекорд, за который монеты уже выданы

      // Возвращает, сколько монет начислить (0 — если рекорд не побит)
      bump(streak) {
        const { best, paidFor } = get()
        if (streak <= best) return 0
        const gain = Math.max(0, streak - Math.max(best, paidFor)) * COIN_PER_DAY
        set({ best: streak, paidFor: streak })
        return gain
      },

      reset: () => set({ best: 0, paidFor: 0 }),
    }),
    { name: 'nutribear-streak', storage: createJSONStorage(() => AsyncStorage) }
  )
)
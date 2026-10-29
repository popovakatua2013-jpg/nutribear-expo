// Интервальное голодание: план (например 16/8), окно питания и
// текущий сеанс голодания со временем старта. История последних сеансов.
// Сохраняется в AsyncStorage.

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

export const useFastingStore = create(
  persist(
    (set) => ({
      windowStart: 10, // час начала окна питания (0–23)
      windowHours: 8, // длительность окна питания (план 16/8)
      fastHours: null, // длительность голодания сеанса — фиксируется в момент старта
      startedAt: null, // timestamp старта текущего голодания
      laps: [], // история: [{ from, to }]

      setWindowStart: (h) => set({ windowStart: h }),
      setWindowHours: (h) => set({ windowHours: h }),

      // План сеанса замораживается при старте: смена плашек на ходу
      // больше не искажает % и «осталось» идущего таймера
      start: () =>
        set((s) => ({ startedAt: Date.now(), fastHours: 24 - s.windowHours })),

      stop: () =>
        set((s) => ({
          laps: s.startedAt
            ? [{ from: s.startedAt, to: Date.now() }, ...s.laps].slice(0, 30)
            : s.laps,
          startedAt: null,
          fastHours: null,
        })),
    }),
    {
      name: 'nutribear-fasting-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        windowStart: s.windowStart,
        windowHours: s.windowHours,
        fastHours: s.fastHours,
        startedAt: s.startedAt,
        laps: s.laps,
      }),
    }
  )
)

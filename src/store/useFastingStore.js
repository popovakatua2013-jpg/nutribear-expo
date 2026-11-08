// Интервальное голодание: план (например 16/8), окно питания и
// текущий сеанс голодания со временем старта. История последних сеансов.
// Сохраняется в AsyncStorage.

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

// Случайные сеансы короче 2 минут (двойной тап «начать-завершить»)
// в историю не пишем: строка «0 мин в среднем» сбивала с толку
// (скрин Кати 08.11 — сеанс 21:47 → 21:48, «0 мин»)
export const FASTING_MIN_LAP_MS = 120000

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
        set((s) => {
          if (!s.startedAt) return { startedAt: null, fastHours: null }
          const to = Date.now()
          // Короткий случайный сеанс — только сброс таймера, без записи
          const laps =
            to - s.startedAt >= FASTING_MIN_LAP_MS
              ? [{ from: s.startedAt, to }, ...s.laps].slice(0, 30)
              : s.laps
          return { laps, startedAt: null, fastHours: null }
        }),
    }),
    {
      name: 'nutribear-fasting-v1',
      version: 1,
      migrate: (state) => state, // схема меняется — здесь появится миграция
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

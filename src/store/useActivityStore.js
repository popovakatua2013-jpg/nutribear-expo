// Состояние активности за сегодня: вода и добавленные вручную шаги.
// Хранится в AsyncStorage отдельно от дневника питания.

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useShopStore } from './useShopStore'
import { EARN } from '@/lib/data/shop'

export const DEFAULT_VESSELS = [
  { id: 'glass', label: 'Стакан', ml: 250 },
  { id: 'mug', label: 'Кружка', ml: 300 },
  { id: 'bottle', label: 'Бутылка', ml: 500 },
  { id: 'jug', label: 'Кувшин', ml: 700 },
]

// Старый набор по умолчанию (до добавления кувшина) — для миграции
const OLD_DEFAULT = DEFAULT_VESSELS.slice(0, 3)

export const useActivityStore = create(
  persist(
    (set) => ({
      waterMl: 0, // выпито воды сегодня, мл
      extraSteps: 0, // шаги, добавленные вручную
      lastWaterAt: 0, // когда последний раз добавляли воду (timestamp)
      // Ёмкости для окна добавления воды (редактируются пользователем)
      vessels: DEFAULT_VESSELS,
      // Напоминания о воде: интервал и время последнего срабатывания
      reminder: { enabled: false, everyMin: 60, lastAt: 0 },

      setVessels: (vessels) => set({ vessels }),
      setReminder: (patch) => set((s) => ({ reminder: { ...s.reminder, ...patch } })),

      addWater: (ml) => {
        set((s) => ({
          waterMl: Math.min(6000, s.waterMl + ml),
          lastWaterAt: Date.now(),
        }))
        // +2 монетки за стакан (250 мл)
        useShopStore.getState().earn(Math.round((ml / 250) * EARN.water))
      },

      addSteps: (n) => {
        set((s) => ({ extraSteps: Math.min(50000, s.extraSteps + n) }))
        // +5 монеток за каждую 1 000 шагов
        useShopStore.getState().earn(Math.round((n / 1000) * EARN.steps))
      },

      resetToday: () => set({ waterMl: 0, extraSteps: 0, lastWaterAt: Date.now() }),
    }),
    {
      name: 'nutribear-activity-v1',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      // У кого остался старый набор из 3 ёмкостей — добавляем «Кувшин 700»
      migrate: (state, version) => {
        if (version < 1 && state && Array.isArray(state.vessels)) {
          const isOld =
            state.vessels.length === OLD_DEFAULT.length &&
            state.vessels.every(
              (v, i) => v && v.id === OLD_DEFAULT[i].id && v.ml === OLD_DEFAULT[i].ml
            )
          if (isOld) state.vessels = DEFAULT_VESSELS
        }
        return state
      },
      partialize: (state) => ({
        waterMl: state.waterMl,
        extraSteps: state.extraSteps,
        lastWaterAt: state.lastWaterAt,
        vessels: state.vessels,
        reminder: state.reminder,
      }),
    }
  )
)

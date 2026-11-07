// Особые дни: метки «Менструация / Командировка / Праздник» на конкретном
// дне и прибавка ккал к норме на такой день (перерасчёт). Зачем: трекер
// цикла добавили, чтобы в эти дни корректировать калории, но сама
// корректировка нигде не фиксировалась — теперь метка дня хранится,
// норма дня пересчитывается (остаток на Главной, кольца, «Цель: N/7 дн»
// в отчётах), а карточка «Съедено за сегодня» показывает бейдж особого
// дня. Дни менструации дополнительно выводятся ИЗ трекера цикла
// автоматически (lib/data/dayContext.js) — здесь только ручные метки
// и величины прибавок. Все данные — только на устройстве (zustand
// persist, AsyncStorage).

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

// Ключи типов — те же, что в lib/data/dayContext.js (DAY_TYPES)
export const DAY_TYPE_IDS = ['cycle', 'trip', 'holiday']

// Прибавка по умолчанию: мягкая для менструации (аппетит растёт —
// фаза подсказывает это сама), заметная для командировки (еда вне
// дома, контроль слабее) и праздничного стола
export const DEFAULT_DELTAS = { cycle: 100, trip: 250, holiday: 350 }

// Границы и шаг прибавки (настройка в «Ещё → Дневник питания»)
export const DELTA_MIN = 0
export const DELTA_MAX = 1000
export const DELTA_STEP = 50

const clampDelta = (n) => Math.max(DELTA_MIN, Math.min(DELTA_MAX, Math.round(Number(n) || 0)))

export const useDayTypesStore = create(
  persist(
    (set) => ({
      // { '2026-11-08': 'trip' } — ручные метки дней (командировка/праздник;
      // «менструация» ставится вручную только если трекер цикла выключен)
      marks: {},
      // Прибавка ккал к норме по типам особого дня
      deltas: { ...DEFAULT_DELTAS },

      // Поставить/снять метку дня. type=null/чужой — снять
      setMark: (dayKey, type) =>
        set((s) => {
          const marks = { ...s.marks }
          if (!dayKey || !DAY_TYPE_IDS.includes(type)) delete marks[dayKey]
          else marks[dayKey] = type
          return { marks }
        }),

      // Прибавка конкретного типа, ккал (0 — день без перерасчёта)
      setDelta: (type, kcal) =>
        set((s) => {
          if (!DAY_TYPE_IDS.includes(type)) return {}
          return { deltas: { ...s.deltas, [type]: clampDelta(kcal) } }
        }),

      resetAll: () => set({ marks: {}, deltas: { ...DEFAULT_DELTAS } }),
    }),
    {
      name: 'nutribear-daytypes-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ marks: s.marks, deltas: s.deltas }),
    }
  )
)

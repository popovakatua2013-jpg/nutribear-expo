// Дневная история показателей: шаги, съеденные ккал, вода, сожжённые
// ккал (тренировки) и опыт — по датам. Наполняется сама, когда вы
// пользуетесь приложением (экраны «Главная» и «Активность»).
// Нужна графикам и отчётам: раньше прошлые дни были нулями.

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

// Локальная дата «ГГГГ-ММ-ДД» (не UTC — иначе до 3 утра дата «вчерашняя»)
export function dayKeyOf(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export const EMPTY_DAY = { steps: 0, kcal: 0, waterMl: 0, burned: 0, xp: 0 }

const MAX_DAYS = 150 // хранить около 5 месяцев

export const useHistoryStore = create(
  persist(
    (set) => ({
      days: {}, // { '2026-10-24': { steps, kcal, waterMl, burned, xp } }

      // Записать/обновить показатели дня (patch сливается с прежними)
      record: (key, patch) =>
        set((s) => {
          const next = { ...(s.days[key] || EMPTY_DAY) }
          Object.keys(patch || {}).forEach((f) => {
            const v = Math.round(Number(patch[f]))
            if (!Number.isNaN(v)) next[f] = Math.max(0, v)
          })
          const days = { ...s.days, [key]: next }
          // чистим самые старые дни, если их стало слишком много
          const keys = Object.keys(days).sort()
          while (keys.length > MAX_DAYS) delete days[keys.shift()]
          return { days }
        }),
    }),
    {
      name: 'nutribear-history-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ days: s.days }),
    }
  )
)

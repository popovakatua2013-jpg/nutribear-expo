// Дневная история показателей: шаги, съеденные ккал, вода, сожжённые
// ккал (тренировки) и опыт — по датам. Наполняется сама, когда вы
// пользуетесь приложением (экраны «Главная» и «Дневник»).
// Нужна графикам и отчётам: раньше прошлые дни были нулями.
// sleepMin — минуты сна за день пробуждения (трекер «лёг/встал»,
// lib/data/sleep.js); запись ведёт окно «Записать сон» в Отчётах.

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

export const EMPTY_DAY = { steps: 0, kcal: 0, waterMl: 0, burned: 0, xp: 0, sleepMin: 0 }

const MAX_DAYS = 210 // около 7 месяцев: отчёт «90 дней» сравнивает
// текущий период с предыдущими 90 — итого до 180 дней истории

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
            // Number.isFinite, а не Number.isNaN: Infinity тоже мусор —
            // JSON.stringify превратил бы его в null в хранилище
            if (Number.isFinite(v)) next[f] = Math.max(0, v)
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
      version: 1,
      migrate: (state) => state, // схема меняется — здесь появится миграция
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ days: s.days }),
    }
  )
)

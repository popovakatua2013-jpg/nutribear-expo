// Разборы недели от напарника (Premium, этап 2 монетизации): хранение
// готовых текстов по неделям. Ключ — неделя 'YYYY-MM-DD' (понедельник),
// значение — { text, source: 'ai' | 'offline', at }. Текст небольшой
// (1–2 КБ), но старые недели подчищаем — хранилище не растёт бесконечно.
// Сохранённый разбор открывается без запроса к ИИ; «Обновить» пересчитывает.

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

// Максимум недель с разборами: старые вытесняются первыми
const MAX_WEEKS = 16

export const useWeekReviewStore = create(
  persist(
    (set, get) => ({
      reviews: {}, // [weekKey] = { text, source, at }

      /** Сохранить разбор недели. weekKey — 'YYYY-MM-DD' понедельника */
      setReview: (weekKey, text, source) =>
        set((state) => {
          const reviews = {
            ...state.reviews,
            [weekKey]: { text: String(text || ''), source, at: Date.now() },
          }
          // Чистим старые недели, если накопилось больше лимита
          const keys = Object.keys(reviews)
          if (keys.length > MAX_WEEKS) {
            keys
              .sort((a, b) => (reviews[a]?.at || 0) - (reviews[b]?.at || 0))
              .slice(0, keys.length - MAX_WEEKS)
              .forEach((k) => delete reviews[k])
          }
          return { reviews }
        }),

      /** Удалить разбор недели. true — был и удалён, false — его не было */
      removeReview: (weekKey) => {
        if (!get().reviews[weekKey]) return false
        set((state) => {
          const reviews = { ...state.reviews }
          delete reviews[weekKey]
          return { reviews }
        })
        return true
      },
    }),
    {
      name: 'nutribear-week-review',
      version: 1,
      migrate: (state) => state,
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
)

// Фото прогресса «до/после» во вкладке «Тело»: снимки тела хранятся
// ТОЛЬКО на устройстве — в папке приложения (documentDirectory),
// в AsyncStorage лежит только список с путями и датами.
// Список ведётся от новых к старым: items[0] — самое свежее фото.

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { makeId } from '@/lib/format'

export const useProgressPhotosStore = create(
  persist(
    (set) => ({
      items: [], // [{ id, date (ISO), uri }] — новые сверху

      addPhoto: (uri) =>
        set((s) => ({
          items: [
            { id: makeId(), date: new Date().toISOString(), uri },
            ...s.items,
          ],
        })),

      removePhoto: (id) =>
        set((s) => ({ items: s.items.filter((p) => p.id !== id) })),

      clearPhotos: () => set({ items: [] }),
    }),
    {
      name: 'nutribear-photos-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ items: s.items }),
    }
  )
)

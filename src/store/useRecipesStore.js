// Свои рецепты пользователя: название + вес + калорийность + БЖУ (по желанию).
// Из рецепта можно добавлять блюдо в любой приём пищи. AsyncStorage.

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { makeId } from '@/lib/format'

const per100 = (total, grams) =>
  Math.round(((Number(total) || 0) / grams) * 1000) / 10

export const useRecipesStore = create(
  persist(
    (set) => ({
      items: [], // [{id, name, grams, kcal100, p100?, f100?, c100?, createdAt}]

      // grams — вес порции/блюда, totalKcal — калорийность всего веса,
      // totalP/totalF/totalC — белки/жиры/углеводы всего веса (необязательно)
      add: ({ name, grams, totalKcal, totalP, totalF, totalC }) =>
        set((state) => ({
          items: [
            {
              id: `recipe-${makeId()}`,
              name,
              grams,
              kcal100: Math.max(1, per100(totalKcal, grams)),
              p100: totalP ? per100(totalP, grams) : undefined,
              f100: totalF ? per100(totalF, grams) : undefined,
              c100: totalC ? per100(totalC, grams) : undefined,
              createdAt: Date.now(),
            },
            ...state.items,
          ],
        })),

      remove: (id) =>
        set((state) => ({ items: state.items.filter((r) => r.id !== id) })),

      // Изменить рецепт (данные — на весь вес, как при создании).
      // КБЖУ на 100 г пересчитывается заново.
      update: (id, data) =>
        set((state) => ({
          items: state.items.map((r) =>
            r.id === id
              ? {
                  ...r,
                  name: data.name,
                  grams: data.grams,
                  kcal100: Math.max(1, per100(data.totalKcal, data.grams)),
                  p100: data.totalP ? per100(data.totalP, data.grams) : undefined,
                  f100: data.totalF ? per100(data.totalF, data.grams) : undefined,
                  c100: data.totalC ? per100(data.totalC, data.grams) : undefined,
                }
              : r
          ),
        })),
    }),
    {
      name: 'nutribear-recipes-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ items: s.items }),
    }
  )
)

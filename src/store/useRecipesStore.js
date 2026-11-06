// Свои рецепты пользователя: название + вес + калорийность + БЖУ (по желанию).
// Опционально — «готовый вес» (после варки/жарки): тогда ккал/100 г и БЖУ
// считаются от готового блюда (крупа разваривается, суп упаривается),
// а не от веса ингредиентов. Из рецепта можно добавлять блюдо в любой
// приём пищи. AsyncStorage.

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { makeId } from '@/lib/format'

const per100 = (total, grams) =>
  Math.round(((Number(total) || 0) / grams) * 1000) / 10

// База пересчёта: готовый вес, если он указан, иначе вес ингредиентов
function baseGrams(grams, cookedGrams) {
  const cooked = Number(cookedGrams) || 0
  return cooked > 0 ? cooked : Math.max(1, Number(grams) || 1)
}

export const useRecipesStore = create(
  persist(
    (set) => ({
      items: [], // [{id, name, grams, cookedGrams?, totalKcal, kcal100, p100?, f100?, c100?, createdAt}]

      // grams — вес ингредиентов (до готовки); cookedGrams — вес готового
      // блюда (необязательно). totalKcal — калорийность всего (при готовке
      // почти не меняется), totalP/totalF/totalC — БЖУ всего (необязательно)
      add: ({ name, grams, cookedGrams, totalKcal, totalP, totalF, totalC }) => {
        const base = baseGrams(grams, cookedGrams)
        const cooked = Number(cookedGrams) || 0
        return set((state) => ({
          items: [
            {
              id: `recipe-${makeId()}`,
              name,
              grams: Math.max(1, Number(grams) || 1),
              ...(cooked > 0 ? { cookedGrams: cooked } : {}),
              totalKcal: Math.round(Number(totalKcal) || 0),
              kcal100: Math.max(1, per100(totalKcal, base)),
              p100: totalP ? per100(totalP, base) : undefined,
              f100: totalF ? per100(totalF, base) : undefined,
              c100: totalC ? per100(totalC, base) : undefined,
              createdAt: Date.now(),
            },
            ...state.items,
          ],
        }))
      },

      remove: (id) =>
        set((state) => ({ items: state.items.filter((r) => r.id !== id) })),

      // Изменить рецепт (данные — на весь вес, как при создании).
      // КБЖУ на 100 г пересчитывается заново — от готового веса, если задан.
      update: (id, data) => {
        const base = baseGrams(data.grams, data.cookedGrams)
        const cooked = Number(data.cookedGrams) || 0
        return set((state) => ({
          items: state.items.map((r) =>
            r.id === id
              ? {
                  ...r,
                  name: data.name,
                  grams: Math.max(1, Number(data.grams) || 1),
                  cookedGrams: cooked > 0 ? cooked : undefined,
                  totalKcal: Math.round(Number(data.totalKcal) || 0),
                  kcal100: Math.max(1, per100(data.totalKcal, base)),
                  p100: data.totalP ? per100(data.totalP, base) : undefined,
                  f100: data.totalF ? per100(data.totalF, base) : undefined,
                  c100: data.totalC ? per100(data.totalC, base) : undefined,
                }
              : r
          ),
        }))
      },
    }),
    {
      name: 'nutribear-recipes-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ items: s.items }),
    }
  )
)

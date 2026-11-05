// Свои рецепты пользователя: название + общий выход (г) + число порций +
// калорийность + БЖУ (по желанию) + фото блюда. Из рецепта можно добавлять
// блюдо в любой приём пищи — порция по умолчанию равна выходу, делённому
// на число порций. AsyncStorage.

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { makeId } from '@/lib/format'

const per100 = (total, grams) => {
  const g = Number(grams)
  // grams <= 0 или мусор: делить нельзя — иначе получится Infinity,
  // который JSON.stringify превращает в null и ломает КБЖУ рецепта
  if (!(g > 0)) return 0
  return Math.round(((Number(total) || 0) / g) * 1000) / 10
}

// Число порций: целое 1–24, иначе 1
const servingsOf = (v) => {
  const n = Math.round(Number(v) || 1)
  return Math.max(1, Math.min(24, n))
}

// Граммовка одной порции: выход, делённый на порции (0, если вес битый)
export function gramsPerServing(r) {
  const servings = servingsOf(r && r.servings)
  if (!r || !r.grams) return 0
  return Math.max(1, Math.round(r.grams / servings))
}

export const useRecipesStore = create(
  persist(
    (set) => ({
      // [{id, name, grams, servings?, photo?, kcal100, p100?, f100?, c100?, createdAt}]
      items: [],

      // grams — общий выход блюда (г), totalKcal — калорийность всего веса,
      // totalP/totalF/totalC — белки/жиры/углеводы всего веса (необязательно),
      // servings — на сколько порций приготовлено (по умолчанию 1),
      // photo — uri снимка блюда (необязательно)
      add: ({ name, grams, totalKcal, totalP, totalF, totalC, servings, photo }) =>
        set((state) => ({
          items: [
            {
              id: `recipe-${makeId()}`,
              name,
              grams,
              servings: servingsOf(servings),
              photo: photo || undefined,
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

      // Изменить рецепт (данные — на весь выход, как при создании).
      // КБЖУ на 100 г пересчитывается заново; photo: undefined — не трогаем,
      // null — снять фото.
      update: (id, data) =>
        set((state) => ({
          items: state.items.map((r) =>
            r.id === id
              ? {
                  ...r,
                  name: data.name,
                  grams: data.grams,
                  servings: servingsOf(data.servings),
                  photo: data.photo === undefined ? r.photo : data.photo || undefined,
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
      version: 1,
      migrate: (state) => state, // схема меняется — здесь появится миграция
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ items: s.items }),
    }
  )
)

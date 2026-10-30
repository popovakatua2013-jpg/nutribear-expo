// Свои продукты пользователя — пополняют встроенную базу (144 продукта).
// Хранятся в AsyncStorage и подставляются в поиск и окно «База продуктов».

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { makeId } from '@/lib/format'

const num = (v) => {
  const n = Number(String(v ?? '').replace(',', '.'))
  return Number.isFinite(n) ? Math.max(0, Math.min(950, Math.round(n * 10) / 10)) : 0
}

export const useUserFoodsStore = create(
  persist(
    (set) => ({
      items: [], // [{id, name, emoji, kcal, p, f, c, fib, sug, defaultGrams, createdAt}]

      // kcal/p/f/c/fib/sug — на 100 г; defaultGrams — обычная порция
      add: ({ name, emoji, kcal, p, f, c, fib, sug, defaultGrams }) =>
        set((state) => ({
          items: [
            {
              id: `user-${makeId()}`,
              name: String(name).trim().slice(0, 60),
              emoji: String(emoji || '⭐').trim().slice(0, 4) || '⭐',
              kcal: Math.max(1, num(kcal)),
              p: num(p),
              f: num(f),
              c: num(c),
              fib: num(fib),
              sug: num(sug),
              defaultGrams: Math.max(5, Math.min(2000, Math.round(num(defaultGrams)) || 100)),
              createdAt: Date.now(),
            },
            ...state.items,
          ],
        })),

      update: (id, data) =>
        set((state) => ({
          items: state.items.map((it) =>
            it.id === id
              ? {
                  ...it,
                  name: String(data.name).trim().slice(0, 60) || it.name,
                  emoji: String(data.emoji || it.emoji).trim().slice(0, 4) || it.emoji,
                  kcal: Math.max(1, num(data.kcal)),
                  p: num(data.p),
                  f: num(data.f),
                  c: num(data.c),
                  fib: num(data.fib),
                  sug: num(data.sug),
                  defaultGrams: Math.max(5, Math.min(2000, Math.round(num(data.defaultGrams)) || 100)),
                }
              : it
          ),
        })),

      remove: (id) =>
        set((state) => ({ items: state.items.filter((it) => it.id !== id) })),
    }),
    {
      name: 'nutribear-user-foods-v1',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
)

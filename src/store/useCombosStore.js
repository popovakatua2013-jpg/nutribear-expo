// Комбо — сохранённые наборы блюд одного приёма («Мой завтрак»):
// добавляются одним тапом в хабе добавления еды. Хранится в AsyncStorage.
// Каждое блюдо комбо — снимок записи дневника (граммовка + КБЖУ +
// клетчатка/сахар + витамины/минералы), как в журнале истории.

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { makeId } from '@/lib/format'

// Снимок записи дневника для комбо (те же поля, что foodFromRow читает)
export function snapshotEntry(e) {
  return {
    name: e.name,
    emoji: e.emoji,
    grams: e.grams,
    kcal: e.kcal,
    p: e.p,
    f: e.f,
    c: e.c,
    fib: e.fib,
    sug: e.sug,
    mk: e.mk,
    fe: e.fe,
    ca: e.ca,
    k: e.k,
    mg: e.mg,
    vitc: e.vitc,
    vita: e.vita,
    desc: e.desc,
  }
}

export const useCombosStore = create(
  persist(
    (set) => ({
      items: [], // [{id, name, emoji, items: [снимок…], createdAt}]

      add: ({ name, emoji, items }) =>
        set((state) => ({
          items: [
            {
              id: `combo-${makeId()}`,
              name: String(name).trim().slice(0, 40) || 'Моё комбо',
              emoji: String(emoji || '⭐').trim().slice(0, 4) || '⭐',
              items: (items || []).map(snapshotEntry),
              createdAt: Date.now(),
            },
            ...state.items,
          ],
        })),

      remove: (id) =>
        set((state) => ({ items: state.items.filter((c) => c.id !== id) })),
    }),
    {
      name: 'nutribear-combos-v1',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
)

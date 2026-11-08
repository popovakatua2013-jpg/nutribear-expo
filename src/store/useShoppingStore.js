// Список покупок (вкладка «Тренировки» → сегмент «Покупки»).
// Простые строки: что купить + отметка «в корзине». Отсортирован так,
// что некупленные идут сверху в порядке добавления, купленные оседают
// вниз — в магазине отмеченное не мешает собирать остальное.
// Сохраняется в AsyncStorage, как остальные сторы приложения.

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { makeId } from '@/lib/format'

/** Порядок списка: некупленные сверху (ранние раньше), купленные вниз */
export function sortItems(items) {
  return [...items].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1
    return (a.createdAt || 0) - (b.createdAt || 0)
  })
}

export const useShoppingStore = create(
  persist(
    (set) => ({
      items: [],

      /** Добавить продукт; false — пустая строка */
      add(name) {
        const clean = String(name || '').trim()
        if (!clean) return false
        set((state) => ({
          items: sortItems([
            ...state.items,
            { id: makeId(), name: clean.slice(0, 80), done: false, createdAt: Date.now() },
          ]),
        }))
        return true
      },

      toggle(id) {
        set((state) => ({
          items: sortItems(
            state.items.map((it) => (it.id === id ? { ...it, done: !it.done } : it)),
          ),
        }))
      },

      remove(id) {
        set((state) => ({ items: state.items.filter((it) => it.id !== id) }))
      },

      /** Убрать все купленные */
      clearDone() {
        set((state) => ({ items: state.items.filter((it) => !it.done) }))
      },
    }),
    { name: 'nutribear-shopping-list', storage: createJSONStorage(() => AsyncStorage) },
  ),
)

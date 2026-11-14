// ═══════════════════════════════════════════════════════════════
//  Кеш Open Food Facts
// ═══════════════════════════════════════════════════════════════
//  Найденные через OFF продукты сохраняются локально (AsyncStorage),
//  повторный поиск по тому же запросу не ходит в сеть — мгновенный
//  ответ. Лимит: 100 записей (LRU — вытесняем самые старые по
//  timestamps). Кеш переживает перезапуск приложения.
//
//  Ключи:
//   • по имени: `q:хачапури` → массив продуктов
//   • по штрих-коду: `b:4607034712345` → один продукт

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

const MAX_ENTRIES = 100

export const useOffCacheStore = create(
  persist(
    (set, get) => ({
      // { 'q:хачапури': { items: [...], ts: 1700000000 }, 'b:460...': { items: {...}, ts: ... } }
      cache: {},

      // Получить закешированный результат (null если нет)
      get: (key) => {
        const entry = get().cache[key]
        if (!entry) return null
        // Обновляем timestamp (LRU — «недавно использованные» живут дольше)
        set({ cache: { ...get().cache, [key]: { ...entry, ts: Date.now() } } })
        return entry.items
      },

      // Сохранить результат. Вытесняем старые, если больше MAX_ENTRIES.
      set: (key, items) => {
        const cache = { ...get().cache }
        cache[key] = { items, ts: Date.now() }
        const keys = Object.keys(cache)
        if (keys.length > MAX_ENTRIES) {
          // Сортируем по ts (старые — в конце), удаляем самые старые
          keys
            .sort((a, b) => cache[a].ts - cache[b].ts)
            .slice(0, keys.length - MAX_ENTRIES)
            .forEach((k) => delete cache[k])
        }
        set({ cache })
      },

      // Очистить весь кеш (для отладки / «Сброс данных»)
      clear: () => set({ cache: {} }),
    }),
    {
      name: 'nutribear-off-cache-v1',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ cache: s.cache }),
    }
  )
)

// Хелпер: поиск по имени с кешем. Сначала проверяем кеш, если нет —
// ходим в OFF, результат сохраняем.
import { searchOpenFoodFacts, getFoodByBarcode } from '@/lib/off-search'

export async function searchOFFCached(query, opts) {
  const key = `q:${(query || '').trim().toLowerCase()}`
  const cached = useOffCacheStore.getState().get(key)
  if (cached) return cached
  const items = await searchOpenFoodFacts(query, opts)
  if (items.length > 0) {
    useOffCacheStore.getState().set(key, items)
  }
  return items
}

export async function getBarcodeCached(code, opts) {
  const key = `b:${String(code).replace(/\D/g, '')}`
  const cached = useOffCacheStore.getState().get(key)
  if (cached) return cached
  const item = await getFoodByBarcode(code, opts)
  if (item) {
    useOffCacheStore.getState().set(key, item)
  }
  return item
}

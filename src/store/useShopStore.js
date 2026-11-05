// Копилка монеток и купленные товары.
// Монетки начисляются за полезные действия, тратятся в магазине наград.

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

export const useShopStore = create(
  persist(
    (set, get) => ({
      coins: 0,
      owned: {}, // { itemId: timestamp покупки }

      // Начислить монетки (за действие в приложении). Санитизация:
      // NaN/мусор → 0, отрицательное не уменьшает копилку, потолок —
      // чтобы битые данные не переполнили хранилище
      earn: (n) =>
        set((s) => ({
          coins: Math.min(999999, s.coins + Math.max(0, Math.round(Number(n)) || 0)),
        })),

      // Купить товар. true — успех, false — не хватает монеток
      spend: (itemId, price) => {
        const { coins, owned } = get()
        if (coins < price || owned[itemId]) return false
        set({ coins: coins - price, owned: { ...owned, [itemId]: Date.now() } })
        return true
      },

      // Полный сброс (вместе с «Стереть все данные»)
      resetAll: () => set({ coins: 0, owned: {} }),
    }),
    {
      name: 'nutribear-shop-v1',
      version: 1,
      migrate: (state) => state, // схема меняется — здесь появится миграция
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ coins: s.coins, owned: s.owned }),
    }
  )
)

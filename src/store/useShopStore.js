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

      // Начислить монетки (за действие в приложении)
      earn: (n) => set((s) => ({ coins: s.coins + n })),

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
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ coins: s.coins, owned: s.owned }),
    }
  )
)

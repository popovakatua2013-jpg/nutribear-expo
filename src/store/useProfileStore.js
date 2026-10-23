// Профиль пользователя: имя, биоданные (пол/возраст/активность), рост, вес
// и история измерений. Используется в разделах «ИМТ» и «Ещё».
// Биоданные нужны калькулятору ИМТ: базовый обмен и суточная норма
// считаются по полу, возрасту и уровню активности.

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { makeId } from '@/lib/format'
import { useShopStore } from './useShopStore'
import { EARN } from '@/lib/data/shop'

export const useProfileStore = create(
  persist(
    (set) => ({
      name: '',
      sex: 'female', // female | male
      age: 30,
      heightCm: 175,
      weightKg: 75,
      activityId: 'light', // id из ACTIVITY_LEVELS (онбординг / калькулятор ИМТ)
      hasBio: false, // true — биоданные уже заполнены (онбординг или калькулятор)
      weights: [], // [{ id, date (ISO), kg }] — новые сверху

      setProfile: (patch) =>
        set((s) => ({
          ...s,
          ...patch,
        })),

      // Новое измерение веса: в историю + текущий вес
      addWeight: (kg) => {
        set((s) => ({
          weightKg: kg,
          weights: [
            { id: makeId(), date: new Date().toISOString(), kg },
            ...s.weights,
          ],
        }))
        // +10 монеток за запись веса
        useShopStore.getState().earn(EARN.weight)
      },

      removeWeight: (id) =>
        set((s) => ({
          weights: s.weights.filter((w) => w.id !== id),
        })),
    }),
    {
      name: 'nutribear-profile-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        name: s.name,
        sex: s.sex,
        age: s.age,
        heightCm: s.heightCm,
        weightKg: s.weightKg,
        activityId: s.activityId,
        hasBio: s.hasBio,
        weights: s.weights,
      }),
    }
  )
)

// Профиль пользователя: имя, биоданные (пол/возраст/активность), рост, вес
// и история измерений. Используется в разделах «ИМТ» и «Ещё».
// Биоданные нужны калькулятору ИМТ: базовый обмен и суточная норма
// считаются по полу, возрасту и уровню активности.

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { makeId } from '@/lib/format'

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
      goalWeightKg: null, // цель по весу (кг) или null — показывает прогресс в «Динамике веса»
      goalReachedAt: null, // ISO-дата, когда цель по весу впервые достигнута (награда)
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
      },

      // Изменить измерение веса (например, опечатались в цифре).
      // Если поправили самое свежее — обновляется и текущий вес.
      updateWeight: (id, kg) =>
        set((s) => {
          const safe = Math.round(Number(kg) * 10) / 10
          if (!Number.isFinite(safe) || safe < 25 || safe > 300) return {}
          if (!s.weights.some((w) => w.id === id)) return {}
          const weights = s.weights.map((w) => (w.id === id ? { ...w, kg: safe } : w))
          const isTop = s.weights[0] && s.weights[0].id === id
          return { weights, weightKg: isTop ? safe : s.weightKg }
        }),

      // Удалить измерение. Если удалили самое свежее — текущим весом
      // становится предыдущее измерение (данные не «зависают»).
      removeWeight: (id) =>
        set((s) => {
          const wasTop = s.weights[0] && s.weights[0].id === id
          const weights = s.weights.filter((w) => w.id !== id)
          return {
            weights,
            weightKg: wasTop && weights[0] ? weights[0].kg : s.weightKg,
          }
        }),
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
        goalWeightKg: s.goalWeightKg,
        goalReachedAt: s.goalReachedAt,
        weights: s.weights,
      }),
    }
  )
)

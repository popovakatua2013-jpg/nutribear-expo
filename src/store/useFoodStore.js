// Глобальное состояние дневника питания.
// Сохраняется в AsyncStorage, чтобы данные не терялись при перезагрузке.

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { DEFAULT_GOAL } from '@/lib/data/goals'
import { makeId } from '@/lib/format'
import { bjuForPortion } from '@/lib/data/bju'
import { rescaleEntry } from '@/lib/data/diary'
import { useShopStore } from './useShopStore'
import { EARN } from '@/lib/data/shop'

const EMPTY_ENTRIES = { breakfast: [], lunch: [], dinner: [], snack: [] }

const nowTime = () =>
  new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
const todayKey = () => new Date().toISOString().slice(0, 10)

export const useFoodStore = create(
  persist(
    (set) => ({
      goal: DEFAULT_GOAL,
      entries: EMPTY_ENTRIES,
      customMeals: [], // дополнительные перекусы: [{id, name}]
      history: [], // журнал приёмов: [{id, day, time, mealId, name, emoji, grams, kcal, p, f, c}]

      setGoal: (goal) => set({ goal }),

      // Добавить блюдо в приём пищи (+ время + БЖУ + запись в историю)
      addEntry: (mealId, { food, grams, kcal }) => {
        const time = nowTime()
        const bju = bjuForPortion(food, grams)
        const entry = {
          id: makeId(), foodId: food.id, name: food.name, emoji: food.emoji,
          grams, kcal, ...bju, time,
        }
        set((state) => ({
          entries: {
            ...state.entries,
            [mealId]: [...(state.entries[mealId] || []), entry],
          },
          history: [
            { ...entry, day: todayKey(), mealId },
            ...state.history,
          ].slice(0, 300),
        }))
        // +3 монетки за запись в дневнике
        useShopStore.getState().earn(EARN.meal)
      },

      // Изменить граммовку записи: ккал и БЖУ пересчитываются пропорционально
      updateEntryGrams: (mealId, entryId, newGrams) =>
        set((state) => ({
          entries: {
            ...state.entries,
            [mealId]: (state.entries[mealId] || []).map((e) => rescaleEntry(e, entryId, newGrams)),
          },
          history: state.history.map((h) => rescaleEntry(h, entryId, newGrams)),
        })),

      removeEntry: (mealId, entryId) =>
        set((state) => ({
          entries: {
            ...state.entries,
            [mealId]: state.entries[mealId].filter((e) => e.id !== entryId),
          },
        })),

      // Ещё один перекус пользователя («Перекус 2», «Перекус 3»…)
      addCustomMeal: () =>
        set((state) => {
          const id = `custom-${makeId()}`
          return {
            customMeals: [...state.customMeals, { id, name: `Перекус ${state.customMeals.length + 2}` }],
            entries: { ...state.entries, [id]: [] },
          }
        }),

      // Удалить дополнительный перекус (вместе с его записями — история
      // дневника остаётся, там это просто журнал)
      removeCustomMeal: (id) =>
        set((state) => {
          const entries = { ...state.entries }
          delete entries[id]
          return {
            customMeals: state.customMeals.filter((m) => m.id !== id),
            entries,
          }
        }),

      // Начать новый день (история и перекусы сохраняются)
      resetDay: () => set({ entries: EMPTY_ENTRIES }),
    }),
    {
      name: 'nutribear-diary-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        goal: state.goal,
        entries: state.entries,
        customMeals: state.customMeals,
        history: state.history,
      }),
    }
  )
)

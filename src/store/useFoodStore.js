// Глобальное состояние дневника питания.
// Сохраняется в AsyncStorage, чтобы данные не терялись при перезагрузке.

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { DEFAULT_GOAL } from '@/lib/data/goals'
import { makeId } from '@/lib/format'
import { bjuForPortion } from '@/lib/data/bju'
import { rescaleEntry } from '@/lib/data/diary'
import { dayKeyOf, useHistoryStore } from './useHistoryStore'

const EMPTY_ENTRIES = { breakfast: [], lunch: [], dinner: [], snack: [] }

const nowTime = () =>
  new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
// Локальная дата (как в истории отчётов) — раньше была UTC,
// и ночные записи до 3 утра уходили «во вчера»
const todayKey = dayKeyOf

// Досчитать калории дня в дневной истории (по журналу приёмов): архив
// туда пишется только в полночь, поэтому запись «за вчера» без этого
// досчёта не изменила бы сводку дня/календарь/отчёты до следующей ночи.
// Math.max — не уронить уже архивированное значение меньшим (журнал
// может не знать о чём-то, что учла архивация). allowLower — правка/
// удаление записи: считаем только на догидрированных сторах, чтобы
// неполные данные не занизили день, и разрешаем честное понижение
function syncHistoryKcal(day, allowLower = false) {
  try {
    if (allowLower) {
      if (!useFoodStore.persist.hasHydrated()) return
      if (!useHistoryStore.persist.hasHydrated()) return
    }
    const sum = useFoodStore
      .getState()
      .history.reduce((n, h) => (h.day === day ? n + (Number(h.kcal) || 0) : n), 0)
    const prev = useHistoryStore.getState().days[day] || {}
    const next = Math.round(sum)
    useHistoryStore.getState().record(day, {
      kcal: allowLower ? next : Math.max(prev.kcal || 0, next),
    })
  } catch {}
}

// День, к которому относится запись журнала (для пересчёта после правки)
function syncHistoryKcalOfEntry(entryId) {
  try {
    const row = useFoodStore.getState().history.find((h) => h.id === entryId)
    if (row?.day) syncHistoryKcal(row.day, true)
  } catch {}
}

export const useFoodStore = create(
  persist(
    (set) => ({
      goal: DEFAULT_GOAL,
      entries: EMPTY_ENTRIES,
      customMeals: [], // дополнительные перекусы: [{id, name}]
      history: [], // журнал приёмов: [{id, day, time, mealId, name, emoji, grams, kcal, p, f, c, desc}]
      dayKey: dayKeyOf(), // локальный день, к которому относится дневник

      setGoal: (goal) => set({ goal }),

      // Добавить блюдо в приём пищи (+ время + БЖУ + описание + запись в историю).
      // mk — маркер «по продукту известны витамины/минералы» (продукты базы).
      // dayOff — «за какой день»: 0 = сегодня, 1 = вчера (приём после полуночи).
      // Вчера — запись идёт только в журнал со вчерашним днём: дневник
      // «entries» — это живой сегодня, чужие записи ему ни к чему. Заодно
      // досчитываем вчерашние калории в дневную историю, иначе календарь,
      // сводка дня и отчёты покажут старую сумму до следующей полуночи.
      // Возвращает созданную запись — тостам удобно предлагать «Отменить»
      addEntry: (mealId, { food, grams, kcal, desc }, dayOff = 0) => {
        const time = nowTime()
        const bju = bjuForPortion(food, grams)
        const entry = {
          id: makeId(), foodId: food.id, name: food.name, emoji: food.emoji,
          grams, kcal, ...bju, mk: food.mk, time,
          desc: String(desc || '').trim(),
        }
        if (dayOff) {
          const d = new Date()
          d.setDate(d.getDate() - dayOff)
          const day = dayKeyOf(d)
          set((state) => ({
            history: [
              { ...entry, day, mealId },
              ...state.history,
            ].slice(0, 900),
          }))
          syncHistoryKcal(day)
          return { ...entry, day }
        }
        set((state) => ({
          entries: {
            ...state.entries,
            [mealId]: [...(state.entries[mealId] || []), entry],
          },
          history: [
            { ...entry, day: todayKey(), mealId },
            ...state.history,
          ].slice(0, 900), // ~2 месяца при 15 записях/день — месяц рейтинга помещается целиком
        }))
        return entry
      },

      // Изменить граммовку записи: ккал и БЖУ пересчитываются пропорционально
      updateEntryGrams: (mealId, entryId, newGrams) => {
        set((state) => ({
          entries: {
            ...state.entries,
            [mealId]: (state.entries[mealId] || []).map((e) => rescaleEntry(e, entryId, newGrams)),
          },
          history: state.history.map((h) => rescaleEntry(h, entryId, newGrams)),
        }))
        syncHistoryKcalOfEntry(entryId)
      },

      // Полная правка уже добавленной записи (название, вес, ккал, БЖУ) —
      // значения абсолютные «за порцию», меняются и в дневнике, и в истории
      updateEntry: (mealId, entryId, patch) => {
        set((state) => {
          const apply = (e) => (e.id === entryId ? { ...e, ...patch } : e)
          return {
            entries: {
              ...state.entries,
              [mealId]: (state.entries[mealId] || []).map(apply),
            },
            history: state.history.map(apply),
          }
        })
        syncHistoryKcalOfEntry(entryId)
      },

      removeEntry: (mealId, entryId) => {
        // День удаляемой записи — до set: из журнала она уже уйдёт
        const day = useFoodStore.getState().history.find((h) => h.id === entryId)?.day
        set((state) => ({
          entries: {
            ...state.entries,
            // приёма может уже не быть (удалён доп. перекус) — не падаем
            [mealId]: (state.entries[mealId] || []).filter((e) => e.id !== entryId),
          },
          // ошибочная запись уходит и из журнала — иначе она продолжает
          // учитываться в месячном рейтинге и копировании вчерашнего дня
          history: state.history.filter((h) => h.id !== entryId),
        }))
        // Честно понизить калории дня в истории — раньше счётчик дня
        // оставался завышенным до полуночи
        if (day) syncHistoryKcal(day, true)
      },

      // Ещё один перекус пользователя («Перекус 2», «Перекус 3»…).
      // Имя — по максимальному занятому номеру + 1: после удаления
      // «Перекус 2» из набора «2, 3» новый станет «Перекус 4», а не
      // вторым «Перекус 3». Возвращает созданный перекус — тостам и
      // автосворачиванию секций удобно
      addCustomMeal: () => {
        const maxNum = useFoodStore
          .getState()
          .customMeals.reduce((mx, m) => {
            const n = Number(String(m.name || '').match(/^Перекус\s*(\d+)$/)?.[1] || 1)
            return Math.max(mx, n)
          }, 1)
        const id = `custom-${makeId()}`
        const meal = { id, name: `Перекус ${Math.max(2, maxNum + 1)}` }
        set((state) => ({
          customMeals: [...state.customMeals, meal],
          entries: { ...state.entries, [id]: [] },
        }))
        return meal
      },

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

      // Начать новый день вручную (история и перекусы сохраняются)
      resetDay: () => set({ entries: EMPTY_ENTRIES, dayKey: dayKeyOf() }),

      // Авто-переход на новый день (вызывается из lib/rollover.js).
      // У кого dayKey ещё не сохранялся (старая версия приложения) —
      // просто фиксируем текущий день, ничего не очищаем.
      rollDay: (key) =>
        set((s) => {
          if (s.dayKey === key) return {}
          if (!s.dayKey) return { dayKey: key }
          return { entries: EMPTY_ENTRIES, dayKey: key }
        }),
    }),
    {
      name: 'nutribear-diary-v1',
      version: 1,
      migrate: (state) => state,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        goal: state.goal,
        entries: state.entries,
        customMeals: state.customMeals,
        history: state.history,
        dayKey: state.dayKey,
      }),
    }
  )
)

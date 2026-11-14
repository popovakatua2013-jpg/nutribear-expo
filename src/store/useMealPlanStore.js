// План питания на неделю (вкладка «План» → сегмент «Меню»).
// Хранение: plans[weekKey][dayIdx][mealId] = [items], где weekKey —
// дата понедельника недели 'YYYY-MM-DD' (недели с понедельника, как в
// календарях отчётов), dayIdx 0…6, mealId — приёмы из MEAL_IDS.
// templates — шаблоны дней (просьба Кати 10.11): [{ id, name, day,
// kcal, dishes, createdAt }], «day» — тот же пустой день { breakfast:
// [], lunch: [], dinner: [], snack: [] }; сохранённый любимый день
// вставляется в любой день одним тапом.
// Элемент меню — выжимка из buildFood (продукт базы или «своё блюдо»)
// + граммовка и ккал порции: этого достаточно, чтобы «В дневник»
// записал блюдо через useFoodStore.addEntry с полным БЖУ.
// Сохраняется в AsyncStorage, как остальные сторы приложения.

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { makeId } from '@/lib/format'

export const MEAL_IDS = ['breakfast', 'lunch', 'dinner', 'snack']

export const MEAL_NAMES = {
  breakfast: 'Завтрак',
  lunch: 'Обед',
  dinner: 'Ужин',
  snack: 'Перекус',
}

export const MEAL_EMOJI = {
  breakfast: '🌅',
  lunch: '🍲',
  dinner: '🌙',
  snack: '🍎',
}

export const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

const pad = (n) => String(n).padStart(2, '0')

/** Ключ недели (дата понедельника) для даты: 'YYYY-MM-DD'.
 * Полдень в дате — от сдвигов часового пояса/DST вокруг полуночи. */
export function weekKeyOf(date) {
  const d = new Date(date)
  d.setHours(12, 0, 0, 0)
  const dow = (d.getDay() + 6) % 7 // 0 = понедельник
  d.setDate(d.getDate() - dow)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Ключ недели, сдвинутый на n недель (n может быть отрицательным) */
export function weekKeyShift(weekKey, n) {
  const [y, m, dd] = weekKey.split('-').map(Number)
  const d = new Date(y, m - 1, dd, 12)
  d.setDate(d.getDate() + n * 7)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Дата (Date) дня недели внутри недели weekKey: idx 0 = понедельник */
export function dayDate(weekKey, idx) {
  const [y, m, dd] = weekKey.split('-').map(Number)
  const d = new Date(y, m - 1, dd, 12)
  d.setDate(d.getDate() + idx)
  return d
}

/** Пустой день плана: все приёмы пустые */
export function emptyDay() {
  return { breakfast: [], lunch: [], dinner: [], snack: [] }
}

/** Сумма калорий дня плана */
export function dayKcal(planDay) {
  if (!planDay) return 0
  return Math.round(
    MEAL_IDS.reduce(
      (sum, mealId) =>
        sum + (planDay[mealId] || []).reduce((n, it) => n + (Number(it.kcal) || 0), 0),
      0,
    ),
  )
}

export const useMealPlanStore = create(
  persist(
    (set, get) => ({
      plans: {},
      templates: [], // шаблоны дней меню — см. шапку файла

      /** Добавить блюдо в приём: item — buildFood-подобный объект + grams */
      addItem(weekKey, dayIdx, mealId, item) {
        const planItem = {
          id: makeId(),
          name: String(item.name || 'Блюдо').slice(0, 80),
          emoji: item.emoji || '🍽️',
          grams: Math.round(item.grams || 100),
          kcal: Math.round((Number(item.kcal) || 0) * 10) / 10,
          kcal100: item.kcal100 ?? item.kcal ?? 100,
          p: item.p, f: item.f, c: item.c,
          source: item.source || 'local',
        }
        set((state) => {
          const week = state.plans[weekKey] || {}
          const day = week[dayIdx] || emptyDay()
          return {
            plans: {
              ...state.plans,
              [weekKey]: {
                ...week,
                [dayIdx]: { ...day, [mealId]: [...(day[mealId] || []), planItem] },
              },
            },
          }
        })
      },

      removeItem(weekKey, dayIdx, mealId, itemId) {
        set((state) => {
          const week = state.plans[weekKey]
          const day = week?.[dayIdx]
          if (!day) return state
          return {
            plans: {
              ...state.plans,
              [weekKey]: {
                ...week,
                [dayIdx]: {
                  ...day,
                  [mealId]: (day[mealId] || []).filter((it) => it.id !== itemId),
                },
              },
            },
          }
        })
      },

      /** Изменить граммовку блюда: ккал пересчитываются от калорийности
       * на 100 г (kcal100). Границы 10…2000 г. Для «своего блюда»
       * kcal100 — калорийность базовой порции (100 г), формула та же. */
      updateGrams(weekKey, dayIdx, mealId, itemId, grams) {
        const g = Math.max(10, Math.min(2000, Math.round(Number(grams) || 0)))
        set((state) => {
          const week = state.plans[weekKey]
          const day = week?.[dayIdx]
          if (!day) return state
          const list = day[mealId] || []
          if (!list.some((x) => x.id === itemId)) return state
          return {
            plans: {
              ...state.plans,
              [weekKey]: {
                ...week,
                [dayIdx]: {
                  ...day,
                  [mealId]: list.map((x) =>
                    x.id === itemId
                      ? {
                          ...x,
                          grams: g,
                          kcal: Math.round(((Number(x.kcal100) || 0) * g) / 100 * 10) / 10,
                        }
                      : x,
                  ),
                },
              },
            },
          }
        })
      },

      /** Заменить блюдо в приёме другим (замены «похожее по ккал»,
       * просьба Кати 10.11): новый item встаёт на то же место, у копии
       * новый id. Форма planItem — как в addItem */
      replaceItem(weekKey, dayIdx, mealId, itemId, item) {
        set((state) => {
          const week = state.plans[weekKey]
          const day = week?.[dayIdx]
          if (!day) return state
          const list = day[mealId] || []
          if (!list.some((x) => x.id === itemId)) return state
          const planItem = {
            id: makeId(),
            name: String(item.name || 'Блюдо').slice(0, 80),
            emoji: item.emoji || '🍽️',
            grams: Math.round(item.grams || 100),
            kcal: Math.round((Number(item.kcal) || 0) * 10) / 10,
            kcal100: item.kcal100 ?? item.kcal ?? 100,
            p: item.p, f: item.f, c: item.c,
            source: item.source || 'local',
          }
          return {
            plans: {
              ...state.plans,
              [weekKey]: {
                ...week,
                [dayIdx]: {
                  ...day,
                  [mealId]: list.map((x) => (x.id === itemId ? planItem : x)),
                },
              },
            },
          }
        })
      },

      // ─── Шаблоны дней («сохраняешь любимый день меню и вставляешь
      // его на любой день одним тапом», просьба Кати 10.11) ───

      /** Сохранить меню дня как шаблон. Пустой день — null (сохранять
       * нечего). Имя — до 30 символов, без имени — «Шаблон N» */
      saveDayAsTemplate(weekKey, dayIdx, name) {
        const src = get().plans[weekKey]?.[dayIdx]
        const day = emptyDay()
        let dishes = 0
        if (src) {
          for (const mealId of MEAL_IDS) {
            day[mealId] = (src[mealId] || []).map((it) => ({ ...it, id: makeId() }))
            dishes += day[mealId].length
          }
        }
        if (dishes === 0) return null
        const clean = String(name || '').trim().slice(0, 30)
        const tpl = {
          id: makeId(),
          name: clean || `Шаблон ${get().templates.length + 1}`,
          day,
          kcal: dayKcal(day),
          dishes,
          createdAt: Date.now(),
        }
        set((state) => ({ templates: [...state.templates, tpl] }))
        return tpl
      },

      /** Вставить шаблон в день (меню дня заменяется, как при
       * копировании); id у блюд новые. false — шаблона нет */
      applyTemplate(templateId, weekKey, dayIdx) {
        const tpl = get().templates.find((t) => t.id === templateId)
        if (!tpl) return false
        set((state) => {
          const week = state.plans[weekKey] || {}
          const day = emptyDay()
          for (const mealId of MEAL_IDS) {
            day[mealId] = (tpl.day[mealId] || []).map((it) => ({ ...it, id: makeId() }))
          }
          return { plans: { ...state.plans, [weekKey]: { ...week, [dayIdx]: day } } }
        })
        return true
      },

      /** Удалить шаблон. false — шаблона не было */
      removeTemplate(templateId) {
        const before = get().templates.length
        set((state) => ({
          templates: state.templates.filter((t) => t.id !== templateId),
        }))
        return get().templates.length < before
      },

      /** Копировать день (в т.ч. между неделями); id у копий новые */
      copyDay(fromWeekKey, fromIdx, toWeekKey, toIdx) {
        set((state) => {
          const src = state.plans[fromWeekKey]?.[fromIdx]
          const day = emptyDay()
          if (src) {
            for (const mealId of MEAL_IDS) {
              day[mealId] = (src[mealId] || []).map((it) => ({ ...it, id: makeId() }))
            }
          }
          const week = state.plans[toWeekKey] || {}
          return { plans: { ...state.plans, [toWeekKey]: { ...week, [toIdx]: day } } }
        })
      },

      clearDay(weekKey, dayIdx) {
        set((state) => {
          const week = state.plans[weekKey]
          if (!week) return state
          return { plans: { ...state.plans, [weekKey]: { ...week, [dayIdx]: emptyDay() } } }
        })
      },

      /** Заполнить неделю копией предыдущей. false — у прошлой нет меню */
      copyPrevWeek(weekKey) {
        const src = get().plans[weekKeyShift(weekKey, -1)]
        if (!src) return false
        set((state) => {
          const week = {}
          for (let i = 0; i < 7; i++) {
            const day = emptyDay()
            const srcDay = src[i]
            if (srcDay) {
              for (const mealId of MEAL_IDS) {
                day[mealId] = (srcDay[mealId] || []).map((it) => ({ ...it, id: makeId() }))
              }
            }
            week[i] = day
          }
          return { plans: { ...state.plans, [weekKey]: week } }
        })
        return true
      },

      clearWeek(weekKey) {
        set((state) => {
          const plans = { ...state.plans }
          delete plans[weekKey]
          return { plans }
        })
      },

      /** Заменить меню недели целиком (ИИ-меню на неделю, этап 2
       * монетизации): days — массив из 7 элементов (null или
       * { breakfast, lunch, dinner, snack } с блюдами формата addItem).
       * Один set вместо 28 addItem'ов — одна запись AsyncStorage вместо
       * целой серии. Id у блюд проставляются новые — уникальные. */
      setWeek(weekKey, days) {
        set((state) => {
          const week = {}
          for (let i = 0; i < 7; i++) {
            const day = { ...emptyDay(), ...(days?.[i] || {}) }
            for (const mealId of MEAL_IDS) {
              day[mealId] = (day[mealId] || []).map((it) => ({
                ...it,
                id: makeId(),
                grams: Math.round(it.grams || 100),
                kcal: Math.round((Number(it.kcal) || 0) * 10) / 10,
              }))
            }
            week[i] = day
          }
          return { plans: { ...state.plans, [weekKey]: week } }
        })
      },
    }),
    {
      name: 'nutribear-meal-plan',
      storage: createJSONStorage(() => AsyncStorage),
      // v2 — шаблоны дней: у старых хранилищ поля templates нет, merge
      // оставит начальный [] — ничего не ломает, миграция не нужна
      version: 2,
      migrate: (state) => state,
    },
  ),
)

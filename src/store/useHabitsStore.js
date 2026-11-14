// ═══════════════════════════════════════════════════════════════
//  Стор привычек NutriBear
// ═══════════════════════════════════════════════════════════════
//  Чек-лист привычек на день — то, чего нет у MFP, но есть у Yazio и
//  Lifesum («привычки»). 5 базовых: вода, шаги, дневник питания,
//  взвешивание, сон. Вода и шаги отмечаются автоматически по достижении
//  цели (useActivityStore), остальные — вручную тапом по чекбоксу.
//
//  Серия дней (streak): сколько дней подряд закрыты ВСЕ 5 привычек.
//  Это мотивирующая метрика — простой чек-лист не цепляет, а «серия
//  12 дней» заставляет не бросать. Хранится по dateKey (YYYY-MM-DD),
//  переживает перезапуск приложения (AsyncStorage через persist).

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

// Дефолтный набор: id, имя, иконка, цель (текст для UI), autoCheck —
// нужно ли автоматически отмечать по стокам (вода/шаги). Ручные:
// diary (записал еду), weight (взвесился), sleep (заполнил сон).
export const DEFAULT_HABITS = [
  { id: 'water', name: 'Вода', emoji: '💧', goal: 'норма', autoCheck: true },
  { id: 'steps', name: 'Шаги', emoji: '👣', goal: 'норма', autoCheck: true },
  { id: 'diary', name: 'Дневник питания', emoji: '📝', goal: 'запись', autoCheck: false },
  { id: 'weight', name: 'Взвешивание', emoji: '⚖️', goal: '1 раз/нед', autoCheck: false },
  { id: 'sleep', name: 'Сон 7+', emoji: '😴', goal: '7 ч', autoCheck: false },
]

// Ключ даты: YYYY-MM-DD в локальной зоне. Не UTC (UTC съедает/добавляет
// день в зависимости от часового пояса — пользователь «вчера отмечал
// воду сегодня»).
export function dateKey(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// Сдвиг ключа даты на ±n дней (для серии: смотрим вчера, позавчера…)
export function shiftDateKey(key, deltaDays) {
  const [y, m, d] = key.split('-').map(Number)
  const dt = new Date(y, m - 1, d + deltaDays)
  return dateKey(dt)
}

export const useHabitsStore = create(
  persist(
    (set, get) => ({
      habits: DEFAULT_HABITS,
      // checks: { '2026-11-14': { water: true, diary: true, ... } }
      // Только РУЧНЫЕ отметки. Авто (вода/шаги) — вычисляются на лету
      // в isHabitDone(), в сторе не хранятся (иначе рассинхрон с реальностью:
      // выпил воду → отменил → снова выпил; ручная отметка застряла бы).
      checks: {},

      // Ручная отметка: toggle. Авто-привычки (water/steps) нельзя
      // отметить вручную — они вычисляются из сторов. Если попытаться —
      // игнорируем (return без изменений), чтобы пользователь не мог
      // «отметить воду», не выпив её.
      toggle: (habitId, dayKey) => {
        const h = get().habits.find((x) => x.id === habitId)
        if (!h || h.autoCheck) return
        const key = dayKey || dateKey()
        const dayChecks = { ...(get().checks[key] || {}) }
        if (dayChecks[habitId]) {
          delete dayChecks[habitId]
        } else {
          dayChecks[habitId] = true
        }
        set({ checks: { ...get().checks, [key]: dayChecks } })
      },

      // Установить отметку явно (для авто-синхры из useActivityStore:
      // если вода достигла цели — ставим true; но мы НЕ храним авто
      // в сторе, поэтому этот метод только для ручных привычек).
      setCheck: (habitId, dayKey, value) => {
        const h = get().habits.find((x) => x.id === habitId)
        if (!h || h.autoCheck) return
        const key = dayKey || dateKey()
        const dayChecks = { ...(get().checks[key] || {}) }
        if (value) dayChecks[habitId] = true
        else delete dayChecks[habitId]
        set({ checks: { ...get().checks, [key]: dayChecks } })
      },

      // Сброс всех отметок (только ручных — авто всегда вычисляются)
      reset: () => set({ checks: {} }),

      // Восстановить привычки к дефолту (если пользователь их не менял —
      // сейчас ручное редактирование не делаем, но задел на будущее)
      resetHabits: () => set({ habits: DEFAULT_HABITS }),
    }),
    {
      name: 'nutribear-habits-v1',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ checks: s.checks }),
    }
  )
)

// ── Хелперы для UI и тестов ───────────────────────────────────────

// Готова ли привычка в указанный день.
// Для ручных — берём из checks. Для авто — caller должен передать
// done=true (он сам вычислил из сторов; стор привычек не знает про
// useActivityStore, чтобы не было циклической зависимости).
// Возвращает boolean.
export function isHabitDone(state, habitId, dayKey, autoDone) {
  const h = state.habits.find((x) => x.id === habitId)
  if (!h) return false
  if (h.autoCheck) return Boolean(autoDone)
  const key = dayKey || dateKey()
  return Boolean(state.checks?.[key]?.[habitId])
}

// Сколько привычек закрыто сегодня (для прогресса «3 из 5»).
// autoDone — карта { water: true, steps: false } для авто-привычек.
export function doneCount(state, dayKey, autoDone = {}) {
  let n = 0
  for (const h of state.habits) {
    if (isHabitDone(state, h.id, dayKey, autoDone[h.id])) n++
  }
  return n
}

// Процент выполнения за день (0..100), для кругового прогресса.
export function dayProgress(state, dayKey, autoDone = {}) {
  const total = state.habits.length || 1
  return Math.round((doneCount(state, dayKey, autoDone) / total) * 100)
}

// Серия дней: сколько дней ПОДРЯД (включая сегодня, если он закрыт)
// закрыты ВСЕ привычки. Идём назад от today, пока не наткнёмся на
// неполный день. Возвращает число ≥ 0.
// autoDoneByDay — карта { '2026-11-14': { water: true, steps: true } }
// для всех прошлых дней (caller проходит по своим историческим данным).
// Если не передан — считаем только ручные отметки (авто в прошлом
// нам недоступны, поэтому серия без него — нижняя оценка).
export function streak(state, todayKey, autoDoneByDay = {}) {
  const key = todayKey || dateKey()
  let count = 0
  let cur = key
  // Страховка от бесконечного цикла: 366 дней
  for (let i = 0; i < 366; i++) {
    const auto = autoDoneByDay[cur] || {}
    if (doneCount(state, cur, auto) === state.habits.length) {
      count++
      cur = shiftDateKey(cur, -1)
    } else {
      break
    }
  }
  return count
}

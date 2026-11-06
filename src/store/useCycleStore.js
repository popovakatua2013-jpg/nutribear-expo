// Трекер цикла (по отзыву из Google Play: «хочу отслеживать цикл —
// в разные фазы разный аппетит»). Принцип как у особых состояний
// онбординга: БЕЗ медицинских рекомендаций — только констатация фазы,
// прогноз следующего цикла и мягкие подсказки про аппетит и вес.
// Все данные — только на устройстве (zustand persist, AsyncStorage).

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

// Ключ дня 'ГГГГ-ММ-ДД' из Date
function keyOf(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Разница в днях между ключами (b - a), ключи — валидные даты
function diffDays(a, b) {
  const da = new Date(`${a}T00:00:00`)
  const db = new Date(`${b}T00:00:00`)
  if (Number.isNaN(da.getTime()) || Number.isNaN(db.getTime())) return NaN
  return Math.round((db - da) / 86400000)
}

export function dayKeyOf(date = new Date()) {
  return keyOf(date)
}

// Ограничения настроек: реалистичные границы, без диагностики
export const CYCLE_MIN = 21
export const CYCLE_MAX = 38
export const BLEED_MIN = 2
export const BLEED_MAX = 10
export const HISTORY_MAX = 12 // хранить максимум 12 последних циклов

const clamp = (v, min, max) => Math.max(min, Math.min(max, v))

export function normLength(v) {
  if (v == null || v === '') return 28
  const n = Math.round(Number(v))
  if (!Number.isFinite(n)) return 28
  return clamp(n, CYCLE_MIN, CYCLE_MAX)
}
export function normBleed(v) {
  if (v == null || v === '') return 5
  const n = Math.round(Number(v))
  if (!Number.isFinite(n)) return 5
  return clamp(n, BLEED_MIN, BLEED_MAX)
}

// ── Чистые функции фаз (тестируются напрямую) ──────────────────────────

// Дата следующего цикла: start + длина. Возвращает ключ или null
export function nextStartKey(lastStart, length) {
  if (!lastStart) return null
  const d = new Date(`${lastStart}T00:00:00`)
  if (Number.isNaN(d.getTime())) return null
  d.setDate(d.getDate() + normLength(length))
  return keyOf(d)
}

// Сколько дней до следующего цикла (может быть отрицательным — задержка)
export function daysToNext(lastStart, length, todayKey = dayKeyOf()) {
  const next = nextStartKey(lastStart, length)
  if (!next) return null
  return diffDays(todayKey, next)
}

// Фаза дня цикла. Возвращает null, если данных нет или start в будущем.
// Овуляция ≈ length − 14, окно ±1 день. Менструация — первые bleed дней.
// phase: 'menstrual' | 'follicular' | 'ovulation' | 'luteal'
export function phaseOf(lastStart, length, bleed, todayKey = dayKeyOf()) {
  if (!lastStart) return null
  const d = diffDays(lastStart, todayKey)
  if (!Number.isFinite(d) || d < 0) return null
  const len = normLength(length)
  const bld = normBleed(bleed)
  const dayInCycle = d + 1
  const ovDay = len - 14
  let phase = 'luteal'
  if (dayInCycle <= bld) phase = 'menstrual'
  else if (Math.abs(dayInCycle - ovDay) <= 1) phase = 'ovulation'
  else if (dayInCycle < ovDay) phase = 'follicular'
  return { phase, dayInCycle, cycleLength: len, ovDay, nextStart: nextStartKey(lastStart, len) }
}

// Мягкая подсказка по фазе — без медицины, поддержка и объяснение,
// почему аппетит и вес могут отличаться. Для рейтинга «не льстим».
export function phaseHint(phase) {
  switch (phase) {
    case 'menstrual':
      return {
        emoji: '🌙',
        title: 'Менструальная фаза',
        text: 'Вес может скакать — это вода и отёки, а не жир. Аппетит часто выше нормы: слушайте тело и пейте достаточно воды.',
      }
    case 'follicular':
      return {
        emoji: '🌱',
        title: 'Фолликулярная фаза',
        text: 'Обычно много сил и ровный аппетит — хорошее время для активных дней и новых привычек.',
      }
    case 'ovulation':
      return {
        emoji: '✨',
        title: 'Овуляция',
        text: 'Окно овуляции — пара дней в середине цикла. Энергии много, но не забывайте про норму воды.',
      }
    case 'luteal':
      return {
        emoji: '🍂',
        title: 'Лютеиновая фаза',
        text: 'Аппетит и тяга к сладкому растут — это нормально. Сытный ужин и вода помогают не срываться.',
      }
    default:
      return null
  }
}

// Ключи дней месячных (для точек в календаре) в диапазоне [fromKey..toKey]
export function bleedDayKeys(history, length, bleed, fromKey, toKey) {
  const keys = []
  const bld = normBleed(bleed)
  for (const rec of history || []) {
    for (let i = 0; i < bld; i++) {
      const d = new Date(`${rec.start}T00:00:00`)
      if (Number.isNaN(d.getTime())) continue
      d.setDate(d.getDate() + i)
      const k = keyOf(d)
      if (k >= fromKey && k <= toKey) keys.push(k)
    }
  }
  // Хронологический порядок — потребители рисуют маркеры по датам
  return keys.sort()
}

// ── Стор ────────────────────────────────────────────────────────────────

export const useCycleStore = create(
  persist(
    (set, get) => ({
      enabled: false,
      lastStart: null, // 'ГГГГ-ММ-ДД' — начало последних месячных
      length: 28, // средняя длина цикла, дни
      bleed: 5, // длительность месячных, дни
      history: [], // [{start}] — прошлые циклы, новые сверху

      setEnabled: (v) => set({ enabled: Boolean(v) }),

      setSettings: ({ length, bleed }) =>
        set((s) => ({
          length: normLength(length != null ? length : s.length),
          bleed: normBleed(bleed != null ? bleed : s.bleed),
        })),

      // Двигать дату начала на n дней (n может быть отрицательным)
      shiftLastStart: (days) =>
        set((s) => {
          if (!s.lastStart) return {}
          const d = new Date(`${s.lastStart}T00:00:00`)
          if (Number.isNaN(d.getTime())) return {}
          d.setDate(d.getDate() + Math.round(Number(days) || 0))
          const key = keyOf(d)
          const today = dayKeyOf()
          // Начало не может быть в будущем и не старше 90 дней
          if (key > today || diffDays(key, today) > 90) return {}
          return { lastStart: key }
        }),

      // Отметить начало месячных в день dayKey (по умолчанию сегодня).
      // Прежний start уходит в историю (без дублей); счётчик length не
      // перезаписываем — пользователь настраивает его сам
      logStart: (dayKey) => {
        const today = dayKeyOf()
        const start = dayKey || today
        const s = get()
        // Один и тот же день не записываем дважды
        if (s.lastStart === start) return false
        if (diffDays(start, today) < 0) return false // будущее — нельзя
        // Прежний lastStart сохраняем в историю (он мог быть отмечен,
        // но в history не попадать), дублей быть не должно
        const merged = [
          { start },
          ...(s.lastStart && s.lastStart !== start ? [{ start: s.lastStart }] : []),
          ...s.history,
        ]
        const seen = new Set()
        const history = merged
          .filter((r) => r && typeof r.start === 'string' && !seen.has(r.start) && seen.add(r.start))
          .slice(0, HISTORY_MAX)
        set({ lastStart: start, history })
        return true
      },

      // Сброс всей истории цикла (кнопка «Удалить данные»)
      resetAll: () =>
        set({ enabled: false, lastStart: null, length: 28, bleed: 5, history: [] }),
    }),
    {
      name: 'nutribear-cycle-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        enabled: s.enabled,
        lastStart: s.lastStart,
        length: s.length,
        bleed: s.bleed,
        history: s.history,
      }),
    }
  )
)

// Данные активности: цели и помощники для графиков и сводки.
// Прошлые дни берутся из дневной истории (useHistoryStore) — только
// реальные данные пользователя; дни без записей остаются нулями.

import { useHistoryStore, dayKeyOf, EMPTY_DAY } from '@/store/useHistoryStore'

export const WATER_GLASS = 250
export const KCAL_PER_STEP = 0.04

export const RANGES = [
  { id: '7d', label: '7 дней', days: 7 },
  { id: '30d', label: '30 дней', days: 30 },
  { id: '90d', label: '90 дней', days: 90 },
]

export function shortWeekday(date) {
  const s = new Intl.DateTimeFormat('ru-RU', { weekday: 'short' }).format(date)
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function shortDate(date) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
  }).format(date)
}

function sum(arr, field) {
  return arr.reduce((s, x) => s + (x[field] || 0), 0)
}

function savedDays() {
  return useHistoryStore.getState().days || {}
}

// Строка дня: сохранённая история + живое «сегодня» поверх
function dayRow(d, today) {
  const k = dayKeyOf(d)
  const row = { ...(savedDays()[k] || EMPTY_DAY) }
  if (d && dayKeyOf(d) === dayKeyOf() && today) {
    Object.keys(EMPTY_DAY).forEach((f) => {
      if (today[f] != null) row[f] = today[f]
    })
  }
  return row
}

// История за N дней (последний элемент — сегодня).
// today — живые значения за сегодня { steps, kcal, waterMl, burned, xp }
export function history(days, today) {
  const out = []
  const now = new Date()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    out.push({
      ...dayRow(d, today),
      label: days <= 7 ? shortWeekday(d) : shortDate(d),
    })
  }
  return out
}

// Агрегация по неделям — для периодов 30/90 дней
export function weeklyHistory(days, today) {
  const all = history(days, today)
  const weeks = []
  for (let i = 0; i < all.length; i += 7) {
    const chunk = all.slice(i, i + 7)
    weeks.push({
      label: chunk[0].label,
      steps: sum(chunk, 'steps'),
      kcal: sum(chunk, 'kcal'),
      waterMl: sum(chunk, 'waterMl'),
      burned: sum(chunk, 'burned'),
      xp: sum(chunk, 'xp'),
    })
  }
  return weeks
}

// Итоги за период: сумма реальных дней, «сегодня» — из живых сторов
export function blendedTotals(days, today) {
  return history(days, today).reduce(
    (acc, r) => {
      Object.keys(EMPTY_DAY).forEach((f) => {
        acc[f] += r[f] || 0
      })
      return acc
    },
    { steps: 0, kcal: 0, waterMl: 0, burned: 0, xp: 0 }
  )
}

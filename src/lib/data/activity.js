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

function savedDays() {
  return useHistoryStore.getState().days || {}
}

// Строка дня: сохранённая история + живое «сегодня» поверх.
// Единственное место склейки — её использует и reports.js
// (раньше эта логика была продублирована во втором модуле).
export function dayRow(d, today) {
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
      key: dayKeyOf(d), // «ГГГГ-ММ-ДД» — теплокарта открывает по нему сводку дня
      label: days <= 7 ? shortWeekday(d) : shortDate(d),
    })
  }
  return out
}

// Опыт за день: шаги + стаканы воды + приёмы пищи + тренировки
// (1 ккал ≈ 0.1 опыта). Формула была продублирована на экранах
// «Главная» и «Дневник» — теперь одна на оба экрана.
export function xpForDay({ steps, waterMl, mealCount, burned }) {
  const glasses = Math.round(waterMl / WATER_GLASS)
  return (
    Math.round(steps / 500) * 2 + glasses * 5 + mealCount * 10 + Math.round(burned / 10)
  )
}

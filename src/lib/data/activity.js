// Данные активности: цели и помощники для графиков.
// Все числа — только реальные данные пользователя: дни, в которые
// записей не было, остаются нулями (никаких демо-подстановок).

export const WATER_GLASS = 250
export const KCAL_PER_STEP = 0.04

export const RANGES = [
  { id: '7d', label: '7 дней', days: 7 },
  { id: '30d', label: '30 дней', days: 30 },
  { id: '90d', label: '90 дней', days: 90 },
]

const EMPTY = { steps: 0, kcal: 0, waterMl: 0, xp: 0 }

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
  return arr.reduce((s, x) => s + x[field], 0)
}

// История за N дней (последний элемент — сегодня).
// Значения нулевые: реальные данные пользователя подмешиваются
// в последнюю точку графиками и blendedTotals(days, today).
export function history(days) {
  const out = []
  const now = new Date()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    out.push({ ...EMPTY, label: days <= 7 ? shortWeekday(d) : shortDate(d) })
  }
  return out
}

// Агрегация по неделям — для периодов 30/90 дней
export function weeklyHistory(days) {
  const all = history(days)
  const weeks = []
  for (let i = 0; i < all.length; i += 7) {
    const chunk = all.slice(i, i + 7)
    weeks.push({
      label: chunk[0].label,
      steps: sum(chunk, 'steps'),
      kcal: sum(chunk, 'kcal'),
      waterMl: sum(chunk, 'waterMl'),
      xp: sum(chunk, 'xp'),
    })
  }
  return weeks
}

// Итоги за период с реальным «сегодня»: прошлые дни без записей = 0,
// сегодня — значения из сторов (шаги, еда, вода)
export function blendedTotals(days, today) {
  const t = today || EMPTY
  return {
    steps: (t.steps || 0),
    kcal: (t.kcal || 0),
    waterMl: (t.waterMl || 0),
    xp: (t.xp || 0),
  }
}

// Закономерности для главной: короткие наблюдения, которые мишка
// подмечает в уже собираемых данных (история дней, взвешивания,
// тренировки, цели). Только чтение — новые сторы не нужны.
// Каждый помощник возвращает { emoji, text } или null, если данных мало.

import { dayKeyOf } from '@/store/useHistoryStore'
import { dayStatus } from '@/lib/data/calendar'
import { fmtDecimal } from '@/lib/data/bmi'

// Дни недели в предложениях: «в норме чаще всего по вторникам»
const WD = [
  'по понедельникам', 'по вторникам', 'по средам', 'по четвергам',
  'по пятницам', 'по субботам', 'по воскресеньям',
]

// Склонение: 1 день, 2 дня, 5 дней
function plural(n, one, few, many) {
  const m10 = n % 10
  const m100 = n % 100
  if (m10 === 1 && m100 !== 11) return one
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few
  return many
}

// Динамика веса за последние 30 дней: нужно хотя бы 2 измерения
// в разные дни. Ровный вес тоже наблюдение — пусть радует.
export function weightInsight(weights) {
  const now = Date.now()
  const inWindow = (weights || []).filter(
    (w) => now - new Date(w.date).getTime() <= 30 * 86400000
  )
  const daySet = new Set(inWindow.map((w) => String(w.date).slice(0, 10)))
  if (daySet.size < 2) return null
  const sorted = [...inWindow].sort((a, b) => new Date(a.date) - new Date(b.date))
  const delta = Math.round((sorted[sorted.length - 1].kg - sorted[0].kg) * 10) / 10
  if (delta <= -0.3) return { emoji: '📉', text: `Вес за месяц: −${fmtDecimal(-delta)} кг` }
  if (delta >= 0.3) return { emoji: '📈', text: `Вес за месяц: +${fmtDecimal(delta)} кг` }
  return { emoji: '⚖️', text: 'Вес за месяц держится ровно — устойчивость тоже результат' }
}

// Счёт дней «в норме»/«перебор» по дням недели (статус из календаря)
function weekdayStats(days, goalKcal) {
  const ok = Array(7).fill(0)
  const over = Array(7).fill(0)
  Object.keys(days || {}).forEach((key) => {
    const st = dayStatus(days[key], goalKcal)
    if (!st) return
    const wd = new Date(`${key}T00:00:00`).getDay()
    if (st === 'ok') ok[wd]++
    else over[wd]++
  })
  return { ok, over }
}

// Лучший день недели (не меньше min повторов), иначе null
function topWeekday(arr, min) {
  let best = -1
  arr.forEach((n, wd) => {
    if (n >= min && (best < 0 || n > arr[best])) best = wd
  })
  return best < 0 ? null : { wd: best, n: arr[best] }
}

// Привычка с водой: сначала серия дней подряд (сегодня, если ещё пусто,
// не ломает серию — как в серии календаря), иначе доля за 14 дней
export function waterInsight(days, waterGoalMl) {
  if (!waterGoalMl) return null
  const d = new Date()
  const todayRow = days[dayKeyOf(d)]
  let streak = 0
  for (
    let i = (todayRow?.waterMl || 0) >= waterGoalMl ? 0 : 1;
    i < 60;
    i++
  ) {
    const dd = new Date(d)
    dd.setDate(d.getDate() - i)
    const row = days[dayKeyOf(dd)]
    if ((row?.waterMl || 0) >= waterGoalMl) streak++
    else break
  }
  if (streak >= 3) {
    return { emoji: '💧', text: `Вода в норме ${streak} ${plural(streak, 'день', 'дня', 'дней')} подряд` }
  }
  let norm = 0
  let withData = 0
  for (let i = 0; i < 14; i++) {
    const dd = new Date(d)
    dd.setDate(d.getDate() - i)
    const row = days[dayKeyOf(dd)]
    if (!row || (!row.waterMl && !row.steps && !row.kcal)) continue
    withData++
    if ((row.waterMl || 0) >= waterGoalMl) norm++
  }
  const gen = withData % 10 === 1 && withData % 100 !== 11 ? 'дня' : 'дней'
  if (withData >= 4 && norm > 0) {
    return { emoji: '💧', text: `Вода в норме ${norm} из ${withData} ${gen}` }
  }
  return null
}

// Ритм тренировок: сколько дней с тренировками за последние 7 дней
export function workoutInsight(exLogs) {
  const d = new Date()
  let n = 0
  for (let i = 0; i < 7; i++) {
    const dd = new Date(d)
    dd.setDate(d.getDate() - i)
    if ((exLogs[dayKeyOf(dd)] || []).length > 0) n++
  }
  if (n >= 1) return { emoji: '🏋️', text: `Тренировок за неделю: ${n}` }
  return null
}

// Собирает наблюдения по порядку: вес, лучший день, переборы, вода,
// тренировки. Максимум 4 строки, чтобы карточка оставалась компактной.
export function buildInsights({ days, goals, weights, exLogs }) {
  const list = []
  const weight = weightInsight(weights)
  if (weight) list.push(weight)
  if (goals?.kcal) {
    const { ok, over } = weekdayStats(days, goals.kcal)
    const bestOk = topWeekday(ok, 3)
    if (bestOk) {
      list.push({
        emoji: '✅',
        text: `В норме чаще всего ${WD[bestOk.wd]} — ${bestOk.n} ${plural(bestOk.n, 'день', 'дня', 'дней')}`,
      })
    }
    const bestOver = topWeekday(over, 2)
    if (bestOver && (!bestOk || bestOver.wd !== bestOk.wd)) {
      list.push({
        emoji: '⚠️',
        text: `Переборы чаще ${WD[bestOver.wd]} — ${bestOver.n} ${plural(bestOver.n, 'раз', 'раза', 'раз')}`,
      })
    }
  }
  const water = waterInsight(days, goals?.waterMl)
  if (water) list.push(water)
  const workout = workoutInsight(exLogs || {})
  if (workout) list.push(workout)
  return list.slice(0, 4)
}
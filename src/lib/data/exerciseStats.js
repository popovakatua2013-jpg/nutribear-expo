// Чистые функции витрины «Тренировок» (реддизайн по шаблону Катиной
// картинки-референса): 4 плитки-статистики, кольцо «выполнено за неделю»
// с дельтой к прошлой неделе, «Популярные виды» и «Последние тренировки».
// Всё считается по журналу useExerciseStore (logs) — без новых сторов.
// Функции чистые (now передаётся параметром) — покрываются тестами.

import { dayKeyOf } from '@/store/useHistoryStore'

// Ориентир недели — рекомендации ВОЗ: 150 минут умеренной активности
// в неделю. Кольцо «за неделю» и плитка «Прогресс» — доля от этих минут
export const WHO_WEEK_MIN = 150

// Ключ дня n дней назад от now
function keyAgo(n, now) {
  const d = new Date(now)
  d.setDate(d.getDate() - n)
  return dayKeyOf(d)
}

// Сумма минут тренировок за день
export function dayMinutes(logs, key) {
  return (logs[key] || []).reduce((s, e) => s + (Number(e.minutes) || 0), 0)
}

// Неделя для плиток и кольца: минуты/ккал за последние 7 дней (включая
// сегодня) и те же 7 дней неделей раньше — для дельты «к прошлой неделе»
export function weekStats(logs, now = new Date()) {
  let minutes = 0
  let kcal = 0
  let prevMinutes = 0
  for (let i = 0; i < 7; i++) {
    const k = keyAgo(i, now)
    minutes += dayMinutes(logs, k)
    kcal += (logs[k] || []).reduce((s, e) => s + (Number(e.kcal) || 0), 0)
  }
  for (let i = 7; i < 14; i++) prevMinutes += dayMinutes(logs, keyAgo(i, now))
  const pct = Math.min(100, Math.round((minutes / WHO_WEEK_MIN) * 100))
  const prevPct = Math.min(100, Math.round((prevMinutes / WHO_WEEK_MIN) * 100))
  return { minutes, kcal, pct, prevPct, delta: pct - prevPct }
}

// Стрик тренировок: сколько дней ПОДРЯД была хотя бы одна запись.
// Сегодня без записи серию не рвём — день ещё не закончился (как у
// стрика дневника). Ищем назад максимум 400 дней.
export function workoutStreak(logs, now = new Date()) {
  let n = 0
  for (let i = 0; i < 400; i++) {
    const has = (logs[keyAgo(i, now)] || []).length > 0
    if (has) n += 1
    else if (i > 0) break // сегодня могли ещё не тренироваться — не брейкаем
  }
  return n
}

// Популярные виды за `days` дней: сумма минут по названиям, топ-4.
// Свои тренировки живут рядом с каталогом — считаем по имени записи
export function popularTypes(logs, days = 30, now = new Date()) {
  const acc = new Map()
  for (let i = 0; i < days; i++) {
    for (const e of logs[keyAgo(i, now)] || []) {
      const cur = acc.get(e.name) || { name: e.name, emoji: e.emoji, minutes: 0, kcal: 0 }
      cur.minutes += Number(e.minutes) || 0
      cur.kcal += Number(e.kcal) || 0
      acc.set(e.name, cur)
    }
  }
  return [...acc.values()].sort((a, b) => b.minutes - a.minutes).slice(0, 4)
}

// Последние записи: свежие дни раньше, внутри дня — как в журнале
// (addLog кладёт новые в начало). До `n` штук, осматриваем `days` дней
export function recentWorkouts(logs, days = 14, n = 6, now = new Date()) {
  const out = []
  for (let i = 0; i < days && out.length < n; i++) {
    const list = logs[keyAgo(i, now)] || []
    for (const e of list) {
      out.push({ ...e, daysAgo: i })
      if (out.length >= n) break
    }
  }
  return out.slice(0, n)
}

// Подпись дня для списка «Последние»: Сегодня / Вчера / «27 ноя»
const MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']
export function dayLabel(daysAgo, now = new Date()) {
  if (daysAgo === 0) return 'Сегодня'
  if (daysAgo === 1) return 'Вчера'
  const d = new Date(now)
  d.setDate(d.getDate() - daysAgo)
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`
}

// 45 → «45 мин», 205 → «3,4 ч» — для плитки часов и «Популярных видов»
export function fmtHours(minutes) {
  const m = Math.round(Number(minutes) || 0)
  if (m < 60) return `${m} мин`
  const h = Math.round((m / 60) * 10) / 10
  return `${String(h).replace('.', ',')} ч`
}

// Ряд для графика «Динамика»: сожжённые ккал по дням, старые раньше.
// Подписи X: для недели — день недели (Пн…), для 30/90 — «число+месяц»
const WEEKDAYS_SHORT = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
export function dynamicsSeries(logs, days, now = new Date()) {
  const out = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const k = dayKeyOf(d)
    const value = (logs[k] || []).reduce((s, e) => s + (Number(e.kcal) || 0), 0)
    out.push({
      label:
        days <= 7
          ? WEEKDAYS_SHORT[d.getDay()]
          : `${d.getDate()}.${String(d.getMonth() + 1).padStart(2, '0')}`,
      value,
    })
  }
  return out
}

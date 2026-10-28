// Помощники календаря-статистики: ключи дат, статус дня (норма ккал),
// маркеры привычек и серии дней подряд. Все данные уже собираются
// useHistoryStore / useProfileStore / useExerciseStore / useFoodStore —
// здесь только чтение, новые сторы не нужны.

import { dayKeyOf, EMPTY_DAY } from '@/store/useHistoryStore'

// Ключ дня 'ГГГГ-ММ-ДД' из клетки календаря
export function cellKey(y, m, day) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

// Показатели дня: история + «живое сегодня» поверх (если это сегодня)
export function dayData(history, key, todayLive) {
  const row = { ...EMPTY_DAY, ...(history[key] || {}) }
  if (todayLive && key === dayKeyOf()) {
    Object.keys(todayLive).forEach((f) => {
      if (todayLive[f] != null) row[f] = todayLive[f]
    })
  }
  return row
}

// Статус дня по калориям: 'ok' | 'over' | null
// ok — в пределах 50–110% цели, over — больше 110%, null — нет данных
export function dayStatus(d, goalKcal) {
  if (!d || (!d.kcal && !d.steps && !d.waterMl)) return null
  const target = Math.round(goalKcal || 0)
  if (!target) return null
  if (d.kcal > target * 1.1) return 'over'
  if (d.kcal >= target * 0.5) return 'ok'
  return null
}

// Маркеры привычек дня: 💧 норма воды, 🏋️ тренировка, ⚖️ взвешивание
export function dayMarkers(d, { weights = [], exLogs = {}, key, waterGoalMl = 2000 }) {
  return {
    water: (d.waterMl || 0) >= waterGoalMl,
    workout: (exLogs[key] || []).length > 0,
    weight: weights.some((w) => String(w.date || '').slice(0, 10) === key),
  }
}

// Был ли день «активным» (что-то записано в дневник/историю)
function isActive(d, foodHistory, key) {
  const hasFood = (foodHistory || []).some((h) => h.day === key)
  return hasFood || d.kcal > 0 || d.steps > 0 || d.waterMl > 0 || d.burned > 0
}

// Текущая серия дней подряд. Если сегодня ещё пусто — считаем со вчерашнего
// дня, чтобы серия не «мигала» утром (сегодня ещё впереди)
export function calcStreak(history, foodHistory, todayLive) {
  const active = (key) => isActive(dayData(history, key, todayLive), foodHistory, key)
  const d = new Date()
  let n = 0
  for (let i = active(dayKeyOf(d)) ? 0 : 1; i < 400; i++) {
    const dd = new Date(d)
    dd.setDate(d.getDate() - i)
    if (active(dayKeyOf(dd))) n++
    else break
  }
  return n
}

// Рекорд серии за всю доступную историю (~150 дней) — по соседним датам
export function bestStreak(history, foodHistory) {
  const keys = Object.keys(history).sort()
  if (!keys.length) return 0
  let best = 0
  let run = 0
  let prev = null
  keys.forEach((key) => {
    const d = new Date(`${key}T00:00:00`)
    const cont = prev && d - prev === 86400000
    run = cont && isActive({ ...history[key] }, foodHistory, key) ? run + 1 : isActive({ ...history[key] }, foodHistory, key) ? 1 : 0
    if (run > best) best = run
    prev = d
  })
  return best
}

// Самая ранняя дата с хоть какими-то данными — старт ведения дневника.
// Дни до неё в календаре бледные и не тапаются: пользователь их ещё не «вёл».
// Смотрим все источники: историю дней, записи еды, взвешивания, тренировки.
export function firstActiveKey(history, foodHistory, weights, exLogs) {
  const candidates = []
  const hist = Object.keys(history || {})
  if (hist.length) candidates.push(hist.sort()[0])
  const food = (foodHistory || []).map((h) => h.day).filter(Boolean).sort()
  if (food.length) candidates.push(food[0])
  const weigh = (weights || [])
    .map((w) => String(w.date || '').slice(0, 10))
    .filter(Boolean)
    .sort()
  if (weigh.length) candidates.push(weigh[0])
  const ex = Object.keys(exLogs || {}).sort()
  if (ex.length) candidates.push(ex[0])
  if (!candidates.length) return null
  return candidates.sort()[0]
}

// Сводка за месяц для шапки календаря: сколько дней в норме ккал, переборов,
// тренировок и взвешиваний. view = { y, m } отображаемого месяца.
export function monthSummary(history, { y, m }, goals, weights, exLogs) {
  const daysInMonth = new Date(y, m + 1, 0).getDate()
  let ok = 0
  let over = 0
  let workouts = 0
  for (let day = 1; day <= daysInMonth; day++) {
    const key = cellKey(y, m, day)
    const d = dayData(history, key, null)
    const status = dayStatus(d, goals.kcal)
    if (status === 'ok') ok++
    if (status === 'over') over++
    if ((exLogs[key] || []).length > 0) workouts++
  }
  const prefix = `${y}-${String(m + 1).padStart(2, '0')}`
  const weighings = (weights || []).filter((w) => String(w.date || '').startsWith(prefix)).length
  return { ok, over, workouts, weighings }
}
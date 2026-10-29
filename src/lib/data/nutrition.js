// Рейтинг качества питания: клетчатка, сахар и баланс нутриентов
// (белки/жиры/углеводы в % от калорий). Оценки — за день (по записям
// дневника) и за месяц (по журналу приёмов useFoodStore.history).
// Нормы: клетчатка 25 г/день (ВОЗ), сахар — в идеале до 25 г (5% ккал),
// до 50 г допустимо (10% ккал, ВОЗ); БЖУ — классические диапазоны МЗ РФ:
// белки 15–30%, жиры 20–35%, углеводы 45–65% калорий.

// Нормы дня
export const FIBER_NORM = 25 // г клетчатки в день
export const SUGAR_IDEAL = 25 // г сахара в день (≈5% ккал)
export const SUGAR_LIMIT = 50 // г сахара в день (≈10% ккал — порог ВОЗ)

// Сумма нутриентов по списку записей (fib/sug могут отсутствовать
// в старых записях и своих блюдах — считаем их нулями)
export function sumNutrition(rows) {
  return rows.reduce(
    (a, e) => ({
      kcal: a.kcal + (e.kcal || 0),
      p: a.p + (e.p || 0),
      f: a.f + (e.f || 0),
      c: a.c + (e.c || 0),
      fib: a.fib + (e.fib || 0),
      sug: a.sug + (e.sug || 0),
    }),
    { kcal: 0, p: 0, f: 0, c: 0, fib: 0, sug: 0 }
  )
}

// Доля макронутриента в калориях: белки/углеводы 4 ккал/г, жиры 9 ккал/г.
// Делим на сумму калорий всех трёх — проценты всегда дают ровно 100%
export function macroShares(n) {
  const pk = n.p * 4
  const fk = n.f * 9
  const ck = n.c * 4
  const total = pk + fk + ck
  if (total <= 0) return { pPct: 0, fPct: 0, cPct: 0 }
  return {
    pPct: Math.round((pk / total) * 100),
    fPct: Math.round((fk / total) * 100),
    cPct: Math.round((ck / total) * 100),
  }
}

// Трапецеидальная оценка: 0 вне диапазона, 100 внутри «идеала»,
// линейный рост/спад между границами
function band(v, empty, idealFrom, idealTo, over) {
  if (v <= 0) return empty
  if (v >= idealFrom && v <= idealTo) return 100
  if (v < idealFrom) return Math.round(((v - empty) / (idealFrom - empty)) * 100)
  return Math.max(0, Math.round(((over - v) / (over - idealTo)) * 100))
}

// Оценка одного показателя 0–100 по клетчатке и сахару
function fiberScore(grams) {
  return Math.min(100, Math.round((grams / FIBER_NORM) * 100))
}

function sugarScore(grams) {
  if (grams <= SUGAR_IDEAL) return 100
  if (grams <= SUGAR_LIMIT) return Math.round(100 - ((grams - SUGAR_IDEAL) / (SUGAR_LIMIT - SUGAR_IDEAL)) * 20)
  return Math.max(0, Math.round(80 - ((grams - SUGAR_LIMIT) / SUGAR_LIMIT) * 80))
}

// Итог: оценки по каждому показателю + общий балл 0–100
export function nutritionRating(n) {
  const { pPct, fPct, cPct } = macroShares(n)
  const parts = {
    fiber: { value: n.fib, score: fiberScore(n.fib) },
    sugar: { value: n.sug, score: n.kcal > 0 || n.sug > 0 ? sugarScore(n.sug) : 0 },
    protein: { value: pPct, score: band(pPct, 0, 15, 30, 40) },
    fat: { value: fPct, score: band(fPct, 0, 20, 35, 45) },
    carbs: { value: cPct, score: band(cPct, 0, 45, 65, 80) },
  }
  // Вес: клетчатка и сахар — главное, баланс БЖУ — остальное
  const overall = Math.round(
    parts.fiber.score * 0.3 +
      parts.sugar.score * 0.25 +
      parts.protein.score * 0.15 +
      parts.fat.score * 0.15 +
      parts.carbs.score * 0.15
  )
  return { ...parts, overall }
}

// Словесная оценка и эмодзи по баллу
export function ratingLabel(score) {
  if (score >= 80) return { label: 'Отлично', emoji: '🥇' }
  if (score >= 60) return { label: 'Хорошо', emoji: '👍' }
  if (score >= 40) return { label: 'Средне', emoji: '🤔' }
  return { label: 'Слабо', emoji: '🐻' }
}

// Записи журнала за текущий месяц (day = 'ГГГГ-ММ-ДД')
export function monthRows(history, now = new Date()) {
  const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  return (history || []).filter((h) => typeof h.day === 'string' && h.day.startsWith(prefix))
}

// Число дней с записями в наборе строк журнала
export function daysCount(rows) {
  return new Set(rows.map((r) => r.day).filter(Boolean)).size
}

// Средние нутриенты за месяц: суммы по записям → в среднем за день с едой
export function monthNutrition(rows) {
  const sum = sumNutrition(rows)
  const days = daysCount(rows)
  if (days === 0) return { ...sum, days: 0 }
  const avg = (v) => Math.round((v / days) * 10) / 10
  return {
    kcal: Math.round(sum.kcal / days),
    p: avg(sum.p),
    f: avg(sum.f),
    c: avg(sum.c),
    fib: avg(sum.fib),
    sug: avg(sum.sug),
    days,
  }
}

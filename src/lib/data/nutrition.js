// Рейтинг качества питания: клетчатка, сахар, баланс нутриентов
// (белки/жиры/углеводы в % от калорий) и витамины/минералы.
// Оценки — за день (по записям дневника) и за месяц (по журналу
// приёмов useFoodStore.history со средними за день с записями).
//
// Нормы: клетчатка 25 г/день (ВОЗ), сахар — в идеале до 25 г (5% ккал),
// до 50 г допустимо (10% ккал, ВОЗ); БЖУ — классические диапазоны МЗ РФ:
// белки 15–30%, жиры 20–35%, углеводы 45–65% калорий.
// Микронутриенты (усреднённые взрослые нормы): железо 14 мг, кальций
// 1000 мг, калий 3500 мг, магний 400 мг, витамин C 90 мг, витамин A 900 мкг.
//
// Общий балл: макро-часть (клетчатка 0.25, сахар 0.2, Б/Ж/У по 0.1) +
// микро-часть (среднее по 6 показателям × 0.25), микро-часть учитывается
// пропорционально полноте данных (маркер mk — у записей из базы продуктов).
// Если еды есть, а клетчатки ноль — общий балл не поднимается выше
// «Средне» (59): рацион без клетчатки не может считаться хорошим.

// Нормы дня
export const FIBER_NORM = 25 // г клетчатки в день
export const SUGAR_IDEAL = 25 // г сахара в день (≈5% ккал)
export const SUGAR_LIMIT = 50 // г сахара в день (≈10% ккал — порог ВОЗ)

// Нормы витаминов и минералов в день
export const MICRO_NORMS = {
  fe: 14, // мг железа
  ca: 1000, // мг кальция
  k: 3500, // мг калия
  mg: 400, // мг магния
  vitc: 90, // мг витамина C
  vita: 900, // мкг витамина A (рет.экв.)
}

const MICRO_KEYS = ['fe', 'ca', 'k', 'mg', 'vitc', 'vita']

const ZERO = { kcal: 0, p: 0, f: 0, c: 0, fib: 0, sug: 0, fe: 0, ca: 0, k: 0, mg: 0, vitc: 0, vita: 0, rows: 0, mk: 0 }

// Сумма нутриентов по списку записей. fib/sug/микро могут отсутствовать
// в старых записях и своих блюдах — считаем их нулями; rows — число
// записей, mk — сколько из них с известными витаминами (для полноты данных)
export function sumNutrition(rows) {
  return rows.reduce(
    (a, e) => ({
      kcal: a.kcal + (e.kcal || 0),
      p: a.p + (e.p || 0),
      f: a.f + (e.f || 0),
      c: a.c + (e.c || 0),
      fib: a.fib + (e.fib || 0),
      sug: a.sug + (e.sug || 0),
      fe: a.fe + (e.fe || 0),
      ca: a.ca + (e.ca || 0),
      k: a.k + (e.k || 0),
      mg: a.mg + (e.mg || 0),
      vitc: a.vitc + (e.vitc || 0),
      vita: a.vita + (e.vita || 0),
      rows: a.rows + 1,
      mk: a.mk + (e.mk ? 1 : 0),
    }),
    { ...ZERO }
  )
}

// Доля макронутриента в калориях: белки/углеводы 4 ккал/г, жиры 9 ккал/г.
// Делим на сумму калорий всех трёх — проценты согласованы между собой
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

// Оценка «чем больше, тем лучше»: линейно от 0 до 100% нормы (cap 100)
function enoughScore(amount, norm) {
  if (amount <= 0) return 0
  return Math.min(100, Math.round((amount / norm) * 100))
}

function fiberScore(grams) {
  return enoughScore(grams, FIBER_NORM)
}

function sugarScore(grams) {
  if (grams <= SUGAR_IDEAL) return 100
  if (grams <= SUGAR_LIMIT) return Math.round(100 - ((grams - SUGAR_IDEAL) / (SUGAR_LIMIT - SUGAR_IDEAL)) * 20)
  return Math.max(0, Math.round(80 - ((grams - SUGAR_LIMIT) / SUGAR_LIMIT) * 80))
}

// Итог: оценки по каждому показателю + общий балл 0–100.
// Микро-часть входит в общий балл с весом, пропорциональным полноте
// данных (mk/rows): дни из чистой базы — 100%, ИИ/старые записи — 0%
export function nutritionRating(n) {
  const { pPct, fPct, cPct } = macroShares(n)
  const micro = {
    fe: { value: n.fe, score: enoughScore(n.fe, MICRO_NORMS.fe) },
    ca: { value: n.ca, score: enoughScore(n.ca, MICRO_NORMS.ca) },
    k: { value: n.k, score: enoughScore(n.k, MICRO_NORMS.k) },
    mg: { value: n.mg, score: enoughScore(n.mg, MICRO_NORMS.mg) },
    vitc: { value: n.vitc, score: enoughScore(n.vitc, MICRO_NORMS.vitc) },
    vita: { value: n.vita, score: enoughScore(n.vita, MICRO_NORMS.vita) },
  }
  const microAvg = Math.round(
    MICRO_KEYS.reduce((s, key) => s + micro[key].score, 0) / MICRO_KEYS.length
  )
  const parts = {
    fiber: { value: n.fib, score: fiberScore(n.fib) },
    sugar: { value: n.sug, score: n.kcal > 0 || n.sug > 0 ? sugarScore(n.sug) : 0 },
    protein: { value: pPct, score: band(pPct, 0, 15, 30, 40) },
    fat: { value: fPct, score: band(fPct, 0, 20, 35, 45) },
    carbs: { value: cPct, score: band(cPct, 0, 45, 65, 80) },
    micro,
    microAvg,
  }
  // Полнота данных о витаминах: доля записей с маркером mk
  const microShare = n.rows > 0 ? Math.max(0, Math.min(1, n.mk / n.rows)) : 0
  // Вес: клетчатка и сахар — главное, баланс БЖУ — остальное,
  // витамины/минералы — добавка по полноте данных
  const macroW =
    parts.fiber.score * 0.25 +
    parts.sugar.score * 0.2 +
    parts.protein.score * 0.1 +
    parts.fat.score * 0.1 +
    parts.carbs.score * 0.1
  const microW = microAvg * 0.25 * microShare
  let overall = Math.round((macroW + microW) / (0.75 + 0.25 * microShare))
  // Еда есть, а клетчатки ноль — рацион не может считаться хорошим
  // (раньше из-за этого «Хорошо 👍» показывалось при пустой клетчатке)
  if (n.kcal > 0 && n.fib <= 0) overall = Math.min(overall, 59)
  parts.microShare = microShare
  parts.overall = overall
  return parts
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
    fe: avg(sum.fe),
    ca: avg(sum.ca),
    k: avg(sum.k),
    mg: avg(sum.mg),
    vitc: avg(sum.vitc),
    vita: avg(sum.vita),
    rows: sum.rows,
    mk: sum.mk,
    days,
  }
}

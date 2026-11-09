// Прогноз цели по весу — карточка «Прогресс» на вкладке «План»
// (просьба Кати 10.11: «при твоём текущем дефиците −0,5 кг/нед,
// к цели по весу придёшь ~20 декабря. Считается по дневнику»).
//
// Как считается: среднее съеденное за последние 2 недели (только дни
// с записями дневника) против нормы калорий → дефицит ккал/день →
// темп кг/нед (7700 ккал ≈ 1 кг жира) → дата, когда вес дойдёт до цели.
// Работает в обе стороны: дефицит — к цели ниже, профицит — к цели выше.
//
// Никаких выдуманных чисел: если данных мало (меньше 3 дней с записями),
// цель по весу не поставлена, вес уже у цели или рацион уводит от цели —
// честный отказ с причиной reason, UI покажет подсказку вместо даты.

const KCAL_PER_KG = 7700 // энергетический эквивалент 1 кг жира, ккал
const MIN_DAYS = 3 // минимум дней с записями за окно, иначе прогноза нет
const MIN_RATE = 0.05 // кг/нед — медленнее уже не прогноз (годы и шум)
const WINDOW_DAYS = 14 // окно расчёта дефицита, дней

const pad = (n) => String(n).padStart(2, '0')

// Локальный ключ дня 'YYYY-MM-DD' — как в журнале дневника (useHistoryStore)
const dayKeyOf = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

const round1 = (x) => Math.round(x * 10) / 10

/**
 * Прогноз даты достижения цели по весу.
 * @param {Array}  history       журнал дневника [{ day: 'YYYY-MM-DD', kcal, ... }]
 * @param {number} kcalGoal      норма калорий в день (цель из «Ещё → Цели»)
 * @param {number} weightKg      текущий вес (профиль)
 * @param {number|null} goalWeightKg  цель по весу (null — не поставлена)
 * @param {Date}   now           «сегодня» (для тестов можно подменить)
 * @param {number} windowDays    окно расчёта, дней (по умолчанию 14)
 * @returns {{
 *   ok: boolean, reason: 'ok'|'need-data'|'no-goal'|'reached'|'wrong-dir'|'too-slow',
 *   deficitKcal: number,      // ккал/день: >0 дефицит, <0 профицит (0 при no-goal)
 *   rateKgWeek: number,       // темп кг/нед, точность 0,1
 *   loggedDays: number,       // дней с записями в окне
 *   needDays?: number,        // для need-data: сколько дней ещё заполнить
 *   daysLeft?: number,        // для ok: дней до цели
 *   date?: Date,              // для ok: дата цели
 * }}
 */
export function goalForecast({
  history = [],
  kcalGoal = 0,
  weightKg = null,
  goalWeightKg = null,
  now = new Date(),
  windowDays = WINDOW_DAYS,
}) {
  // Калории по ключам дня из журнала
  const perDay = new Map()
  for (const h of Array.isArray(history) ? history : []) {
    if (!h?.day) continue
    perDay.set(h.day, (perDay.get(h.day) || 0) + (Number(h.kcal) || 0))
  }

  // Окно последних windowDays дней (включая сегодня) — ключами-строками,
  // без разбора дат: дневник ведёт локальные ключи, сравнение честное
  const keys = new Set()
  for (let i = 0; i < windowDays; i++) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    keys.add(dayKeyOf(d))
  }

  let loggedDays = 0
  let totalKcal = 0
  for (const k of keys) {
    const v = perDay.get(k) || 0
    if (v > 0) {
      loggedDays += 1
      totalKcal += v
    }
  }

  // Данных мало — прогноз строить не на чем
  if (!kcalGoal || kcalGoal <= 0 || loggedDays < MIN_DAYS) {
    return {
      ok: false,
      reason: 'need-data',
      deficitKcal: 0,
      rateKgWeek: 0,
      loggedDays,
      needDays: Math.max(0, MIN_DAYS - loggedDays),
    }
  }

  const deficit = kcalGoal - totalKcal / loggedDays // ккал/день
  const rate = (deficit * 7) / KCAL_PER_KG // кг/нед: >0 — похудение

  const base = {
    deficitKcal: Math.round(deficit),
    rateKgWeek: round1(rate),
    loggedDays,
  }

  // Цель по весу не поставлена — прогнозировать не к чему
  if (goalWeightKg == null || weightKg == null) {
    return { ok: false, reason: 'no-goal', ...base }
  }

  const delta = goalWeightKg - weightKg // кг: <0 — надо сбросить, >0 — набрать

  // Вес уже у цели (±50 г)
  if (Math.abs(delta) < 0.05) {
    return { ok: false, reason: 'reached', ...base }
  }

  // Темп почти нулевой — дата будет гулять на месяцы от каждой записи
  if (Math.abs(rate) < MIN_RATE) {
    return { ok: false, reason: 'too-slow', ...base }
  }

  // Рацион уводит от цели: дефицит при цели набора или профицит при сбросе
  const sameDir = (delta < 0 && rate > 0) || (delta > 0 && rate < 0)
  if (!sameDir) {
    return { ok: false, reason: 'wrong-dir', ...base }
  }

  const daysLeft = Math.round((Math.abs(delta) / Math.abs(rate)) * 7)
  const date = new Date(now)
  date.setDate(date.getDate() + daysLeft)

  return { ok: true, reason: 'ok', ...base, daysLeft, date }
}

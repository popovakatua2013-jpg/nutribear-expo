// Замены блюд в меню недели (просьба Кати 10.11: «тап по блюду в меню:
// „заменить на похожее по ккал", приложение предлагает 2–3 варианта
// из базы»). Чистая логика без RN — ищем в базе продуктов блюда с близкой
// калорийностью на 100 г и подгоняем граммовку замены под те же ккал
// порции, что у текущего блюда (сумма ккал приёма не уезжает).

import { FOODS } from './foods'

const norm = (s) => String(s || '').toLowerCase().replace(/ё/g, 'е')

const clampGrams = (g) => Math.max(10, Math.min(2000, Math.round(g) || 10))

/**
 * 2–3 похожих продукта из базы по калорийности на 100 г.
 * @param {{ name?: string, kcal100?: number, kcal?: number }} item блюдо плана
 * @param {Array}  pool  база продуктов (по умолчанию FOODS)
 * @param {number} count сколько предложить (по умолчанию 3)
 * @returns {Array} продукты базы [{ id, name, emoji, kcal, p, f, c, ... }]
 */
export function swapCandidates(item, pool = FOODS, count = 3) {
  const kcal100 = Number(item?.kcal100 ?? item?.kcal) || 0
  if (!(kcal100 > 0)) return []
  const self = norm(item?.name)
  const others = pool.filter((f) => f && f.kcal > 0 && norm(f.name) !== self)
  if (!others.length) return []

  const scored = others
    .map((f) => ({ f, diff: Math.abs(f.kcal - kcal100) / kcal100 }))
    .sort((a, b) => a.diff - b.diff)

  // Сначала — близкие по калорийности (±50 %); если их меньше двух,
  // расширяем поиск (±75 %), в крайнем случае — ближайшие по списку
  let picked = scored.filter((x) => x.diff <= 0.5).slice(0, count)
  if (picked.length < 2) picked = scored.filter((x) => x.diff <= 0.75).slice(0, count)
  if (picked.length < 2) picked = scored.slice(0, count)

  return picked.map((x) => x.f)
}

/**
 * Граммовка замены под те же ккал порции: ккал/100 г × граммы = ккал
 * текущего блюда. Границы как у порций в приложении — 10…2000 г.
 */
export function gramsForSameKcal(kcal100, kcalPortion) {
  if (!(kcal100 > 0) || !(kcalPortion > 0)) return 100
  return clampGrams((kcalPortion / kcal100) * 100)
}

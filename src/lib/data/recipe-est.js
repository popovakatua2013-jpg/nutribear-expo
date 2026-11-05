// Чистая математика автозаполнения рецепта по составу продуктов.
// food-ai.js умеет разбирать текст состава («свинина 300 грамм, картошка
// 500 грамм») и отдаёт КБЖУ на 100 г сырья + общий вес ингредиентов.
// Здесь — пересчёт «на 100 г» в «на весь выход» (как поля формы рецепта)
// и строка распознанных ингредиентов для тоста. Без нативных модулей —
// тестируется в Node.

// Оценка состава (est) → КБЖУ на весь вес ингредиентов.
// Возвращает null, если вес или калории не раскрылись — формула
// не должна подставлять «нулевые» цифры в форму.
export function toRecipeTotals(est) {
  if (!est || typeof est !== 'object') return null
  const weight = Math.round(Number(est.weight) || 0)
  if (weight < 10) return null
  const kcal = Math.round(((Number(est.kcal100) || 0) * weight) / 100)
  if (kcal <= 0) return null
  // БЖУ считаем от веса сырья и округляем до целого грамма —
  // в форме рецепта поля на весь выход, доли грамма там шум
  const conv = (v) => Math.round(((Number(v) || 0) * weight) / 100)
  return { weight, kcal, p: conv(est.p), f: conv(est.f), c: conv(est.c) }
}

// Распознанные ингредиенты → компактная строка для тоста:
// «свинина 300 г · картошка 500 г · ещё 2». Пустой состав → ''
export function recipeItemsLine(items, max = 3) {
  if (!Array.isArray(items) || !items.length) return ''
  const shown = items.slice(0, Math.max(1, max))
  const parts = shown.map((it) => `${it.name} ${it.grams} г`)
  const rest = items.length - shown.length
  return parts.join(' · ') + (rest > 0 ? ` · ещё ${rest}` : '')
}

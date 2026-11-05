// Автозаполнение рецепта по составу продуктов: пересчёт оценки
// состава (КБЖУ на 100 г сырья) в «на весь выход» и строка
// распознанных ингредиентов для тоста. Чистая математика — Node.

import { toRecipeTotals, recipeItemsLine } from '@/lib/data/recipe-est'

describe('toRecipeTotals', () => {
  // «Борщ»: 49 ккал/100 г, вес сырья 800 г → всего 392 ккал
  const est = { kcal100: 49, p: 2.6, f: 2.9, c: 5.5, weight: 800 }

  test('пересчитывает КБЖУ на весь вес', () => {
    expect(toRecipeTotals(est)).toEqual({ weight: 800, kcal: 392, p: 21, f: 23, c: 44 })
  })

  test('дробный вес округляется до целого грамма', () => {
    expect(toRecipeTotals({ ...est, weight: 799.6 }).weight).toBe(800)
  })

  test('null на битых входах', () => {
    expect(toRecipeTotals(null)).toBeNull()
    expect(toRecipeTotals(undefined)).toBeNull()
    expect(toRecipeTotals('борщ')).toBeNull()
    expect(toRecipeTotals({})).toBeNull()
  })

  test('null, если вес меньше 10 г — нули в форму не подставляем', () => {
    expect(toRecipeTotals({ ...est, weight: 5 })).toBeNull()
    expect(toRecipeTotals({ ...est, weight: 0 })).toBeNull()
  })

  test('null, если калорий не раскрылось', () => {
    expect(toRecipeTotals({ weight: 500, kcal100: 0 })).toBeNull()
    expect(toRecipeTotals({ weight: 500 })).toBeNull()
  })

  test('БЖУ без значения считаются нулями, а не NaN', () => {
    const r = toRecipeTotals({ kcal100: 100, weight: 200 })
    expect(r.kcal).toBe(200)
    expect(r.p).toBe(0)
    expect(r.f).toBe(0)
    expect(r.c).toBe(0)
  })
})

describe('recipeItemsLine', () => {
  const items = [
    { name: 'свинина', grams: 300 },
    { name: 'картошка', grams: 500 },
    { name: 'лук', grams: 50 },
    { name: 'соль', grams: 5 },
  ]

  test('первые три + счётчик остальных', () => {
    expect(recipeItemsLine(items)).toBe('свинина 300 г · картошка 500 г · лук 50 г · ещё 1')
  })

  test('ровно максимум — без счётчика', () => {
    expect(recipeItemsLine(items, 4)).toBe('свинина 300 г · картошка 500 г · лук 50 г · соль 5 г')
  })

  test('один ингредиент', () => {
    expect(recipeItemsLine([{ name: 'борщ', grams: 300 }])).toBe('борщ 300 г')
  })

  test('пустой/битый состав — пустая строка', () => {
    expect(recipeItemsLine([])).toBe('')
    expect(recipeItemsLine(null)).toBe('')
    expect(recipeItemsLine(undefined)).toBe('')
  })
})

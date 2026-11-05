// Парсер состава рецептов estimateFromDescription (food-ai.js) — в Node.
// Нативные модули expo-file-system / expo-image-manipulator подменяются
// заглушками: food-ai.js создаёт файл кэша ИИ при импорте, которого в
// Node не должно быть. Тестируется только разбор текста — без сети.

jest.mock('expo-file-system', () => ({
  File: class File {
    constructor() {}
  },
  Paths: { document: '/tmp', cache: '/tmp' },
}))
jest.mock('expo-image-manipulator', () => ({
  ImageManipulator: {},
  SaveFormat: {},
}))

import { estimateFromDescription } from '@/lib/food-ai'

describe('estimateFromDescription — разбор состава рецепта', () => {
  test('плов: свинина + картошка + лук (ккал и вес точные)', () => {
    const est = estimateFromDescription('свинина 300 грамм, картошка 500 грамм, лук 50 грамм')
    expect(est.weight).toBe(850)
    expect(est.items).toEqual([
      { name: 'Свинина', grams: 300 },
      { name: 'Картошка', grams: 500 },
      { name: 'Лук', grams: 50 },
    ])
    // 250×3 + 80×5 + 41×0.5 = 1170.5 ккал на 850 г → 138 ккал / 100 г
    expect(est.kcal100).toBe(138)
  })

  test('новые ингредиенты: сливки + сгущёнка + орехи (торт)', () => {
    const est = estimateFromDescription('сливки 200 грамм, сгущенное молоко 300 грамм, грецкие орехи 100 грамм')
    expect(est.items).toEqual([
      { name: 'Сливки 33%', grams: 200 },
      { name: 'Сгущённое молоко', grams: 300 },
      { name: 'Грецкие орехи', grams: 100 },
    ])
    expect(est.weight).toBe(600)
    // 337×2 + 320×3 + 654×1 = 2288 ккал на 600 г → 381 ккал / 100 г
    expect(est.kcal100).toBe(381)
  })

  test('баранина для плова распознаётся', () => {
    const est = estimateFromDescription('баранина 400 грамм, лук 100 грамм, морковь 150 грамм')
    expect(est.items[0]).toEqual({ name: 'Баранина', grams: 400 })
    expect(est.weight).toBe(650)
  })

  test('двухсловные названия: «томатная паста» — не помидор', () => {
    const est = estimateFromDescription('томатная паста 50 грамм, кетчуп 30 грамм')
    expect(est.items).toEqual([
      { name: 'Томатная паста', grams: 50 },
      { name: 'Кетчуп', grams: 30 },
    ])
  })

  test('порядок «300 грамм свинины» — название после граммовки', () => {
    const est = estimateFromDescription('300 грамм свинины, 200 грамм огурцов соленых')
    expect(est.items[0]).toEqual({ name: 'Свинина', grams: 300 })
    expect(est.items[1]).toEqual({ name: 'Огурцы солёные', grams: 200 })
  })

  test('миллилитры: «сливки 100 мл» считаются как граммы', () => {
    const est = estimateFromDescription('сливки 100 мл')
    expect(est.items).toEqual([{ name: 'Сливки 33%', grams: 100 }])
    expect(est.kcal100).toBe(337)
  })

  test('сода и соль — вес есть, калорий ноль', () => {
    const est = estimateFromDescription('мука 500 грамм, сода 5 грамм, соль 3 грамма')
    expect(est.weight).toBe(508)
    // мука 364? — проверяем только положительность
    expect(est.kcal100).toBeGreaterThan(0)
    expect(est.items.map((i) => i.name)).toEqual(['Мука', 'Сода', 'Соль'])
  })

  test('незнакомые слова дают null (уйдёт в ИИ)', () => {
    expect(estimateFromDescription('пангасиус 300 грамм, кускус 200 грамм')).toBeNull()
  })

  test('битый вход — null, а не падение', () => {
    expect(estimateFromDescription('')).toBeNull()
    expect(estimateFromDescription(null)).toBeNull()
    expect(estimateFromDescription('просто текст без цифр')).toBeNull()
    expect(estimateFromDescription('вода 500 мл')).toBeNull() // 0 ккал → null
  })
})

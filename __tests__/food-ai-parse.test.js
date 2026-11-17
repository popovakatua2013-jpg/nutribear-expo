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

import { estimateFromDescription, scanFoodImage, recognizeVoiceText, estimateItemKcal } from '@/lib/food-ai'

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

// Регрессия 16.11 (скрин Кати 01:52): на части Samsung новый API
// манипулятора снимков падает молча — на воркер уходит исходный
// снимок на десятки мегабайт, лимит тела отвечает 413 и интерфейс
// показывает «Снимок слишком большой». Оба пути сжатия под заглушками
// здесь падают → scanFoodImage ОБЯЗАН выбросить понятную ошибку ДО
// сети, а не отправлять огромное тело
describe('сжатие фото: сбой манипулятора — понятная ошибка до сети', () => {
  test('scanFoodImage не уходит в сеть, если снимок не подготовился', async () => {
    await expect(scanFoodImage('file:///photo.jpg')).rejects.toThrow(
      'Снимок не удалось подготовить'
    )
  })
})

// Отзыв Кати 17.11: голос распознал «яйцо 2 штуки, грудка 100 грамм,
// кофе с молоком и сахаром, большая кружка», а в списке появился ТОЛЬКО
// кофе (парсер брал одно блюдо на всю фразу и вешал на него чужой вес).
// Локальный разбор обязан отдавать ВСЕ продукты через запятую, каждый
// со своим весом: штуки → граммы по весу штуки, посуда → объём
describe('голосовой разбор фразы: все продукты, свой вес у каждого', () => {
  test('фраза Кати: яйцо 2 шт + грудка 100 г + кофе большая кружка', async () => {
    const res = await recognizeVoiceText(
      'яйцо отварное 2 штуки, грудка куриная отварная 100 грамм, кофе с молоком и сахаром, большая кружка'
    )
    expect(res.items.map((i) => i.name)).toEqual([
      'Яйцо варёное',
      'Куриная грудка отварная',
      'Кофе с молоком и сахаром',
    ])
    // 2 яйца × 55 г; явные 100 г; «большая кружка» из отдельного сегмента
    // переносится в кофе: 250 × 1.4 = 350
    expect(res.items.map((i) => i.grams)).toEqual([110, 100, 350])
  })

  test('итоговый калораж по каждому продукту и сумма по фразе', async () => {
    const res = await recognizeVoiceText(
      'яйцо отварное 2 штуки, грудка куриная отварная 100 грамм, кофе с молоком и сахаром, большая кружка'
    )
    const kcal = res.items.map(estimateItemKcal)
    // яйцо 157 × 110/100 = 173; грудка 137 × 1 = 137; кофе 50 × 350/100 = 175
    expect(kcal).toEqual([173, 137, 175])
    expect(kcal.reduce((s, k) => s + k, 0)).toBe(485)
  })

  test('одна позиция: «тарелка овсянки 250 граммов» — как раньше', async () => {
    const res = await recognizeVoiceText('тарелка овсянки 250 граммов')
    expect(res.items).toHaveLength(1)
    expect(res.items[0].name).toBe('Овсянка на воде')
    expect(res.items[0].grams).toBe(250)
    expect(estimateItemKcal(res.items[0])).toBe(220) // 88 × 250/100
  })

  test('штуки без посуды и граммов — по весу штуки', async () => {
    const res = await recognizeVoiceText('сырники 3 штуки')
    expect(res.items).toHaveLength(1)
    expect(res.items[0].grams).toBe(180) // 3 × 60
  })

  test('estimateItemKcal: без веса или без калорий — null', () => {
    expect(estimateItemKcal({ kcal100: 50 })).toBeNull()
    expect(estimateItemKcal({ kcal100: 0, grams: 200 })).toBeNull()
    expect(estimateItemKcal(null)).toBeNull()
  })
})

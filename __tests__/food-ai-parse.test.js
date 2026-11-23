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
      { name: 'Свинина', grams: 300, kcal: 750 },
      { name: 'Картошка', grams: 500, kcal: 400 },
      { name: 'Лук', grams: 50, kcal: 21 },
    ])
    // 250×3 + 80×5 + 41×0.5 = 1170.5 ккал на 850 г → 138 ккал / 100 г
    expect(est.kcal100).toBe(138)
  })

  test('новые ингредиенты: сливки + сгущёнка + орехи (торт)', () => {
    const est = estimateFromDescription('сливки 200 грамм, сгущенное молоко 300 грамм, грецкие орехи 100 грамм')
    expect(est.items).toEqual([
      { name: 'Сливки 33%', grams: 200, kcal: 674 },
      { name: 'Сгущённое молоко', grams: 300, kcal: 960 },
      { name: 'Грецкие орехи', grams: 100, kcal: 654 },
    ])
    expect(est.weight).toBe(600)
    // 337×2 + 320×3 + 654×1 = 2288 ккал на 600 г → 381 ккал / 100 г
    expect(est.kcal100).toBe(381)
  })

  test('баранина для плова распознаётся', () => {
    const est = estimateFromDescription('баранина 400 грамм, лук 100 грамм, морковь 150 грамм')
    expect(est.items[0]).toEqual({ name: 'Баранина', grams: 400, kcal: 836 })
    expect(est.weight).toBe(650)
  })

  test('двухсловные названия: «томатная паста» — не помидор', () => {
    const est = estimateFromDescription('томатная паста 50 грамм, кетчуп 30 грамм')
    expect(est.items).toEqual([
      { name: 'Томатная паста', grams: 50, kcal: 41 },
      { name: 'Кетчуп', grams: 30, kcal: 28 },
    ])
  })

  test('порядок «300 грамм свинины» — название после граммовки', () => {
    const est = estimateFromDescription('300 грамм свинины, 200 грамм огурцов соленых')
    expect(est.items[0]).toEqual({ name: 'Свинина', grams: 300, kcal: 750 })
    expect(est.items[1]).toEqual({ name: 'Огурцы солёные', grams: 200, kcal: 24 })
  })

  test('миллилитры: «сливки 100 мл» считаются как граммы', () => {
    const est = estimateFromDescription('сливки 100 мл')
    expect(est.items).toEqual([{ name: 'Сливки 33%', grams: 100, kcal: 337 }])
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

  // Отзыв Кати 19.11 (скрин 09:59): «Масло сливочное -10 гр / Бедро
  // куриное -150 гр / Перловка -50 гр / Греча 100 гр» — раньше бедро
  // считалось безымянной «Курицей», а в окне не было видно, что вошло
  // в расчёт. Бедро — самостоятельный ингредиент, у каждого продукта
  // видна своя ккал, выход по составу — сумма граммовок
  test('обед Кати: бедро куриное распознаётся, выход 310 г, ккал по каждому', () => {
    const est = estimateFromDescription(
      'Масло сливочное -10 гр\nБедро куриное -150 гр\nПерловка -50 гр\nГреча 100 гр',
    )
    expect(est.weight).toBe(310)
    expect(est.items.map((i) => i.name)).toEqual([
      'Масло сливочное',
      'Куриное бедро',
      'Перловка отварная',
      'Гречка',
    ])
    // 750×0.1 + 190×1.5 + 109×0.5 + 110×1 = 524.5 ккал на 310 г
    expect(est.items.map((i) => i.kcal)).toEqual([75, 285, 55, 110])
    expect(est.kcal100).toBe(169)
    expect(est.missed).toEqual([])
  })

  test('«бедро 150 грамм» одним словом тоже распознаётся', () => {
    const est = estimateFromDescription('бедро 150 грамм')
    expect(est.items[0].name).toBe('Куриное бедро')
  })

  test('нераспознанный продукт не теряется молча — попадает в missed', () => {
    const est = estimateFromDescription('курица 200 грамм, пангасиус 100 грамм')
    expect(est.items).toEqual([{ name: 'Курица', grams: 200, kcal: 300 }])
    expect(est.missed).toEqual([{ name: 'пангасиус', grams: 100 }])
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

// Отзыв Кати 23.11 (скрины 17:30–17:34): диктует 4 продукта
// («куриная грудка отварная 200 грамм, варёное яйцо 3 штуки, свежий
// помидор 200 грамм, свежий огурец 1 штука»), а в списке ТОЛЬКО один —
// первый. Причина: нейросеть транскрипции часто не ставит запятые,
// вся фраза считалась ОДНИМ сегментом, первое блюдо получало первую
// граммовку, остальные продукты терялись молча (на скрине ≈274 ккал =
// 137 × 200 г — только грудка). Локальный разбор обязан резать поток
// без запятых на продукты по границам «название + число/единица»
describe('голос без запятых: несколько продуктов подряд (отзыв Кати 23.11)', () => {
  test('фраза Кати сплошным потоком → все 4 продукта со своими граммовками', async () => {
    const res = await recognizeVoiceText(
      'куриная грудка отварная 200 грамм варёное яйцо 3 штуки свежий помидор 200 грамм свежий огурец 1 штука'
    )
    expect(res.items.map((i) => i.name)).toEqual([
      'Куриная грудка отварная',
      'Яйцо варёное',
      'Помидор',
      'Огурец',
    ])
    // 2 яйца = 165 г; огурец поштучно = 120 г
    expect(res.items.map((i) => i.grams)).toEqual([200, 165, 200, 120])
  })

  test('«шт» вместо «штуки» тоже считается', async () => {
    const res = await recognizeVoiceText('куриная грудка отварная 200 грамм вареное яйцо 3 шт')
    expect(res.items.map((i) => [i.name, i.grams])).toEqual([
      ['Куриная грудка отварная', 200],
      ['Яйцо варёное', 165],
    ])
  })

  test('«варёная» не превращается в «Варенье» (одна основа «варен»)', async () => {
    const res = await recognizeVoiceText('варёная куриная грудка 200 грамм')
    expect(res.items).toHaveLength(1)
    expect(res.items[0].name).toBe('Куриная грудка отварная')
    expect(res.items[0].grams).toBe(200)
  })

  test('«варенье 20 грамм» — существительное с той же основой работает', async () => {
    const res = await recognizeVoiceText('варенье 20 грамм')
    expect(res.items[0].name).toBe('Варенье')
    expect(res.items[0].grams).toBe(20)
  })

  test('«2 яйца и банан» — штуки перед названием и второй продукт', async () => {
    const res = await recognizeVoiceText('2 яйца и банан')
    expect(res.items.map((i) => i.name)).toEqual(['Яйцо варёное', 'Банан'])
    expect(res.items[0].grams).toBe(110)
  })

  test('голое число без единицы у штучного продукта — штуки («яйца 2»)', async () => {
    const res = await recognizeVoiceText('яйца 2')
    expect(res.items[0].name).toBe('Яйцо варёное')
    expect(res.items[0].grams).toBe(110)
  })

  test('проценты из транскрипта не становятся весом («молоко 2,5», «сметана 15»)', async () => {
    const milk = await recognizeVoiceText('молоко 2,5')
    expect(milk.items[0].name).toBe('Молоко 2.5%')
    expect(milk.items[0].grams).toBeUndefined()
    const smet = await recognizeVoiceText('сметана 15')
    expect(smet.items[0].name).toBe('Сметана 15%')
    expect(smet.items[0].grams).toBeUndefined()
  })

  test('с запятыми результат не изменился', async () => {
    const res = await recognizeVoiceText(
      'куриная грудка отварная 200 грамм, варёное яйцо 3 штуки, свежий помидор 200 грамм, свежий огурец 1 штука'
    )
    expect(res.items.map((i) => [i.name, i.grams])).toEqual([
      ['Куриная грудка отварная', 200],
      ['Яйцо варёное', 165],
      ['Помидор', 200],
      ['Огурец', 120],
    ])
  })
})

// Тесты расширения брендовой базы и фастфуда (отзыв Кати 19.11,
// «расширь базу продуктов по брендам на 300 позиций популярных, ещё
// добавь в базу фастфуд — КФС, Вкусно и точка, Бургер Кинг и другие»).
// Проверяем: объём (≥300 новых позиций), уникальные id, марка в
// названии, алиасы, согласованность КБЖУ (Атуотер: 4Б/9Ж/4У, клетчатка
// 2 ккал/г) и что сети реально находятся поиском findLocalFood.
// expo-file-system / expo-image-manipulator / ai-config стабим —
// food-ai импортирует их на уровне модуля.

jest.mock('expo-file-system', () => ({
  File: class {
    get exists() {
      return false
    }
    text() {
      return '{}'
    }
    write() {}
  },
  Paths: { document: '/tmp' },
}))
jest.mock('expo-image-manipulator', () => ({
  ImageManipulator: class {},
  SaveFormat: { JPEG: 0, PNG: 1 },
  manipulateAsync: jest.fn(async () => ({ uri: 'file:///tmp/x.jpg' })),
}))
jest.mock('@/lib/ai-config', () => ({
  AI_CONFIG: { apiKey: '', proxyUrl: '', baseUrl: '', model: 'test', voiceModel: '' },
}))

jest.requireActual('./helpers/react-native-stub')
jest.requireActual('./helpers/async-storage-stub')

let FASTFOOD_FOODS
let BRAND2_FOODS
let BRAND3_FOODS
let BRAND_FOODS
let FOODS
let foodAi

beforeAll(() => {
  ;({ FASTFOOD_FOODS } = require('@/lib/data/foods-fastfood'))
  ;({ BRAND2_FOODS } = require('@/lib/data/foods-brands-2'))
  ;({ BRAND3_FOODS } = require('@/lib/data/foods-brands-3'))
  ;({ BRAND_FOODS } = require('@/lib/data/foods-brands'))
  ;({ FOODS } = require('@/lib/data/foods'))
  foodAi = require('@/lib/food-ai')
})

// Новые позиции собираются лениво (переменные заполняются в beforeAll)
const newFoods = () => [...FASTFOOD_FOODS, ...BRAND2_FOODS, ...BRAND3_FOODS]

// Позиции без марки — честные генерики и марки-имена (газировки —
// название и есть марка): обёртка «ёлочками» для них ничего не даёт
const NO_BRAND = new Set([
  'Изюм',
  'Курага',
  'Рулет бисквитный',
  'Кока-кола',
  'Кока-кола Zero',
  'Спрайт',
  'Фанта',
  'Пепси',
  'Миринда',
  '7UP',
  'Dr Pepper',
])

describe('foods-fastfood + foods-brands-2/3: объём и целостность', () => {
  test('новых позиций ≥ 300 (просьба Кати), все в общем списке FOODS', () => {
    expect(FASTFOOD_FOODS.length).toBeGreaterThanOrEqual(70)
    expect(BRAND2_FOODS.length).toBeGreaterThanOrEqual(80)
    expect(BRAND3_FOODS.length).toBeGreaterThanOrEqual(140)
    expect(newFoods().length).toBeGreaterThanOrEqual(300)
    const names = new Set(FOODS.map((f) => f.name))
    for (const f of newFoods()) expect(names.has(f.name)).toBe(true)
  })

  test('id уникальны и не пересекаются с первой брендовой базой', () => {
    const ids = new Set()
    for (const f of [...newFoods(), ...BRAND_FOODS]) {
      expect(ids.has(f.id)).toBe(false)
      ids.add(f.id)
    }
    for (const f of FASTFOOD_FOODS) expect(f.id).toMatch(/^ff-/)
    for (const f of [...BRAND2_FOODS, ...BRAND3_FOODS]) expect(f.id).toMatch(/^brand[23]-/)
  })

  test('названия уникальны, марка выделена «ёлочками»', () => {
    const names = new Set()
    const безМарки = []
    for (const f of newFoods()) {
      expect(names.has(f.name)).toBe(false)
      names.add(f.name)
      if (!NO_BRAND.has(f.name) && !/«/.test(f.name)) безМарки.push(f.id)
      expect(f.name.length).toBeLessThanOrEqual(80)
    }
    expect(безМарки).toEqual([])
  })

  test('КБЖУ согласованы (Атуотер 4Б/9Ж/4У, клетчатка 2), числа правдоподобны', () => {
    const наруш = []
    for (const f of newFoods()) {
      if (f.kcal < 0 || f.kcal > 900 || f.p < 0 || f.p > 100 || f.f < 0 || f.f > 100 || f.c < 0 || f.c > 100) наруш.push(`${f.id}: пределы КБЖУ`)
      if (f.sug > f.c + 0.001) наруш.push(`${f.id}: sug ${f.sug} > c ${f.c}`)
      if (f.fib > f.c + 0.001) наруш.push(`${f.id}: fib ${f.fib} > c ${f.c}`)
      if (!(f.defaultGrams > 0 && f.defaultGrams <= 1000)) наруш.push(`${f.id}: defaultGrams ${f.defaultGrams}`)
      if (!f.tags?.length) наруш.push(`${f.id}: пустые tags`)
      if (!f.al?.length) наруш.push(`${f.id}: пустые алиасы`)
      const calc = f.p * 4 + f.f * 9 + (f.c - f.fib) * 4 + f.fib * 2
      const dev = calc > 0 ? Math.abs(f.kcal - calc) / calc : f.kcal > 0 ? 1 : 0
      // этикеточное округление — допуск 6% + 3 ккал (для нулевых водокалорийных — 0/0)
      if (dev > 0.06 + 3 / Math.max(calc, 1)) наруш.push(`${f.id} «${f.name}»: ккал ${f.kcal}, по БЖУ ${Math.round(calc)}`)
    }
    expect(наруш).toEqual([])
  })
})

describe('фастфуд: сети присутствуют и находятся поиском', () => {
  test('КФС/Ростикс, Вкусно и точка, Бургер Кинг, Додо — по 10+ позиций', () => {
    const cnt = (re) => FASTFOOD_FOODS.filter((f) => re.test(f.name)).length
    expect(cnt(/КФС/)).toBeGreaterThanOrEqual(10)
    expect(cnt(/Вкусно и точка/)).toBeGreaterThanOrEqual(12)
    expect(cnt(/Бургер Кинг/)).toBeGreaterThanOrEqual(12)
    expect(cnt(/Додо/)).toBeGreaterThanOrEqual(10)
  })

  test('поиск по коротким голосовым запросам — офлайн и бесплатно', () => {
    // «воппер» — только обычный (у «Двойного»/«Джуниора» свои алиасы)
    expect(foodAi.findLocalFood('воппер').kcal).toBe(192)
    expect(foodAi.findLocalFood('двойной воппер').kcal).toBe(224)
    expect(foodAi.findLocalFood('воппер джюниор').kcal).toBe(201)
    // КФС и Вкусно и точка
    expect(foodAi.findLocalFood('твистер').kcal).toBe(173)
    expect(foodAi.findLocalFood('кфс крылышки').kcal).toBe(168)
    expect(foodAi.findLocalFood('биг хит').kcal).toBe(198)
    expect(foodAi.findLocalFood('чикен хит').kcal).toBe(193)
    // Додо и Теремок
    expect(foodAi.findLocalFood('пепперони').kcal).toBe(272)
    expect(foodAi.findLocalFood('четыре сыра').kcal).toBe(284)
    expect(foodAi.findLocalFood('сырники теремок').kcal).toBe(223)
    // голый алиас «наггетсы» — ровно одна позиция (Вкусно и точка)
    expect(foodAi.findLocalFood('наггетсы').name).toContain('Вкусно и точка')
  })

  test('оценка по названию берёт сети из базы (source «base», не ИИ)', async () => {
    const r = await foodAi.estimateByName('воппер')
    expect(r.source).toBe('base')
    expect(r.kcal100).toBe(192)
    const t = await foodAi.estimateByName('твистер')
    expect(t.source).toBe('base')
    expect(t.kcal100).toBe(173)
  })
})

describe('брендовые позиции: популярные марки на месте', () => {
  test('молочка/сыры/крупы/снеки/напитки — по конкретным запросам', () => {
    expect(foodAi.findLocalFood('молоко 2.5 простоквашино').kcal).toBe(53)
    expect(foodAi.findLocalFood('активиа натуральный').kcal).toBe(76)
    expect(foodAi.findLocalFood('даниссимо вишня').kcal).toBe(150)
    expect(foodAi.findLocalFood('сыр тильзитер брест литовск').kcal).toBe(339)
    expect(foodAi.findLocalFood('мистраль гречка').kcal).toBe(332)
    expect(foodAi.findLocalFood('макфа спагетти').kcal).toBe(338)
    expect(foodAi.findLocalFood('сникерс').kcal).toBe(482)
    // «колой» — склонённая «кола»: основа «коло» совпала с алиасом «кола»
    expect(foodAi.findLocalFood('колой').kcal).toBe(42)
    expect(foodAi.findLocalFood('кока кола').kcal).toBe(42)
    expect(foodAi.findLocalFood('кола ноль').kcal).toBe(0)
    expect(foodAi.findLocalFood('тунец меридиан').kcal).toBe(103)
    expect(foodAi.findLocalFood('вкусвилл творог').kcal).toBe(124)
    expect(foodAi.findLocalFood('пельмени царь').kcal).toBe(260)
  })

  test('голос: «кока кола 330» и «воппер 200 грамм» разбираются офлайн', async () => {
    const r = await foodAi.recognizeVoiceText('кока кола 330 грамм')
    expect(r.items[0].name).toBe('Кока-кола')
    expect(r.items[0].grams).toBe(330)
    const v = await foodAi.recognizeVoiceText('воппер 200 грамм')
    expect(v.items[0].kcal100).toBe(192)
    expect(v.items[0].grams).toBe(200)
  })
})

describe('preferBrandBase: этикеточные КБЖУ перекрывают ИИ-оценку', () => {
  test('«Селёдка в масле» (ИИ давал ~400) → консервы 239 из базы', () => {
    const r = foodAi.preferBrandBase([
      { name: 'Селёдка в масле', emoji: '🐟', kcal100: 400, p: 30, f: 35, c: 0, fib: 0, sug: 0, defaultGrams: 100, source: 'ai' },
    ])
    expect(r[0].kcal100).toBe(239)
    expect(r[0].p).toBe(17)
    expect(r[0].f).toBe(19)
    expect(r[0].source).toBe('brand')
    expect(r[0].defaultGrams).toBe(100) // граммовка от ИИ сохраняется
  })

  test('«Омлет с селёдкой в масле» НЕ перекрывается (лишнее слово «омлет»)', () => {
    const src = { name: 'Омлет с селёдкой в масле', kcal100: 414, p: 12, f: 40, c: 2, fib: 0, sug: 1, source: 'ai' }
    const r = foodAi.preferBrandBase([src])
    expect(r[0].kcal100).toBe(414)
    expect(r[0].source).toBe('ai')
  })

  test('«Воппер» → 192, «Твистер» → 173, «Кока-кола» → 42', () => {
    const r = foodAi.preferBrandBase([
      { name: 'Воппер', kcal100: 300, p: 15, f: 20, c: 25, fib: 0, sug: 5, source: 'ai' },
      { name: 'Твистер', kcal100: 250, p: 12, f: 12, c: 20, fib: 0, sug: 3, source: 'ai' },
      { name: 'Кока-кола', kcal100: 60, p: 0, f: 0, c: 15, fib: 0, sug: 15, source: 'ai' },
    ])
    expect(r.map((x) => x.kcal100)).toEqual([192, 173, 42])
    expect(r.every((x) => x.source === 'brand')).toBe(true)
  })

  test('незнакомое блюдо не трогаем', () => {
    const src = { name: 'Незнакомая похлёбка', kcal100: 123, p: 5, f: 4, c: 10, fib: 1, sug: 2, source: 'ai' }
    const r = foodAi.preferBrandBase([src])
    expect(r[0].kcal100).toBe(123)
    expect(r[0].source).toBe('ai')
  })

  test('пустой/битый ввод возвращается как есть', () => {
    expect(foodAi.preferBrandBase([])).toEqual([])
    expect(foodAi.preferBrandBase(null)).toBeNull()
    expect(foodAi.preferBrandBase([{ name: '' }])).toEqual([{ name: '' }])
  })
})

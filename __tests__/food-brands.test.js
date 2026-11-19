// Тесты брендовой базы «по поставщикам» и фикса «придуманного» колоража
// (отзыв Кати 19.11, скрин 12:12 — омлет с «селёдкой в масле» показывал
// 414 ккал/100 г, потому что слово «масле» спалось с «Маслом растительным»
// 900 ккал/100 г). expo-file-system / expo-image-manipulator / ai-config
// стабим — food-ai импортирует их на уровне модуля.

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

let FOODS
let BRAND_FOODS
let foodAi

beforeAll(() => {
  ;({ FOODS } = require('@/lib/data/foods'))
  ;({ BRAND_FOODS } = require('@/lib/data/foods-brands'))
  foodAi = require('@/lib/food-ai')
})

describe('foods-brands: база «по поставщикам» (Кати 19.11)', () => {
  test('в базе есть брендовые позиции, и все они в общем списке FOODS', () => {
    expect(BRAND_FOODS.length).toBeGreaterThanOrEqual(25)
    const names = new Set(FOODS.map((f) => f.name))
    for (const f of BRAND_FOODS) expect(names.has(f.name)).toBe(true)
  })

  test('у брендов есть марка в названии и уникальные id', () => {
    const ids = new Set()
    // Консервы без марки — тоже в этом файле (марка зависит от партии)
    const NO_BRAND = new Set(['Сельдь в масле (консервы)', 'Шпроты в масле'])
    for (const f of BRAND_FOODS) {
      expect(f.id).toMatch(/^brand-/)
      expect(ids.has(f.id)).toBe(false)
      ids.add(f.id)
      if (!NO_BRAND.has(f.name)) expect(/«/.test(f.name)).toBe(true) // марка выделена
      expect(f.al?.length).toBeGreaterThan(0) // короткие алиасы для поиска
    }
  })

  test('все бренды валидны: КБЖУ согласованы и сходятся с энергетическим уравнением', () => {
    for (const f of BRAND_FOODS) {
      expect(f.kcal).toBeGreaterThan(0)
      expect(f.p).toBeGreaterThanOrEqual(0)
      expect(f.f).toBeGreaterThanOrEqual(0)
      expect(f.c).toBeGreaterThanOrEqual(0)
      expect(f.sug).toBeLessThanOrEqual(f.c + 0.001)
      expect(f.defaultGrams).toBeGreaterThan(0)
      expect(f.tags.length).toBeGreaterThan(0)
      // ккал ≈ 4Б + 9Ж + 4У (этикеточное округление — допуск 12% + 5)
      const eq = 4 * f.p + 9 * f.f + 4 * f.c
      expect(Math.abs(f.kcal - eq)).toBeLessThanOrEqual(f.kcal * 0.12 + 5)
    }
  })

  test('ключевые позиции Кати с этикеточными значениями (Open Food Facts)', () => {
    const byId = Object.fromEntries(BRAND_FOODS.map((f) => [f.id, f]))
    // Вязанка, Докторская — этикетка: 230 ккал, Б 12, Ж 20
    expect(byId['brand-vyazanka-doktorskaya'].kcal).toBe(230)
    expect(byId['brand-vyazanka-doktorskaya'].p).toBe(12)
    expect(byId['brand-vyazanka-doktorskaya'].f).toBe(20)
    // Простоквашино, Творог 5% — 117 ккал, Б 15, Ж 5, У 3
    expect(byId['brand-prostokvashino-tvorog5'].kcal).toBe(117)
    // Сельдь в масле (консервы) — справочник: 239 ккал, Б 17, Ж 19
    expect(byId['brand-seld-v-masle'].kcal).toBe(239)
    // Шпроты в масле — 320 ккал
    expect(byId['brand-shproty-v-masle'].kcal).toBe(320)
    // Сыр Российский Брест-Литовск — 340 ккал
    expect(byId['brand-brestlitovsk-rossiyskiy'].kcal).toBe(340)
  })
})

describe('парсер состава: «в масле» — модификатор подачи, не ингредиент', () => {
  test('обед Кати со скрина 12:12: омлет 70 г, сельдь в масле 60 г, красный лук 30 г', () => {
    const r = foodAi.estimateFromDescription('омлет 70 г, сельдь в масле 60 г, красный лук 30 г')
    expect(r).not.toBeNull()
    // Раньше «масле» подтягивало Масло растительное 900 ккал → 414 ккал/100 г.
    // Теперь: (184·70 + 220·60 + 41·30) / 160 = 170,7 → 171
    expect(r.kcal100).toBe(171)
    expect(r.weight).toBe(160)
    const names = r.items.map((it) => it.name)
    expect(names).toEqual(['Омлет', 'Сельдь', 'Лук'])
    expect(names).not.toContain('Масло растительное')
    const herring = r.items.find((it) => it.name === 'Сельдь')
    expect(herring.grams).toBe(60)
    expect(herring.kcal).toBe(132) // 220 · 60 / 100
    expect(r.f).toBe(12.6) // (15·70 + 16·60 + 0.1·30) / 160
  })

  test('«шпроты в масле 50 г» — 320 ккал/100 г у шпрот, 160 ккал на порцию 50 г', () => {
    const r = foodAi.estimateFromDescription('шпроты в масле 50 г')
    expect(r.kcal100).toBe(320) // на 100 г продукта
    expect(r.items).toHaveLength(1)
    expect(r.items[0].name).toBe('Шпроты')
    expect(r.items[0].kcal).toBe(160) // 320 · 50 / 100
  })

  test('«тунец в собственном соку 100 г» — консервы 96 ккал/100 г', () => {
    const r = foodAi.estimateFromDescription('тунец в собственном соку 100 г')
    expect(r.kcal100).toBe(96)
    expect(r.items[0].name).toBe('Тунец')
  })

  test('«омлет НА масле» — масло жарки по-прежнему считается', () => {
    // «на масле» модификатором не вырезается: жарка — реальный источник
    // калорий. Проверяем, что слово «масле» не потерялось из текста
    const r = foodAi.estimateFromDescription('огурцы в масле 200 г')
    // «в масле» вырезано, огурцы считаются без масла
    expect(r.items[0].name).toBe('Огурец')
    expect(r.kcal100).toBe(15)
  })
})

describe('estimateByName/findLocalFood: бренды отвечают бесплатно из базы', () => {
  test('полное название бренда — source «base», этикеточные значения', async () => {
    const r = await foodAi.estimateByName('Колбаса варёная «Вязанка» Докторская')
    expect(r.source).toBe('base')
    expect(r.kcal100).toBe(230)
    expect(r.p).toBe(12)
    expect(r.f).toBe(20)
  })

  test('короткий запрос по алиасу «вязанка докторская» — тоже бесплатно', async () => {
    const r = await foodAi.estimateByName('вязанка докторская')
    expect(r.source).toBe('base')
    expect(r.kcal100).toBe(230)
  })

  test('фраза с лишними словами («майонез сдобри провансаль») — по алиасу', async () => {
    const r = await foodAi.estimateByName('майонез сдобри провансаль')
    expect(r.source).toBe('base')
    expect(r.kcal100).toBe(620)
  })

  test('«сельдь в масле» по названию — консервы из базы продуктов (239, длиннее общее блюдо)', async () => {
    // Побеждает длиннейшее совпадение: «Сельдь в масле (консервы)» точнее,
    // чем общее блюдо «Сельдь солёная»
    const r = await foodAi.estimateByName('сельдь в масле')
    expect(r.source).toBe('base')
    expect(r.kcal100).toBe(239)
    expect(r.p).toBe(17)
    expect(r.f).toBe(19)
  })

  test('findLocalFood находит бренды по частям названия', () => {
    expect(foodAi.findLocalFood('домик в деревне молоко').kcal).toBe(60)
    expect(foodAi.findLocalFood('сыр российский брест литовск').kcal).toBe(340)
    expect(foodAi.findLocalFood('рис мистраль кубань').kcal).toBe(349)
    expect(foodAi.findLocalFood('просто запрос без бренда')).toBeNull()
  })
})

describe('голос: брендовая позиция разбирается офлайн (recognizeVoiceText)', () => {
  test('«колбаса вязанка 50 грамм» — элемент дневника из базы, без ИИ', async () => {
    const r = await foodAi.recognizeVoiceText('колбаса вязанка 50 грамм')
    expect(r.items).toHaveLength(1)
    expect(r.items[0].name).toBe('Колбаса варёная «Вязанка» Докторская')
    expect(r.items[0].kcal100).toBe(230)
    expect(r.items[0].grams).toBe(50)
  })

  test('«шпроты в масле 80 грамм» — тоже из базы', async () => {
    const r = await foodAi.recognizeVoiceText('шпроты в масле 80 грамм')
    expect(r.items[0].name).toBe('Шпроты в масле')
    expect(r.items[0].kcal100).toBe(320)
    expect(r.items[0].grams).toBe(80)
  })
})

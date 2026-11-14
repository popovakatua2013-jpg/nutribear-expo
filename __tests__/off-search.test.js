// Тесты Open Food Facts: парсер продукта (parseOFFProduct), эвристики
// defaultGrams и tags, поиск по имени и штрих-коду с замоканным fetch.
// Реальная сеть в тестах не используется — mock global.fetch возвращает
// фиксированные ответы OFF (взяты из реального API OFF, формат тот же).

jest.requireActual('./helpers/react-native-stub')
jest.requireActual('./helpers/async-storage-stub')

const {
  parseOFFProduct,
  searchOpenFoodFacts,
  getFoodByBarcode,
  isOFFProduct,
} = require('@/lib/off-search')
const {
  useOffCacheStore,
  searchOFFCached,
  getBarcodeCached,
} = require('@/store/useOffCacheStore')

// Реальный продукт OFF (хачапури из российской базы) — формат 1:1
const OFF_KHACHAPURI = {
  code: '4607034712345',
  product_name: 'Хачапури по-имеретински',
  brands: 'Молкомб',
  serving_size: '120 г',
  nutriments: {
    'energy-kcal_100g': 270,
    proteins_100g: 11,
    fat_100g: 12,
    carbohydrates_100g: 28,
    fiber_100g: 1.3,
    sugars_100g: 1.8,
  },
}

const OFF_TOFU = {
  code: '3017620422003',
  product_name: 'Tofu organic',
  serving_size: '100 g',
  nutriments: {
    'energy-kcal_100g': 144,
    proteins_100g: 17,
    fat_100g: 9,
    carbohydrates_100g: 3,
    fiber_100g: 2.0,
    sugars_100g: 0.6,
  },
}

describe('parseOFFProduct: парсинг продукта OFF в наш формат', () => {
  test('корректный продукт → наш формат с всеми полями', () => {
    const f = parseOFFProduct(OFF_KHACHAPURI)
    expect(f).not.toBeNull()
    expect(f.id).toBe('off-4607034712345')
    expect(f.name).toBe('Хачапури по-имеретински')
    expect(f.kcal).toBe(270)
    expect(f.p).toBe(11)
    expect(f.f).toBe(12)
    expect(f.c).toBe(28)
    expect(f.fib).toBeCloseTo(1.3)
    expect(f.sug).toBeCloseTo(1.8)
    expect(f.defaultGrams).toBe(120)
    expect(f.source).toBe('off')
    expect(f.barcode).toBe('4607034712345')
    expect(f.brand).toBe('Молкомб')
  })

  test('serving_size «100 g» → defaultGrams=100', () => {
    const f = parseOFFProduct(OFF_TOFU)
    expect(f.defaultGrams).toBe(100)
  })

  test('kcal из energy_100g в кДж → конвертация /4.184', () => {
    const f = parseOFFProduct({
      product_name: 'Масло сливочное',
      nutriments: {
        energy_100g: 3700, // кДж = ~884 ккал
        proteins_100g: 0.5,
        fat_100g: 82,
        carbohydrates_100g: 0.5,
      },
    })
    expect(f).not.toBeNull()
    expect(f.kcal).toBe(884) // 3700/4.184 ≈ 884.4 → Math.round = 884
  })

  test('без product_name → null', () => {
    expect(parseOFFProduct({ code: '1', nutriments: {} })).toBeNull()
    expect(parseOFFProduct({ product_name: '', nutriments: {} })).toBeNull()
    expect(parseOFFProduct({ product_name: 'A', nutriments: {} })).toBeNull() // <2 символа
  })

  test('без kcal → null', () => {
    expect(
      parseOFFProduct({
        product_name: 'Молоко',
        nutriments: { proteins_100g: 3, fat_100g: 3, carbohydrates_100g: 5 },
      })
    ).toBeNull()
  })

  test('отрицательный kcal → null', () => {
    expect(
      parseOFFProduct({
        product_name: 'Молоко',
        nutriments: { 'energy-kcal_100g': -10 },
      })
    ).toBeNull()
  })

  test('мусор на входе → null', () => {
    expect(parseOFFProduct(null)).toBeNull()
    expect(parseOFFProduct('string')).toBeNull()
    expect(parseOFFProduct(undefined)).toBeNull()
  })

  test('длинное имя обрезается до 80 символов', () => {
    const long = 'А'.repeat(200)
    const f = parseOFFProduct({
      product_name: long,
      nutriments: { 'energy-kcal_100g': 100 },
    })
    expect(f.name.length).toBe(80)
  })
})

describe('parseOFFProduct: эвристика tags', () => {
  test('хачапури → lunch', () => {
    const f = parseOFFProduct({ ...OFF_KHACHAPURI, product_name: 'Хачапури' })
    expect(f.tags).toContain('lunch')
  })
  test('йогурт → breakfast', () => {
    const f = parseOFFProduct({
      product_name: 'Йогурт натуральный',
      nutriments: { 'energy-kcal_100g': 60 },
    })
    expect(f.tags).toContain('breakfast')
  })
  test('лосось → dinner', () => {
    const f = parseOFFProduct({
      product_name: 'Лосось запечённый',
      nutriments: { 'energy-kcal_100g': 200 },
    })
    expect(f.tags).toContain('dinner')
  })
  test('шоколад → snack', () => {
    const f = parseOFFProduct({
      product_name: 'Шоколад горький 70%',
      nutriments: { 'energy-kcal_100g': 546 },
    })
    expect(f.tags).toContain('snack')
  })
  test('непонятное имя → все теги', () => {
    // «Квазимодо» — не совпадает ни с одной эвристикой → все теги
    const f = parseOFFProduct({
      product_name: 'Квазимодо',
      nutriments: { 'energy-kcal_100g': 100 },
    })
    expect(f.tags).toEqual(expect.arrayContaining(['breakfast', 'lunch', 'dinner', 'snack']))
  })
})

describe('parseOFFProduct: parseDefaultGrams', () => {
  test('«30 г» → 30', () => {
    const f = parseOFFProduct({
      product_name: 'Печенье',
      serving_size: '30 г',
      nutriments: { 'energy-kcal_100g': 400 },
    })
    expect(f.defaultGrams).toBe(30)
  })
  test('«1 порция (45 г)» → 45', () => {
    const f = parseOFFProduct({
      product_name: 'Каша',
      serving_size: '1 порция (45 г)',
      nutriments: { 'energy-kcal_100g': 350 },
    })
    expect(f.defaultGrams).toBe(45)
  })
  test('без serving_size → 100', () => {
    const f = parseOFFProduct({
      product_name: 'Молоко',
      nutriments: { 'energy-kcal_100g': 50 },
    })
    expect(f.defaultGrams).toBe(100)
  })
  test('нестандартное «100g» → 100', () => {
    const f = parseOFFProduct({
      product_name: 'Тофу',
      serving_size: '100g',
      nutriments: { 'energy-kcal_100g': 144 },
    })
    expect(f.defaultGrams).toBe(100)
  })
})

describe('isOFFProduct', () => {
  test('продукт из OFF → true', () => {
    expect(isOFFProduct({ source: 'off', name: 'Tofu' })).toBe(true)
  })
  test('встроенный продукт → false', () => {
    expect(isOFFProduct({ name: 'Овсянка' })).toBe(false)
  })
  test('null → false', () => {
    expect(isOFFProduct(null)).toBe(false)
  })
})

describe('searchOpenFoodFacts: поиск по имени (mock fetch)', () => {
  const realFetch = global.fetch
  afterEach(() => {
    global.fetch = realFetch
  })

  test('возвращает распарсенные продукты', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            products: [OFF_KHACHAPURI, OFF_TOFU],
          }),
      })
    )
    const out = await searchOpenFoodFacts('хачапури')
    expect(out).toHaveLength(2)
    expect(out[0].name).toBe('Хачапури по-имеретински')
    expect(out[1].name).toBe('Tofu organic')
    expect(out[0].source).toBe('off')
  })

  test('короткий запрос (<2 символов) → пусто без запроса', async () => {
    global.fetch = jest.fn()
    const out = await searchOpenFoodFacts('а')
    expect(out).toEqual([])
    expect(global.fetch).not.toHaveBeenCalled()
  })

  test('сеть упала → пусто, без throw', async () => {
    global.fetch = jest.fn(() => Promise.reject(new Error('network')))
    const out = await searchOpenFoodFacts('тофу')
    expect(out).toEqual([])
  })

  test('продукты без kcal отфильтровываются', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            products: [
              OFF_KHACHAPURI,
              { product_name: 'Бесполезный', nutriments: {} }, // нет kcal
              OFF_TOFU,
            ],
          }),
      })
    )
    const out = await searchOpenFoodFacts('test')
    expect(out).toHaveLength(2) // только валидные
  })
})

describe('getFoodByBarcode: поиск по штрих-коду (mock fetch)', () => {
  const realFetch = global.fetch
  afterEach(() => {
    global.fetch = realFetch
  })

  test('найден → наш формат', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            status: 1,
            product: OFF_TOFU,
          }),
      })
    )
    const f = await getFoodByBarcode('3017620422003')
    expect(f).not.toBeNull()
    expect(f.barcode).toBe('3017620422003')
    expect(f.kcal).toBe(144)
  })

  test('status=0 → null (нет такого кода)', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ status: 0, product: null }),
      })
    )
    const f = await getFoodByBarcode('0000000000000')
    expect(f).toBeNull()
  })

  test('короткий код (<8 цифр) → null без запроса', async () => {
    global.fetch = jest.fn()
    const f = await getFoodByBarcode('123')
    expect(f).toBeNull()
    expect(global.fetch).not.toHaveBeenCalled()
  })

  test('не-цифры в коде — чистятся', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ status: 1, product: OFF_TOFU }),
      })
    )
    await getFoodByBarcode('301 762 0422003')
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/3017620422003.json'),
      expect.anything()
    )
  })
})

describe('useOffCacheStore: кеш', () => {
  beforeEach(() => {
    useOffCacheStore.setState({ cache: {} })
  })

  test('get по несуществующему ключу → null', () => {
    expect(useOffCacheStore.getState().get('q:нету')).toBeNull()
  })

  test('set + get возвращает items', () => {
    useOffCacheStore.getState().set('q:тофу', [OFF_TOFU])
    expect(useOffCacheStore.getState().get('q:тофу')).toEqual([OFF_TOFU])
  })

  test('clear — очищает кеш', () => {
    useOffCacheStore.getState().set('q:тофу', [OFF_TOFU])
    useOffCacheStore.getState().clear()
    expect(useOffCacheStore.getState().cache).toEqual({})
  })

  test('LRU — вытесняет самые старые при переполнении', () => {
    // Добавляем 105 записей — должны остаться 100 (самые новые)
    for (let i = 0; i < 105; i++) {
      useOffCacheStore.getState().set(`q:item${i}`, [{ id: i }])
    }
    const keys = Object.keys(useOffCacheStore.getState().cache)
    expect(keys.length).toBeLessThanOrEqual(100)
    // Самые старые (item0..item4) должны быть вытеснены
    expect(useOffCacheStore.getState().get('q:item0')).toBeNull()
    expect(useOffCacheStore.getState().get('q:item104')).not.toBeNull()
  })
})

describe('searchOFFCached: поиск с кешем', () => {
  const realFetch = global.fetch
  afterEach(() => {
    global.fetch = realFetch
    useOffCacheStore.setState({ cache: {} })
  })

  test('первый поиск — ходит в сеть, кеширует', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ products: [OFF_TOFU] }),
      })
    )
    const out = await searchOFFCached('тофу')
    expect(out).toHaveLength(1)
    expect(global.fetch).toHaveBeenCalledTimes(1)
    // В кеше есть
    expect(useOffCacheStore.getState().get('q:тофу')).toHaveLength(1)
  })

  test('второй поиск — берёт из кеша, в сеть не ходит', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ products: [OFF_TOFU] }),
      })
    )
    await searchOFFCached('тофу')
    global.fetch.mockClear()
    const out = await searchOFFCached('тофу')
    expect(out).toHaveLength(1)
    expect(global.fetch).not.toHaveBeenCalled()
  })
})

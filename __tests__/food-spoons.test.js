// Тесты ложек для сыпучих (просьба Кати 28.11: «в 1 ч.л. сахара ?кал?»):
// spoonsFor возвращает граммы «с горкой» для сахара/муки/крупы/хлопьев,
// макароны и готовые блюда ложек не получают; foods.js подмешивает
// tsp/tbsp в базу; калории порции ложкой считаются из обычных КБЖУ.

jest.requireActual('./helpers/react-native-stub')
jest.requireActual('./helpers/async-storage-stub')

const { spoonsFor } = require('@/lib/data/spoons')
const { FOODS, kcalForPortion } = require('@/lib/data/foods')

const byId = (id) => FOODS.find((f) => f.id === id)

describe('spoonsFor: граммы ложек сыпучих', () => {
  test('сахар: 8 г ч.л. / 25 г ст.л.', () => {
    expect(spoonsFor({ id: 'sugar', name: 'Сахар-песок' })).toEqual({ tsp: 8, tbsp: 25 })
  })

  test('мука и манка — 8/25 по шаблону имени', () => {
    expect(spoonsFor({ id: 'brand6-makfa-muka', name: 'Мука пшеничная в/с «Макфа»' })).toEqual({
      tsp: 8,
      tbsp: 25,
    })
    expect(spoonsFor({ id: 'brand6-nat-mannaya', name: 'Крупа манная «Национальная»' })).toEqual({
      tsp: 8,
      tbsp: 25,
    })
  })

  test('овсяные хлопья легче круп: 6/12', () => {
    expect(spoonsFor({ id: 'xl-cornflakes', name: 'Кукурузные хлопья' })).toEqual({ tsp: 6, tbsp: 12 })
    expect(spoonsFor({ id: 'brand6-nordic-ovsyanka', name: 'Овсяные хлопья «Nordic»' })).toEqual({
      tsp: 6,
      tbsp: 12,
    })
  })

  test('какао-порошок 6/15, разрыхлитель 5/15', () => {
    expect(spoonsFor({ id: 'x', name: 'Какао-порошок «Золотой ярлык»' })).toEqual({ tsp: 6, tbsp: 15 })
    expect(spoonsFor({ id: 'y', name: 'Разрыхлитель теста' })).toEqual({ tsp: 5, tbsp: 15 })
  })

  test('«сухие» крупы из брендовых файлов — 8/25', () => {
    expect(spoonsFor({ id: 'z', name: 'Пшено «Мистраль» (сухое)' })).toEqual({ tsp: 8, tbsp: 25 })
    expect(spoonsFor({ id: 'w', name: 'Рис «Национальная» (сухой)' })).toEqual({ tsp: 8, tbsp: 25 })
  })

  test('макароны и вермишель ложек не получают даже «(сухой)»', () => {
    expect(spoonsFor({ id: 'm', name: 'Спагетти «Макфа» (сухой)' })).toBeNull()
    expect(spoonsFor({ id: 'n', name: 'Вермишель «Шебекинские»' })).toBeNull()
  })

  test('готовые блюда и напитки без ложек', () => {
    expect(spoonsFor({ id: 'g', name: 'Гречка отварная' })).toBeNull()
    expect(spoonsFor({ id: 'k', name: 'Какао на молоке' })).toBeNull()
    expect(spoonsFor(null)).toBeNull()
  })

  test('уже заданные tsp/tbsp в продукте приоритетны', () => {
    expect(spoonsFor({ id: 'a', name: 'Мука', tsp: 10, tbsp: 30 })).toEqual({ tsp: 10, tbsp: 30 })
  })
})

describe('база: ложки подмешаны в FOODS', () => {
  test('«Сахар-песок» несёт tsp/tbsp', () => {
    const sugar = byId('sugar')
    expect(sugar).toBeTruthy()
    expect(sugar.tsp).toBe(8)
    expect(sugar.tbsp).toBe(25)
  })

  test('пример Кати: 1 ч.л. сахара ≈ 31 ккал', () => {
    const sugar = byId('sugar')
    // 387 ккал/100 г × 8 г = 30.96 → 31
    expect(kcalForPortion(sugar, 8)).toBe(31)
    // 1 ст.л. ≈ 97 ккал
    expect(kcalForPortion(sugar, 25)).toBe(97)
  })

  test('«Макфа» мука тоже с ложками, а пельмени — нет', () => {
    expect(byId('brand6-makfa-muka').tsp).toBe(8)
    const pelmeni = FOODS.find((f) => (f.name || '').toLowerCase().includes('пельмени'))
    expect(pelmeni ? pelmeni.tsp : undefined).toBeUndefined()
  })

  test('в большинстве сыпучих есть ложки, у готовых блюд их нет', () => {
    const bulk = FOODS.filter((f) => f.tsp > 0)
    expect(bulk.length).toBeGreaterThan(15)
    for (const f of bulk) {
      expect(f.tbsp).toBeGreaterThanOrEqual(f.tsp)
    }
  })
})

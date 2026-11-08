// Тесты второй волны планового хаба: правка граммовки в меню
// (updateGrams — пересчёт ккал от kcal100), категории/количество в
// списке покупок (guessCategory, setQty, setCategory, addMany с
// дедупликацией, groupByCategory) и сбор покупок из плана недели
// (planToShopping — объединение повторов, категории по названию).

jest.requireActual('./helpers/react-native-stub')
jest.requireActual('./helpers/async-storage-stub')

const MON = '2026-11-09' // понедельник

describe('useMealPlanStore.updateGrams: правка граммовки', () => {
  let store

  beforeAll(() => {
    ;({ useMealPlanStore: store } = require('@/store/useMealPlanStore'))
  })

  beforeEach(() => {
    store.setState({ plans: {} })
    store.getState().addItem(MON, 0, 'breakfast', {
      name: 'Овсянка', emoji: '🥣', grams: 250, kcal: 220, kcal100: 88, p: 3, f: 1.7, c: 15,
    })
  })

  test('пересчёт ккал от калорийности на 100 г', () => {
    const id = store.getState().plans[MON][0].breakfast[0].id
    store.getState().updateGrams(MON, 0, 'breakfast', id, 100)
    const it = store.getState().plans[MON][0].breakfast[0]
    expect(it.grams).toBe(100)
    expect(it.kcal).toBe(88) // 88 ккал/100 г × 100 г
    store.getState().updateGrams(MON, 0, 'breakfast', id, 300)
    expect(store.getState().plans[MON][0].breakfast[0].kcal).toBe(264)
  })

  test('границы 10…2000 г, мусорный ввод → минимум', () => {
    const id = store.getState().plans[MON][0].breakfast[0].id
    store.getState().updateGrams(MON, 0, 'breakfast', id, 99999)
    let it = store.getState().plans[MON][0].breakfast[0]
    expect(it.grams).toBe(2000)
    expect(it.kcal).toBe(1760)
    store.getState().updateGrams(MON, 0, 'breakfast', id, 0)
    it = store.getState().plans[MON][0].breakfast[0]
    expect(it.grams).toBe(10)
  })

  test('чужой id и пустой день — без изменений', () => {
    const before = JSON.stringify(store.getState().plans)
    store.getState().updateGrams(MON, 0, 'breakfast', 'no-such-id', 150)
    store.getState().updateGrams(MON, 5, 'dinner', 'no-such-id', 150)
    expect(JSON.stringify(store.getState().plans)).toBe(before)
  })
})

describe('useShoppingStore: категории и количество', () => {
  let store, guessCategory, groupByCategory, SHOP_CATEGORIES

  beforeAll(() => {
    ;({
      useShoppingStore: store,
      guessCategory,
      groupByCategory,
      SHOP_CATEGORIES,
    } = require('@/store/useShoppingStore'))
  })

  beforeEach(() => {
    store.setState({ items: [] })
  })

  test('guessCategory: ключевые слова по отделам, мусор → other', () => {
    expect(guessCategory('Молоко 2,5%')).toBe('dairy')
    expect(guessCategory('ЯЙЦА С1')).toBe('dairy')
    expect(guessCategory('куриная грудка')).toBe('meat')
    expect(guessCategory('Печень трески')).toBe('meat')
    expect(guessCategory('яблоки голден')).toBe('produce')
    expect(guessCategory('Хлеб бородинский')).toBe('bakery')
    expect(guessCategory('овсяное печенье')).toBe('snacks') // не крупа
    expect(guessCategory('мороженое')).toBe('snacks') // не заморозка
    expect(guessCategory('пельмени сибирские')).toBe('frozen')
    expect(guessCategory('гречка')).toBe('grains')
    expect(guessCategory('оливки')).toBe('produce')
    expect(guessCategory('шоколад тёмный 70%')).toBe('snacks')
    expect(guessCategory('мыло хозяйственное')).toBe('other')
  })

  test('add: количество и категория, авто-категория по названию', () => {
    store.getState().add('Кефир')
    store.getState().add('Куриная грудка', { qty: 2, category: 'produce' })
    const items = store.getState().items
    expect(items[0].category).toBe('dairy')
    expect(items[0].qty).toBe(1)
    expect(items[1].qty).toBe(2)
    expect(items[1].category).toBe('produce') // явная категория сильнее авто
    store.getState().add('   ')
    expect(store.getState().items).toHaveLength(2)
  })

  test('setQty: границы 1…99; setCategory: неизвестная категория игнорируется', () => {
    store.getState().add('Хлеб')
    const id = store.getState().items[0].id
    store.getState().setQty(id, 0)
    expect(store.getState().items[0].qty).toBe(1)
    store.getState().setQty(id, 999)
    expect(store.getState().items[0].qty).toBe(99)
    store.getState().setCategory(id, 'no-such-cat')
    expect(store.getState().items[0].category).toBe('bakery')
    store.getState().setCategory(id, 'snacks')
    expect(store.getState().items[0].category).toBe('snacks')
  })

  test('addMany: дубликаты по названию пропускаются (регистр и ё/е не важны)', () => {
    store.getState().add('СЫР')
    const n = store.getState().addMany([
      { name: 'сыр' },
      { name: 'Молоко' },
      { name: 'молоко' },
      { name: 'Ёжик' }, // ё → е, добавится
      { name: '   ' },
    ])
    expect(n).toBe(2)
    const names = store.getState().items.map((it) => it.name)
    expect(names).toContain('Молоко')
    expect(names).toContain('Ёжик')
    expect(store.getState().items).toHaveLength(3)
  })

  test('groupByCategory: порядок отделов как в SHOP_CATEGORIES, купленные внизу отдела', () => {
    store.getState().add('Молоко') // dairy
    store.getState().add('Яблоки') // produce
    store.getState().add('Гречка') // grains
    const bread = store.getState().items.find((it) => it.name === 'Гречка')
    store.getState().toggle(bread.id)
    const groups = groupByCategory(store.getState().items)
    expect(groups.map((g) => g.id)).toEqual(['produce', 'dairy', 'grains'])
    expect(groups[2].items[0].done).toBe(true) // купленное — внизу отдела
    expect(groups[2].items).toHaveLength(1)
  })

  test('groupByCategory: старые записи без категории — авто по названию', () => {
    store.setState({
      items: [{ id: 'old', name: 'кефир', qty: 1, done: false, createdAt: 1 }],
    })
    const groups = groupByCategory(store.getState().items)
    expect(groups).toHaveLength(1)
    expect(groups[0].id).toBe('dairy')
  })
})

describe('planToShopping: покупки из плана недели', () => {
  let planToShopping

  beforeAll(() => {
    ;({ planToShopping } = require('@/lib/plan-shopping'))
  })

  test('повторы объединяются, категории по названию', () => {
    const plan = {
      0: {
        breakfast: [
          { name: 'Овсянка', grams: 250 },
          { name: 'Молоко', grams: 200 },
        ],
        lunch: [{ name: 'Куриная грудка', grams: 150 }],
      },
      1: { breakfast: [{ name: 'овсянка' }] },
      3: { dinner: [{ name: 'Творог' }, { name: 'Творог' }] },
    }
    const list = planToShopping(plan)
    const byName = Object.fromEntries(list.map((x) => [x.name, x]))
    expect(list).toHaveLength(4)
    expect(byName['Овсянка']).toMatchObject({ qty: 2, category: 'grains' })
    expect(byName['Молоко']).toMatchObject({ qty: 1, category: 'dairy' })
    expect(byName['Куриная грудка']).toMatchObject({ qty: 1, category: 'meat' })
    expect(byName['Творог']).toMatchObject({ qty: 2, category: 'dairy' })
  })

  test('пустая и неполная неделя', () => {
    expect(planToShopping(undefined)).toEqual([])
    expect(planToShopping({})).toEqual([])
    expect(planToShopping({ 2: { breakfast: [] } })).toEqual([])
  })
})

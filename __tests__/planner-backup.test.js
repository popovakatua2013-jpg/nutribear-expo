// Тесты аудита 09.11.2026: план питания и список покупок должны
// переноситься копией (applyBackup) — раньше разделов в копии не было,
// и при переносе на новый телефон план/покупки терялись. Также:
// мусорные недели/строки фильтруются, лимиты соблюдаются, а копия без
// этих разделов (старый формат) НЕ трогает текущие данные.

// RN-стабы должны встать до импортов сторов
jest.requireActual('./helpers/react-native-stub')
jest.requireActual('./helpers/async-storage-stub')
jest.mock('@/lib/photos', () => ({
  restorePhotos: jest.fn(async () => true),
  collectPhotosForBackup: jest.fn(async (items) => []),
}))

describe('applyBackup: план питания и покупки переносятся копией', () => {
  let applyBackup, useMealPlanStore, useShoppingStore

  beforeAll(() => {
    ;({ applyBackup } = require('@/lib/backup'))
    ;({ useMealPlanStore } = require('@/store/useMealPlanStore'))
    ;({ useShoppingStore } = require('@/store/useShoppingStore'))
  })

  beforeEach(() => {
    useMealPlanStore.setState({ plans: {} })
    useShoppingStore.setState({ items: [] })
  })

  test('план и покупки восстанавливаются из копии', async () => {
    await applyBackup({
      app: 'NutriBear',
      mealPlan: {
        plans: {
          '2026-11-09': {
            0: { breakfast: [{ id: 'a', name: 'Овсянка', grams: 100, kcal: 88, kcal100: 88 }], lunch: [], dinner: [], snack: [] },
            1: {}, 2: {}, 3: {}, 4: {}, 5: {}, 6: {},
          },
        },
      },
      shopping: {
        items: [
          { id: 's1', name: 'Молоко', done: true, qty: 2, category: 'dairy', createdAt: 1 },
          { id: 's2', name: 'Хлеб', done: false, qty: 1, category: null, createdAt: 2 },
        ],
      },
    })
    const week = useMealPlanStore.getState().plans['2026-11-09']
    expect(week[0].breakfast[0].name).toBe('Овсянка')
    const items = useShoppingStore.getState().items
    expect(items).toHaveLength(2)
    expect(items[0]).toMatchObject({ name: 'Молоко', done: true, qty: 2, category: 'dairy' })
  })

  test('мусорные недели фильтруются по формату даты', async () => {
    await applyBackup({
      app: 'NutriBear',
      mealPlan: { plans: { bad: 5, '2026-11-02': { 1: { lunch: [] } }, 'не дата': {} } },
    })
    expect(Object.keys(useMealPlanStore.getState().plans)).toEqual(['2026-11-02'])
  })

  test('покупки чистятся: без имени — долой, мусорный qty → минимум, генерируется id', async () => {
    await applyBackup({
      app: 'NutriBear',
      shopping: {
        items: [
          null,
          { name: '' },
          { name: 'Без id', qty: 3 },
          { id: 'z', name: 'Молоко', qty: 0 },
        ],
      },
    })
    const saved = useShoppingStore.getState().items
    expect(saved).toHaveLength(2)
    const noId = saved.find((it) => it.name === 'Без id')
    expect(noId.qty).toBe(3)
    expect(typeof noId.id).toBe('string') // id сгенерирован
    expect(saved.find((it) => it.name === 'Молоко').qty).toBe(1) // 0 → минимум 1
  })

  test('лимит списка покупок из копии — 200 строк', async () => {
    const items = Array.from({ length: 250 }, (_, i) => ({
      id: `i${i}`, name: `Продукт ${i}`, qty: 2, done: false, createdAt: i,
    }))
    await applyBackup({ app: 'NutriBear', shopping: { items } })
    expect(useShoppingStore.getState().items).toHaveLength(200)
  })

  test('копия без разделов план/покупки (старый формат) не стирает текущие данные', async () => {
    useMealPlanStore.setState({
      plans: { '2026-11-09': { 0: { breakfast: [{ id: 'k', name: 'Творог', grams: 100, kcal: 90, kcal100: 90 }] } } },
    })
    useShoppingStore.setState({ items: [{ id: 'k2', name: 'Хлеб', qty: 1, done: false, createdAt: 1 }] })
    await applyBackup({ app: 'NutriBear', profile: {} })
    const plans = useMealPlanStore.getState().plans
    expect(plans['2026-11-09'][0].breakfast[0].name).toBe('Творог')
    expect(useShoppingStore.getState().items[0].name).toBe('Хлеб')
  })
})

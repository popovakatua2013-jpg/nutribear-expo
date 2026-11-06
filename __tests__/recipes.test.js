// Тесты стора своих рецептов (useRecipesStore): пересчёт ккал/100 г
// с опциональным «готовым весом» (отзыв из Google Play — после варки/
// жарки вес блюда меняется, и ккал/100 г надо считать от готового),
// редактирование и обратная совместимость со старыми рецептами.

// RN-стабы должны встать до импортов стора
jest.requireActual('./helpers/react-native-stub')
jest.requireActual('./helpers/async-storage-stub')

describe('useRecipesStore', () => {
  let useRecipesStore

  beforeAll(() => {
    ;({ useRecipesStore } = require('@/store/useRecipesStore'))
  })

  beforeEach(() => {
    useRecipesStore.setState({ items: [] })
  })

  test('без готового веса — ккал/100 г от веса ингредиентов (как раньше)', () => {
    useRecipesStore.getState().add({ name: 'Овсянка', grams: 500, totalKcal: 1700 })
    const r = useRecipesStore.getState().items[0]
    expect(r.kcal100).toBe(340)
    expect(r.cookedGrams).toBeUndefined()
    expect(r.totalKcal).toBe(1700)
  })

  test('с готовым весом — ккал/100 г считается от готового блюда', () => {
    // 500 г сухого риса (1700 ккал) → 1100 г готового: 155 ккал/100 г,
    // а не 340 — это ровно кейс из отзыва
    useRecipesStore
      .getState()
      .add({ name: 'Рис отварной', grams: 500, cookedGrams: 1100, totalKcal: 1700 })
    const r = useRecipesStore.getState().items[0]
    expect(r.kcal100).toBe(154.5)
    expect(r.cookedGrams).toBe(1100)
    expect(r.grams).toBe(500)
  })

  test('БЖУ тоже пересчитывается от готового веса', () => {
    useRecipesStore
      .getState()
      .add({ name: 'Суп', grams: 2000, cookedGrams: 1500, totalKcal: 900, totalP: 60 })
    const r = useRecipesStore.getState().items[0]
    expect(r.kcal100).toBe(60)
    expect(r.p100).toBe(4)
  })

  test('cookedGrams <= 0 игнорируется — работаем как без него', () => {
    useRecipesStore
      .getState()
      .add({ name: 'Салат', grams: 300, cookedGrams: 0, totalKcal: 360 })
    const r = useRecipesStore.getState().items[0]
    expect(r.kcal100).toBe(120)
    expect(r.cookedGrams).toBeUndefined()
  })

  test('update пересчитывает ккал/100 г от нового готового веса', () => {
    useRecipesStore.getState().add({ name: 'Каша', grams: 400, cookedGrams: 800, totalKcal: 1200 })
    const id = useRecipesStore.getState().items[0].id
    // Сварила ещё: готового стало 1000 г → 120 ккал/100 г
    useRecipesStore
      .getState()
      .update(id, { name: 'Каша', grams: 400, cookedGrams: 1000, totalKcal: 1200 })
    const r = useRecipesStore.getState().items[0]
    expect(r.kcal100).toBe(120)
    expect(r.cookedGrams).toBe(1000)
  })

  test('update без готового веса убирает cookedGrams (снятая галочка)', () => {
    useRecipesStore.getState().add({ name: 'Каша', grams: 400, cookedGrams: 800, totalKcal: 1200 })
    const id = useRecipesStore.getState().items[0].id
    useRecipesStore
      .getState()
      .update(id, { name: 'Каша', grams: 400, cookedGrams: 0, totalKcal: 1200 })
    const r = useRecipesStore.getState().items[0]
    expect(r.cookedGrams).toBeUndefined()
    expect(r.kcal100).toBe(300)
  })

  test('старый рецепт без totalKcal не падает при редактировании (форма считает сама)', () => {
    // Имитация записи, созданной до обновления: только per-100 значения
    useRecipesStore.setState({
      items: [
        { id: 'recipe-old', name: 'Старый рецепт', grams: 600, kcal100: 200, createdAt: 1 },
      ],
    })
    const store = useRecipesStore.getState()
    expect(store.items[0].totalKcal).toBeUndefined()
    // Форма при редактировании восстановит totalKcal = 200 * 600 / 100 = 1200
    store.update('recipe-old', { name: 'Старый рецепт', grams: 600, totalKcal: 1200 })
    const r = useRecipesStore.getState().items[0]
    expect(r.kcal100).toBe(200)
    expect(r.totalKcal).toBe(1200)
  })
})

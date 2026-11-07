// Тесты своих перекусов («Перекус 2», «Перекус 3»…): каждый — ОТДЕЛЬНАЯ
// секция дневника со своим mealId (отзыв Кати: «все перекусы сохраняются
// в один» — больше не смешиваются). addCustomMeal возвращает созданный
// перекус (тосты и автосворачивание секций), нумерует по максимальному
// занятому номеру + 1 (после удаления «Перекус 2» из набора «2, 3» новый
// станет «Перекус 4», а не вторым «Перекус 3»); записи пишутся в свой
// ключ entries и журнал с настоящим mealId; getMeal понимает id своих
// перекусов, а customMealCard даёт секции имя и картинку.

// RN-стабы должны встать до импортов стора
jest.requireActual('./helpers/react-native-stub')
jest.requireActual('./helpers/async-storage-stub')

const FOOD = { id: 'f1', name: 'Банан', emoji: '🍌', kcal: 89, p: 1, f: 0, c: 23 }

describe('свои перекусы: addCustomMeal / removeCustomMeal', () => {
  let useFoodStore, dayKeyOf

  beforeAll(() => {
    ;({ useFoodStore } = require('@/store/useFoodStore'))
    ;({ dayKeyOf } = require('@/store/useHistoryStore'))
  })

  beforeEach(() => {
    const empty = { breakfast: [], lunch: [], dinner: [], snack: [] }
    useFoodStore.setState({ entries: { ...empty }, history: [], customMeals: [], dayKey: dayKeyOf() })
  })

  test('первый свой перекус — «Перекус 2», action возвращает созданный объект', () => {
    const meal = useFoodStore.getState().addCustomMeal()
    expect(meal).toEqual({ id: expect.any(String), name: 'Перекус 2' })
    expect(meal.id).toMatch(/^custom-/)
    const s = useFoodStore.getState()
    expect(s.customMeals).toHaveLength(1)
    expect(s.entries[meal.id]).toEqual([])
  })

  test('второй — «Перекус 3», нумерация сквозная', () => {
    useFoodStore.getState().addCustomMeal()
    const second = useFoodStore.getState().addCustomMeal()
    expect(second.name).toBe('Перекус 3')
  })

  test('после удаления «Перекус 2» новый станет «Перекус 4», а не вторым «Перекус 3»', () => {
    const first = useFoodStore.getState().addCustomMeal()
    useFoodStore.getState().addCustomMeal()
    useFoodStore.getState().removeCustomMeal(first.id)
    const next = useFoodStore.getState().addCustomMeal()
    expect(next.name).toBe('Перекус 4')
    // ключ удалённого перекуса вычищен из дневника
    expect(useFoodStore.getState().entries[first.id]).toBeUndefined()
  })

  test('запись блюда в свой перекус: свой ключ entries, обычный «Перекус» не тронут', () => {
    const meal = useFoodStore.getState().addCustomMeal()
    useFoodStore.getState().addEntry(meal.id, { food: FOOD, grams: 120, kcal: 107, desc: '' })
    const s = useFoodStore.getState()
    expect(s.entries[meal.id]).toHaveLength(1)
    expect(s.entries.snack).toHaveLength(0)
    expect(s.history[0].mealId).toBe(meal.id)
  })

  test('удаление перекуса убирает его записи из дневника, журнал сохраняется', () => {
    const meal = useFoodStore.getState().addCustomMeal()
    useFoodStore.getState().addEntry(meal.id, { food: FOOD, grams: 120, kcal: 107, desc: '' })
    useFoodStore.getState().removeCustomMeal(meal.id)
    const s = useFoodStore.getState()
    expect(s.customMeals).toHaveLength(0)
    expect(s.entries[meal.id]).toBeUndefined()
    expect(s.history).toHaveLength(1)
  })
})

describe('getMeal и customMealCard: свои перекусы как секции дневника', () => {
  const { getMeal, customMealCard, MEALS } = require('@/lib/data/meals')

  test('customMealCard: имя и короткое имя «Перекус 2», картинка задана', () => {
    const card = customMealCard({ id: 'custom-1', name: 'Перекус 2' })
    expect(card).toMatchObject({ id: 'custom-1', name: 'Перекус 2', short: 'Перекус 2' })
    expect(card.image).toBeTruthy()
  })

  test('getMeal находит свой перекус по id, встроенные работают как раньше', () => {
    const customs = [{ id: 'custom-1', name: 'Перекус 2' }]
    expect(getMeal('custom-1', customs).name).toBe('Перекус 2')
    expect(getMeal('snack').name).toBe('Перекус/Полдник')
    expect(getMeal('snack', customs).id).toBe('snack')
  })

  test('неизвестный/удалённый id — безопасный фолбэк (Завтрак), как раньше', () => {
    expect(getMeal('custom-deleted').name).toBe(MEALS[0].name)
  })
})

// Режимы остатка калорий в сводке «Съедено за сегодня»:
// строгий по умолчанию (цель − съедено, сожжённое НЕ прибавляется —
// отзыв Кати: «строгий остаток по умолчанию») и «с учётом сожжённых»
// (цель − съедено + сожжено). Переключатель — goals.countBurned,
// карточка «Дневник питания» в разделе «Ещё».

// RN-стабы должны встать до импортов стора
jest.requireActual('./helpers/react-native-stub')
jest.requireActual('./helpers/async-storage-stub')

describe('remainderOf: режимы остатка', () => {
  let remainderOf

  beforeAll(() => {
    ;({ remainderOf } = require('@/lib/data/remainder'))
  })

  test('строгий режим по умолчанию: сожжённое НЕ прибавляется', () => {
    // Пример со скриншота Кати: 1200 − 1725 + 600 было 75, строго — −525
    expect(remainderOf(1200, 1725, 600)).toBe(-525)
    expect(remainderOf(1200, 1725, 600, false)).toBe(-525)
  })

  test('режим «с учётом сожжённых»: активность возвращается в остаток', () => {
    expect(remainderOf(1200, 1725, 600, true)).toBe(75)
    expect(remainderOf(2000, 1500, 300, true)).toBe(800)
  })

  test('цель не задана (0 или меньше) — остаток не считается', () => {
    expect(remainderOf(0, 500, 100, true)).toBe(null)
    expect(remainderOf(-1, 500, 100, true)).toBe(null)
  })

  test('остаток округляется до целых ккал', () => {
    expect(remainderOf(1200.4, 500.2, 0, false)).toBe(700)
    expect(remainderOf(1200.6, 500.2, 33.5, true)).toBe(734)
  })
})

describe('goals.countBurned: переключатель режима в сторе', () => {
  let useGoalsStore, DEFAULT_GOALS, AsyncStorage

  beforeAll(() => {
    ;({ useGoalsStore, DEFAULT_GOALS } = require('@/store/useGoalsStore'))
    AsyncStorage = require('./helpers/async-storage-stub').default
  })

  beforeEach(() => {
    useGoalsStore.setState({ goals: { ...DEFAULT_GOALS } })
  })

  test('по умолчанию строгий режим (countBurned: false)', () => {
    expect(DEFAULT_GOALS.countBurned).toBe(false)
    expect(useGoalsStore.getState().goals.countBurned).toBe(false)
  })

  test('переключатель сохраняется, остальные цели не тронуты', () => {
    useGoalsStore.getState().setGoals({ countBurned: true })
    const g = useGoalsStore.getState().goals
    expect(g.countBurned).toBe(true)
    expect(g.kcal).toBe(DEFAULT_GOALS.kcal)
    expect(g.macroNorms).toEqual(DEFAULT_GOALS.macroNorms)
  })

  test('гидратация старого хранилища без countBurned — строгий режим', async () => {
    // Хранилище «старого пользователя»: цели есть, countBurned ещё нет
    await AsyncStorage.setItem(
      'nutribear-goals-v1',
      JSON.stringify({ state: { goals: { kcal: 1500 } }, version: 1 })
    )
    await useGoalsStore.persist.rehydrate()
    const g = useGoalsStore.getState().goals
    expect(g.kcal).toBe(1500)
    expect(g.countBurned).toBe(false)
  })
})

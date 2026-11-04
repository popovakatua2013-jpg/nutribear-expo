// Тесты своих норм нутриентов в целях: setGoals сохраняет macroNorms,
// а при гидратации старого хранилища (без macroNorms) дефолт не теряется.

// RN-стабы должны встать до импортов стора
jest.requireActual('./helpers/react-native-stub')
jest.requireActual('./helpers/async-storage-stub')

describe('macroNorms: свои нормы нутриентов', () => {
  let useGoalsStore, DEFAULT_GOALS, AsyncStorage

  beforeAll(() => {
    ;({ useGoalsStore, DEFAULT_GOALS } = require('@/store/useGoalsStore'))
    AsyncStorage = require('./helpers/async-storage-stub').default
  })

  beforeEach(() => {
    useGoalsStore.setState({ goals: { ...DEFAULT_GOALS } })
  })

  test('setGoals сохраняет нормы, остальные цели не тронуты', () => {
    useGoalsStore.getState().setGoals({ macroNorms: { p: 100, f: 55, c: 220, fib: 30 } })
    const g = useGoalsStore.getState().goals
    expect(g.macroNorms).toEqual({ p: 100, f: 55, c: 220, fib: 30 })
    expect(g.kcal).toBe(DEFAULT_GOALS.kcal)
  })

  test('гидратация старого хранилища без macroNorms подставляет дефолт', async () => {
    // Хранилище «старого пользователя»: цели есть, macroNorms ещё нет
    await AsyncStorage.setItem(
      'nutribear-goals-v1',
      JSON.stringify({ state: { goals: { kcal: 1250 } }, version: 0 })
    )
    await useGoalsStore.persist.rehydrate()
    const g = useGoalsStore.getState().goals
    expect(g.kcal).toBe(1250)
    expect(g.macroNorms).toEqual({ p: 0, f: 0, c: 0, fib: 0 })
  })
})

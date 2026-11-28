// Тесты защиты от случайного добавления воды (отзыв Кати 28.11:
// «добавила воду несколько раз нечаянно, нет возможности удалить»):
// addWater возвращает id записи журнала; removeWaterLog(id) откатывает
// объём (кнопка «Отменить» в тосте); subtractSteps не уходит в минус.

jest.requireActual('./helpers/react-native-stub')
jest.requireActual('./helpers/async-storage-stub')

const { useActivityStore } = require('@/store/useActivityStore')

describe('вода: журнал и отмена случайного добавления', () => {
  beforeEach(() => {
    useActivityStore.setState({
      waterMl: 0,
      waterLog: [],
      extraSteps: 0,
      dayKey: useActivityStore.getState().dayKey,
    })
  })

  test('addWater пишет запись в журнал и возвращает её id', () => {
    const id = useActivityStore.getState().addWater(350)
    const s = useActivityStore.getState()
    expect(id).toBeTruthy()
    expect(s.waterMl).toBe(350)
    expect(s.waterLog).toHaveLength(1)
    expect(s.waterLog[0]).toMatchObject({ id, ml: 350 })
  })

  test('«Отменить»: removeWaterLog убирает запись и откатывает мл', () => {
    const a = useActivityStore.getState().addWater(350)
    useActivityStore.getState().addWater(300)
    expect(useActivityStore.getState().waterMl).toBe(650)

    useActivityStore.getState().removeWaterLog(a)
    const s = useActivityStore.getState()
    expect(s.waterMl).toBe(300)
    expect(s.waterLog).toHaveLength(1)
    expect(s.waterLog[0].id).not.toBe(a)
  })

  test('несколько случайных тапов подряд дают разные записи — каждую можно удалить', () => {
    const ids = [1, 2, 3].map(() => useActivityStore.getState().addWater(250))
    expect(new Set(ids).size).toBe(3)
    expect(useActivityStore.getState().waterMl).toBe(750)
    for (const id of ids) useActivityStore.getState().removeWaterLog(id)
    expect(useActivityStore.getState().waterMl).toBe(0)
    expect(useActivityStore.getState().waterLog).toHaveLength(0)
  })

  test('удаление не уходит в минус по дневной сумме', () => {
    const id = useActivityStore.getState().addWater(200)
    useActivityStore.getState().removeWaterLog(id)
    useActivityStore.getState().removeWaterLog(id) // второй раз — безопасно
    expect(useActivityStore.getState().waterMl).toBe(0)
  })

  test('editWaterLog пересчитывает дневную сумму', () => {
    const id = useActivityStore.getState().addWater(250)
    useActivityStore.getState().editWaterLog(id, { ml: 300 })
    expect(useActivityStore.getState().waterMl).toBe(300)
  })
})

describe('шаги: откат случайного добавления', () => {
  beforeEach(() => {
    useActivityStore.setState({ extraSteps: 0 })
  })

  test('subtractSteps убирает лишнее, но не уходит в минус', () => {
    useActivityStore.getState().addSteps(3000)
    useActivityStore.getState().subtractSteps(1000)
    expect(useActivityStore.getState().extraSteps).toBe(2000)
    useActivityStore.getState().subtractSteps(9999)
    expect(useActivityStore.getState().extraSteps).toBe(0)
    useActivityStore.getState().subtractSteps(-500) // мусор игнорируется
    expect(useActivityStore.getState().extraSteps).toBe(0)
  })
})

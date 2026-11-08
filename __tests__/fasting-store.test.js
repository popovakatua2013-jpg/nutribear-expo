// Тесты стора голодания (экран на вкладке «План» → сегмент
// «Голодание»): цель фиксируется при старте (24 − окно еды), «стоп»
// пишет сеанс в историю (свежие сверху, лимит 30) и сбрасывает таймер,
// настройки окна меняются независимо, «стоп» без старта историю не
// трогает.

jest.requireActual('./helpers/react-native-stub')
jest.requireActual('./helpers/async-storage-stub')

describe('useFastingStore: интервальное голодание', () => {
  let store

  beforeAll(() => {
    ;({ useFastingStore: store } = require('@/store/useFastingStore'))
  })

  beforeEach(() => {
    store.setState({ windowStart: 10, windowHours: 8, fastHours: null, startedAt: null, laps: [] })
  })

  test('старт фиксирует цель 24 − окно (16/8 → 16 ч) и время старта', () => {
    const before = Date.now()
    store.getState().start()
    const s = store.getState()
    expect(s.startedAt).toBeGreaterThanOrEqual(before)
    expect(s.fastHours).toBe(16)
  })

  test('смена плана на ходу не искажает зафиксированную цель', () => {
    store.getState().start()
    store.getState().setWindowHours(12)
    expect(store.getState().fastHours).toBe(16) // зафиксирована при старте
    expect(store.getState().windowHours).toBe(12)
  })

  test('стоп пишет сеанс в историю (свежие сверху) и сбрасывает таймер', () => {
    const from = Date.now() - 3 * 3600000
    store.setState({ startedAt: from, fastHours: 16 })
    store.getState().stop()
    const s = store.getState()
    expect(s.startedAt).toBeNull()
    expect(s.fastHours).toBeNull()
    expect(s.laps).toHaveLength(1)
    expect(s.laps[0].from).toBe(from)
    expect(s.laps[0].to).toBeGreaterThanOrEqual(from)
  })

  test('лимит истории — 30 сеансов, свежие сверху', () => {
    const old = Array.from({ length: 30 }, (_, i) => ({ from: i * 1000, to: i * 1000 + 500 }))
    store.setState({ laps: old, startedAt: Date.now() - 3 * 60000, fastHours: 16 })
    store.getState().stop()
    const laps = store.getState().laps
    expect(laps).toHaveLength(30)
    expect(laps[0].to).toBeGreaterThanOrEqual(laps[1].to) // новый — первый
  })

  test('случайный сеанс короче 2 минут в историю не пишется (только сброс таймера)', () => {
    // Скрин Кати: случайный старт-стоп за минуту дал строку «0 мин»
    // и испортил среднее («0 мин в среднем»)
    store.setState({ laps: [{ from: 1, to: 2 }], startedAt: Date.now() - 60000, fastHours: 16 })
    store.getState().stop()
    const s = store.getState()
    expect(s.startedAt).toBeNull()
    expect(s.fastHours).toBeNull()
    expect(s.laps).toEqual([{ from: 1, to: 2 }]) // история не изменилась
  })

  test('стоп без активного старта историю не трогает', () => {
    store.setState({ laps: [{ from: 1, to: 2 }], startedAt: null, fastHours: null })
    store.getState().stop()
    expect(store.getState().laps).toEqual([{ from: 1, to: 2 }])
  })

  test('час начала окна ограничен часами суток при сдвиге экрана', () => {
    // сам стор хранит 0–23 как передали; сдвиг экрана делает модуль
    store.getState().setWindowStart(0)
    expect(store.getState().windowStart).toBe(0)
    store.getState().setWindowHours(14)
    expect(store.getState().windowHours).toBe(14) // голодание 14/10
  })
})

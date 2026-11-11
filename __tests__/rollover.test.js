// Тесты перехода суток (lib/rollover). Аудит 06.11 отметил этот модуль
// как непротестированный, и P0-2 там уже был исправлен (гонка сторов).
// Здесь покрываем:
//   • checkDayRollover молчит, если сторы не догидрированы
//   • checkDayRollover молчит, если день не сменился
//   • при смене дня — уходящий день архивируется в историю, а дневник
//     и вода обнуляются (rollDay)
//   • архив держит максимум: если в истории уже было больше — не
//     перезаписывает меньшим (сторы могут быть не догидрированы)
//   • startRolloverWatcher возвращает функцию остановки
//
// Стабы RN/AsyncStorage должны встать до импортов сторов. Поскольку
// rollover.js импортирует expo-notifications через lib/notifs только
// косвенно (через напоминания), он в тестах поднимается без RN-рантайма.

jest.requireActual('./helpers/react-native-stub')
jest.requireActual('./helpers/async-storage-stub')

describe('lib/rollover: переход суток', () => {
  let checkDayRollover, startRolloverWatcher
  let useFoodStore, useActivityStore, useExerciseStore, useHistoryStore
  let dayKeyOf

  beforeAll(() => {
    ;({ checkDayRollover, startRolloverWatcher } = require('@/lib/rollover'))
    ;({ useFoodStore } = require('@/store/useFoodStore'))
    ;({ useActivityStore, selectTotalSteps } = require('@/store/useActivityStore'))
    ;({ useExerciseStore } = require('@/store/useExerciseStore'))
    ;({ useHistoryStore, dayKeyOf } = require('@/store/useHistoryStore'))
  })

  beforeEach(() => {
    // Сторы между тестами держат состояние — сбрасываем
    useHistoryStore.setState({ days: {} })
    useExerciseStore.setState({ logs: {}, custom: [] })
    useActivityStore.setState({
      waterMl: 0,
      extraSteps: 0,
      waterLog: [],
      pedometerSteps: 0,
      dayKey: dayKeyOf(),
    })
    useFoodStore.setState({
      goal: 'maintain',
      entries: { breakfast: [], lunch: [], dinner: [], snack: [] },
      customMeals: [],
      history: [],
      dayKey: dayKeyOf(),
    })
  })

  test('checkDayRollover возвращает false, если день не сменился', () => {
    // Сторы догидрированы (стаб мгновенно возвращает null), dayKey = сегодня
    expect(checkDayRollover()).toBe(false)
  })

  test('при смене дня — уходящий день архивируется в историю', () => {
    // Сымитируем вчера: в дневнике есть еда, в воде — стакан, в шагах —
    // накопленные шаги, в тренировках — запись
    const yesterday = dayKeyOf(new Date(Date.now() - 24 * 3600 * 1000))
    useFoodStore.setState({
      entries: {
        breakfast: [{ id: 'b1', name: 'Овсянка', grams: 100, kcal: 88, p: 3, f: 1, c: 14 }],
        lunch: [],
        dinner: [],
        snack: [],
      },
      dayKey: yesterday,
    })
    useActivityStore.setState({
      waterMl: 500,
      waterLog: [{ id: 'w1', ml: 500, time: '12:00', at: 1 }],
      extraSteps: 4000,
      pedometerSteps: 0,
      dayKey: yesterday,
    })
    useExerciseStore.setState({
      logs: { [yesterday]: [{ id: 'e1', exId: 'walk', name: 'Ходьба', emoji: '🚶', minutes: 30, kcal: 150 }] },
      custom: [],
    })

    const rolled = checkDayRollover()

    expect(rolled).toBe(true)
    // Дневник обнулён и прицеплен к сегодняшнему дню
    const food = useFoodStore.getState()
    expect(food.dayKey).toBe(dayKeyOf())
    expect(Object.values(food.entries).flat()).toHaveLength(0)
    // Вода и шаги обнулены, dayKey — сегодня
    const act = useActivityStore.getState()
    expect(act.dayKey).toBe(dayKeyOf())
    expect(act.waterMl).toBe(0)
    expect(act.extraSteps).toBe(0)
    expect(act.waterLog).toHaveLength(0)
    // Ушедший день записан в историю: калории, вода, шаги, сожжённые ккал
    const hist = useHistoryStore.getState().days[yesterday]
    expect(hist).toBeDefined()
    expect(hist.kcal).toBeGreaterThan(0)
    expect(hist.waterMl).toBe(500)
    expect(hist.steps).toBeGreaterThanOrEqual(4000)
    expect(hist.burned).toBeGreaterThanOrEqual(150)
  })

  test('архив не уменьшает уже записанные большие значения (Math.max)', () => {
    // В истории уже записано 3000 ккал за вчера — релоовер не должен
    // уронить значение, если в сторах оказалось меньше (например, при
    // неполной гидратации)
    const yesterday = dayKeyOf(new Date(Date.now() - 24 * 3600 * 1000))
    useHistoryStore.getState().record(yesterday, { kcal: 3000, steps: 9000, waterMl: 1500 })
    useFoodStore.setState({
      entries: { breakfast: [], lunch: [], dinner: [], snack: [] },
      dayKey: yesterday,
    })
    useActivityStore.setState({
      waterMl: 300,
      extraSteps: 1000,
      dayKey: yesterday,
    })

    checkDayRollover()

    const hist = useHistoryStore.getState().days[yesterday]
    expect(hist.kcal).toBe(3000)
    expect(hist.steps).toBe(9000)
    expect(hist.waterMl).toBe(1500)
  })

  test('отсутствие данных уходящего дня не плодит пустую запись в истории', () => {
    // Если за вчера ничего не было — не создаём запись с нулями
    // (иначе графики и стрики показывают «ведённый» пустой день)
    const yesterday = dayKeyOf(new Date(Date.now() - 24 * 3600 * 1000))
    useFoodStore.setState({
      entries: { breakfast: [], lunch: [], dinner: [], snack: [] },
      dayKey: yesterday,
    })
    useActivityStore.setState({
      waterMl: 0,
      extraSteps: 0,
      dayKey: yesterday,
    })
    useExerciseStore.setState({ logs: {}, custom: [] })

    checkDayRollover()

    const hist = useHistoryStore.getState().days[yesterday]
    expect(hist).toBeUndefined()
  })

  test('startRolloverWatcher возвращает функцию остановки', () => {
    // В тестовой среде AppState и setInterval работают (стабы), таймер
    // минимальный — старт/стоп не падает
    const stop = startRolloverWatcher()
    expect(typeof stop).toBe('function')
    expect(() => stop()).not.toThrow()
  })

  test('если оба dayKey уже сегодня — повторный вызов молчит', () => {
    // Стороны могут триггерить rollover watcher несколько раз — двойной
    // вызов не должен повторно архивировать уже архивированный день
    useActivityStore.setState({ dayKey: dayKeyOf() })
    useFoodStore.setState({ dayKey: dayKeyOf() })

    const first = checkDayRollover()
    const second = checkDayRollover()

    expect(first).toBe(false)
    expect(second).toBe(false)
  })
})

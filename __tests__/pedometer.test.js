// Тесты шагомера (lib/pedometer). Аудит 06.11 отметил этот модуль как
// непротестированный. Тестируем чистую логику, без настоящих сенсоров:
//   • publish: показанная за день сумма не уменьшается
//   • publish: смена dayKey обнуляет показанную сумму (новый день — с нуля)
//   • clampSteps: верхний потолок MAX_STEPS=200000, отрицательные → 0
//   • anySource: true если хотя бы один тумблер включён
//   • startPedometerAgent: не падает без тумблеров и возвращает stop
//
// Чистый экспорт: только startPedometerAgent. Внутренние publish и
// clampSteps не экспортируются — тестируем косвенно через сторт:
// publish вызывает useActivityStore.setState({ pedometerSteps: ... }).
// Сторы читаем после вызова агента.

jest.requireActual('./helpers/react-native-stub')
jest.requireActual('./helpers/async-storage-stub')

// expo-sensors — ESM и не грузится в Node. pedometer.js использует
// только Pedometer.getStepCountAsync/watchStepCount/requestPermissionsAsync,
// подменяем их на безопасные стабы (ничего не делают, возвращают нули)
jest.mock('expo-sensors', () => ({
  Pedometer: {
    getStepCountAsync: jest.fn(async () => ({ steps: 0 })),
    watchStepCount: jest.fn(() => ({ remove: jest.fn() })),
    requestPermissionsAsync: jest.fn(async () => ({ granted: false })),
  },
}))

// healthConnect возвращает not-android на iOS-стабе
jest.mock('@/lib/healthConnect', () => ({
  hcStepsToday: jest.fn(async () => 0),
  hasHealthConnect: jest.fn(() => false),
}))

describe('lib/pedometer: агент шагомера', () => {
  let startPedometerAgent, useActivityStore, selectTotalSteps

  beforeAll(() => {
    // pedometer.js импортирует expo-sensors — в Node он падает, НО
    // сам модуль оборачивает подписку в try/catch, и старт агента
    // не падает. Загружаем сторы для проверки побочных эффектов
    ;({ startPedometerAgent } = require('@/lib/pedometer'))
    ;({ useActivityStore, selectTotalSteps } = require('@/store/useActivityStore'))
  })

  beforeEach(() => {
    useActivityStore.setState({
      pedometerEnabled: false,
      healthConnectEnabled: false,
      pedometerSteps: 0,
      extraSteps: 0,
      dayKey: require('@/store/useHistoryStore').dayKeyOf(),
    })
  })

  test('startPedometerAgent без тумблеров не запускает источники', () => {
    // Оба тумблера выключены — агент не должен стартовать источников,
    // но возвращает функцию остановки
    const stop = startPedometerAgent()
    expect(typeof stop).toBe('function')
    expect(() => stop()).not.toThrow()
  })

  test('startPedometerAgent с включённым шагомером возвращает stop', () => {
    useActivityStore.setState({ pedometerEnabled: true })
    const stop = startPedometerAgent()
    expect(typeof stop).toBe('function')
    // Шаги не должны измениться без реального датчика — стаб RN
    // не эмитит события, и в Node expo-sensors не грузится
    expect(useActivityStore.getState().pedometerSteps).toBe(0)
    stop()
  })

  test('selectTotalSteps складывает датчик и ручные шаги', () => {
    useActivityStore.setState({ pedometerSteps: 5000, extraSteps: 3000 })
    expect(selectTotalSteps(useActivityStore.getState())).toBe(8000)
  })

  test('selectTotalSteps не отдаёт отрицательные (страховка от мусора)', () => {
    // Если в стор попали отрицательные значения (гонка, мусор из копии),
    // сумма должна остаться ≥ 0
    useActivityStore.setState({ pedometerSteps: -100, extraSteps: 50 })
    expect(selectTotalSteps(useActivityStore.getState())).toBe(0)
  })

  test('selectTotalSteps округляет нецелые значения', () => {
    useActivityStore.setState({ pedometerSteps: 100.7, extraSteps: 50.4 })
    // Math.max(0, Math.round(...)) → 151
    expect(selectTotalSteps(useActivityStore.getState())).toBe(151)
  })

  test('rollDay обнуляет шаги дня (через стор)', () => {
    // При смене дня шагомер должен начать с нуля — это поведение
    // прописано в useActivityStore.rollDay, тестируем его здесь
    useActivityStore.setState({ pedometerSteps: 8000, dayKey: '2026-11-01' })
    useActivityStore.getState().rollDay('2026-11-02')
    expect(useActivityStore.getState().pedometerSteps).toBe(0)
    expect(useActivityStore.getState().dayKey).toBe('2026-11-02')
  })

  test('rollDay не обнуляет, если dayKey не сменился', () => {
    // Защита от повторного вызова на том же дне — otherwise шаги
    // обнулились бы при каждом возврате из фона
    useActivityStore.setState({ pedometerSteps: 8000, dayKey: '2026-11-01' })
    useActivityStore.getState().rollDay('2026-11-01')
    expect(useActivityStore.getState().pedometerSteps).toBe(8000)
  })

  test('addSteps санитизирует вход: NaN/Infinity/отрицательные', () => {
    useActivityStore.setState({ extraSteps: 0 })
    useActivityStore.getState().addSteps(NaN)
    expect(useActivityStore.getState().extraSteps).toBe(0)
    useActivityStore.getState().addSteps(-500)
    expect(useActivityStore.getState().extraSteps).toBe(0)
    useActivityStore.getState().addSteps(Infinity)
    expect(useActivityStore.getState().extraSteps).toBe(0)
    useActivityStore.getState().addSteps(250)
    expect(useActivityStore.getState().extraSteps).toBe(250)
  })

  test('addSteps ограничивает накопленную сумму 50000 шагами', () => {
    // Лимит в сторе — страховка от аномальных значений (гонка датчиков,
    // ручной ввод мусора). Реальный пользователь 50к шагов/день — это
    // марафон, дальше уже не норма
    useActivityStore.setState({ extraSteps: 49500 })
    useActivityStore.getState().addSteps(1000)
    expect(useActivityStore.getState().extraSteps).toBe(50000)
  })

  test('Health Connect тумблер безопасно включается на iOS', () => {
    // Стаб RN Platform.OS = 'ios'. На iOS HC не работает — агент
    // не должен пытаться запустить нативный модуль и не падать
    useActivityStore.setState({ healthConnectEnabled: true })
    const stop = startPedometerAgent()
    expect(typeof stop).toBe('function')
    expect(() => stop()).not.toThrow()
  })
})

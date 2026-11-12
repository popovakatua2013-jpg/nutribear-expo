// Тесты расчёта минут активности для главной карточки «Активность 0/70 мин».
// Аудит 12.11.2026 (вечер, скриншот Кати): на главной «0 мин», хотя в
// журнале тренировка на 30 минут. Причина: минуты считались только из
// шагов (steps/100), без учёта записей тренировок.
// Теперь minutes = steps/100 + сумма минут тренировок за сегодня.

jest.requireActual('./helpers/react-native-stub')
jest.requireActual('./helpers/async-storage-stub')

describe('lib/data/dashboard: минуты активности', () => {
  let buildDashboard, exerciseMinutes

  beforeAll(() => {
    ;({ buildDashboard, exerciseMinutes } = require('@/lib/data/dashboard'))
  })

  test('exerciseMinutes: сумма минут из массива тренировок', () => {
    expect(
      exerciseMinutes([
        { id: 'e1', name: 'Ходьба', minutes: 30, kcal: 150 },
        { id: 'e2', name: 'Бег', minutes: 20, kcal: 220 },
      ])
    ).toBe(50)
  })

  test('exerciseMinutes: пустой массив → 0', () => {
    expect(exerciseMinutes([])).toBe(0)
  })

  test('exerciseMinutes: undefined → 0 (без exLogs)', () => {
    // Совместимость со старым кодом, который не передаёт exLogs
    expect(exerciseMinutes(undefined)).toBe(0)
    expect(exerciseMinutes(null)).toBe(0)
  })

  test('exerciseMinutes: мусорные записи (без minutes) пропускаются', () => {
    expect(
      exerciseMinutes([
        { id: 'e1', name: 'Без минут', kcal: 100 }, // minutes undefined
        null,
        'не объект',
        { id: 'e2', name: 'Бег', minutes: 25, kcal: 200 },
        { id: 'e3', name: 'NaN', minutes: 'мусор', kcal: 0 },
      ])
    ).toBe(25)
  })

  test('buildDashboard: минуты только из шагов, если нет тренировок', () => {
    const d = buildDashboard({
      hydrated: true,
      entries: { breakfast: [], lunch: [], dinner: [], snack: [] },
      waterMl: 0,
      extraSteps: 5000,
      goals: { kcal: 1800, waterMl: 2000, steps: 7000, minutes: 60 },
      exLogs: [],
    })
    // 5000 шагов / 100 = 50 минут
    expect(d.minutes).toBe(50)
    expect(d.minutesPct).toBe(83) // 50/60 ≈ 83%
  })

  test('buildDashboard: минуты = шаги + тренировки (баг-фикс)', () => {
    // Баг Кати: тренировка на 30 минут записана, но шагов 0 →
    // на главной показывалось «0/70 мин». Теперь 0/100 + 30 = 30 минут.
    const d = buildDashboard({
      hydrated: true,
      entries: { breakfast: [], lunch: [], dinner: [], snack: [] },
      waterMl: 0,
      extraSteps: 0,
      goals: { kcal: 1800, waterMl: 2000, steps: 7000, minutes: 70 },
      exLogs: [{ id: 'e1', name: 'Быстрая ходьба', minutes: 30, kcal: 121 }],
    })
    expect(d.minutes).toBe(30)
    expect(d.minutesPct).toBe(43) // 30/70 ≈ 43%
  })

  test('buildDashboard: шаги + тренировки складываются', () => {
    const d = buildDashboard({
      hydrated: true,
      entries: { breakfast: [], lunch: [], dinner: [], snack: [] },
      waterMl: 0,
      extraSteps: 3000, // 30 минут ходьбы
      goals: { kcal: 1800, waterMl: 2000, steps: 7000, minutes: 70 },
      exLogs: [
        { id: 'e1', name: 'Ходьба', minutes: 33, kcal: 85 },
        { id: 'e2', name: 'Быстрая ходьба', minutes: 30, kcal: 121 },
      ],
    })
    // 30 (шаги) + 33 + 30 = 93 минуты
    expect(d.minutes).toBe(93)
  })

  test('buildDashboard: без exLogs — минуты только из шагов (обратная совместимость)', () => {
    // Старый код, который не передаёт exLogs, должен работать как раньше
    const d = buildDashboard({
      hydrated: true,
      entries: { breakfast: [], lunch: [], dinner: [], snack: [] },
      waterMl: 0,
      extraSteps: 4000,
      goals: { kcal: 1800, waterMl: 2000, steps: 7000, minutes: 60 },
    })
    // 4000 / 100 = 40 минут, без тренировок
    expect(d.minutes).toBe(40)
  })

  test('buildDashboard: проценты ограничены 100 (перевыполнение цели)', () => {
    // 200 минут тренировок + 0 шагов, цель 70 → 200/70 > 100%, но не больше 100
    const d = buildDashboard({
      hydrated: true,
      entries: { breakfast: [], lunch: [], dinner: [], snack: [] },
      waterMl: 0,
      extraSteps: 0,
      goals: { kcal: 1800, waterMl: 2000, steps: 7000, minutes: 70 },
      exLogs: [{ id: 'e1', name: 'Марафон', minutes: 200, kcal: 1500 }],
    })
    expect(d.minutes).toBe(200)
    expect(d.minutesPct).toBe(100)
  })

  test('buildDashboard: цель минут = 0 → minutesPct = 0 (без деления на 0)', () => {
    const d = buildDashboard({
      hydrated: true,
      entries: { breakfast: [], lunch: [], dinner: [], snack: [] },
      waterMl: 0,
      extraSteps: 5000,
      goals: { kcal: 1800, waterMl: 2000, steps: 7000, minutes: 0 },
      exLogs: [],
    })
    expect(d.minutes).toBe(50)
    expect(d.minutesPct).toBe(0) // цель 0 → pct возвращает 0, без Infinity
  })
})

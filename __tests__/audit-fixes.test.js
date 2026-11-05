// Тесты фиксов полного аудита (2026-11-06): срок триала, лимит лога
// тренировок, санитизация чисел в сторах, единая точка смены цели,
// CSV-экспорт дневника и гейт ролловера на гидратацию.

// RN-стабы должны встать до импортов сторов
jest.requireActual('./helpers/react-native-stub')
jest.requireActual('./helpers/async-storage-stub')
// CSV-экспорт пишет файл — в тестах не нужен
jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: '/cache/',
  writeAsStringAsync: jest.fn(async () => undefined),
  deleteAsync: jest.fn(async () => undefined),
  EncodingType: { UTF8: 'utf8' },
}))
jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(async () => true),
  shareAsync: jest.fn(async () => undefined),
}))

const DAY = 86400000
function keyAgo(days) {
  const d = new Date(Date.now() - days * DAY)
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

describe('Premium: триал 7 дней истекает', () => {
  let useProStore
  beforeAll(() => {
    ;({ useProStore } = require('@/store/useProStore'))
  })

  test('свежий триал активен', () => {
    useProStore.setState({ pro: true, plan: 'trial', activatedAt: Date.now() - DAY })
    useProStore.getState().refresh()
    expect(useProStore.getState().pro).toBe(true)
  })

  test('триал старше 7 дней выключается (раньше был вечным)', () => {
    useProStore.setState({ pro: true, plan: 'trial', activatedAt: Date.now() - 8 * DAY })
    useProStore.getState().refresh()
    const s = useProStore.getState()
    expect(s.pro).toBe(false)
    expect(s.plan).toBeNull()
  })

  test('месяц/год не трогаем', () => {
    useProStore.setState({ pro: true, plan: 'year', activatedAt: Date.now() - 400 * DAY })
    useProStore.getState().refresh()
    expect(useProStore.getState().pro).toBe(true)
  })
})

describe('Тренировки: лимит 210 дней и защита от NaN', () => {
  let useExerciseStore, dayBurned
  beforeAll(() => {
    ;({ useExerciseStore } = require('@/store/useExerciseStore'))
    ;({ dayBurned } = require('@/store/useExerciseStore'))
  })

  test('лог обрезается до 210 последних дней', () => {
    const logs = {}
    for (let i = 220; i >= 1; i--) logs[keyAgo(i)] = []
    useExerciseStore.setState({ logs })
    useExerciseStore.getState().addLog(keyAgo(0), { exId: 'e1', name: 'Т', emoji: '🏋️', minutes: 30, kcal: 150 })
    const keys = Object.keys(useExerciseStore.getState().logs)
    expect(keys.length).toBeLessThanOrEqual(210)
    expect(keys).toContain(keyAgo(0))
    expect(keys).not.toContain(keyAgo(220))
  })

  test('битые ккал записи считаются нулём, а не NaN', () => {
    expect(dayBurned({ '2026-11-05': [{ kcal: NaN }, { kcal: 120 }] }, '2026-11-05')).toBe(120)
    expect(dayBurned({ '2026-11-05': [{ kcal: 'abc' }] }, '2026-11-05')).toBe(0)
  })
})

describe('Копилка и вес: санитизация чисел', () => {
  test('earn: NaN/минус не портят монетки', () => {
    const { useShopStore } = require('@/store/useShopStore')
    useShopStore.setState({ coins: 50 })
    useShopStore.getState().earn(Number('мусор'))
    expect(useShopStore.getState().coins).toBe(50)
    useShopStore.getState().earn(-30)
    expect(useShopStore.getState().coins).toBe(50)
    useShopStore.getState().earn(3.6)
    expect(useShopStore.getState().coins).toBe(54)
  })

  test('addWeight: мусор отклоняется, значение округляется до 0,1 кг', () => {
    const { useProfileStore } = require('@/store/useProfileStore')
    useProfileStore.setState({ weightKg: 70, weights: [] })
    useProfileStore.getState().addWeight(Number('мусор'))
    expect(useProfileStore.getState().weights).toHaveLength(0)
    expect(useProfileStore.getState().weightKg).toBe(70)
    useProfileStore.getState().addWeight(70.56)
    expect(useProfileStore.getState().weightKg).toBe(70.6)
    expect(useProfileStore.getState().weights[0].kg).toBe(70.6)
  })

  test('addSteps: мусор и минус не меняют шаги', () => {
    const { useActivityStore } = require('@/store/useActivityStore')
    useActivityStore.setState({ extraSteps: 1000 })
    useActivityStore.getState().addSteps(Number('мусор'))
    expect(useActivityStore.getState().extraSteps).toBe(1000)
    useActivityStore.getState().addSteps(-500)
    expect(useActivityStore.getState().extraSteps).toBe(1000)
    useActivityStore.getState().addSteps(1500)
    expect(useActivityStore.getState().extraSteps).toBe(2500)
  })
})

describe('Цель питания: единая точка applyGoalChoice', () => {
  test('id пресета и норма ккал меняются вместе', () => {
    const { useFoodStore } = require('@/store/useFoodStore')
    const { useGoalsStore } = require('@/store/useGoalsStore')
    const { applyGoalChoice } = require('@/lib/data/goals-apply')
    applyGoalChoice('lose')
    expect(useFoodStore.getState().goal).toBe('lose')
    expect(useGoalsStore.getState().goals.kcal).toBe(1800) // 450+620+530+200
    applyGoalChoice('maintain', 2100) // личная норма поверх пресета
    expect(useFoodStore.getState().goal).toBe('maintain')
    expect(useGoalsStore.getState().goals.kcal).toBe(2100)
  })
})

describe('CSV дневника: файл, а не текст', () => {
  test('buildCsv собирает строки с ; и кавычками', () => {
    const { buildCsv } = require('@/lib/data/diary-export')
    const csv = buildCsv(
      [{ day: '2026-11-05', time: '13:00', mealId: 'lunch', name: 'Каша "Янтарная"', grams: 250, kcal: 250, p: 8, f: 4, c: 40 }],
      (id) => (id === 'lunch' ? 'Обед' : id)
    )
    const lines = csv.split('\r\n')
    expect(lines[0]).toContain('Дата;Время;Приём;Продукт')
    // Каждое поле в кавычках, внутренние кавычки удваиваются (Excel-стандарт)
    expect(lines[1]).toBe('"05.11.2026";"13:00";"Обед";"Каша ""Янтарная""";"250";"250";"8";"4";"40"')
  })

  test('shareCsv отправляет файл через expo-sharing', async () => {
    const Sharing = require('expo-sharing')
    const FileSystem = require('expo-file-system/legacy')
    const { shareCsv } = require('@/lib/data/diary-export')
    await shareCsv('nutribear-diary.csv', 'a;b')
    expect(FileSystem.writeAsStringAsync).toHaveBeenCalled()
    expect(Sharing.shareAsync).toHaveBeenCalledWith(
      '/cache/nutribear-diary.csv',
      expect.objectContaining({ mimeType: 'text/csv' })
    )
  })
})

describe('Ролловер: гейт на гидратацию', () => {
  test('пока сторы догружаются — ничего не чистим', () => {
    const { checkDayRollover } = require('@/lib/rollover')
    // Свежие сторы в тесте ещё не гидратированы — переход дня
    // обязан подождать (раньше архивация писала в пустую историю)
    expect(checkDayRollover()).toBe(false)
  })
})

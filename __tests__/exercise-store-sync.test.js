// Тесты syncHistoryBurned: после правки тренировок «сожжено» дня сразу
// пересчитывается в дневной истории (тренировки + шаги дня), уже
// архивированное большее значение не уронить (Math.max).

// RN-стабы должны встать до импортов стора
jest.requireActual('./helpers/react-native-stub')
jest.requireActual('./helpers/async-storage-stub')

const DAY = 86400000

// Ключ дня со сдвигом: keyAt(0) = сегодня, keyAt(-1) = вчера
function keyAt(offsetDays) {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

describe('syncHistoryBurned: «сожжено» дня в дневной истории', () => {
  let useExerciseStore, syncHistoryBurned, useHistoryStore

  beforeAll(() => {
    ;({ useExerciseStore, syncHistoryBurned } = require('@/store/useExerciseStore'))
    ;({ useHistoryStore } = require('@/store/useHistoryStore'))
  })

  beforeEach(() => {
    useExerciseStore.setState({ logs: {}, custom: [] })
    useHistoryStore.setState({ days: {} })
  })

  test('тренировки за вчера сразу досчитываются в историю (перенос записи)', () => {
    // Вчера: 6000 шагов в истории, тренировок нет — сгорало только по шагам
    useHistoryStore.getState().record(keyAt(-1), { steps: 6000, burned: 240 })
    // Перенесли вчерашнюю тренировку: 60 мин × 10 ккал
    useExerciseStore.getState().addLog(keyAt(-1), { exId: 'walk', name: 'Ходьба', emoji: '🚶', minutes: 60, kcal: 600 })
    syncHistoryBurned(keyAt(-1))
    const day = useHistoryStore.getState().days[keyAt(-1)]
    // 600 ккал тренировки + 6000 шагов × 0.04 = 240 → 840
    expect(day.burned).toBe(840)
  })

  test('уже архивированное большее значение не уронить', () => {
    useHistoryStore.getState().record(keyAt(-1), { burned: 1206 })
    useExerciseStore.getState().addLog(keyAt(-1), { exId: 'run', name: 'Бег', emoji: '🏃', minutes: 30, kcal: 400 })
    syncHistoryBurned(keyAt(-1))
    // Math.max(1206, 400) — история не уменьшается
    expect(useHistoryStore.getState().days[keyAt(-1)].burned).toBe(1206)
  })

  test('шаги берутся из истории дня, а не из живого датчика', () => {
    // История вчера: 1000 шагов (→ 40 ккал), тренировок нет
    useHistoryStore.getState().record(keyAt(-1), { steps: 1000, burned: 40 })
    syncHistoryBurned(keyAt(-1))
    expect(useHistoryStore.getState().days[keyAt(-1)].burned).toBe(40)
    // Сегодня в сторах других дней тренировок нет — не влияет на вчера
    useExerciseStore.getState().addLog(keyAt(0), { exId: 'run', name: 'Бег', emoji: '🏃', minutes: 30, kcal: 500 })
    syncHistoryBurned(keyAt(-1))
    expect(useHistoryStore.getState().days[keyAt(-1)].burned).toBe(40)
  })

  test('день без истории и без тренировок — запись дня не создаётся', () => {
    syncHistoryBurned(keyAt(-1))
    expect(useHistoryStore.getState().days[keyAt(-1)]).toBeUndefined()
  })

  test('после удаления sync не уронит уже записанное (сегодня поправит главная)', () => {
    useHistoryStore.getState().record(keyAt(0), { burned: 300 })
    const todayKey = keyAt(0)
    useExerciseStore.getState().addLog(todayKey, { exId: 'run', name: 'Бег', emoji: '🏃', minutes: 20, kcal: 250 })
    syncHistoryBurned(todayKey)
    expect(useHistoryStore.getState().days[todayKey].burned).toBe(300) // max(300, 250)
    const id = useExerciseStore.getState().logs[todayKey][0].id
    useExerciseStore.getState().removeLog(todayKey, id)
    syncHistoryBurned(todayKey)
    // Math.max защищает от догидрированных сторов; живое «сегодня»
    // всё равно пересчитывает главная (recordToday без Math.max)
    expect(useHistoryStore.getState().days[todayKey].burned).toBe(300)
  })

  test('чужие дни при sync не трогаются', () => {
    useHistoryStore.getState().record(keyAt(-1), { burned: 300 })
    const todayKey = keyAt(0)
    useExerciseStore.getState().addLog(todayKey, { exId: 'run', name: 'Бег', emoji: '🏃', minutes: 20, kcal: 250 })
    syncHistoryBurned(todayKey)
    expect(useHistoryStore.getState().days[todayKey].burned).toBe(250)
    expect(useHistoryStore.getState().days[keyAt(-1)].burned).toBe(300)
  })
})

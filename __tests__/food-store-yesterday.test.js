// Тесты записи еды «за вчера» (приём после полуночи): addEntry с dayOff
// пишет только в журнал со вчерашним днём, досчитывает вчерашние калории
// в дневную историю (календарь/сводка дня/отчёты) и не трогает дневник
// «сегодня»; readdRow пробрасывает выбор дня в стор.

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

const FOOD = { id: 'f1', name: 'Каша', emoji: '🥣', kcal: 250, p: 8, f: 4, c: 40 }

describe('addEntry: запись «за вчера»', () => {
  let useFoodStore, useHistoryStore, dayKeyOf

  beforeAll(() => {
    ;({ useFoodStore } = require('@/store/useFoodStore'))
    ;({ useHistoryStore, dayKeyOf } = require('@/store/useHistoryStore'))
  })

  beforeEach(() => {
    const empty = { breakfast: [], lunch: [], dinner: [], snack: [] }
    useFoodStore.setState({ entries: { ...empty }, history: [], customMeals: [], dayKey: dayKeyOf() })
    useHistoryStore.setState({ days: {} })
  })

  test('обычная запись (dayOff=0) — в дневник и журнал за сегодня', () => {
    useFoodStore.getState().addEntry('dinner', { food: FOOD, grams: 100, kcal: 250, desc: '' })
    const s = useFoodStore.getState()
    expect(s.entries.dinner).toHaveLength(1)
    expect(s.history).toHaveLength(1)
    expect(s.history[0].day).toBe(dayKeyOf())
    // дневную историю не трогаем — её пишет архивация в полночь
    expect(useHistoryStore.getState().days[dayKeyOf()]).toBeUndefined()
  })

  test('запись за вчера (dayOff=1) — только журнал, дневник сегодня чист', () => {
    useFoodStore.getState().addEntry('dinner', { food: FOOD, grams: 100, kcal: 250, desc: '' }, 1)
    const s = useFoodStore.getState()
    expect(s.entries.dinner).toHaveLength(0)
    expect(s.history).toHaveLength(1)
    expect(s.history[0].day).toBe(keyAt(-1))
    expect(s.history[0].mealId).toBe('dinner')
    expect(s.history[0].kcal).toBe(250)
  })

  test('вчерашние калории досчитываются в дневную историю', () => {
    useFoodStore.getState().addEntry('snack', { food: FOOD, grams: 100, kcal: 250, desc: '' }, 1)
    useFoodStore.getState().addEntry('snack', { food: FOOD, grams: 100, kcal: 320, desc: '' }, 1)
    expect(useHistoryStore.getState().days[keyAt(-1)].kcal).toBe(570)
  })

  test('уже архивированное большее значение не уронится', () => {
    useHistoryStore.setState({ days: { [keyAt(-1)]: { steps: 0, kcal: 1000, waterMl: 0, burned: 0, xp: 0 } } })
    useFoodStore.getState().addEntry('snack', { food: FOOD, grams: 100, kcal: 250, desc: '' }, 1)
    // журнал за день суммарно даёт 250, но архив помнит 1000 — не затираем
    expect(useHistoryStore.getState().days[keyAt(-1)].kcal).toBe(1000)
  })

  test('readdRow пробрасывает выбор дня в стор', () => {
    const { readdRow } = require('@/lib/data/readd')
    const row = { id: 'r1', foodId: 'f2', name: 'Суп', emoji: '🍲', grams: 300, kcal: 320 }
    readdRow(useFoodStore.getState().addEntry, 'lunch', row, 1)
    const s = useFoodStore.getState()
    expect(s.entries.lunch).toHaveLength(0)
    expect(s.history).toHaveLength(1)
    expect(s.history[0].day).toBe(keyAt(-1))
    expect(s.history[0].kcal).toBe(320)
  })
})

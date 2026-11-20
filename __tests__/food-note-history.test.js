// Тесты отзыва Кати 20.11 (окно «Добавить приём пищи»): комментарий к
// записи (note) — сохраняется в журнале, правится в записи, переносится
// при повторном добавлении из «Истории»/«Недавних»; группировка журнала
// по дням для карточки «История» — метки «Сегодня/Вчера/Позавчера/дата»,
// лимит строк, порядок «новые сверху» сохраняется.

// RN-стабы должны встать до импортов стора
jest.requireActual('./helpers/react-native-stub')
jest.requireActual('./helpers/async-storage-stub')

const FOOD = { id: 'f1', name: 'Каша', emoji: '🥣', kcal: 250, p: 8, f: 4, c: 40 }

// Ключ дня со сдвигом: keyAt(0) = сегодня, keyAt(-1) = вчера
function keyAt(offsetDays) {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

describe('note: комментарий к записи еды', () => {
  let useFoodStore, dayKeyOf, readdRow

  beforeAll(() => {
    ;({ useFoodStore } = require('@/store/useFoodStore'))
    ;({ dayKeyOf } = require('@/store/useHistoryStore'))
    ;({ readdRow } = require('@/lib/data/readd'))
  })

  beforeEach(() => {
    const empty = { breakfast: [], lunch: [], dinner: [], snack: [] }
    useFoodStore.setState({ entries: { ...empty }, history: [], customMeals: [], dayKey: dayKeyOf() })
  })

  test('addEntry сохраняет комментарий рядом с описанием', () => {
    useFoodStore
      .getState()
      .addEntry('dinner', { food: FOOD, grams: 100, kcal: 250, desc: 'на воде', note: 'без масла' })
    const row = useFoodStore.getState().history[0]
    expect(row.desc).toBe('на воде')
    expect(row.note).toBe('без масла')
    // и в живом дневнике тоже
    expect(useFoodStore.getState().entries.dinner[0].note).toBe('без масла')
  })

  test('пустой и пробельный комментарий превращаются в пустую строку', () => {
    useFoodStore.getState().addEntry('lunch', { food: FOOD, grams: 100, kcal: 250, note: '   ' })
    const row = useFoodStore.getState().history[0]
    expect(row.note).toBe('')
  })

  test('длинный комментарий обрезается до 200 символов', () => {
    useFoodStore.getState().addEntry('lunch', { food: FOOD, grams: 100, kcal: 250, note: 'а'.repeat(260) })
    expect(useFoodStore.getState().history[0].note).toHaveLength(200)
  })

  test('updateEntry меняет комментарий (и умеет стирать)', () => {
    useFoodStore.getState().addEntry('snack', { food: FOOD, grams: 100, kcal: 250 })
    const entry = useFoodStore.getState().entries.snack[0]
    useFoodStore.getState().updateEntry('snack', entry.id, { note: 'с солью' })
    expect(useFoodStore.getState().entries.snack[0].note).toBe('с солью')
    expect(useFoodStore.getState().history[0].note).toBe('с солью')
    useFoodStore.getState().updateEntry('snack', entry.id, { note: '' })
    expect(useFoodStore.getState().entries.snack[0].note).toBe('')
  })

  test('readdRow переносит комментарий из журнала при повторном добавлении', () => {
    const store = useFoodStore.getState()
    store.addEntry('breakfast', { food: FOOD, grams: 80, kcal: 200, note: 'на воде, без сахара' }, 1)
    const row = useFoodStore.getState().history[0]
    readdRow(useFoodStore.getState().addEntry, 'breakfast', row)
    const added = useFoodStore.getState().entries.breakfast[0]
    expect(added.note).toBe('на воде, без сахара')
    expect(added.grams).toBe(80)
  })
})

describe('historyGroups: журнал по дням для карточки «История»', () => {
  let historyGroups, dayLabelOf

  beforeAll(() => {
    ;({ historyGroups, dayLabelOf } = require('@/lib/data/history-groups'))
  })

  const TODAY = '2030-01-05' // пятница; вчера = 04.01, позавчера = 03.01

  test('метки дней: Сегодня, Вчера, Позавчера, дальше дата', () => {
    expect(dayLabelOf('2030-01-05', TODAY)).toBe('Сегодня')
    expect(dayLabelOf('2030-01-04', TODAY)).toBe('Вчера')
    expect(dayLabelOf('2030-01-03', TODAY)).toBe('Позавчера')
    expect(dayLabelOf('2030-01-02', TODAY)).toBe('02.01.2030')
    expect(dayLabelOf('2029-12-31', TODAY)).toBe('31.12.2029')
  })

  test('сдвиг через границу месяца — «Вчера» считается от переданного дня', () => {
    expect(dayLabelOf('2030-01-01', '2030-01-02')).toBe('Вчера')
    expect(dayLabelOf('2029-12-31', '2030-01-01')).toBe('Вчера')
  })

  test('группировка по дням в порядке журнала (новые сверху)', () => {
    const rows = [
      { id: 'r1', day: TODAY, name: 'Овсянка' },
      { id: 'r2', day: TODAY, name: 'Кофе' },
      { id: 'r3', day: '2030-01-04', name: 'Сельдь' },
    ]
    const groups = historyGroups(rows, 20, TODAY)
    expect(groups).toHaveLength(2)
    expect(groups[0].label).toBe('Сегодня')
    expect(groups[0].rows.map((r) => r.id)).toEqual(['r1', 'r2'])
    expect(groups[1].label).toBe('Вчера')
    expect(groups[1].rows.map((r) => r.id)).toEqual(['r3'])
  })

  test('лимит строк обрезает журнал, не ломая группы', () => {
    const rows = [
      { id: 'r1', day: TODAY, name: 'А' },
      { id: 'r2', day: TODAY, name: 'Б' },
      { id: 'r3', day: '2030-01-04', name: 'В' },
    ]
    const groups = historyGroups(rows, 2, TODAY)
    expect(groups).toHaveLength(1)
    expect(groups[0].rows.map((r) => r.id)).toEqual(['r1', 'r2'])
  })

  test('пустой журнал — пустой список групп', () => {
    expect(historyGroups([], 20, TODAY)).toEqual([])
    expect(historyGroups(undefined, 20, TODAY)).toEqual([])
  })
})

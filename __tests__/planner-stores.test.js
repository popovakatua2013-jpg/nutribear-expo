// Тесты планового хаба: стор недельного меню (вкладка «План»)
// (ключ недели с понедельника, добавление/копирование/очистка, калории
// дня) и списка покупок (порядок «некупленные сверху», toggle/clearDone).

jest.requireActual('./helpers/react-native-stub')
jest.requireActual('./helpers/async-storage-stub')

// Фиксированные даты (локальное время): 2026-11-09 — понедельник
const MON = '2026-11-09'
const NEXT_MON = '2026-11-16'

describe('useMealPlanStore: недельное меню', () => {
  let store, weekKeyOf, weekKeyShift, dayDate, dayKcal

  beforeAll(() => {
    ;({
      useMealPlanStore: store,
      weekKeyOf,
      weekKeyShift,
      dayDate,
      dayKcal,
    } = require('@/store/useMealPlanStore'))
  })

  beforeEach(() => {
    store.setState({ plans: {} })
  })

  test('weekKeyOf: среда и воскресенье — одна неделя, следующий понедельник — новая', () => {
    expect(weekKeyOf(new Date(2026, 10, 11, 12))).toBe(MON) // среда
    expect(weekKeyOf(new Date(2026, 10, 15, 12))).toBe(MON) // воскресенье
    expect(weekKeyOf(new Date(2026, 10, 16, 12))).toBe(NEXT_MON) // понедельник
  })

  test('weekKeyShift: сдвиг на неделю туда-обратно', () => {
    expect(weekKeyShift(MON, 1)).toBe(NEXT_MON)
    expect(weekKeyShift(NEXT_MON, -1)).toBe(MON)
  })

  test('dayDate: idx 0 — понедельник 9-го, idx 6 — воскресенье 15-го', () => {
    expect(dayDate(MON, 0).getDate()).toBe(9)
    expect(dayDate(MON, 6).getDate()).toBe(15)
  })

  test('addItem: блюдо в приём, dayKcal считает сумму; removeItem убирает', () => {
    store.getState().addItem(MON, 0, 'breakfast', {
      name: 'Овсянка', emoji: '🥣', grams: 250, kcal: 220, kcal100: 88, p: 3, f: 1.7, c: 15,
    })
    store.getState().addItem(MON, 0, 'lunch', {
      name: 'Суп', emoji: '🍲', grams: 300, kcal: 350,
    })
    const day = store.getState().plans[MON][0]
    expect(day.breakfast).toHaveLength(1)
    expect(dayKcal(day)).toBe(570)
    const id = day.breakfast[0].id
    store.getState().removeItem(MON, 0, 'breakfast', id)
    expect(store.getState().plans[MON][0].breakfast).toHaveLength(0)
    expect(dayKcal(store.getState().plans[MON][0])).toBe(350)
  })

  test('copyDay: копия с новым id; clearDay очищает приём', () => {
    store.getState().addItem(MON, 0, 'lunch', { name: 'Суп', emoji: '🍲', grams: 300, kcal: 350 })
    store.getState().copyDay(MON, 0, MON, 1)
    const a = store.getState().plans[MON][0].lunch[0]
    const b = store.getState().plans[MON][1].lunch[0]
    expect(b.name).toBe('Суп')
    expect(b.id).not.toBe(a.id)
    store.getState().clearDay(MON, 1)
    expect(store.getState().plans[MON][1].lunch).toHaveLength(0)
  })

  test('copyPrevWeek: копирует прошлую неделю; без прошлой — false', () => {
    expect(store.getState().copyPrevWeek(NEXT_MON)).toBe(false)
    store.getState().addItem(MON, 2, 'dinner', { name: 'Творог', emoji: '🥛', grams: 200, kcal: 180 })
    expect(store.getState().copyPrevWeek(NEXT_MON)).toBe(true)
    expect(store.getState().plans[NEXT_MON][2].dinner[0].name).toBe('Творог')
  })

  test('clearWeek удаляет неделю целиком', () => {
    store.getState().addItem(MON, 0, 'snack', { name: 'Яблоко', emoji: '🍎', grams: 150, kcal: 78 })
    store.getState().clearWeek(MON)
    expect(store.getState().plans[MON]).toBeUndefined()
  })
})

describe('useShoppingStore: список покупок', () => {
  let store, sortItems

  beforeAll(() => {
    ;({ useShoppingStore: store, sortItems } = require('@/store/useShoppingStore'))
  })

  beforeEach(() => {
    store.setState({ items: [] })
  })

  test('add: пустая строка не добавляется, обычная — да', () => {
    expect(store.getState().add('   ')).toBe(false)
    expect(store.getState().add('Молоко')).toBe(true)
    expect(store.getState().items).toHaveLength(1)
    expect(store.getState().items[0].name).toBe('Молоко')
  })

  test('toggle + порядок: купленное уходит вниз списка', () => {
    store.getState().add('Хлеб')
    store.getState().add('Сыр')
    const first = store.getState().items[0]
    store.getState().toggle(first.id)
    expect(store.getState().items.map((it) => it.name)).toEqual(['Сыр', 'Хлеб'])
    expect(store.getState().items[1].done).toBe(true)
  })

  test('clearDone и remove', () => {
    store.getState().add('Чай')
    store.getState().add('Кофе')
    store.getState().toggle(store.getState().items[0].id)
    store.getState().clearDone()
    expect(store.getState().items).toHaveLength(1)
    store.getState().remove(store.getState().items[0].id)
    expect(store.getState().items).toHaveLength(0)
  })

  test('sortItems: некупленные по времени, купленные в конец', () => {
    const out = sortItems([
      { id: 'a', name: 'A', done: true, createdAt: 1 },
      { id: 'b', name: 'B', done: false, createdAt: 3 },
      { id: 'c', name: 'C', done: false, createdAt: 2 },
    ])
    expect(out.map((i) => i.id)).toEqual(['c', 'b', 'a'])
  })
})

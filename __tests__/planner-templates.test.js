// Тесты шаблонов дней меню (useMealPlanStore, просьба Кати 10.11:
// «сохраняешь любимый день меню и вставляешь его на любой день одним
// тапом») и замены блюда (replaceItem — «похожее по ккал», новое блюдо
// встаёт на то же место с новым id).

jest.requireActual('./helpers/react-native-stub')
jest.requireActual('./helpers/async-storage-stub')

// Фиксированные даты (локальное время): 2026-11-09 — понедельник
const MON = '2026-11-09'
const NEXT_MON = '2026-11-16'

describe('useMealPlanStore: шаблоны дней', () => {
  let store

  beforeAll(() => {
    ;({ useMealPlanStore: store } = require('@/store/useMealPlanStore'))
  })

  beforeEach(() => {
    store.setState({ plans: {}, templates: [] })
  })

  const addDay = (weekKey, idx) => {
    store.getState().addItem(weekKey, idx, 'breakfast', {
      name: 'Овсянка', emoji: '🥣', grams: 250, kcal: 220, kcal100: 88,
    })
    store.getState().addItem(weekKey, idx, 'lunch', {
      name: 'Суп', emoji: '🍲', grams: 300, kcal: 350, kcal100: 117,
    })
  }

  test('saveDayAsTemplate: копия дня с новыми id, ккал и число блюд', () => {
    addDay(MON, 2)
    const tpl = store.getState().saveDayAsTemplate(MON, 2, 'Любимый день')
    expect(tpl).not.toBeNull()
    expect(tpl.name).toBe('Любимый день')
    expect(tpl.kcal).toBe(570)
    expect(tpl.dishes).toBe(2)
    expect(tpl.day.breakfast).toHaveLength(1)
    expect(tpl.day.breakfast[0].name).toBe('Овсянка')
    // id в шаблоне — новые копии, не те же объекты
    const src = store.getState().plans[MON][2]
    expect(tpl.day.breakfast[0].id).not.toBe(src.breakfast[0].id)
    expect(store.getState().templates).toHaveLength(1)
  })

  test('saveDayAsTemplate: пустой день — null; без имени — «Шаблон N»', () => {
    expect(store.getState().saveDayAsTemplate(MON, 0, '')).toBeNull()
    addDay(MON, 1)
    const a = store.getState().saveDayAsTemplate(MON, 1, '')
    const b = store.getState().saveDayAsTemplate(MON, 1, '   ')
    expect(a.name).toBe('Шаблон 1')
    expect(b.name).toBe('Шаблон 2')
  })

  test('applyTemplate: меню дня заменяется, id новые; несуществующий — false', () => {
    addDay(MON, 2)
    const tpl = store.getState().saveDayAsTemplate(MON, 2, 'День')
    // у целевого дня уже своё меню — оно заменится
    addDay(NEXT_MON, 4)
    expect(store.getState().applyTemplate('нет-такого', NEXT_MON, 4)).toBe(false)
    expect(store.getState().applyTemplate(tpl.id, NEXT_MON, 4)).toBe(true)
    const day = store.getState().plans[NEXT_MON][4]
    expect(dayKcalLocal(day)).toBe(570)
    expect(day.breakfast[0].name).toBe('Овсянка')
    // вставка в другой день — снова новые id (не те, что в шаблоне)
    expect(day.breakfast[0].id).not.toBe(tpl.day.breakfast[0].id)
    // вставка в пустой день тоже работает
    expect(store.getState().applyTemplate(tpl.id, MON, 6)).toBe(true)
    expect(store.getState().plans[MON][6].lunch[0].name).toBe('Суп')
  })

  test('removeTemplate: удаляет; неизвестный id — false', () => {
    addDay(MON, 0)
    const tpl = store.getState().saveDayAsTemplate(MON, 0, 'День')
    expect(store.getState().removeTemplate('нет-такого')).toBe(false)
    expect(store.getState().removeTemplate(tpl.id)).toBe(true)
    expect(store.getState().templates).toHaveLength(0)
  })

  const dayKcalLocal = (day) =>
    ['breakfast', 'lunch', 'dinner', 'snack'].reduce(
      (n, m) => n + (day[m] || []).reduce((s, it) => s + (Number(it.kcal) || 0), 0),
      0,
    )
})

describe('useMealPlanStore: замена блюда (похожее по ккал)', () => {
  let store

  beforeAll(() => {
    ;({ useMealPlanStore: store } = require('@/store/useMealPlanStore'))
  })

  beforeEach(() => {
    store.setState({ plans: {}, templates: [] })
  })

  test('replaceItem: новое блюдо на том же месте, id новый, ккал пересчитаны', () => {
    store.getState().addItem(MON, 0, 'lunch', {
      name: 'Паста болоньезе', emoji: '🍝', grams: 250, kcal: 395, kcal100: 158,
    })
    store.getState().addItem(MON, 0, 'lunch', {
      name: 'Овощной салат', emoji: '🥗', grams: 150, kcal: 78, kcal100: 52,
    })
    const list = store.getState().plans[MON][0].lunch
    const oldId = list[0].id

    store.getState().replaceItem(MON, 0, 'lunch', oldId, {
      name: 'Плов с курицей', emoji: '🍛', grams: 250, kcal: 475, kcal100: 190, p: 8.5, f: 7.6, c: 22.4,
    })

    const next = store.getState().plans[MON][0].lunch
    expect(next).toHaveLength(2)
    expect(next[0].name).toBe('Плов с курицей') // позиция сохранена
    expect(next[1].name).toBe('Овощной салат') // сосед не тронут
    expect(next[0].id).not.toBe(oldId)
    expect(next[0].kcal).toBe(475)
    expect(next[0].kcal100).toBe(190)
    expect(next[0].source).toBe('local')
  })

  test('replaceItem: неизвестный itemId и чужой день — состояние не меняется', () => {
    store.getState().addItem(MON, 0, 'lunch', { name: 'Суп', emoji: '🍲', grams: 300, kcal: 350 })
    store.getState().replaceItem(MON, 0, 'lunch', 'нет-такого', { name: 'X', grams: 100, kcal: 100 })
    expect(store.getState().plans[MON][0].lunch[0].name).toBe('Суп')
    store.getState().replaceItem(MON, 5, 'lunch', 'нет-такого', { name: 'X', grams: 100, kcal: 100 })
    expect(store.getState().plans[MON][5]).toBeUndefined()
  })
})

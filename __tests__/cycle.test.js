// Тесты трекера цикла (useCycleStore): фазы дня, прогноз следующего
// начала, отметка и перенос даты, гигиена истории, восстановление
// из бэкапа (normLength/normBleed). Без медицинских допущений —
// только арифметика дней.

jest.requireActual('./helpers/react-native-stub')
jest.requireActual('./helpers/async-storage-stub')
// Фото пишутся в файловую систему — в тестах не нужны
jest.mock('@/lib/photos', () => ({
  restorePhotos: jest.fn(async () => true),
  collectPhotosForBackup: jest.fn(async (items) => []),
}))

const DAY = 86400000
const { useCycleStore, phaseOf, phaseHint, nextStartKey, daysToNext, bleedDayKeys, normLength, normBleed } =
  require('@/store/useCycleStore')

// Ключ дня со сдвигом от «опорного сегодня»: anchorKey(0) = сегодня
function keyAt(offsetDays, base) {
  const d = new Date(`${base}T00:00:00`)
  d.setDate(d.getDate() + offsetDays)
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

describe('чистые функции фаз', () => {
  test('нет даты начала — фазы нет', () => {
    expect(phaseOf(null, 28, 5, '2026-11-06')).toBeNull()
  })

  test('начало в будущем — фазы нет', () => {
    expect(phaseOf('2026-11-20', 28, 5, '2026-11-06')).toBeNull()
  })

  test('день 1 — менструальная фаза', () => {
    const p = phaseOf('2026-11-06', 28, 5, '2026-11-06')
    expect(p.dayInCycle).toBe(1)
    expect(p.phase).toBe('menstrual')
  })

  test('дни 6–12 — фолликулярная, 13–15 — окно овуляции (цикл 28)', () => {
    expect(phaseOf('2026-11-01', 28, 5, '2026-11-07').phase).toBe('follicular')
    expect(phaseOf('2026-11-01', 28, 5, '2026-11-13').phase).toBe('ovulation')
    expect(phaseOf('2026-11-01', 28, 5, '2026-11-14').phase).toBe('ovulation')
    expect(phaseOf('2026-11-01', 28, 5, '2026-11-15').phase).toBe('ovulation')
    expect(phaseOf('2026-11-01', 28, 5, '2026-11-16').phase).toBe('luteal')
  })

  test('для короткого цикла овуляция ближе (цикл 24 → день 10±1)', () => {
    // start 01.11, длина 24 → овуляция = 24-14 = 10-й день = 10.11
    expect(phaseOf('2026-11-01', 24, 4, '2026-11-10').phase).toBe('ovulation')
    expect(phaseOf('2026-11-01', 24, 4, '2026-11-14').phase).toBe('luteal')
  })

  test('настройки вне границ срезаются (22–36 / 3–8 внутри норм)', () => {
    expect(normLength(10)).toBe(21)
    expect(normLength(90)).toBe(38)
    expect(normLength(undefined)).toBe(28)
    expect(normBleed(0)).toBe(2)
    expect(normBleed(30)).toBe(10)
  })

  test('прогноз следующего начала и дней до него', () => {
    expect(nextStartKey('2026-11-01', 28)).toBe('2026-11-29')
    expect(daysToNext('2026-11-01', 28, '2026-11-06')).toBe(23)
    // Задержка: сегодня позже прогноза — отрицательное число
    expect(daysToNext('2026-11-01', 28, '2026-12-05')).toBe(-6)
  })

  test('подсказки есть у всех фаз и нет у неизвестной', () => {
    for (const f of ['menstrual', 'follicular', 'ovulation', 'luteal']) {
      expect(phaseHint(f).text.length).toBeGreaterThan(10)
    }
    expect(phaseHint('unknown')).toBeNull()
  })

  test('bleedDayKeys выбирает только дни месячных в диапазоне', () => {
    const history = [{ start: '2026-11-01' }, { start: '2026-10-04' }]
    const keys = bleedDayKeys(history, 28, 5, '2026-10-06', '2026-11-06')
    // Октябрьский цикл: 04–08.10 → в диапазон попадают 06,07,08; ноябрьский 01–05
    expect(keys).toEqual(['2026-10-06', '2026-10-07', '2026-10-08', '2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05'])
  })
})

describe('useCycleStore', () => {
  beforeEach(() => {
    useCycleStore.getState().resetAll()
  })

  test('logStart: сегодня записывается, дубль и будущее — нет', () => {
    const store = useCycleStore
    const today = new Date()
    const p = (n) => String(n).padStart(2, '0')
    const todayKey = `${today.getFullYear()}-${p(today.getMonth() + 1)}-${p(today.getDate())}`
    expect(store.getState().logStart(todayKey)).toBe(true)
    expect(store.getState().lastStart).toBe(todayKey)
    expect(store.getState().history[0].start).toBe(todayKey)
    // Дубль того же дня
    expect(store.getState().logStart(todayKey)).toBe(false)
    // Будущее — нельзя
    const future = keyAt(5, todayKey)
    expect(store.getState().logStart(future)).toBe(false)
    expect(store.getState().lastStart).toBe(todayKey)
  })

  test('новый start сдвигает прежний в историю и подрезает её до 12', () => {
    const store = useCycleStore
    const today = new Date()
    const p = (n) => String(n).padStart(2, '0')
    const todayKey = `${today.getFullYear()}-${p(today.getMonth() + 1)}-${p(today.getDate())}`
    // 14 старых записей
    const history = Array.from({ length: 14 }, (_, i) => ({ start: keyAt(-(i + 2) * 28, todayKey) }))
    useCycleStore.setState({ lastStart: keyAt(-28, todayKey), history })
    store.getState().logStart(todayKey)
    const s = store.getState()
    expect(s.lastStart).toBe(todayKey)
    expect(s.history.length).toBe(12)
    expect(s.history.some((r) => r.start === keyAt(-28, todayKey))).toBe(true)
  })

  test('shiftLastStart: двигает дату, но не в будущее и не глубже 90 дней', () => {
    const store = useCycleStore
    const today = new Date()
    const p = (n) => String(n).padStart(2, '0')
    const todayKey = `${today.getFullYear()}-${p(today.getMonth() + 1)}-${p(today.getDate())}`
    useCycleStore.setState({ lastStart: todayKey })
    // −1 день: ок
    store.getState().shiftLastStart(-1)
    expect(store.getState().lastStart).toBe(keyAt(-1, todayKey))
    // +1 день вернёт на вчера→сегодня? Нет: вчера+1 = сегодня — ок (не будущее)
    store.getState().shiftLastStart(1)
    expect(store.getState().lastStart).toBe(todayKey)
    // Ещё +1 — будущее, отказ
    store.getState().shiftLastStart(1)
    expect(store.getState().lastStart).toBe(todayKey)
    // Уводим глубоко в прошлое: 5 раз по −20 → −80 ок, −100 отказ (>90),
    // поэтому последний успешный сдвиг = −80 дней
    useCycleStore.setState({ lastStart: todayKey })
    for (let i = 0; i < 5; i++) store.getState().shiftLastStart(-20)
    expect(store.getState().lastStart).toBe(keyAt(-80, todayKey))
  })

  test('setSettings нормализует значения', () => {
    useCycleStore.getState().setSettings({ length: 999, bleed: 1 })
    expect(useCycleStore.getState().length).toBe(38)
    expect(useCycleStore.getState().bleed).toBe(2)
  })

  test('resetAll возвращает стартовые значения', () => {
    useCycleStore.setState({ enabled: true, lastStart: '2026-11-01', history: [{ start: '2026-11-01' }] })
    useCycleStore.getState().resetAll()
    const s = useCycleStore.getState()
    expect(s.enabled).toBe(false)
    expect(s.lastStart).toBeNull()
    expect(s.history).toEqual([])
    expect(s.length).toBe(28)
  })

  test('восстановление из бэкапа: битые записи отфильтровываются', () => {
    // Применяем applyBackup из lib/backup — он должен валидировать cycle
    const { applyBackup } = require('@/lib/backup')
    return applyBackup({
      app: 'NutriBear',
      cycle: {
        enabled: true,
        lastStart: '2026-11-01',
        length: 26,
        bleed: 4,
        history: [{ start: '2026-11-01' }, { start: 'мусор' }, 'ещё мусор'],
      },
    }).then(() => {
      const s = useCycleStore.getState()
      expect(s.enabled).toBe(true)
      expect(s.lastStart).toBe('2026-11-01')
      expect(s.length).toBe(26)
      expect(s.bleed).toBe(4)
      expect(s.history).toEqual([{ start: '2026-11-01' }])
    })
  })
})

test('константа DAY нужна только читаемости тестов', () => {
  expect(DAY).toBe(86400000)
})

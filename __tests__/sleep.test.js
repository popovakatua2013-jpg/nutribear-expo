// Тесты трекера сна (ввод «лёг/встал»): разбор времени, длительность ночи
// через полночь, форматирование, средний сон и ночи в норме, запись
// sleepMin в дневную историю и её видимость в отчётах (history,
// periodTotals), «ведённый день» дисциплины и цели по сну.

// RN-стабы должны встать до импортов сторов (dayKeyOf живёт рядом с ними)
jest.requireActual('./helpers/react-native-stub')
jest.requireActual('./helpers/async-storage-stub')

const {
  parseTimeToMin,
  sleepMinutes,
  fmtSleep,
  fmtSleepShort,
  sleepAvg,
  nightsInNorm,
  SLEEP_NORM_MIN,
} = require('@/lib/data/sleep')
const { METRICS } = require('@/lib/data/metrics')
const { EMPTY_DAY, dayKeyOf, useHistoryStore } = require('@/store/useHistoryStore')
const { DEFAULT_GOALS } = require('@/store/useGoalsStore')
const { history } = require('@/lib/data/activity')
const { discipline, dayHasRecords, periodTotals } = require('@/lib/data/reports')
const { foodInsight, weightStands } = require('@/lib/data/insights')

// Ключ дня со сдвигом: keyAt(0) — сегодня, keyAt(-1) — вчера
function keyAt(offsetDays) {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return dayKeyOf(d)
}

describe('parseTimeToMin — разбор «ЧЧ:ММ»', () => {
  test('«23:30» — 1410 минут от полуночи', () => {
    expect(parseTimeToMin('23:30')).toBe(23 * 60 + 30)
  })

  test('ведущий ноль не обязателен: «7:05» — 425 минут', () => {
    expect(parseTimeToMin('7:05')).toBe(7 * 60 + 5)
  })

  test('границы суток: «00:00» и «23:59»', () => {
    expect(parseTimeToMin('00:00')).toBe(0)
    expect(parseTimeToMin('23:59')).toBe(1439)
  })

  test('мусор отсекается: «25:00», «12:5», «abc», «», null, «12:60»', () => {
    expect(parseTimeToMin('25:00')).toBeNull()
    expect(parseTimeToMin('12:5')).toBeNull()
    expect(parseTimeToMin('abc')).toBeNull()
    expect(parseTimeToMin('')).toBeNull()
    expect(parseTimeToMin(null)).toBeNull()
    expect(parseTimeToMin('12:60')).toBeNull()
  })
})

describe('sleepMinutes — длительность ночи', () => {
  test('через полночь: «23:30» → «07:00» = 450 мин (7 ч 30 мин)', () => {
    expect(sleepMinutes('23:30', '07:00')).toBe(450)
  })

  test('ровно 8 часов: «23:00» → «07:00»', () => {
    expect(sleepMinutes('23:00', '07:00')).toBe(480)
  })

  test('дневной сон без перехода через полночь: «14:00» → «14:30» = 30 мин', () => {
    expect(sleepMinutes('14:00', '14:30')).toBe(30)
  })

  test('одинаковые времена — 0 (не мусор: окно честно скажет «время совпадает», запись блокируется)', () => {
    expect(sleepMinutes('23:00', '23:00')).toBe(0)
  })

  test('мусор в поле — null (кнопка «Сохранить» блокируется)', () => {
    expect(sleepMinutes('25:00', '07:00')).toBeNull()
    expect(sleepMinutes('23:xx', '07:00')).toBeNull()
    expect(sleepMinutes(null, '07:00')).toBeNull()
  })

  test('принимает готовые минуты (числа) — для Health Connect в будущем', () => {
    expect(sleepMinutes(1410, 420)).toBe(450)
  })
})

describe('fmtSleep / fmtSleepShort — форматирование', () => {
  test('450 → «7 ч 30 мин»', () => {
    expect(fmtSleep(450)).toBe('7 ч 30 мин')
  })

  test('420 → «7 ч», 45 → «45 мин», 0 → «0 мин»', () => {
    expect(fmtSleep(420)).toBe('7 ч')
    expect(fmtSleep(45)).toBe('45 мин')
    expect(fmtSleep(0)).toBe('0 мин')
  })

  test('короткий формат: 450 → «7:30», 45 → «0:45»', () => {
    expect(fmtSleepShort(450)).toBe('7:30')
    expect(fmtSleepShort(45)).toBe('0:45')
  })
})

describe('Сон в реестре показателей и целях', () => {
  const sleep = METRICS.find((m) => m.key === 'sleepMin')

  test('sleepMin в METRICS: «Сон», сиреневый, генитив «сна»', () => {
    expect(sleep).toBeDefined()
    expect(sleep.label).toBe('Сон')
    expect(sleep.gen).toBe('сна')
    expect(sleep.color).toBe('#c084fc')
    expect(sleep.invert).toBe(false)
  })

  test('fmt часов: 480 → «8ч», формат значения: 450 → «7 ч 30 мин»', () => {
    expect(sleep.yFmt(480)).toBe('8ч')
    expect(sleep.fmt(450)).toBe('7 ч 30 мин')
  })

  test('цель по сну по умолчанию — 420 мин (норма взрослого 7–9 ч)', () => {
    expect(DEFAULT_GOALS.sleepMin).toBe(420)
    expect(SLEEP_NORM_MIN).toBe(420)
  })

  test('EMPTY_DAY содержит sleepMin: 0 — дни без сна честные нули', () => {
    expect(EMPTY_DAY.sleepMin).toBe(0)
  })
})

describe('Средний сон и ночи в норме', () => {
  test('пустые дни среднее не топят: сон могли начать вести вчера', () => {
    const rows = [{ sleepMin: 0 }, { sleepMin: 420 }, { sleepMin: 480 }, {}]
    expect(sleepAvg(rows)).toBe(450)
  })

  test('нет записей — среднее 0 (не NaN)', () => {
    expect(sleepAvg([])).toBe(0)
    expect(sleepAvg([{ sleepMin: 0 }, {}])).toBe(0)
  })

  test('ночи в норме: ≥ 7 ч считаются, кастомная цель уважается', () => {
    const rows = [{ sleepMin: 480 }, { sleepMin: 420 }, { sleepMin: 300 }, { sleepMin: 0 }]
    expect(nightsInNorm(rows)).toBe(2)
    expect(nightsInNorm(rows, 300)).toBe(3)
    expect(nightsInNorm(rows, 481)).toBe(0)
  })
})

describe('Запись сна в дневную историю', () => {
  beforeEach(() => {
    useHistoryStore.setState({ days: {} })
  })

  test('record кладёт sleepMin в свой день, history() его видит', () => {
    useHistoryStore.getState().record(keyAt(0), { sleepMin: 450 })
    const rows = history(7, null)
    const today = rows[rows.length - 1]
    expect(today.key).toBe(keyAt(0))
    expect(today.sleepMin).toBe(450)
  })

  test('ночь «вчера» попадает во вчерашний день пробуждения', () => {
    useHistoryStore.getState().record(keyAt(-1), { sleepMin: 390 })
    const rows = history(7, null)
    expect(rows[rows.length - 2].sleepMin).toBe(390)
    expect(rows[rows.length - 1].sleepMin).toBe(0)
  })

  test('перезапись ночи заменяет значение (patch сливается с днём)', () => {
    const k = keyAt(0)
    useHistoryStore.getState().record(k, { sleepMin: 300 })
    useHistoryStore.getState().record(k, { sleepMin: 480 })
    expect(useHistoryStore.getState().days[k].sleepMin).toBe(480)
  })

  test('живое «сегодня» (шаги/еда) не затирает записанный сон', () => {
    useHistoryStore.getState().record(keyAt(0), { sleepMin: 450 })
    const rows = history(7, { steps: 1000, kcal: 1500, waterMl: 500, burned: 100, xp: 30 })
    const today = rows[rows.length - 1]
    expect(today.steps).toBe(1000)
    expect(today.sleepMin).toBe(450)
  })
})

describe('Сон в отчётах: итоги, дисциплина, «ведённый день»', () => {
  beforeEach(() => {
    useHistoryStore.setState({ days: {} })
  })

  test('periodTotals суммирует минуты сна за период', () => {
    useHistoryStore.getState().record(keyAt(0), { sleepMin: 450 })
    useHistoryStore.getState().record(keyAt(-1), { sleepMin: 390 })
    expect(periodTotals(7, 0, null).sleepMin).toBe(840)
  })

  test('день только со сном — «ведённый» для дисциплины и среднего', () => {
    expect(dayHasRecords({ steps: 0, kcal: 0, waterMl: 0, burned: 0, sleepMin: 450 })).toBe(true)
    expect(dayHasRecords({ steps: 0, kcal: 0, waterMl: 0, burned: 0, sleepMin: 0 })).toBe(false)
    const rows = [
      { steps: 0, kcal: 0, waterMl: 0, burned: 0, sleepMin: 450 },
    ]
    expect(discipline(rows, {}).recorded).toBe(1)
  })

  test('уровень дня теплокарты по цели сна: 8 ч — met, 5 ч — mid, 1 ч — low', () => {
    // dayLevel(key, value, goal) — цель по сну 420 мин
    const { dayLevel } = require('@/lib/data/reports')
    expect(dayLevel('sleepMin', 480, 420)).toBe('met')
    expect(dayLevel('sleepMin', 300, 420)).toBe('mid')
    expect(dayLevel('sleepMin', 60, 420)).toBe('low')
    expect(dayLevel('sleepMin', 0, 420)).toBe('none')
  })
})

describe('Подсказка «мало сна» в персональных подсказках', () => {
  const now = new Date()
  const iso = (offsetDays) => new Date(now.getTime() - offsetDays * 86400000).toISOString()

  // Вес стоит: два свежих взвешивания с разницей ≤ 0,3 кг (weightStands)
  const standingWeights = [
    { kg: 70.0, date: iso(0) },
    { kg: 70.2, date: iso(3) },
  ]

  // Ночь короткая/долгая — для компактности строк
  const night = (min) => ({ kcal: 0, waterMl: 0, p: 0, fib: 0, sleepMin: min })

  test('3 короткие ночи + вес стоит → «Мало сна — и вес стоит»', () => {
    const rows = [night(390), night(400), night(410)]
    const hint = foodInsight({ rows, goals: null, weights: standingWeights })
    expect(hint).not.toBeNull()
    expect(hint.id).toBe('sleep-low-stall')
    expect(hint.title).toBe('Мало сна — и вес стоит')
    expect(hint.text).toContain('3 ночи подряд короче 7 ч')
  })

  test('3 короткие ночи без данных веса → «Мало сна» без «вес стоит»', () => {
    const hint = foodInsight({ rows: [night(350), night(400), night(419)], goals: null, weights: [] })
    expect(hint.id).toBe('sleep-low')
    expect(hint.title).toBe('Мало сна')
    expect(hint.text).not.toContain('вес не двигается')
  })

  test('меньше 3 записанных ночей — подсказки нет (не выдумываем проблемы)', () => {
    expect(foodInsight({ rows: [night(300), night(300)], goals: null, weights: [] })).toBeNull()
  })

  test('3 ночи в норме — подсказки нет', () => {
    expect(
      foodInsight({ rows: [night(420), night(480), night(450)], goals: null, weights: [] })
    ).toBeNull()
  })

  test('своя цель по сну уважается: при цели 6 ч ночи 6:10 — уже норма', () => {
    const goals = { ...DEFAULT_GOALS, sleepMin: 360 }
    const short = foodInsight({ rows: [night(350), night(355), night(340)], goals, weights: [] })
    expect(short.id).toBe('sleep-low')
    expect(short.text).toContain('6 ч')
    const ok = foodInsight({ rows: [night(360), night(370), night(380)], goals, weights: [] })
    expect(ok).toBeNull()
  })

  test('правило сна работает БЕЗ дневника питания (вести еду не обязательно)', () => {
    // ни один день не ведён по еде/воде, но 3 ночи записаны
    const hint = foodInsight({ rows: [night(300), night(300), night(300)], goals: null, weights: [] })
    expect(hint.id).toBe('sleep-low')
  })

  test('пищевые правила не срабатывают по 2 дням при 3 коротких ночах', () => {
    // 2 ведённых дня с низким белком + 3 короткие ночи → про сон,
    // а не про белок (белок считается только по трём ведённым дням)
    const rows = [
      { kcal: 1500, waterMl: 1500, p: 20, fib: 5, sleepMin: 0 },
      { kcal: 1500, waterMl: 1500, p: 20, fib: 5, sleepMin: 0 },
      night(300),
      night(300),
      night(300),
    ]
    const hint = foodInsight({ rows, goals: { ...DEFAULT_GOALS, kcal: 2000 }, weights: [] })
    expect(hint.id).toBe('sleep-low')
  })

  test('приоритет: мало белка И мало сна — побеждает белок (пример Кати)', () => {
    const rows = [
      { kcal: 1500, waterMl: 1500, p: 20, fib: 10, sleepMin: 300 },
      { kcal: 1500, waterMl: 1500, p: 20, fib: 10, sleepMin: 300 },
      { kcal: 1500, waterMl: 1500, p: 20, fib: 10, sleepMin: 300 },
    ]
    const hint = foodInsight({ rows, goals: { ...DEFAULT_GOALS, kcal: 2000 }, weights: standingWeights })
    expect(hint.id).toBe('protein-low-stall')
  })

  test('weightStands: вес движется — вариант «вес стоит» не показывается', () => {
    const moving = [
      { kg: 71.5, date: iso(0) },
      { kg: 70.2, date: iso(3) },
    ]
    expect(weightStands(moving)).toBe(false)
    const hint = foodInsight({ rows: [night(300), night(300), night(300)], goals: null, weights: moving })
    expect(hint.id).toBe('sleep-low')
  })
})

describe('Пинок «пора спать»: настройки в сторе напоминаний', () => {
  test('блок sleep по умолчанию — выключен, время 22:30', () => {
    const { useActivityStore } = require('@/store/useActivityStore')
    expect(useActivityStore.getState().reminder.sleep).toEqual({
      enabled: false,
      time: '22:30',
    })
  })

  test('setReminder включает пинок, не трогая остальное', () => {
    const { useActivityStore } = require('@/store/useActivityStore')
    const before = useActivityStore.getState().reminder.exercise
    useActivityStore.getState().setReminder({ sleep: { enabled: true, time: '23:00' } })
    const r = useActivityStore.getState().reminder
    expect(r.sleep).toEqual({ enabled: true, time: '23:00' })
    expect(r.exercise).toEqual(before) // соседние пинки не задеты
    // вернуть как было
    useActivityStore.getState().setReminder({ sleep: { enabled: false, time: '22:30' } })
  })
})

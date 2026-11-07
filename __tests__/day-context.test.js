// Тесты «Особых дней» (lib/data/dayContext + useDayTypesStore) и витрины
// «Тренировок» (lib/data/exerciseStats). Отзыв Кати: корректировка
// калорий в особые дни «нигде не фиксировалась» — проверяем, что метка
// дня (ручная или авто из цикла) пересчитывает норму, а чистые функции
// витрины считают неделю/стрик/популярное правильно.

jest.requireActual('./helpers/react-native-stub')
jest.requireActual('./helpers/async-storage-stub')
jest.mock('@/lib/photos', () => ({
  restorePhotos: jest.fn(async () => true),
  collectPhotosForBackup: jest.fn(async (items) => []),
}))

const { dayMark, kcalWithDayMark, DAY_TYPES } = require('@/lib/data/dayContext')
const { useDayTypesStore, DEFAULT_DELTAS } = require('@/store/useDayTypesStore')
const {
  dayMinutes,
  weekStats,
  workoutStreak,
  popularTypes,
  recentWorkouts,
  dayLabel,
  fmtHours,
  dynamicsSeries,
  WHO_WEEK_MIN,
} = require('@/lib/data/exerciseStats')

// Ключ дня со сдвигом от базовой даты
function keyAt(offsetDays, base = '2026-11-08') {
  const d = new Date(`${base}T00:00:00`)
  d.setDate(d.getDate() + offsetDays)
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

const ctx = (marks = {}, deltas = DEFAULT_DELTAS) => ({ marks, deltas })

describe('dayMark: ручная метка и авто-цикл', () => {
  const cycle = {
    enabled: true,
    lastStart: '2026-11-06',
    length: 28,
    bleed: 5,
    history: [],
  }

  test('без меток и без цикла — обычный день', () => {
    expect(dayMark('2026-11-08', ctx(), null)).toBeNull()
  })

  test('ручная метка праздника возвращает тип и прибавку', () => {
    const m = dayMark('2026-11-08', ctx({ '2026-11-08': 'holiday' }), null)
    expect(m.type).toBe('holiday')
    expect(m.delta).toBe(DEFAULT_DELTAS.holiday)
    expect(m.auto).toBe(false)
  })

  test('дни менструации подставляются из трекера автоматически', () => {
    // start 06.11 + bleed 5 → 06..10.11 — особые дни
    expect(dayMark('2026-11-06', ctx(), cycle).type).toBe('cycle')
    expect(dayMark('2026-11-10', ctx(), cycle).type).toBe('cycle')
    expect(dayMark('2026-11-11', ctx(), cycle)).toBeNull() // уже после
  })

  test('ручная метка сильнее авто-цикла (командировка поверх месячных)', () => {
    const m = dayMark('2026-11-07', ctx({ '2026-11-07': 'trip' }), cycle)
    expect(m.type).toBe('trip')
    expect(m.auto).toBe(false)
  })

  test('выключенный трекер цикла — авто-дней нет', () => {
    const off = { ...cycle, enabled: false }
    expect(dayMark('2026-11-07', ctx(), off)).toBeNull()
  })

  test('кривая/чужая метка — как её нет', () => {
    expect(dayMark('2026-11-08', ctx({ '2026-11-08': 'vacation' }), null)).toBeNull()
  })

  test('все три типа имеют витрину (эмодзи/название)', () => {
    expect(DAY_TYPES.cycle.label).toBe('Менструация')
    expect(DAY_TYPES.trip.label).toBe('Командировка')
    expect(DAY_TYPES.holiday.label).toBe('Праздник')
    expect(DAY_TYPES.cycle.emoji).toBe('🌙')
  })
})

describe('kcalWithDayMark: перерасчёт нормы дня', () => {
  const cycle = { enabled: true, lastStart: '2026-11-06', length: 28, bleed: 5, history: [] }

  test('база + прибавка праздника', () => {
    expect(kcalWithDayMark(1200, '2026-11-08', ctx({ '2026-11-08': 'holiday' }), null)).toBe(
      1200 + DEFAULT_DELTAS.holiday
    )
  })

  test('обычный день — база без изменений', () => {
    expect(kcalWithDayMark(1200, '2026-11-08', ctx(), null)).toBe(1200)
  })

  test('авто-день цикла тоже повышает норму', () => {
    expect(kcalWithDayMark(1200, '2026-11-07', ctx(), cycle)).toBe(1200 + DEFAULT_DELTAS.cycle)
  })

  test('цель не задана (0) — перерасчёта нет', () => {
    expect(kcalWithDayMark(0, '2026-11-08', ctx({ '2026-11-08': 'trip' }), null)).toBe(0)
  })

  test('прибавка 0 — день помечен, норма прежняя', () => {
    expect(kcalWithDayMark(1200, '2026-11-08', ctx({ '2026-11-08': 'trip' }, { trip: 0 }), null)).toBe(1200)
  })
})

describe('useDayTypesStore: метки и прибавки', () => {
  test('setMark ставит и снимает метку дня', () => {
    const s = useDayTypesStore.getState()
    s.setMark('2026-11-08', 'trip')
    expect(useDayTypesStore.getState().marks['2026-11-08']).toBe('trip')
    s.setMark('2026-11-08', null)
    expect(useDayTypesStore.getState().marks['2026-11-08']).toBeUndefined()
  })

  test('setDelta срезает в границы 0…1000 и игнорит чужой тип', () => {
    const s = useDayTypesStore.getState()
    s.setDelta('holiday', 5000)
    expect(useDayTypesStore.getState().deltas.holiday).toBe(1000)
    s.setDelta('holiday', -50)
    expect(useDayTypesStore.getState().deltas.holiday).toBe(0)
    s.setDelta('vacation', 999)
    expect(useDayTypesStore.getState().deltas.vacation).toBeUndefined()
    s.setDelta('holiday', DEFAULT_DELTAS.holiday)
  })
})

describe('exerciseStats: витрина тренировок', () => {
  const logs = {
    // Сегодня — бег 30 мин / 300 ккал
    [keyAt(0)]: [{ id: 'a', exId: 'run', name: 'Бег', emoji: '🏃', minutes: 30, kcal: 300 }],
    // Вчера — силовая 60 мин / 200 ккал
    [keyAt(-1)]: [{ id: 'b', exId: 'strength', name: 'Силовая', emoji: '🏋️', minutes: 60, kcal: 200 }],
    // 8 дней назад — йога 60 мин (прошлая неделя)
    [keyAt(-8)]: [{ id: 'c', exId: 'yoga', name: 'Йога', emoji: '🧘', minutes: 60, kcal: 100 }],
  }
  const now = new Date('2026-11-08T12:00:00')

  test('dayMinutes считает минуты дня', () => {
    expect(dayMinutes(logs, keyAt(0))).toBe(30)
    expect(dayMinutes(logs, keyAt(2))).toBe(0)
  })

  test('weekStats: минуты недели, % от 150 мин ВОЗ, дельта к прошлой неделе', () => {
    const w = weekStats(logs, now)
    expect(w.minutes).toBe(90) // 30 + 60
    // Прошлая неделя: только йога 8 дней назад = 60 мин = 40% от 150
    expect(w.prevPct).toBe(40)
    expect(w.pct).toBe(Math.round((90 / WHO_WEEK_MIN) * 100))
    expect(w.delta).toBe(w.pct - 40)
  })

  test('workoutStreak: сегодня без записи серию не рвёт', () => {
    // Сегодня (i=0) пусто, вчера и позавчера... в logs только вчера →
    // стрик должен посчитать вчера и остановиться на пустом 2 дня назад
    const streakLogs = {
      [keyAt(-1)]: [{ id: 'x', minutes: 10, kcal: 20 }],
      [keyAt(-2)]: [{ id: 'y', minutes: 10, kcal: 20 }],
    }
    expect(workoutStreak(streakLogs, now)).toBe(2)
    // Пустые вчера и сегодня — стрик 0
    expect(workoutStreak({}, now)).toBe(0)
  })

  test('popularTypes: топ по минутам за период', () => {
    const top = popularTypes(logs, 30, now)
    expect(top[0].name).toBe('Силовая')
    expect(top[0].minutes).toBe(60)
    expect(top.length).toBe(3) // Бег, Силовая, Йога
  })

  test('recentWorkouts: свежие дни раньше, daysAgo проставлен', () => {
    const rec = recentWorkouts(logs, 14, 6, now)
    expect(rec[0].id).toBe('a')
    expect(rec[0].daysAgo).toBe(0)
    expect(rec[1].id).toBe('b')
    expect(rec[1].daysAgo).toBe(1)
    expect(rec[2].daysAgo).toBe(8)
  })

  test('dayLabel: Сегодня / Вчера / «8 ноя»', () => {
    expect(dayLabel(0, now)).toBe('Сегодня')
    expect(dayLabel(1, now)).toBe('Вчера')
    expect(dayLabel(2, now)).toBe('6 ноя')
  })

  test('fmtHours: минуты до часа, часы с запятой после', () => {
    expect(fmtHours(45)).toBe('45 мин')
    expect(fmtHours(60)).toBe('1 ч')
    expect(fmtHours(205)).toBe('3,4 ч')
  })

  test('dynamicsSeries: 7 точек старые раньше, подписи — дни недели', () => {
    const row = dynamicsSeries(logs, 7, now)
    expect(row.length).toBe(7)
    expect(row[6].value).toBe(300) // сегодня — последний элемент
    expect(row[5].value).toBe(200) // вчера
    // 8 дней назад в 7-дневный ряд не входит
    expect(row.reduce((s, p) => s + p.value, 0)).toBe(500)
    const row30 = dynamicsSeries(logs, 30, now)
    expect(row30.length).toBe(30)
    expect(row30[0].label).toMatch(/^\d{1,2}\.\d{2}$/)
  })
})

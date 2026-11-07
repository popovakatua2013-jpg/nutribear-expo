// Тесты данных «Отчётов»: дисциплина периода, уровни дней теплокарты,
// рекорды, среднее за день, топ дней, сетка «по дням недели»,
// подпись сравнения периодов, нутриенты по дням и итоги нутриентов.

// RN-стабы должны встать до импортов стора (dayKeyOf живёт рядом с ним)
jest.requireActual('./helpers/react-native-stub')
jest.requireActual('./helpers/async-storage-stub')

const {
  discipline,
  dayLevel,
  bestDay,
  bestDays,
  dailyAverage,
  weekdayMatrix,
  prevLabel,
  changePct,
  nutrientsByDay,
  nutrientTotals,
  dayHasRecords,
  diaryAgeDays,
} = require('@/lib/data/reports')
const { dayKeyOf } = require('@/store/useHistoryStore')

// Ключ дня со сдвигом: keyAt(0) — сегодня, keyAt(-1) — вчера
function keyAt(offsetDays) {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return dayKeyOf(d)
}

// Строка дня истории: только заданные поля, остальные нули
function row(fields, extra = {}) {
  return { steps: 0, kcal: 0, waterMl: 0, burned: 0, xp: 0, ...fields, ...extra }
}

const GOALS = { kcal: 2000, waterMl: 2000, steps: 7000, minutes: 60, burnKcal: 300 }

describe('discipline', () => {
  const rows = [
    row({ steps: 8000, kcal: 1800, waterMl: 2200, burned: 100 }), // всё в норме
    row({ steps: 3000, kcal: 2100 }), // записи есть, цели нет (и калории выше)
    row({ steps: 0, kcal: 0, waterMl: 0, burned: 0 }), // день без записей
  ]

  test('заполненность: только дни с любыми записями', () => {
    const d = discipline(rows, GOALS)
    expect(d.days).toBe(3)
    expect(d.recorded).toBe(2)
  })

  test('цель достигнута: шаги и вода — от цели, калории — в рамках цели', () => {
    const d = discipline(rows, GOALS)
    expect(d.met.steps).toBe(1) // 8000 ≥ 7000
    expect(d.met.waterMl).toBe(1) // 2200 ≥ 2000
    expect(d.met.kcal).toBe(1) // 1800 ≤ 2000 и > 0; 2100 — перебор
  })

  test('сожжённые: от цели burnKcal (футер «Сожжено» больше не пуст)', () => {
    const d = discipline(rows, GOALS) // в rows один день с burned: 100 (< 300)
    expect(d.met.burned).toBe(0)
    const hit = [row({ burned: 350 })]
    expect(discipline(hit, GOALS).met.burned).toBe(1)
    // Цель не задана — показатель не попадает в зачёт
    expect(discipline(hit, { ...GOALS, burnKcal: 0 }).met.burned).toBe(0)
  })

  test('дни без записей не считаются достигнутыми по калориям', () => {
    const rowsEmpty = [row(), row()]
    const d = discipline(rowsEmpty, GOALS)
    expect(d.recorded).toBe(0)
    expect(d.met.kcal).toBe(0)
  })

  test('цель не задана (0) — показатель не попадает в зачёт', () => {
    const d = discipline(rows, { ...GOALS, steps: 0 })
    expect(d.met.steps).toBe(0)
  })

  test('пустые rows и отсутствие целей — нули без ошибок', () => {
    const d = discipline([], null)
    expect(d).toEqual({
      days: 0,
      recorded: 0,
      met: { steps: 0, waterMl: 0, kcal: 0, burned: 0 },
    })
  })
})

describe('diaryAgeDays (разблокировка периодов 30/90)', () => {
  test('записей нет — первый день: 30/90 закрыты', () => {
    expect(diaryAgeDays({})).toBe(1)
    expect(diaryAgeDays(null)).toBe(1)
  })

  test('возраст — от первой записи до сегодня включительно', () => {
    const days = { [keyAt(-6)]: {}, [keyAt(0)]: {} }
    expect(diaryAgeDays(days)).toBe(7)
  })

  test('30 дней открывается на 30-й день ведения, 90 — на 90-й', () => {
    expect(diaryAgeDays({ [keyAt(-28)]: {} })).toBe(29) // 30 ещё закрыт
    expect(diaryAgeDays({ [keyAt(-29)]: {} })).toBe(30) // открыт
    expect(diaryAgeDays({ [keyAt(-88)]: {} })).toBe(89) // 90 ещё закрыт
    expect(diaryAgeDays({ [keyAt(-89)]: {} })).toBe(90) // открыт
  })

  test('мусорные ключи игнорируются', () => {
    expect(diaryAgeDays({ garbage: {}, [keyAt(-1)]: {} })).toBe(2)
  })
})

describe('dayLevel (теплокарта)', () => {
  test('шаги: met / mid / low / none по цели', () => {
    expect(dayLevel('steps', 7000, 7000)).toBe('met')
    expect(dayLevel('steps', 9000, 7000)).toBe('met')
    expect(dayLevel('steps', 3500, 7000)).toBe('mid')
    expect(dayLevel('steps', 100, 7000)).toBe('low')
    expect(dayLevel('steps', 0, 7000)).toBe('none')
  })

  test('калории: met — в рамках цели, mid — до +15%, over — перебор', () => {
    expect(dayLevel('kcal', 2000, 2000)).toBe('met')
    expect(dayLevel('kcal', 2290, 2000)).toBe('mid') // +14.5%
    expect(dayLevel('kcal', 2400, 2000)).toBe('over')
    expect(dayLevel('kcal', 0, 2000)).toBe('none')
  })

  test('цель не задана — любой ненулевой день достигнут', () => {
    expect(dayLevel('steps', 500, 0)).toBe('met')
    expect(dayLevel('kcal', 9000, 0)).toBe('met')
    expect(dayLevel('burned', 10, 0)).toBe('met')
  })

  test('сожжено и вода считаются как шаги (чем больше, тем лучше)', () => {
    expect(dayLevel('burned', 300, 300)).toBe('met')
    expect(dayLevel('waterMl', 1000, 2000)).toBe('mid') // ровно половина
    expect(dayLevel('waterMl', 999, 2000)).toBe('low') // на шаг меньше половины
  })
})

describe('bestDay', () => {
  test('максимум показателя по дням', () => {
    const rows = [row({ steps: 3000 }), row({ steps: 12400 }), row({ steps: 8000 })]
    expect(bestDay(rows, 'steps')).toBe(12400)
  })

  test('пустые строки и отсутствующий ключ — 0', () => {
    expect(bestDay([], 'steps')).toBe(0)
    expect(bestDay([row(), row()], 'waterMl')).toBe(0)
    expect(bestDay(null, 'steps')).toBe(0)
  })
})

describe('nutrientsByDay', () => {
  test('группирует записи журнала по дню и суммирует БЖУ', () => {
    const hist = [
      { day: '2026-11-01', kcal: 500, p: 20, f: 10, c: 60, fib: 5 },
      { day: '2026-11-01', kcal: 700, p: 30, f: 15, c: 80, fib: 7 },
      { day: '2026-11-02', kcal: 400, p: 10, f: 5, c: 50, fib: 3 },
    ]
    const byDay = nutrientsByDay(hist)
    expect(byDay['2026-11-01']).toEqual({ kcal: 1200, p: 50, f: 25, c: 140, fib: 12 })
    expect(byDay['2026-11-02'].kcal).toBe(400)
  })

  test('записи без fib и без дня не ломают расчёт', () => {
    const byDay = nutrientsByDay([
      { day: '2026-11-03', kcal: 300, p: 10, f: 5, c: 40 }, // старая запись без fib
      { kcal: 999 }, // без дня — игнорируется
      null,
    ])
    expect(byDay['2026-11-03']).toEqual({ kcal: 300, p: 10, f: 5, c: 40, fib: 0 })
    expect(Object.keys(byDay)).toHaveLength(1)
  })

  test('пустой журнал — пустой объект', () => {
    expect(nutrientsByDay([])).toEqual({})
    expect(nutrientsByDay(null)).toEqual({})
  })
})

describe('nutrientTotals', () => {
  const byDay = {
    [keyAt(0)]: { kcal: 1800, p: 60, f: 40, c: 200, fib: 20 }, // сегодня
    [keyAt(-1)]: { kcal: 2200, p: 70, f: 50, c: 250, fib: 25 }, // вчера
    [keyAt(-3)]: { kcal: 1500, p: 50, f: 30, c: 160, fib: 15 }, // три дня назад
    [keyAt(-5)]: { kcal: 900, p: 30, f: 20, c: 100, fib: 0 }, // только калории
  }

  test('текущий период: суммы по дням и число дней с едой', () => {
    const t = nutrientTotals(byDay, 2) // сегодня + вчера
    expect(t.recorded).toBe(2)
    expect(t.kcal).toBe(4000)
    expect(t.p).toBe(130)
    expect(t.fib).toBe(45)
  })

  test('сдвиг offset смотрит в предыдущий период', () => {
    const t = nutrientTotals(byDay, 2, 2) // позавчера + 3 дня назад
    expect(t.recorded).toBe(1)
    expect(t.kcal).toBe(1500)
  })

  test('день «только калории без БЖУ» всё равно день с едой', () => {
    const t = nutrientTotals(byDay, 6)
    expect(t.recorded).toBe(4) // 0, -1, -3, -5
    expect(t.kcal).toBe(1800 + 2200 + 1500 + 900)
  })

  test('пустой период — нули без NaN', () => {
    const t = nutrientTotals({}, 7)
    expect(t.recorded).toBe(0)
    expect(t.p).toBe(0)
  })
})

// ===== Окно истории: среднее, топ дней, теплокарта недели =====

describe('dayHasRecords', () => {
  test('день с любой записью — день с записями, пустой — нет', () => {
    expect(dayHasRecords(row({ steps: 100 }))).toBe(true)
    expect(dayHasRecords(row({ kcal: 500 }))).toBe(true)
    expect(dayHasRecords(row({ waterMl: 250 }))).toBe(true)
    expect(dayHasRecords(row({ burned: 50 }))).toBe(true)
    // нули при записях в другом поле — честный ноль дня с записями
    expect(dayHasRecords(row({ kcal: 0, waterMl: 300 }))).toBe(true)
    expect(dayHasRecords(row())).toBe(false)
    expect(dayHasRecords(null)).toBe(false)
  })
})

describe('dailyAverage', () => {
  test('среднее делится только на ведённые дни: простои его не топят', () => {
    // второй день велись (вода) — ноль шагов честный; третий — простой
    const rows = [row({ steps: 8000 }), row({ waterMl: 300 }), row()]
    expect(dailyAverage(rows, 'steps')).toBe(4000) // (8000 + 0) / 2
  })

  test('округление до целого', () => {
    const rows = [row({ steps: 1000 }), row({ steps: 500 })]
    expect(dailyAverage(rows, 'steps')).toBe(750)
  })

  test('пустой период — 0 без NaN', () => {
    expect(dailyAverage([], 'steps')).toBe(0)
    expect(dailyAverage([row(), row()], 'kcal')).toBe(0)
    expect(dailyAverage(null, 'steps')).toBe(0)
  })
})

describe('bestDays', () => {
  const rows = [
    row({ steps: 3000, label: 'Пн' }),
    row({ steps: 12400, label: 'Вт' }),
    row({ label: 'Ср' }), // день без записей — не участвует
    row({ steps: 8000, label: 'Чт' }),
    row({ steps: 12400, label: 'Пт' }),
  ]

  test('топ-3 дня по значению, пустые дни не участвуют', () => {
    const top = bestDays(rows, 'steps', 3)
    expect(top.map((d) => d.row.label)).toEqual(['Вт', 'Пт', 'Чт'])
    expect(top[0].value).toBe(12400)
  })

  test('равные значения — в хронологическом порядке (сортировка стабильна)', () => {
    const top = bestDays(rows, 'steps', 2)
    expect(top.map((d) => d.row.label)).toEqual(['Вт', 'Пт'])
  })

  test('дней меньше, чем нужно, и пустой список', () => {
    expect(bestDays(rows, 'steps', 10)).toHaveLength(4)
    expect(bestDays([], 'steps')).toEqual([])
    expect(bestDays(null, 'steps')).toEqual([])
  })
})

describe('weekdayMatrix', () => {
  function dayRows(keys) {
    return keys.map((key) => ({ ...row(), key, label: key }))
  }

  test('начало дополняется пустыми клетками до понедельника', () => {
    // 4–8 ноября 2026: среда … воскресенье → две пустые клетки слева
    const grid = weekdayMatrix(dayRows(['2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07', '2026-11-08']))
    expect(grid).toHaveLength(1)
    expect(grid[0][0]).toBe(null)
    expect(grid[0][1]).toBe(null)
    expect(grid[0][2].key).toBe('2026-11-04')
    expect(grid[0][6].key).toBe('2026-11-08')
  })

  test('ровно две недели (пн…вс) — две строки без добивки', () => {
    const keys = []
    for (let d = 2; d <= 15; d++) keys.push(`2026-11-${String(d).padStart(2, '0')}`)
    const grid = weekdayMatrix(dayRows(keys))
    expect(grid).toHaveLength(2)
    expect(grid[0][0].key).toBe('2026-11-02')
    expect(grid[0][6].key).toBe('2026-11-08')
    expect(grid[1][0].key).toBe('2026-11-09')
    expect(grid[1][6].key).toBe('2026-11-15')
  })

  test('конец дополняется до полной недели', () => {
    // 9–10 ноября 2026: пн, вт → хвост строки добит пустыми клетками
    const grid = weekdayMatrix(dayRows(['2026-11-09', '2026-11-10']))
    expect(grid).toHaveLength(1)
    expect(grid[0][0].key).toBe('2026-11-09')
    expect(grid[0][2]).toBe(null)
    expect(grid[0][6]).toBe(null)
  })

  test('пустые rows — пустая сетка', () => {
    expect(weekdayMatrix([])).toEqual([])
    expect(weekdayMatrix(null)).toEqual([])
  })
})

describe('prevLabel', () => {
  test('неделя, месяц, произвольный период', () => {
    expect(prevLabel(7)).toBe('к прошлой неделе')
    expect(prevLabel(30)).toBe('к прошлому месяцу')
    expect(prevLabel(90)).toBe('к предыдущим 90 дням')
  })
})

describe('changePct — сравнение только с данными', () => {
  test('есть данные прошлого периода — честный процент', () => {
    expect(changePct(1500, 1000)).toBe(50)
    expect(changePct(500, 1000)).toBe(-50)
    expect(changePct(1000, 1000)).toBe(0)
  })

  test('прошлый период пуст — 0 (карточка прячет строку «0% к прошлой неделе»)', () => {
    // Контракт после отзыва Кати: пока прошлая неделя не соберёт
    // данные, сравнения нет — changePct возвращает 0, а UI по
    // prev === 0 скрывает строку сравнения целиком
    expect(changePct(1234, 0)).toBe(0)
    expect(changePct(0, 0)).toBe(0)
  })
})

// ===== Окно истории показателя по макету Кати (вес, «ближе к цели»,
// точки «по дням недели») =====

const {
  weightByDay,
  closestToGoal,
  weekdayAverages,
} = require('@/lib/data/reports')
const { METRICS, WEIGHT_METRIC } = require('@/lib/data/metrics')

describe('weightByDay — журнал взвешиваний в карту «день → кг»', () => {
  test('ISO-дата → ключ дня; несколько замеров за день — последнее (новое сверху)', () => {
    const day = keyAt(0)
    const kg = weightByDay([
      { id: 'a', date: `${day}T18:30:00`, kg: 71.8 }, // новое — сверху
      { id: 'b', date: `${day}T07:10:00`, kg: 72.4 }, // утреннее — ниже
    ])
    expect(Object.keys(kg)).toEqual([day])
    expect(kg[day]).toBe(71.8) // победило последнее взвешивание
  })

  test('округление до 100 г и пропуск битых записей', () => {
    const day = keyAt(-1)
    const kg = weightByDay([
      { id: 'a', date: `${day}T09:00:00`, kg: 71.46 }, // → 71,5
      { id: 'b', date: 'не дата', kg: 70 },
      { id: 'c', date: `${day}T10:00:00`, kg: 0 }, // ноль — не замер
      { id: 'd', date: `${day}T11:00:00`, kg: -3 }, // мусор — не замер
    ])
    expect(kg).toEqual({ [day]: 71.5 })
  })

  test('пустой журнал — пустая карта без ошибок', () => {
    expect(weightByDay([])).toEqual({})
    expect(weightByDay(null)).toEqual({})
  })
})

describe('closestToGoal — дни ближе всего к цели по калориям', () => {
  test('сортировка по отклонению, а не по максимуму; пустые дни не участвуют', () => {
    const rows = [
      row({ kcal: 2400, steps: 1 }, { key: keyAt(-3) }), // dev 1200
      row({ kcal: 1250, steps: 1 }, { key: keyAt(-2) }), // dev 50 — лучший
      row({ kcal: 0, steps: 1 }, { key: keyAt(-1) }), // пустой по калориям
      row({ kcal: 1100, steps: 1 }, { key: keyAt(0) }), // dev 100
    ]
    const top = closestToGoal(rows, 'kcal', 1200, 3)
    expect(top.map((d) => d.value)).toEqual([1250, 1100, 2400])
    expect(top[0].dev).toBe(50)
  })

  test('равное отклонение — раньше по хронологии выше; срез по n; пустой список', () => {
    const rows = [
      row({ kcal: 1300 }, { key: keyAt(-2) }), // dev 100, старше
      row({ kcal: 1100 }, { key: keyAt(-1) }), // dev 100, новее
      row({ kcal: 900 }, { key: keyAt(0) }), // dev 300
    ]
    const top = closestToGoal(rows, 'kcal', 1200, 2)
    expect(top.map((d) => d.row.key)).toEqual([keyAt(-2), keyAt(-1)])
    expect(closestToGoal([], 'kcal', 1200)).toEqual([])
  })
})

describe('weekdayAverages — среднее по дням недели для точек окна', () => {
  test('среднее делится только на ведённые дни, пустой день недели — recorded: false', () => {
    // Сегодня — по локальному времени песочницы; строим 10 дней подряд,
    // среди них два дня не велись — они не должны топить среднее
    const rows = []
    for (let i = 9; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const k = dayKeyOf(d)
      const skip = i === 4 || i === 8 // дни-простои
      rows.push({ key: k, steps: skip ? 0 : 8000, kcal: skip ? 0 : 1800, waterMl: 0, burned: 0, xp: 0, sleepMin: 0 })
    }
    const wd = weekdayAverages(rows, 'steps')
    expect(wd).toHaveLength(7)
    const recordedWd = wd.filter((b) => b.recorded)
    expect(recordedWd.length).toBeGreaterThanOrEqual(5)
    for (const b of recordedWd) expect(b.avg).toBe(8000)
    // у пропущенных дней недели записей нет (если такой день недели
    // вообще был среди десяти)
    const skippedWds = new Set([4, 8].map((i) => {
      const d = new Date()
      d.setDate(d.getDate() - i)
      return (d.getDay() + 6) % 7
    }))
    for (const [i, b] of wd.entries()) {
      if (skippedWds.has(i) && b.recorded === false) expect(b.avg).toBe(0)
    }
  })

  test('все дни пусты — все нули; калории считаются по своей шкале levels отдельно', () => {
    const rows = [row({}, { key: keyAt(0) }), row({}, { key: keyAt(-1) })]
    expect(weekdayAverages(rows, 'kcal').every((b) => !b.recorded && b.avg === 0)).toBe(true)
  })
})

describe('WEIGHT_METRIC — дескриптор веса для окна истории', () => {
  test('формат «71,5 кг» с запятой; ключ weight; вне массива METRICS', () => {
    expect(WEIGHT_METRIC.key).toBe('weight')
    expect(WEIGHT_METRIC.label).toBe('Вес')
    expect(WEIGHT_METRIC.fmt(71.5)).toBe('71,5 кг')
    expect(WEIGHT_METRIC.fmt(70)).toBe('70,0 кг')
    expect(WEIGHT_METRIC.fmt(0)).toBe('0,0 кг')
    expect(METRICS.some((m) => m.key === 'weight')).toBe(false) // шеринг перебирает METRICS — вес туда не попал
  })
})

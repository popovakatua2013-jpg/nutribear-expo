// Экспорт отчёта периода в HTML-файл (Premium-фича 23.11): чистая
// логика buildReportHtml/weightChange/weeklyBuckets (математика та же,
// что на вкладке «Отчёты»: средние делятся только на ведённые дни) и
// shareReportFile (фолбэк без шаринга — файл возвращается, как у
// резервной копии).

jest.requireActual('./helpers/react-native-stub')
jest.requireActual('./helpers/async-storage-stub')

// expo-file-system и expo-sharing — ESM и не грузятся в Node: стабы,
// как в diary-export.test.js (переменные с префиксом mock — требование Jest)
const mockMemFs = new Map()
jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: '/tmp/',
  EncodingType: { UTF8: 'utf8' },
  writeAsStringAsync: jest.fn(async (uri, content) => mockMemFs.set(uri, content)),
  deleteAsync: jest.fn(async (uri) => mockMemFs.delete(uri)),
}))
jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(async () => false), // тестируем фолбэк
  shareAsync: jest.fn(async () => {}),
}))

const DAY_MS = 86400000

// Фикстура периода: 7 дней, один пустой (день без записей) —
// средние должны делиться на 6 ведённых дней, а не на 7
const now = new Date()
const keyFor = (offset, base = now) =>
  // локальный ключ дня (как в useHistoryStore) — чтобы nutrientTotals
  // и отчёт сходились между собой
  (() => {
    const d = new Date(base.getTime() - offset * DAY_MS)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate()
    ).padStart(2, '0')}`
  })()

const ROWS_7 = [
  { key: keyFor(6), steps: 6000, kcal: 1800, waterMl: 1500, burned: 240, sleepMin: 420 },
  { key: keyFor(5), steps: 8000, kcal: 1900, waterMl: 1600, burned: 320, sleepMin: 440 },
  { key: keyFor(4), steps: 0, kcal: 0, waterMl: 0, burned: 0, sleepMin: 0 }, // пустой день
  { key: keyFor(3), steps: 9000, kcal: 1700, waterMl: 1400, burned: 360, sleepMin: 430 },
  { key: keyFor(2), steps: 7000, kcal: 2000, waterMl: 1700, burned: 280, sleepMin: 410 },
  { key: keyFor(1), steps: 10000, kcal: 1750, waterMl: 1800, burned: 400, sleepMin: 450 },
  { key: keyFor(0), steps: 5000, kcal: 1850, waterMl: 1200, burned: 200, sleepMin: 400 },
]

const GOALS = { kcal: 2000, steps: 8000, waterMl: 1500, burnKcal: 300 }

const WEIGHTS = {
  [keyFor(6)]: 74.2,
  [keyFor(2)]: 73.9,
  [keyFor(0)]: 72.8,
}

// Нутриенты по дням: 6 записей (пустой день в карте отсутствует),
// белок везде 90 → среднее 90
const NUTRIENTS = Object.fromEntries(
  [6, 5, 3, 2, 1, 0].map((o) => [
    keyFor(o),
    { kcal: 1800 + o, p: 90, f: 60, c: 180, fib: 20 },
  ])
)

function build7() {
  const { buildReportHtml } = require('@/lib/data/report-export')
  return buildReportHtml({
    days: 7,
    rows: ROWS_7,
    now,
    goals: GOALS,
    weightMap: WEIGHTS,
    nutrients: NUTRIENTS,
  })
}

describe('lib/data/report-export: buildReportHtml', () => {
  let html

  beforeAll(() => {
    html = build7()
  })

  test('полный HTML-документ с русским языком и кодировкой UTF-8', () => {
    expect(html.toLowerCase()).toContain('<!doctype html>')
    expect(html).toContain('lang="ru"')
    expect(html).toContain('charset="utf-8"')
  })

  test('период — сегодня и 6 дней назад в формате ДД.ММ.ГГГГ', () => {
    const from = keyFor(6).split('-').reverse().join('.')
    const to = keyFor(0).split('-').reverse().join('.')
    expect(html).toContain(`${from} — ${to}`)
    expect(html).toContain('файл создан')
  })

  test('средние делятся на ведённые дни: 11000/6 = 1833 ккал, не 1571', () => {
    expect(html).toContain('1833')
    expect(html).not.toContain('1571')
  })

  test('дисциплина: 6 из 7 дней вели дневник', () => {
    expect(html).toContain('6 из 7')
  })

  test('цели: калории 6/7, шаги 3/7 (8000/9000/10000), вода 4/7, сожжено 3/7', () => {
    expect(html).toContain('Калории в норме')
    expect(html).toContain('Шаги — цель')
    expect(html).toContain('Вода — цель')
    expect(html).toContain('Сожжено — цель')
  })

  test('БЖУ: средний белок 90 г (по 6 дням с едой)', () => {
    expect(html).toContain('90 / 60 / 180 г')
    expect(html).toContain('20 г')
  })

  test('вес: 74,2 → 72,8 кг (−1,4 кг)', () => {
    expect(html).toContain('74,2 → 72,8 кг')
    expect(html).toContain('−1,4 кг')
  })

  test('пустой дневник — честное сообщение вместо пустых нулей', () => {
    const { buildReportHtml: build } = require('@/lib/data/report-export')
    const empty = build({ days: 7, rows: [], now, goals: {}, weightMap: {}, nutrients: {} })
    expect(empty).toContain('нет ни одной записи')
  })
})

describe('weightChange и weeklyBuckets', () => {
  const { weightChange, weeklyBuckets } = require('@/lib/data/report-export')

  test('weightChange: первая и последняя запись периода, знак и округление', () => {
    const w = weightChange(WEIGHTS, keyFor(6), keyFor(0))
    expect(w.has).toBe(true)
    expect(w.first).toBe(74.2)
    expect(w.last).toBe(72.8)
    expect(w.change).toBe(-1.4)
  })

  test('weightChange: записей вне периода нет → has: false', () => {
    const w = weightChange({ '2000-01-01': 80 }, keyFor(6), keyFor(0))
    expect(w.has).toBe(false)
  })

  test('weeklyBuckets: 9 дней → корзины 7+2, средние по ведённым дням', () => {
    const rows = [
      ...ROWS_7,
      { key: keyFor(-1), steps: 4000, kcal: 1500, waterMl: 1000, burned: 100, sleepMin: 420 },
      { key: keyFor(-2), steps: 0, kcal: 0, waterMl: 0, burned: 0, sleepMin: 0 },
    ]
    const buckets = weeklyBuckets(rows)
    expect(buckets).toHaveLength(2)
    expect(buckets[0].days).toBe(7)
    expect(buckets[0].recorded).toBe(6)
    expect(buckets[0].kcal).toBe(1833)
    // вторая корзина: один ведённый день (1500 ккал)
    expect(buckets[1].days).toBe(2)
    expect(buckets[1].recorded).toBe(1)
    expect(buckets[1].kcal).toBe(1500)
    // вода суммарная по корзине: 6 дней × ~1,5 л ≈ 9,2 л
    expect(buckets[0].water).toBe(9200)
  })

  test('weeklyBuckets: пустой период → пустой список', () => {
    expect(weeklyBuckets([])).toEqual([])
  })
})

describe('shareReportFile', () => {
  let shareReportFile

  beforeAll(() => {
    ;({ shareReportFile } = require('@/lib/data/report-export'))
  })

  beforeEach(() => {
    mockMemFs.clear()
  })

  test('без шаринга файл записан в кэш и возвращён (фолбэк резервной копии)', async () => {
    const uri = await shareReportFile('<html>тест</html>')
    expect(uri).toContain('/tmp/nutribear-report-')
    expect(uri.endsWith('.html')).toBe(true)
    expect(mockMemFs.get(uri)).toBe('<html>тест</html>')
  })

  test('имя файла содержит сегодняшнюю дату', async () => {
    const uri = await shareReportFile('x')
    expect(uri).toContain(keyFor(0))
  })
})

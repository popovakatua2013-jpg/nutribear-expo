// Тесты разбора недели от напарника (Premium, этап 2 монетизации):
// статистика недели из журнала дневника, промпт, офлайн-разбор,
// фолбэк при недоступном ИИ, guard «мало данных» и стор разборов.

import {
  buildReviewPrompt,
  generateWeekReview,
  offlineWeekReview,
  REVIEW_MIN_DAYS,
  weekDayKeys,
  weekFoodStats,
} from '@/lib/week-review'
import { useWeekReviewStore } from '@/store/useWeekReviewStore'

// askNutritionist мокается целиком: в этих тестах сеть не нужна
jest.mock('@/lib/chat', () => ({
  askNutritionist: jest.fn(),
}))

// ── weekDayKeys ──────────────────────────────────────────────────────

describe('weekDayKeys — ключи текущей недели Пн–Вс', () => {
  test('7 уникальных ключей формата YYYY-MM-DD, начиная с понедельника', () => {
    // 14.11.2026 — суббота; неделя начинается в понедельник 09.11.2026
    const keys = weekDayKeys(new Date(2026, 10, 14, 15, 0, 0))
    expect(keys).toHaveLength(7)
    expect(new Set(keys).size).toBe(7)
    expect(keys[0]).toBe('2026-11-09')
    expect(keys[6]).toBe('2026-11-15')
    for (const k of keys) expect(k).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  test('середина ночи воскресенья не уводит неделю назад (полдень внутри)', () => {
    const keys = weekDayKeys(new Date(2026, 10, 15, 0, 30, 0)) // воскресенье 00:30
    expect(keys[0]).toBe('2026-11-09')
    expect(keys[6]).toBe('2026-11-15')
  })
})

// ── weekFoodStats ────────────────────────────────────────────────────

const DAYS = weekDayKeys(new Date(2026, 10, 9, 12, 0, 0)) // Пн 09.11

describe('weekFoodStats — статистика недели из дневника', () => {
  test('суммы по дням, средние и частые блюда', () => {
    const history = [
      { day: DAYS[0], kcal: 1800, p: 80, f: 60, c: 180, name: 'Овсянка на молоке' },
      { day: DAYS[0], kcal: 450, p: 20, f: 15, c: 45, name: 'Котлета мясная' },
      { day: DAYS[2], kcal: 2100, p: 95, f: 70, c: 210, name: 'Плов' },
      { day: DAYS[3], kcal: 1500, p: 70, f: 50, c: 150, name: 'Творог 5%' },
      { day: '2020-01-01', kcal: 9999, p: 0, f: 0, c: 0, name: 'Другая неделя' },
    ]
    const stats = weekFoodStats(history, DAYS)
    expect(stats.byDay[0]).toEqual({ kcal: 2250, p: 100, f: 75, c: 225, dishes: 2 })
    expect(stats.byDay[1].kcal).toBe(0)
    expect(stats.byDay[2].kcal).toBe(2100)
    expect(stats.loggedDays).toBe(3)
    expect(stats.avgKcal).toBe(1950) // (2250 + 2100 + 1500) / 3
    expect(stats.avgP).toBe(88) // (100 + 95 + 70) / 3 ≈ 88
    // Чужая неделя и пустые дни не считаются
    expect(stats.byDay[4].kcal).toBe(0)
  })

  test('пустой журнал — нули без NaN', () => {
    const stats = weekFoodStats([], DAYS)
    expect(stats.loggedDays).toBe(0)
    expect(stats.avgKcal).toBe(0)
    expect(stats.avgP).toBe(0)
    expect(stats.top).toEqual([])
  })

  test('топ блюд с подсчётом повторов', () => {
    const history = [
      { day: DAYS[0], kcal: 300, p: 1, f: 1, c: 1, name: 'Кофе с молоком и сахаром' },
      { day: DAYS[1], kcal: 300, p: 1, f: 1, c: 1, name: 'Кофе с молоком и сахаром' },
      { day: DAYS[2], kcal: 300, p: 1, f: 1, c: 1, name: 'Кофе с молоком и сахаром' },
      { day: DAYS[0], kcal: 500, p: 1, f: 1, c: 1, name: 'Борщ' },
    ]
    const stats = weekFoodStats(history, DAYS)
    expect(stats.top[0]).toBe('Кофе с молоком и сахаром ×3')
    expect(stats.top).toContain('Борщ')
  })
})

// ── buildReviewPrompt ────────────────────────────────────────────────

describe('buildReviewPrompt — промпт разбора', () => {
  const stats = weekFoodStats(
    [
      { day: DAYS[0], kcal: 1800, p: 80, f: 60, c: 180, name: 'Овсянка' },
      { day: DAYS[1], kcal: 2200, p: 90, f: 75, c: 210, name: 'Плов' },
    ],
    DAYS,
  )

  test('содержит имя, дни, цель и нормы, просит текст без markdown', () => {
    const prompt = buildReviewPrompt({
      name: 'Катя Петрова',
      sex: 'female',
      goal: 'похудеть',
      kcalGoal: 2000,
      norms: { p: 100, f: 67, c: 250 },
      stats,
    })
    expect(prompt).toContain('Катя')
    expect(prompt).toContain('Пн — 1800 ккал')
    expect(prompt).toContain('Вт — 2200 ккал')
    expect(prompt).toContain('записей нет')
    expect(prompt).toContain('Дней с записями: 2 из 7')
    expect(prompt).toContain('2000 ккал')
    expect(prompt).toContain('похудеть')
    expect(prompt).toContain('белки 100 г')
    expect(prompt).toContain('женском роде')
    expect(prompt).toContain('Без markdown')
  })

  test('без имени — нейтральное обращение, без пола — без указания рода', () => {
    const prompt = buildReviewPrompt({ name: '', kcalGoal: 1800, norms: {}, stats })
    expect(prompt).toContain('Пользователь')
    expect(prompt).not.toContain('женском роде')
    expect(prompt).not.toContain('мужском роде')
  })
})

// ── offlineWeekReview ────────────────────────────────────────────────

describe('offlineWeekReview — разбор по правилам без сети', () => {
  const full = weekFoodStats(
    [0, 1, 2, 3, 4].map((i) => ({ day: DAYS[i], kcal: 1900, p: 90, f: 65, c: 190, name: 'Куриная грудка' })),
    DAYS,
  )
  const over = weekFoodStats(
    [0, 1, 2, 3, 4].map((i) => ({ day: DAYS[i], kcal: 2600, p: 85, f: 80, c: 280, name: 'Пельмени' })),
    DAYS,
  )
  const under = weekFoodStats(
    [0, 1, 2].map((i) => ({ day: DAYS[i], kcal: 1400, p: 50, f: 45, c: 140, name: 'Салат' })),
    DAYS,
  )

  test('в цели — «удерживаете цель» и белок в порядке', () => {
    const text = offlineWeekReview({ kcalGoal: 2000, norms: { p: 100 }, stats: full })
    expect(text).toContain('1900 ккал')
    expect(text).toContain('95%')
    expect(text).toContain('Удерживать цель')
    expect(text).toContain('90 г при норме 100 г — с белком порядок')
    expect(text).toContain('Сб, Вс')
    expect(text).not.toContain('NaN')
    expect(text).not.toContain('undefined')
  })

  test('перебор и недобор получают разные советы', () => {
    const tOver = offlineWeekReview({ kcalGoal: 2000, norms: { p: 100 }, stats: over })
    expect(tOver).toContain('130%')
    expect(tOver).toContain('выше цели')
    const tUnder = offlineWeekReview({ kcalGoal: 2000, norms: { p: 100 }, stats: under })
    expect(tUnder).toContain('недобор')
    expect(tUnder).toContain('Белок в среднем 50 г при норме 100 г — маловато')
  })

  test('пустая неделя — честный «разбирать нечего»', () => {
    const text = offlineWeekReview({ kcalGoal: 2000, norms: {}, stats: weekFoodStats([], DAYS) })
    expect(text).toContain('дневник пока пустой')
  })

  test('без цели по ккал текст остаётся полезным', () => {
    const text = offlineWeekReview({ kcalGoal: 0, norms: {}, stats: full })
    expect(text).toContain('1900 ккал')
    expect(text).not.toContain('NaN')
  })
})

// ── generateWeekReview ───────────────────────────────────────────────

describe('generateWeekReview — ИИ с честным фолбэком', () => {
  const { askNutritionist } = require('@/lib/chat')

  const goodStats = weekFoodStats(
    [0, 1, 2].map((i) => ({ day: DAYS[i], kcal: 1800 + i * 100, p: 80, f: 60, c: 180, name: 'Куриная грудка' })),
    DAYS,
  )

  beforeEach(() => {
    askNutritionist.mockReset()
  })

  test(`guard: меньше ${REVIEW_MIN_DAYS} дней с записями — отклоняется`, async () => {
    const few = weekFoodStats([{ day: DAYS[0], kcal: 500, p: 1, f: 1, c: 1, name: 'Яблоко' }], DAYS)
    await expect(generateWeekReview({ stats: few })).rejects.toThrow('Мало данных')
    await expect(generateWeekReview({ stats: weekFoodStats([], DAYS) })).rejects.toThrow('Мало данных')
    expect(askNutritionist).not.toHaveBeenCalled()
  })

  test('ответ ИИ → source: ai, markdown-пришивки чистятся', async () => {
    askNutritionist.mockResolvedValueOnce(
      '**Хорошая неделя!** \nКалории держались у цели.\n### Советы\n— добавьте воды.',
    )
    const res = await generateWeekReview({ stats: goodStats, kcalGoal: 2000 })
    expect(res.source).toBe('ai')
    expect(res.text).not.toContain('**')
    expect(res.text).not.toContain('###')
    expect(res.text).toContain('Хорошая неделя!')
  })

  test('сеть молчит → офлайн-разбор с честной подписью', async () => {
    askNutritionist.mockRejectedValueOnce(new Error('Network request failed'))
    const res = await generateWeekReview({ stats: goodStats, kcalGoal: 2000, norms: { p: 100 } })
    expect(res.source).toBe('offline')
    expect(res.text).toContain('без ИИ')
  })

  test('пустой ответ ИИ (меньше 40 символов) → офлайн-фолбэк', async () => {
    askNutritionist.mockResolvedValueOnce('Ок.')
    const res = await generateWeekReview({ stats: goodStats, kcalGoal: 2000 })
    expect(res.source).toBe('offline')
  })
})

// ── useWeekReviewStore ───────────────────────────────────────────────

describe('useWeekReviewStore — хранение разборов', () => {
  test('set/get/remove по ключу недели', () => {
    useWeekReviewStore.setState({ reviews: {} })
    const store = useWeekReviewStore.getState()
    store.setReview('2026-11-09', 'Разбор текст', 'ai')
    const r = useWeekReviewStore.getState().reviews['2026-11-09']
    expect(r.text).toBe('Разбор текст')
    expect(r.source).toBe('ai')
    expect(r.at).toBeGreaterThan(0)
    useWeekReviewStore.getState().removeReview('2026-11-09')
    expect(useWeekReviewStore.getState().reviews['2026-11-09']).toBeUndefined()
    // remove несуществующей недели — безопасно и честно возвращает false
    expect(useWeekReviewStore.getState().removeReview('2020-01-01')).toBe(false)
    useWeekReviewStore.getState().setReview('2020-01-01', 'x', 'ai')
    expect(useWeekReviewStore.getState().removeReview('2020-01-01')).toBe(true)
  })

  test('старые недели вытесняются (лимит 16)', () => {
    useWeekReviewStore.setState({ reviews: {} })
    const store = useWeekReviewStore.getState()
    for (let i = 0; i < 20; i++) {
      const key = `2026-01-${String(5 + i * 7).padStart(2, '0')}`
      store.setReview(key, `текст ${i}`, 'ai')
    }
    const reviews = useWeekReviewStore.getState().reviews
    expect(Object.keys(reviews).length).toBeLessThanOrEqual(16)
  })
})

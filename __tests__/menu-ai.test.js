// Тесты ИИ-меню на неделю (Premium, этап 2 монетизации): парсинг ответа
// модели, эвристика эмодзи, офлайн-сборка из встроенной базы и действие
// setWeek в плане меню. Нативные модули food-ai.js подменяются заглушками,
// сеть не используется — тестируется чистая логика.

jest.mock('expo-file-system', () => ({
  File: class File {
    constructor() {}
  },
  Paths: { document: '/tmp', cache: '/tmp' },
}))
jest.mock('expo-image-manipulator', () => ({
  ImageManipulator: {},
  SaveFormat: {},
}))

import {
  buildMenuMessages,
  fallbackWeekMenu,
  generateWeekMenu,
  guessEmoji,
  parseMenuReply,
} from '@/lib/menu-ai'
import { useMealPlanStore } from '@/store/useMealPlanStore'

// ── buildMenuMessages ────────────────────────────────────────────────

describe('buildMenuMessages — промпт генерации', () => {
  test('содержит цель калорий, приёмы и формат ответа', () => {
    const msgs = buildMenuMessages({ kcal: 2000 })
    expect(msgs[0].role).toBe('system')
    expect(msgs[1].role).toBe('user')
    expect(msgs[1].content).toContain('2000 ккал')
    expect(msgs[1].content).toContain('завтрак')
    expect(msgs[1].content).toContain('"w"')
    expect(msgs[1].content).toContain('7 дней')
  })

  test('пожелания и цель попадают в промпт', () => {
    const { content } = buildMenuMessages({ kcal: 1800, prefs: 'без свинины', goal: 'Похудение' })[1]
    expect(content).toContain('без свинины')
    expect(content).toContain('Похудение')
  })

  test('без пожеланий — строка «Пожелания» не попадает', () => {
    const { content } = buildMenuMessages({ kcal: 1800, prefs: '   ' })[1]
    expect(content).not.toContain('Пожелания пользователя')
  })
})

// ── guessEmoji ───────────────────────────────────────────────────────

describe('guessEmoji — эмодзи блюда по названию', () => {
  test('типовые блюда распознаются', () => {
    expect(guessEmoji('Борщ украинский')).toBe('🍲')
    expect(guessEmoji('Куриная грудка отварная')).toBe('🍗')
    expect(guessEmoji('Лосось запечённый')).toBe('🐟')
    expect(guessEmoji('Овсянка на молоке')).toBe('🥣')
    expect(guessEmoji('Банан')).toBe('🍌')
    expect(guessEmoji('Салат овощной')).toBe('🥗')
    expect(guessEmoji('Творог 5%')).toBe('🍮')
    expect(guessEmoji('Гречка отварная')).toBe('🍚')
  })

  test('неизвестное блюдо — нейтральная тарелка', () => {
    expect(guessEmoji('Кужух-мужух')).toBe('🍽️')
  })
})

// ── parseMenuReply ───────────────────────────────────────────────────

const AI_WEEK = [
  [['Овсянка на молоке|250|255'], ['Борщ|300|147', 'Куриная грудка отварная|150|206'], ['Гречка отварная|180|198', 'Салат овощной|150|45'], ['Яблоко|150|71']],
  [['Омлет|150|276'], ['Суп куриный|300|108', 'Котлета мясная|150|390'], ['Рис отварной|200|240', 'Винегрет|150|142'], ['Кефир 1%|250|100']],
  [['Сырники|150|338'], ['Щи|300|114', 'Плов|250|500'], ['Макароны отварные|200|280', 'Салат овощной|150|45'], ['Апельсин|180|77']],
  [['Творог 5%|150|182'], ['Рассольник|300|126', 'Говядина отварная|150|330'], ['Картофельное пюре|200|180', 'Огурец|150|23'], ['Банан|120|108']],
  [['Яичница|150|263'], ['Суп овощной|300|114', 'Треска отварная|150|117'], ['Перловка отварная|200|218', 'Винегрет|150|142'], ['Ряженка|250|138']],
  [['Каша пшённая|250|225'], ['Гороховый суп|300|198', 'Курица отварная|150|225'], ['Гречка отварная|180|198', 'Салат овощной|150|45'], ['Груша|180|85']],
  [['Блинчики|150|285'], ['Уха|300|135', 'Котлета рыбная|150|240'], ['Рис отварной|200|240', 'Салат овощной|150|45'], ['Йогурт питьевой|290|203']],
]

describe('parseMenuReply — разбор ответа модели', () => {
  test('валидная неделя (с ```-обёрткой) → 7 дней × 4 приёма', () => {
    const days = parseMenuReply('```json\n' + JSON.stringify({ w: AI_WEEK }) + '\n```')
    expect(days).toHaveLength(7)
    for (const day of days) {
      expect(day.breakfast).toHaveLength(1)
      expect(day.lunch.length).toBeGreaterThanOrEqual(1)
      expect(day.dinner.length).toBeGreaterThanOrEqual(1)
      expect(day.snack).toHaveLength(1)
    }
  })

  test('kcal100 пересчитывается из ккал порции и граммов', () => {
    const days = parseMenuReply(JSON.stringify({ w: AI_WEEK }))
    const oat = days[0].breakfast[0]
    expect(oat.name).toBe('Овсянка на молоке')
    expect(oat.grams).toBe(250)
    expect(oat.kcal).toBe(255)
    expect(oat.kcal100).toBe(102) // 255 / 250 × 100
    expect(oat.source).toBe('ai')
    expect(oat.emoji).toBeTruthy()
  })

  test('нереалистичные граммовки/ккал обрезаются границами', () => {
    const week = AI_WEEK.map((day, i) => (i === 0 ? [['Овсянка|5|2'], day[1], day[2], day[3]] : day))
    const days = parseMenuReply(JSON.stringify({ w: week }))
    expect(days[0].breakfast[0].grams).toBe(20) // минимум
    expect(days[0].breakfast[0].kcal).toBe(5) // минимум по ккал
  })

  test('длинное название обрезается до 60 символов', () => {
    const week = AI_WEEK.map((day, i) =>
      i === 0 ? [['Блюдо ' + 'о'.repeat(100) + '|200|100'], day[1], day[2], day[3]] : day,
    )
    const days = parseMenuReply(JSON.stringify({ w: week }))
    expect(days[0].breakfast[0].name.length).toBeLessThanOrEqual(60)
  })

  test.each([
    ['не 7 дней', JSON.stringify({ w: AI_WEEK.slice(0, 6) })],
    ['день из 3 приёмов', JSON.stringify({ w: AI_WEEK.map((d) => d.slice(0, 3)) })],
    ['пустой приём', JSON.stringify({ w: AI_WEEK.map((d, i) => (i === 0 ? [[], d[1], d[2], d[3]] : d)) })],
    ['блюдо без граммовки', JSON.stringify({ w: AI_WEEK.map((d, i) => (i === 0 ? [['Блюдо'], d[1], d[2], d[3]] : d)) })],
    ['вообще не JSON', 'привет, я модель'],
  ])('невалидная форма (%s) → ошибка', (_label, raw) => {
    expect(() => parseMenuReply(raw)).toThrow()
  })
})

// ── fallbackWeekMenu — офлайн-сборка ─────────────────────────────────

describe('fallbackWeekMenu — меню без сети из встроенной базы', () => {
  test('7 дней × 4 приёма, все блюда с ккал и реалистичными порциями', () => {
    const days = fallbackWeekMenu(1800)
    expect(days).toHaveLength(7)
    for (const day of days) {
      for (const mealId of ['breakfast', 'lunch', 'dinner', 'snack']) {
        expect(day[mealId].length).toBeGreaterThanOrEqual(1)
        for (const it of day[mealId]) {
          expect(it.kcal).toBeGreaterThan(0)
          expect(it.grams).toBeGreaterThanOrEqual(20)
          expect(it.grams).toBeLessThanOrEqual(700)
          expect(it.kcal100).toBeGreaterThan(0)
          expect(it.source).toBe('local')
        }
      }
    }
  })

  test('дневная калорийность около цели (масштабирование порций)', () => {
    for (const target of [1400, 1800, 2400]) {
      const days = fallbackWeekMenu(target)
      for (const day of days) {
        const total = ['breakfast', 'lunch', 'dinner', 'snack']
          .flatMap((m) => day[m])
          .reduce((n, it) => n + it.kcal, 0)
        // Допуск широкий: clamp граммовок (20–700 г) уводит сумму от цели
        expect(total).toBeGreaterThan(target * 0.45)
        expect(total).toBeLessThan(target * 1.7)
      }
    }
  })

  test('детерминированность: два вызова дают одинаковое меню', () => {
    expect(fallbackWeekMenu(2000)).toEqual(fallbackWeekMenu(2000))
  })

  test('дни различаются между собой (завтраки и супы без повторов)', () => {
    const days = fallbackWeekMenu(1900)
    const breakfasts = days.map((d) => d.breakfast[0].name)
    expect(new Set(breakfasts).size).toBe(7)
    const soups = days.map((d) => d.lunch[0].name)
    expect(new Set(soups).size).toBe(7)
  })
})

// ── generateWeekMenu — фолбэк без сети ───────────────────────────────

describe('generateWeekMenu — офлайн-фолбэк', () => {
  test('без конфига/сети возвращается честное офлайн-меню (не бросает)', async () => {
    const res = await generateWeekMenu({ kcal: 1800 })
    expect(res.source).toBe('offline')
    expect(res.days).toHaveLength(7)
  })
})

// ── setWeek в плане меню ─────────────────────────────────────────────

describe('useMealPlanStore.setWeek — замена недели целиком', () => {
  test('заполняет 7 дней с уникальными id, округляя порции', () => {
    const days = fallbackWeekMenu(1800)
    const wk = '2030-01-07' // понедельник
    useMealPlanStore.setState({ plans: {}, templates: [] })
    useMealPlanStore.getState().setWeek(wk, days)
    const week = useMealPlanStore.getState().plans[wk]
    expect(Object.keys(week)).toHaveLength(7)
    const ids = []
    for (let i = 0; i < 7; i++) {
      for (const mealId of ['breakfast', 'lunch', 'dinner', 'snack']) {
        for (const it of week[i][mealId]) {
          expect(it.id).toBeTruthy()
          ids.push(it.id)
          expect(it.grams).toEqual(Math.round(it.grams))
          expect(it.kcal).toEqual(Math.round(it.kcal * 10) / 10)
        }
      }
    }
    expect(new Set(ids).size).toBe(ids.length)
    // Повторный вызов полностью заменяет неделю (без удвоения блюд)
    useMealPlanStore.getState().setWeek(wk, days)
    const again = useMealPlanStore.getState().plans[wk]
    const count = (w) => [0, 1, 2, 3, 4, 5, 6].flatMap((i) => ['breakfast', 'lunch', 'dinner', 'snack'].flatMap((m) => w[i][m])).length
    expect(count(again)).toBe(count(days))
  })

  test('setWeek с null-днями даёт пустые дни', () => {
    const wk = '2030-01-14'
    useMealPlanStore.setState({ plans: {}, templates: [] })
    useMealPlanStore.getState().setWeek(wk, [null, null, null, null, null, null, null])
    const week = useMealPlanStore.getState().plans[wk]
    for (let i = 0; i < 7; i++) {
      expect(week[i].breakfast).toEqual([])
      expect(week[i].lunch).toEqual([])
    }
  })
})

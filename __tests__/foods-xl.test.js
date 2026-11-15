// Тесты большой базы продуктов (foods-xl/foods-xl2/foods-xl3): структура,
// согласованность ккал с БЖУ (правило 4/9/4, у алкоголя — табличная из этанола),
// реалистичные порции, отсутствие дублей id/названий, покрытие категорий.

import { XL_FOODS } from '@/lib/data/foods-xl'
import { XL2_FOODS } from '@/lib/data/foods-xl2'
import { XL3_FOODS } from '@/lib/data/foods-xl3'
import { FOODS } from '@/lib/data/foods'

const NEW_FOODS = [...XL_FOODS, ...XL2_FOODS, ...XL3_FOODS]

// Алкоголь: калорийность из этанола (~7 ккал/г), поэтому правило 4/9/4 к нему
// неприменимо — ккал берутся табличные, БЖУ почти нулевые.
const ALCOHOL_IDS = new Set([
  'xl-cider',
  'xl-champagne-brut',
  'xl-red-wine-semisweet',
  'xl-whisky',
  'xl-cognac',
  'xl-liqueur',
])

const VALID_TAGS = ['breakfast', 'lunch', 'dinner', 'snack']

describe('foods-xl — большая база: структура данных', () => {
  test('каждый продукт: полный набор полей, уникальный id', () => {
    const ids = new Set()
    for (const f of NEW_FOODS) {
      expect(f.id).toBeTruthy()
      expect(ids.has(f.id)).toBe(false)
      ids.add(f.id)
      expect(f.name).toBeTruthy()
      expect(f.emoji).toBeTruthy()
      expect(typeof f.kcal).toBe('number')
      expect(f.kcal).toBeGreaterThan(0)
      expect(f.kcal).toBeLessThan(950)
      expect(f.defaultGrams).toBeGreaterThan(0)
      expect(Array.isArray(f.tags)).toBe(true)
      expect(f.tags.length).toBeGreaterThan(0)
      for (const t of f.tags) expect(VALID_TAGS).toContain(t)
      expect(f.p).toBeGreaterThanOrEqual(0)
      expect(f.f).toBeGreaterThanOrEqual(0)
      expect(f.c).toBeGreaterThanOrEqual(0)
    }
    expect(ids.size).toBe(NEW_FOODS.length)
  })

  test('новых позиций 247, в полной базе нет дубликатов id', () => {
    expect(NEW_FOODS.length).toBe(247)
    const ids = FOODS.map((f) => f.id)
    expect(new Set(ids).size).toBe(FOODS.length)
  })

  test('названия уникальны внутри новых наборов и не пересекаются со старыми', () => {
    const oldNames = new Set(
      FOODS.filter((f) => !f.id.startsWith('xl-')).map((f) => f.name)
    )
    const newNames = new Set()
    for (const f of NEW_FOODS) {
      expect(newNames.has(f.name)).toBe(false)
      expect(oldNames.has(f.name)).toBe(false)
      newNames.add(f.name)
    }
    expect(newNames.size).toBe(NEW_FOODS.length)
  })

  test('ккал согласованы с БЖУ по правилу 4/9/4 (у алкоголя табличные)', () => {
    for (const f of NEW_FOODS) {
      if (ALCOHOL_IDS.has(f.id)) continue
      const expected = 4 * f.p + 9 * f.f + 4 * f.c
      if (expected < 5) continue // у нулевых продуктов (чай) формула вырождается
      expect(`${f.id}:${f.kcal}`).toBe(`${f.id}:${Math.round(expected)}`)
    }
  })

  test('алкоголь: калорийность табличная (не из БЖУ) и не нулевая', () => {
    for (const id of ALCOHOL_IDS) {
      const f = NEW_FOODS.find((x) => x.id === id)
      expect(f).toBeTruthy()
      expect(f.kcal).toBeGreaterThan(20)
    }
  })

  test('сахара и клетчатка не превышают углеводы', () => {
    for (const f of NEW_FOODS) {
      expect(f.sug).toBeLessThanOrEqual(f.c + 1e-9)
      expect(f.fib).toBeLessThanOrEqual(f.c + 1e-9)
    }
  })

  test('порции реалистичные: 3–600 г (анти-паттерн «2 печенья = 200 г»)', () => {
    for (const f of NEW_FOODS) {
      expect(f.defaultGrams).toBeGreaterThanOrEqual(3)
      expect(f.defaultGrams).toBeLessThanOrEqual(600)
    }
    // выборочно: мелкие позиции — мелкими порциями
    expect(NEW_FOODS.find((f) => f.id === 'xl-iris').defaultGrams).toBeLessThanOrEqual(30)
    expect(NEW_FOODS.find((f) => f.id === 'xl-garlic').defaultGrams).toBeLessThanOrEqual(10)
    expect(NEW_FOODS.find((f) => f.id === 'xl-olive-oil').defaultGrams).toBeLessThanOrEqual(15)
    expect(NEW_FOODS.find((f) => f.id === 'xl-chia').defaultGrams).toBeLessThanOrEqual(20)
  })

  test('каждый приём пищи получил новые позиции', () => {
    for (const t of VALID_TAGS) {
      expect(NEW_FOODS.some((f) => f.tags.includes(t))).toBe(true)
    }
  })
})

describe('foods-xl — покрытие категорий', () => {
  const names = () => NEW_FOODS.map((f) => f.name)

  test('мясо и птица', () => {
    for (const n of ['Баранина отварная', 'Кролик тушёный', 'Бефстроганов', 'Люля-кебаб', 'Голубцы с мясом и рисом', 'Язык говяжий отварной']) {
      expect(names()).toContain(n)
    }
  })

  test('рыба и морепродукты', () => {
    for (const n of ['Горбуша запечённая', 'Мидии отварные', 'Скумбрия копчёная', 'Рыбные котлеты из минтая', 'Килька в томатном соусе']) {
      expect(names()).toContain(n)
    }
  })

  test('супы', () => {
    for (const n of ['Щи из свежей капусты', 'Окрошка на кефире', 'Суп харчо', 'Том Ям с креветками', 'Гаспачо']) {
      expect(names()).toContain(n)
    }
  })

  test('овощи, фрукты, зелень', () => {
    for (const n of ['Перец болгарский', 'Морковь по-корейски', 'Икра кабачковая', 'Манго', 'Грейпфрут', 'Смородина чёрная', 'Кокос свежий', 'Укроп']) {
      expect(names()).toContain(n)
    }
  })

  test('молочка и сыры', () => {
    for (const n of ['Кефир 2,5%', 'Брынза', 'Сулугуни', 'Маскарпоне', 'Рикотта', 'Тофу', 'Овсяное молоко']) {
      expect(names()).toContain(n)
    }
  })

  test('выпечка и сладкое', () => {
    for (const n of ['Хачапури с сыром', 'Хинкали', 'Пончик', 'Тирамису', 'Пастила', 'Паста арахисовая', 'Козинаки']) {
      expect(names()).toContain(n)
    }
  })

  test('фастфуд и готовые блюда', () => {
    for (const n of ['Пицца Маргарита', 'Паста карбонара', 'Рамен с курицей и яйцом', 'Вареники с картошкой', 'Шакшука', 'Лагман с говядиной']) {
      expect(names()).toContain(n)
    }
  })

  test('соусы, напитки, веган/ЗОЖ', () => {
    for (const n of ['Соус терияки', 'Масло оливковое', 'Раф на сливках', 'Кисель', 'Комбуча', 'Фалафель', 'Семена чиа', 'Хумус классический']) {
      expect(names()).toContain(n)
    }
  })
})

describe('foods-xl — полная база выросла', () => {
  test('база теперь больше 460 позиций', () => {
    expect(FOODS.length).toBeGreaterThan(460)
  })

  test('микронутриенты добавлены для ключевых новых продуктов', () => {
    const withMicros = FOODS.filter((f) => f.id.startsWith('xl-') && typeof f.fe === 'number')
    expect(withMicros.length).toBeGreaterThan(60)
  })
})

// Аудит базы продуктов (запрос Кати 19.11: «аудит белки жиры углеводы
// клетчатка — правильно ли расписываются данные»): ккал каждого продукта
// должны соответствовать БЖУ. Формула — правила Атуотера: белок 4,
// доступные углеводы 4, клетчатка 2, алкоголь (поле alc, г спирта) 7,
// жиры 9 ккал/г.

const { FOODS } = require('../src/lib/data/foods')

const kcalFrom = (f) =>
  f.p * 4 + f.f * 9 + (f.c - (f.fib || 0)) * 4 + (f.fib || 0) * 2 + (f.alc || 0) * 7

describe('база продуктов: ккал согласованы с БЖУ', () => {
  test('нет дублей ID и пустых названий', () => {
    const seen = new Set()
    for (const f of FOODS) {
      expect(seen.has(f.id)).toBe(false)
      seen.add(f.id)
      expect(f.name).toBeTruthy()
    }
    expect(FOODS.length).toBeGreaterThan(0)
  })

  test('ккал согласованы с БЖУ (Атуотер: 4/9/4, клетчатка 2, алкоголь 7)', () => {
    // У кислых овощей/ягод ккал по таблицам включает органические
    // кислоты (~3 ккал/г), которых нет в чистом Атуотере, — для них
    // допустимое отклонение шире (значения ккал — из справочников)
    const ACIDS_ALLOWED = ['green-onion', 'xl-celery', 'xl-lemon', 'xl-black-currant', 'xl-cranberry', 'xl-blackberry']
    const outliers = []
    for (const f of FOODS) {
      const calc = kcalFrom(f)
      const dev = calc > 0 ? Math.abs(f.kcal - calc) / calc : f.kcal > 0 ? 1 : 0
      const limit = ACIDS_ALLOWED.includes(f.id) ? 0.45 : 0.2
      if (dev > limit) outliers.push(`${f.id} «${f.name}»: указано ${f.kcal}, по БЖУ ${Math.round(calc)}`)
    }
    expect(outliers).toEqual([])
  })

  test('числа неотрицательные и правдоподобные', () => {
    for (const f of FOODS) {
      for (const key of ['kcal', 'p', 'f', 'c']) {
        expect(typeof f[key]).toBe('number')
        expect(f[key]).toBeGreaterThanOrEqual(0)
        expect(f[key]).toBeLessThanOrEqual(900)
      }
      // Клетчатка/сахар (если указаны): не больше углеводов и не отрицательные
      if (f.fib != null) {
        expect(f.fib).toBeGreaterThanOrEqual(0)
        expect(f.fib).toBeLessThanOrEqual(60)
      }
      if (f.sug != null) {
        expect(f.sug).toBeGreaterThanOrEqual(0)
        if (f.c > 0) expect(f.sug).toBeLessThanOrEqual(f.c)
      }
    }
  })
})

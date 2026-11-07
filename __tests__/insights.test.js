// Тесты персональных подсказок по дневнику питания (lib/data/insights):
// правило «3 дня белка меньше нормы — вес стоит» (пример Кати),
// приоритеты, игнор пустых дней и честный null, когда всё в норме.

const {
  foodInsight,
  insightNorms,
  weightStands,
} = require('@/lib/data/insights')

// Цели: 2000 ккал → авто-норма белка 100 г (20% / 4), вода 2000 мл,
// клетчатка 25 г
const GOALS = {
  kcal: 2000,
  waterMl: 2000,
  macroNorms: { p: 0, f: 0, c: 0, fib: 0 },
}

// День дневника: только заданные поля
const day = (over = {}) => ({ kcal: 2000, p: 120, fib: 30, waterMl: 2500, ...over })

function weight(kg, daysAgo) {
  return { id: `w${daysAgo}`, kg, date: new Date(Date.now() - daysAgo * 86400000).toISOString() }
}

describe('insightNorms', () => {
  test('авто-нормы от цели по калориям, свои перекрывают', () => {
    const auto = insightNorms(GOALS)
    expect(auto.p).toBe(100)
    expect(auto.fib).toBe(25)
    expect(auto.waterMl).toBe(2000)

    const own = insightNorms({ ...GOALS, macroNorms: { p: 80, fib: 20 } })
    expect(own.p).toBe(80)
    expect(own.fib).toBe(20)
  })
})

describe('foodInsight — белок', () => {
  test('3 дня белка меньше 80% нормы — подсказка про белок', () => {
    const rows = [day({ p: 40 }), day({ p: 50 }), day({ p: 45 })]
    const res = foodInsight({ rows, goals: GOALS, weights: [] })
    expect(res.id).toBe('protein-low')
    expect(res.title).toBe('Мало белка')
    expect(res.text).toContain('3 дня подряд')
  })

  test('ровно пример Кати: белок низкий 3 дня + вес стоит — «вес стоит»', () => {
    // Первый день ведённый (есть еда) — просто без белка
    const rows = [day({ p: 30, kcal: 1800 }), day({ p: 35 }), day({ p: 40 })]
    const res = foodInsight({
      rows,
      goals: GOALS,
      weights: [weight(54, 1), weight(54.1, 5)],
    })
    expect(res.id).toBe('protein-low-stall')
    expect(res.text).toContain('вес не двигается')
  })

  test('2 дня низкого белка — подсказки нет', () => {
    const rows = [day(), day({ p: 40 }), day({ p: 45 })]
    expect(foodInsight({ rows, goals: GOALS, weights: [] })).toBeNull()
  })
})

describe('foodInsight — калории и вода', () => {
  test('перебор калорий 3 дня — kcal-over', () => {
    const rows = [day({ kcal: 2400 }), day({ kcal: 2500 }), day({ kcal: 2350 })]
    const res = foodInsight({ rows, goals: GOALS, weights: [] })
    expect(res.id).toBe('kcal-over')
  })

  test('мало воды 3 дня — water-low', () => {
    const rows = [day({ waterMl: 500 }), day({ waterMl: 600 }), day({ waterMl: 400 })]
    const res = foodInsight({ rows, goals: GOALS, weights: [] })
    expect(res.id).toBe('water-low')
  })

  test('голодание 3 дня — kcal-low', () => {
    const rows = [day({ kcal: 900 }), day({ kcal: 1000 }), day({ kcal: 1100 })]
    const res = foodInsight({ rows, goals: GOALS, weights: [] })
    expect(res.id).toBe('kcal-low')
  })

  test('мало клетчатки 3 дня — fib-low', () => {
    const rows = [day({ fib: 8 }), day({ fib: 10 }), day({ fib: 9 })]
    const res = foodInsight({ rows, goals: GOALS, weights: [] })
    expect(res.id).toBe('fib-low')
  })
})

describe('foodInsight — цель ниже привычной калорийности', () => {
  // Пример Кати: цель 1200 ккал, три дня подряд съедено ~1725 —
  // строгий остаток каждый день красный, дело не в дисциплине
  const GOALS_1200 = {
    kcal: 1200,
    waterMl: 2000,
    macroNorms: { p: 0, f: 0, c: 0, fib: 0 },
  }

  test('ровно пример Кати: цель 1200, три дня ~1725 — мягкая подсказка про цель', () => {
    const rows = [day({ kcal: 1725 }), day({ kcal: 1700 }), day({ kcal: 1750 })]
    const res = foodInsight({ rows, goals: GOALS_1200, weights: [] })
    expect(res.id).toBe('goal-below-habit')
    expect(res.title).toBe('Может, цель слишком низкая?')
    expect(res.text).toContain('обычной калорийности')
    expect(res.text).toContain('«Тело»')
    // Мягкий тон: без «сделайте легче» — дело не в сегодняшнем дне
    expect(res.text).not.toContain('сделайте легче')
  })

  test('граница: средний перебор ровно 25% — подсказка про цель', () => {
    const rows = [day({ kcal: 2500 }), day({ kcal: 2500 }), day({ kcal: 2500 })]
    expect(foodInsight({ rows, goals: GOALS, weights: [] }).id).toBe('goal-below-habit')
  })

  test('умеренный перебор (в среднем 17%) — прежняя подсказка kcal-over', () => {
    const rows = [day({ kcal: 2340 }), day({ kcal: 2340 }), day({ kcal: 2340 })]
    expect(foodInsight({ rows, goals: GOALS, weights: [] }).id).toBe('kcal-over')
  })

  test('не каждый день выше цели — подсказки про цель нет', () => {
    const rows = [day(), day({ kcal: 2600 }), day({ kcal: 2600 })]
    expect(foodInsight({ rows, goals: GOALS, weights: [] })).toBeNull()
  })

  test('белок по-прежнему важнее подсказки про цель', () => {
    // Авто-норма белка при цели 1200 = 60 г, порог 80% = 48 г — все дни ниже
    const rows = [day({ p: 40, kcal: 1725 }), day({ p: 45, kcal: 1700 }), day({ p: 44, kcal: 1750 })]
    expect(foodInsight({ rows, goals: GOALS_1200, weights: [] }).id).toBe('protein-low')
  })
})

describe('foodInsight — приоритеты и пустые дни', () => {
  test('белок важнее перебора калорий', () => {
    const rows = [day({ p: 40, kcal: 2400 }), day({ p: 50, kcal: 2500 }), day({ p: 45, kcal: 2300 })]
    expect(foodInsight({ rows, goals: GOALS, weights: [] }).id).toBe('protein-low')
  })

  test('пустые дни не топят правило: 3 ведённых дня с низким белком', () => {
    const rows = [
      day(),
      day(), // ведённые, всё в норме
      day({ kcal: 0, waterMl: 0, p: 0, fib: 0 }), // пустой — пропускается
      day({ p: 40 }),
      day({ p: 50 }),
      day({ p: 45 }),
    ]
    const res = foodInsight({ rows, goals: GOALS, weights: [] })
    expect(res.id).toBe('protein-low')
  })

  test('меньше трёх ведённых дней — null; всё в норме — null', () => {
    expect(foodInsight({ rows: [day(), day()], goals: GOALS, weights: [] })).toBeNull()
    expect(foodInsight({ rows: [day(), day(), day()], goals: GOALS, weights: [] })).toBeNull()
  })
})

describe('weightStands', () => {
  test('два свежих взвешивания ±0,3 кг — стоит; дальше — нет', () => {
    expect(weightStands([weight(54, 1), weight(54.2, 5)])).toBe(true)
    expect(weightStands([weight(54, 1), weight(56, 5)])).toBe(false)
    expect(weightStands([weight(54, 1)])).toBe(false)
    expect(weightStands([])).toBe(false)
  })

  test('старые взвешивания не считаются «стоит»', () => {
    expect(weightStands([weight(54, 20), weight(54.1, 25)])).toBe(false)
  })
})

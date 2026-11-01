// Юнит-тесты расчёта ИМТ: категории, кольцо, формулы плана, журнал веса.
import {
  BMI_CATEGORIES,
  calcBmi,
  bmiCategory,
  healthyRange,
  gaugeFill,
  bmrMifflin,
  tdeeKcal,
  idealWeightDevine,
  bodyFatPercent,
  fmtDecimal,
  allWeights,
  kgToNextCategory,
  normStreakWeeks,
} from '@/lib/data/bmi'

describe('calcBmi', () => {
  test('ИМТ = вес / рост², одна десятичная', () => {
    expect(calcBmi(70, 175)).toBe(22.9) // 70 / 3.0625 = 22.857
    expect(calcBmi(50, 175)).toBe(16.3)
    expect(calcBmi(95, 175)).toBe(31.0)
  })

  test('пустые данные — 0, без NaN', () => {
    expect(calcBmi(0, 175)).toBe(0)
    expect(calcBmi(70, 0)).toBe(0)
  })
})

describe('категории ИМТ', () => {
  test('границы по макету (точки 18.5 / 25 / 30 / 35)', () => {
    expect(bmiCategory(17).id).toBe('low')
    expect(bmiCategory(18.5).id).toBe('norm')
    expect(bmiCategory(22.9).id).toBe('norm')
    expect(bmiCategory(24.9).id).toBe('norm')
    expect(bmiCategory(25).id).toBe('over')
    expect(bmiCategory(29.9).id).toBe('over')
    expect(bmiCategory(30).id).toBe('obese1')
    expect(bmiCategory(34.9).id).toBe('obese1')
    expect(bmiCategory(35).id).toBe('obese2')
    expect(bmiCategory(45).id).toBe('obese2')
  })

  test('пять категорий, каждая с подписью и цветом', () => {
    expect(BMI_CATEGORIES).toHaveLength(5)
    expect(BMI_CATEGORIES.every((c) => c.label && c.color)).toBe(true)
  })
})

describe('здоровый диапазон и кольцо', () => {
  test('диапазон веса для роста (ИМТ 18.5…24.9)', () => {
    expect(healthyRange(175)).toEqual({ min: 57, max: 76 })
    expect(healthyRange(160)).toEqual({ min: 47, max: 64 }) // 47.36 / 63.74
  })

  test('заполнение кольца: шкала 0–40, пол 8%, потолок 100%', () => {
    expect(gaugeFill(22)).toBe(55)
    expect(gaugeFill(10)).toBe(25)
    expect(gaugeFill(0)).toBe(8)
    expect(gaugeFill(45)).toBe(100)
  })
})

describe('формулы плана', () => {
  test('БМР Миффлина — Сан Жеора', () => {
    expect(bmrMifflin('female', 30, 175, 75)).toBe(1533) // 750+1093.75−150−161
    expect(bmrMifflin('male', 30, 175, 75)).toBe(1699) // 750+1093.75−150+5
  })

  test('TDEE = БМР × коэффициент', () => {
    expect(tdeeKcal(1533, 1.375)).toBe(2108)
  })

  test('идеальный вес по Девайну', () => {
    expect(idealWeightDevine('female', 175)).toBe(66)
    expect(idealWeightDevine('male', 175)).toBe(70.5)
  })

  test('процент жира по Дёренбергу с зажимом 5…60', () => {
    expect(bodyFatPercent(22.9, 30, 'female')).toBe(29)
    expect(bodyFatPercent(22.9, 30, 'male')).toBe(18.2)
    expect(bodyFatPercent(50, 80, 'male')).toBe(60) // 62.2 → потолок
  })

  test('формат «22.4» — точка вместо запятой', () => {
    expect(fmtDecimal(22.856)).toBe('22.9')
    expect(fmtDecimal(40)).toBe('40.0')
    expect(fmtDecimal(null)).toBe('0.0')
  })
})

describe('журнал веса', () => {
  test('allWeights: одна точка на день, последняя запись дня побеждает', () => {
    const rows = allWeights([
      { date: '2026-10-20', kg: 70.05 },
      { date: '2026-10-20', kg: 71.2 },
      { date: '2026-10-22', kg: 70.8 },
    ])
    expect(rows).toEqual([
      { label: '20.10', kg: 71.2 },
      { label: '22.10', kg: 70.8 },
    ])
  })

  test('allWeights: пустой журнал — пустой массив', () => {
    expect(allWeights([])).toEqual([])
    expect(allWeights(null)).toEqual([])
  })
})

describe('kgToNextCategory', () => {
  test('норма — рабочий диапазон веса', () => {
    const r = kgToNextCategory(70, 175)
    expect(r.tone).toBe('ok')
    expect(r.text).toContain('57–76')
  })

  test('ожирение I — сколько до лишнего веса', () => {
    const r = kgToNextCategory(95, 175) // ИМТ 31.0 → до 29.9
    expect(r.tone).toBe('info')
    expect(r.text).toBe('До «Лишнего веса» осталось −3.4 кг')
  })

  test('недостаток веса — сколько набрать до нормы', () => {
    const r = kgToNextCategory(50, 175) // ИМТ 16.3 → до 18.5
    expect(r.tone).toBe('info')
    expect(r.text).toBe('До «Нормы» осталось +6.7 кг')
  })

  test('без данных — null', () => {
    expect(kgToNextCategory(0, 175)).toBeNull()
    expect(kgToNextCategory(70, 0)).toBeNull()
  })
})

describe('normStreakWeeks', () => {
  const daysAgo = (n) => {
    const d = new Date()
    d.setDate(d.getDate() - n)
    return d.toISOString()
  }

  test('30 дней после выхода из лишнего веса → 4 недели', () => {
    const records = [
      { date: daysAgo(30), kg: 95 },
      { date: daysAgo(0), kg: 70 },
    ]
    expect(normStreakWeeks(70, records, 175)).toBe(4)
  })

  test('все записи в норме — стрик с первой записи', () => {
    const records = [{ date: daysAgo(10), kg: 70 }]
    const weeks = normStreakWeeks(70, records, 175)
    expect([1, 2]).toContain(weeks) // 9…11 дней → 1 полная неделя
  })

  test('вне нормы сейчас — стрика нет', () => {
    const records = [{ date: daysAgo(10), kg: 95 }]
    expect(normStreakWeeks(95, records, 175)).toBe(0)
  })

  test('нет записей или данных — 0', () => {
    expect(normStreakWeeks(70, [], 175)).toBe(0)
    expect(normStreakWeeks(0, [{ date: daysAgo(1), kg: 70 }], 175)).toBe(0)
    expect(normStreakWeeks(70, [{ date: daysAgo(1), kg: 70 }], 0)).toBe(0)
  })
})

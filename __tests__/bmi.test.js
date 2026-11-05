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
  bodyFatLevel,
  fmtDecimal,
  allWeights,
  kgToNextCategory,
  normStreakWeeks,
  weightStrip,
  bodyProgressScore,
  scoreCaption,
  scoreStars,
  TIPS_OF_DAY,
  tipOfDay,
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

describe('bodyFatLevel — цвет строки «Жир в организме»', () => {
  test('женщина 37 лет, ИМТ 31.6 → 41 % — ожирение (красный)', () => {
    const fat = bodyFatPercent(31.6, 37, 'female')
    expect(fat).toBe(41)
    expect(bodyFatLevel(fat, 'female').id).toBe('obese')
    expect(bodyFatLevel(fat, 'female').color).toBe('#f87171')
  })

  test('границы по полу: норма / предожирение / ожирение', () => {
    // Женщины: норма < 32, ожирение ≥ 35
    expect(bodyFatLevel(31.9, 'female').id).toBe('norm')
    expect(bodyFatLevel(32, 'female').id).toBe('pred')
    expect(bodyFatLevel(34.9, 'female').id).toBe('pred')
    expect(bodyFatLevel(35, 'female').id).toBe('obese')
    // Мужчины: норма < 25, ожирение ≥ 30
    expect(bodyFatLevel(24.9, 'male').id).toBe('norm')
    expect(bodyFatLevel(25, 'male').id).toBe('pred')
    expect(bodyFatLevel(29.9, 'male').id).toBe('pred')
    expect(bodyFatLevel(30, 'male').id).toBe('obese')
  })

  test('цвета уровней: норма — зелёный, предожирение — оранжевый, ожирение — красный', () => {
    expect(bodyFatLevel(20, 'female').color).toBe('#4ade80')
    expect(bodyFatLevel(33, 'female').color).toBe('#fb923c')
    expect(bodyFatLevel(40, 'male').color).toBe('#f87171')
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

describe('weightStrip — подпись-поддержка под графиком', () => {
  test('стабильный вес — зелёный лайк, как на макете', () => {
    const s = weightStrip({ delta: 0 })
    expect(s.tone).toBe('stable')
    expect(s.title).toBe('Ваш вес стабилен')
    expect(s.text).toContain('в том же духе')
  })

  test('движение к цели — похвала (и на сброс, и на набор)', () => {
    expect(weightStrip({ delta: -1.2, towardGoal: true }).tone).toBe('good')
    expect(weightStrip({ delta: 1.2, towardGoal: true }).tone).toBe('good')
    expect(weightStrip({ delta: -1.2, towardGoal: true }).title).toContain('к цели')
  })

  test('движение от цели — мягкая поддержка', () => {
    const s = weightStrip({ delta: 1.5, towardGoal: false })
    expect(s.tone).toBe('bad')
    expect(s.text).toContain('Не сдавайтесь')
  })

  test('цели нет — по движению к норме, без слова «цель»', () => {
    const toNorm = weightStrip({ delta: -0.8, towardGoal: null, towardNorm: true })
    expect(toNorm.tone).toBe('good')
    expect(toNorm.title).toBe('Вес движется к норме')
    const away = weightStrip({ delta: -0.8, towardGoal: null, towardNorm: false })
    expect(away.tone).toBe('bad')
    expect(away.title).toBe('Вес уходит от нормы')
    expect(away.text).not.toContain('цели')
  })

  test('цели и нормы нет — нейтрально по направлению динамики', () => {
    const down = weightStrip({ delta: -0.8, towardGoal: null })
    expect(down.tone).toBe('good')
    expect(down.title).toBe('Вес пошёл вниз')
    const up = weightStrip({ delta: 0.8, towardGoal: null })
    expect(up.tone).toBe('stable')
    expect(up.title).toBe('Вес пошёл вверх')
  })

  test('достигнутая цель — поздравление важнее динамики', () => {
    const s = weightStrip({ delta: 0.4, towardGoal: false, goalReached: true })
    expect(s.tone).toBe('good')
    expect(s.title).toContain('Цель достигнута')
  })
})

describe('bodyProgressScore — общий прогресс 0–100', () => {
  const daysAgo = (n) => {
    const d = new Date()
    d.setDate(d.getDate() - n)
    return d.toISOString()
  }

  test('без цели, ИМТ в норме: вес 60, замеров нет — «Хороший результат!»', () => {
    // 60 (норма) + 8 (нет замеров: 4+4) + 0 (нет записей веса) = 68
    const r = bodyProgressScore({ weightKg: 70, heightCm: 175, measurements: {}, weights: [] })
    expect(r.score).toBe(68)
    expect(r.caption).toBe('Хороший результат!')
    expect(r.stars).toBe(3.5)
  })

  test('половина пути к цели + талия −4 см + свежий вес', () => {
    // вес: (90−85)/(90−80)·60 = 30; замеры: талия −4 → 12.5, живота нет → 4;
    // регулярность: 1 замер с данными → 4, свежий вес → +3 → 53.5 → 54
    const r = bodyProgressScore({
      weightKg: 85,
      heightCm: 175,
      goalWeightKg: 80,
      weights: [
        { date: daysAgo(0), kg: 85 },
        { date: daysAgo(30), kg: 90 },
      ],
      measurements: {
        waist: [
          { date: daysAgo(0), cm: 80 },
          { date: daysAgo(30), cm: 84 },
        ],
      },
    })
    expect(r.score).toBe(54)
    expect(r.caption).toBe('Есть движение!')
  })

  test('цель достигнута, талия ушла — «Отличный прогресс!» 4.5★', () => {
    // вес: 60 (у цели); замеры: талия −2 см → 12.5, живот на месте → 6;
    // регулярность: 2 замера → 8, свежий вес → +3 → 89.5 → 90
    const r = bodyProgressScore({
      weightKg: 80,
      heightCm: 175,
      goalWeightKg: 80,
      weights: [
        { date: daysAgo(0), kg: 80 },
        { date: daysAgo(60), kg: 90 },
      ],
      measurements: {
        waist: [
          { date: daysAgo(0), cm: 78 },
          { date: daysAgo(60), cm: 80 },
        ],
        belly: [
          { date: daysAgo(0), cm: 88 },
          { date: daysAgo(60), cm: 88 },
        ],
      },
    })
    expect(r.score).toBe(90)
    expect(r.caption).toBe('Отличный прогресс!')
    expect(r.stars).toBe(4.5)
  })

  test('набор веса работает так же: половина пути к цели — 30 из 60', () => {
    const r = bodyProgressScore({
      weightKg: 65,
      heightCm: 175,
      goalWeightKg: 70,
      weights: [
        { date: daysAgo(0), kg: 65 },
        { date: daysAgo(30), kg: 60 },
      ],
      measurements: {},
    })
    // 30 + 8 (замеров нет) + 0 (замеров с данными нет) + 3 = 41
    expect(r.score).toBe(41)
  })

  test('цель есть, динамики ещё нет — нейтральные 24 за вес', () => {
    const r = bodyProgressScore({
      weightKg: 90,
      heightCm: 175,
      goalWeightKg: 80,
      weights: [{ date: daysAgo(0), kg: 90 }],
      measurements: {},
    })
    // 24 + 8 + 0 + 3 = 35
    expect(r.score).toBe(35)
  })

  test('без цели ИМТ-позиция: ожирение I — 20 за вес', () => {
    // ИМТ 32.7 → obese1 → 20; + 8 + 0 = 28
    const r = bodyProgressScore({ weightKg: 100, heightCm: 175, measurements: {}, weights: [] })
    expect(r.score).toBe(28)
  })

  test('несвежий вес (8 дней) — бонуса за свежесть нет', () => {
    const r = bodyProgressScore({
      weightKg: 70,
      heightCm: 175,
      weights: [{ date: daysAgo(8), kg: 70 }],
      measurements: {},
    })
    expect(r.score).toBe(68) // 60 + 8, без +3
  })
})

describe('scoreCaption / scoreStars', () => {
  test('пороги подписи', () => {
    expect(scoreCaption(85)).toBe('Отличный прогресс!')
    expect(scoreCaption(65)).toBe('Хороший результат!')
    expect(scoreCaption(40)).toBe('Есть движение!')
    expect(scoreCaption(10)).toBe('Начало положено!')
  })

  test('звёзды с шагом 0,5', () => {
    expect(scoreStars(85)).toBe(4.5)
    expect(scoreStars(82)).toBe(4)
    expect(scoreStars(50)).toBe(2.5)
    expect(scoreStars(0)).toBe(0)
    expect(scoreStars(100)).toBe(5)
    expect(scoreStars(120)).toBe(5) // потолок
  })
})

describe('tipOfDay — совет дня', () => {
  test('совет один на весь день и циклится по списку', () => {
    const jan1 = new Date(2026, 0, 1)
    expect(tipOfDay(jan1)).toBe(TIPS_OF_DAY[1])
    // +8 дней → тот же индекс (список из 8 советов)
    const jan9 = new Date(2026, 0, 9)
    expect(tipOfDay(jan9)).toBe(TIPS_OF_DAY[1])
  })

  test('советы уникальны и непустые', () => {
    expect(new Set(TIPS_OF_DAY).size).toBe(TIPS_OF_DAY.length)
    expect(TIPS_OF_DAY.every((t) => t.length > 10)).toBe(true)
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

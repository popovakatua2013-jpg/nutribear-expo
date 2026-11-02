// Юнит-тесты аудита организма: счёт, вердикты систем, фразы с чёрным
// юмором, редкие диагнозы и пулы реплик прыщей.
import {
  AUDIT_SYSTEMS,
  AUDIT_THRESHOLDS,
  VERDICT_META,
  SCAN_STAGES,
  CONCLUSION,
  RARE_CHANCE,
  RARE_PHRASES,
  PHRASES,
  TIPS,
  PIMPLE_POP_PHRASES,
  PIMPLE_POP_PHRASES_PRO,
  PIMPLE_DONE_PHRASES,
  PIMPLE_DONE_PHRASES_PRO,
  auditScore,
  computeAudit,
  pick,
  pickPimplePopPhrase,
  pickPimpleDonePhrase,
  auditShareText,
  auditStreak,
  auditDateLabel,
  weekdayLetterOf,
  dateKeyOf,
} from '@/lib/data/audit'

const HEALTHY = { hydration: 100, protein: 100, energy: 100, activity: 100 }
const EMPTY = { hydration: 0, protein: 0, energy: 0, activity: 0 }

describe('auditScore', () => {
  test('среднее осей, зажатое в 0…100', () => {
    expect(auditScore(HEALTHY)).toBe(100)
    expect(auditScore(EMPTY)).toBe(0)
    expect(auditScore({ hydration: 50, protein: 50, energy: 50, activity: 50 })).toBe(50)
  })

  test('перебор энергии сворачивается к 100 (150% → 50)', () => {
    expect(auditScore({ hydration: 100, protein: 100, energy: 150, activity: 100 })).toBe(88)
    expect(auditScore({ hydration: 100, protein: 100, energy: 200, activity: 100 })).toBe(75)
  })

  test('пустые и частичные оси не дают NaN', () => {
    expect(auditScore()).toBe(0)
    expect(auditScore({ hydration: 80 })).toBe(20)
  })
})

describe('computeAudit — структура', () => {
  test('6 систем: 3 бесплатные, 3 в Premium', () => {
    const r = computeAudit({ axes: HEALTHY, state: 'bloom', streak: 3 })
    expect(r.systems).toHaveLength(6)
    expect(r.systems.filter((s) => !s.pro)).toHaveLength(3)
    expect(r.systems.filter((s) => s.pro)).toHaveLength(3)
    expect(r.systems.map((s) => s.key)).toEqual(AUDIT_SYSTEMS.map((s) => s.key))
  })

  test('каждой системе выдаются непустые фраза и рекомендация', () => {
    const r = computeAudit({ axes: HEALTHY, state: 'bloom', streak: 3 })
    for (const s of r.systems) {
      expect(typeof s.phrase).toBe('string')
      expect(s.phrase.length).toBeGreaterThan(0)
      expect(typeof s.tip).toBe('string')
      expect(s.tip.length).toBeGreaterThan(0)
    }
  })

  test('детерминизм с фиксированным rng', () => {
    const input = { axes: { hydration: 80, protein: 40, energy: 90, activity: 30 }, state: 'normal', streak: 1 }
    const a = computeAudit(input, { pro: true, rng: () => 0.5 })
    const b = computeAudit(input, { pro: true, rng: () => 0.5 })
    expect(a).toEqual(b)
  })

  test('повторный осмотр без rng — новые шутки (розыгрыш каждый раз)', () => {
    const input = { axes: HEALTHY, state: 'bloom', streak: 3 }
    const phrases = new Set(Array.from({ length: 30 }, () => computeAudit(input).systems[0].phrase))
    expect(phrases.size).toBeGreaterThan(1)
  })
})

describe('computeAudit — вердикты систем', () => {
  test('здоровый день: бесплатные системы «Отлично», итог good', () => {
    const r = computeAudit({ axes: HEALTHY, state: 'bloom', streak: 3, kcal: 2000, kcalGoal: 2000 })
    expect(r.score).toBe(100)
    expect(r.verdict).toBe('good')
    expect(CONCLUSION.good).toContain(r.conclusion)
    for (const s of r.systems.filter((x) => !x.pro)) {
      expect(s.verdict).toBe('good')
      expect(VERDICT_META[s.verdict].label).toBe('Отлично')
    }
  })

  test('обезвоживание: кожа в тревоге', () => {
    const r = computeAudit({ axes: { ...HEALTHY, hydration: 10 }, state: 'normal', streak: 2 })
    expect(r.systems.find((s) => s.key === 'skin').verdict).toBe('bad')
  })

  test('кожа на границе порогов', () => {
    const good = computeAudit({ axes: { ...HEALTHY, hydration: AUDIT_THRESHOLDS.skinGood } })
    const ok = computeAudit({ axes: { ...HEALTHY, hydration: AUDIT_THRESHOLDS.skinGood - 1 } })
    expect(good.systems.find((s) => s.key === 'skin').verdict).toBe('good')
    expect(ok.systems.find((s) => s.key === 'skin').verdict).toBe('ok')
  })

  test('перебор калорий >120%: желудок в тревоге', () => {
    const r = computeAudit({ axes: HEALTHY, state: 'normal', streak: 2, kcal: 2600, kcalGoal: 2000 })
    expect(r.systems.find((s) => s.key === 'stomach').verdict).toBe('bad')
    expect(VERDICT_META.bad.label).toBe('Тревога')
  })

  test('лёгкий перебор 110%: желудок «Перебор», не тревога', () => {
    const r = computeAudit({ axes: HEALTHY, state: 'normal', streak: 2, kcal: 2200, kcalGoal: 2000 })
    expect(r.systems.find((s) => s.key === 'stomach').verdict).toBe('over')
  })

  test('недобор калорий: желудок «Недобор»', () => {
    const r = computeAudit({ axes: HEALTHY, state: 'normal', streak: 2, kcal: 800, kcalGoal: 2000 })
    expect(r.systems.find((s) => s.key === 'stomach').verdict).toBe('under')
  })

  test('коридор калорий: желудок «Отлично»', () => {
    const r = computeAudit({ axes: HEALTHY, state: 'normal', streak: 2, kcal: 1600, kcalGoal: 2000 })
    expect(r.systems.find((s) => s.key === 'stomach').verdict).toBe('good')
  })

  test('пустой день без цели: желудок не даёт Infinity-вердиктов', () => {
    const r = computeAudit({ axes: EMPTY, state: 'decline', streak: 0, kcal: 0, kcalGoal: 0 })
    expect(r.systems.find((s) => s.key === 'stomach').verdict).toBe('under')
  })

  test('шаги: от рекорда до дивана', () => {
    const good = computeAudit({ axes: { ...HEALTHY, activity: 70 } })
    const ok = computeAudit({ axes: { ...HEALTHY, activity: 35 } })
    const bad = computeAudit({ axes: { ...HEALTHY, activity: 10 } })
    expect(good.systems.find((s) => s.key === 'heart').verdict).toBe('good')
    expect(ok.systems.find((s) => s.key === 'heart').verdict).toBe('ok')
    expect(bad.systems.find((s) => s.key === 'heart').verdict).toBe('bad')
  })

  test('нервы: серия 3+ — отлично, 1–2 — норма, 0 — тревога', () => {
    const good = computeAudit({ axes: HEALTHY, state: 'normal', streak: AUDIT_THRESHOLDS.nervesGood })
    const ok = computeAudit({ axes: HEALTHY, state: 'normal', streak: AUDIT_THRESHOLDS.nervesOk })
    const bad = computeAudit({ axes: HEALTHY, state: 'normal', streak: 0 })
    expect(good.systems.find((s) => s.key === 'nerves').verdict).toBe('good')
    expect(ok.systems.find((s) => s.key === 'nerves').verdict).toBe('ok')
    expect(bad.systems.find((s) => s.key === 'nerves').verdict).toBe('bad')
  })

  test('иммунитет по состоянию организма: расцвет/норма/упадок', () => {
    const bloom = computeAudit({ axes: HEALTHY, state: 'bloom', streak: 1 })
    const normal = computeAudit({ axes: HEALTHY, state: 'normal', streak: 1 })
    const decline = computeAudit({ axes: EMPTY, state: 'decline', streak: 0 })
    expect(bloom.systems.find((s) => s.key === 'immunity').verdict).toBe('good')
    expect(normal.systems.find((s) => s.key === 'immunity').verdict).toBe('ok')
    expect(decline.systems.find((s) => s.key === 'immunity').verdict).toBe('bad')
  })

  test('пустой день: тревожный вердикт и заключение из тревожного пула', () => {
    const r = computeAudit({ axes: EMPTY, state: 'decline', streak: 0 })
    expect(r.score).toBe(0)
    expect(r.verdict).toBe('bad')
    expect(CONCLUSION.bad).toContain(r.conclusion)
    // в пуле тревожных заключений есть и «Жив!», и «исправимо» — позитив даже тут
    expect(CONCLUSION.bad.some((t) => t.includes('Жив'))).toBe(true)
    expect(CONCLUSION.bad.some((t) => t.includes('исправим'))).toBe(true)
  })
})

describe('computeAudit — редкие диагнозы (Premium)', () => {
  test('без Premium редких диагнозов не бывает', () => {
    // rng() = 0 всегда попадает в RARE_CHANCE — но только для pro
    const free = computeAudit({ axes: HEALTHY, state: 'bloom', streak: 3 }, { pro: false, rng: () => 0 })
    expect(free.systems.every((s) => !s.rare)).toBe(true)
  })

  test('с Premium редкий диагноз заменяет фразу из редкого пула', () => {
    const pro = computeAudit({ axes: HEALTHY, state: 'bloom', streak: 3 }, { pro: true, rng: () => 0 })
    const rareSystem = pro.systems.find((s) => s.rare)
    expect(rareSystem).toBeTruthy()
    expect(RARE_PHRASES).toContain(rareSystem.phrase)
  })

  test('с rng 0.5 редких диагнозов нет', () => {
    const pro = computeAudit({ axes: HEALTHY, state: 'bloom', streak: 3 }, { pro: true, rng: () => 0.5 })
    expect(pro.systems.every((s) => !s.rare)).toBe(true)
  })

  test('RARE_CHANCE — 10%', () => {
    expect(RARE_CHANCE).toBe(0.1)
  })
})

describe('пулы фраз непусты во всех ветках', () => {
  test('у каждой системы и каждого вердикта есть фразы и советы', () => {
    for (const s of AUDIT_SYSTEMS) {
      for (const [v, list] of Object.entries(PHRASES[s.key])) {
        expect(Array.isArray(list)).toBe(true)
        expect(list.length).toBeGreaterThan(0)
        for (const p of list) expect(p.length).toBeGreaterThan(5)
        expect(typeof TIPS[s.key][v]).toBe('string')
        expect(TIPS[s.key][v].length).toBeGreaterThan(5)
      }
    }
  })

  test('у желудка есть ветки good/under/over/bad', () => {
    expect(Object.keys(PHRASES.stomach).sort()).toEqual(['bad', 'good', 'over', 'under'])
  })

  test('статусы сканирования и метки вердиктов на месте', () => {
    expect(SCAN_STAGES.length).toBeGreaterThanOrEqual(4)
    expect(Object.keys(VERDICT_META).sort()).toEqual(['bad', 'good', 'ok', 'over', 'under'])
  })
})

describe('фразы прыщей — позитивный чёрный юмор', () => {
  test('базовые пулы непусты, про-пулы расширяют выбор', () => {
    expect(PIMPLE_POP_PHRASES.length).toBeGreaterThanOrEqual(6)
    expect(PIMPLE_DONE_PHRASES.length).toBeGreaterThanOrEqual(3)
    expect(PIMPLE_POP_PHRASES_PRO.length).toBeGreaterThan(0)
    expect(PIMPLE_DONE_PHRASES_PRO.length).toBeGreaterThan(0)
  })

  test('пример пользователя про фурункулы присутствует', () => {
    const all = [...PIMPLE_POP_PHRASES, ...PIMPLE_DONE_PHRASES]
    expect(all.some((t) => t.includes('фурункул'))).toBe(true)
  })

  test('выборщик возвращает строки из своих пулов', () => {
    const proPool = [...PIMPLE_POP_PHRASES, ...PIMPLE_POP_PHRASES_PRO]
    expect(PIMPLE_POP_PHRASES).toContain(pickPimplePopPhrase(false, () => 0))
    expect(proPool).toContain(pickPimplePopPhrase(true, () => 0))
    const doneProPool = [...PIMPLE_DONE_PHRASES, ...PIMPLE_DONE_PHRASES_PRO]
    expect(PIMPLE_DONE_PHRASES).toContain(pickPimpleDonePhrase(false, () => 0.999))
    expect(doneProPool).toContain(pickPimpleDonePhrase(true, () => 0.999))
  })

  test('pick не выходит за границы списка', () => {
    const list = ['a', 'b', 'c']
    expect(pick(list, () => 0)).toBe('a')
    expect(pick(list, () => 0.999)).toBe('c')
  })
})

describe('auditShareText — текст для «Поделиться»', () => {
  // rng = 0.99: без редких диагнозов, последние фразы списков
  const report = computeAudit(
    { axes: HEALTHY, state: 'bloom', streak: 3, kcal: 1800, kcalGoal: 2000 },
    { pro: true, rng: () => 0.99 }
  )

  test('шапка со счётом, датой и заключением', () => {
    const txt = auditShareText(report, { pro: true, dateLabel: '3 ноября' })
    expect(txt).toContain('🩺 Аудит организма, 3 ноября —')
    expect(txt).toContain('/100')
    expect(txt).toContain(`«${report.conclusion}»`)
    expect(txt).toContain('Доктор Топтыгин')
  })

  test('бесплатнику закрытые системы не раскрываются', () => {
    const txt = auditShareText(report, { pro: false })
    expect(txt).toContain('Кожа')
    expect(txt).toContain('Желудок')
    expect(txt).toContain('Сердце и ноги')
    expect(txt).not.toContain('Мышцы')
    expect(txt).not.toContain('Нервы')
    expect(txt).not.toContain('Иммунитет')
  })

  test('в Premium — все 6 систем с вердиктами', () => {
    const txt = auditShareText(report, { pro: true })
    for (const s of AUDIT_SYSTEMS) expect(txt).toContain(s.name)
    for (const s of report.systems) expect(txt).toContain(VERDICT_META[s.verdict].label)
  })

  test('редкий диагноз помечается ✨ и пустой отчёт не роняет', () => {
    const rare = {
      score: 80,
      conclusion: 'Годен!',
      systems: [
        { key: 'skin', name: 'Кожа', emoji: '🧴', pro: false, verdict: 'good', rare: true, phrase: 'Р', tip: 'Т' },
      ],
    }
    expect(auditShareText(rare)).toContain('Кожа ✨')
    expect(auditShareText({})).toContain('🩺 Аудит организма — 0/100')
  })
})

describe('auditStreak — серия осмотров подряд', () => {
  const days = { '2026-10-31': 50, '2026-11-01': 60, '2026-11-02': 70, '2026-11-03': 80 }

  test('считает дни подряд от dayKey назад', () => {
    expect(auditStreak(days, '2026-11-03')).toBe(4)
    expect(auditStreak(days, '2026-11-02')).toBe(3)
  })

  test('пропуск дня обрывает серию', () => {
    expect(auditStreak({ '2026-11-01': 50, '2026-11-03': 70 }, '2026-11-03')).toBe(1)
    expect(auditStreak(days, '2026-11-05')).toBe(0)
  })

  test('пустые данные и кривые ключи не роняют', () => {
    expect(auditStreak({}, '2026-11-03')).toBe(0)
    expect(auditStreak(days, '')).toBe(0)
    expect(auditStreak(days, 'мусор')).toBe(0)
    expect(auditStreak()).toBe(0)
  })
})

describe('computeAudit — гарантия редкого диагноза (юбилей серии)', () => {
  test('в юбилей редкий диагноз гарантирован в Premium', () => {
    const r = computeAudit({ axes: HEALTHY }, { pro: true, rng: () => 0.99, guaranteeRare: true })
    expect(r.systems.some((s) => s.rare)).toBe(true)
    // редкий — только у Premium-системы и с фразой из пула редких
    const rare = r.systems.find((s) => s.rare)
    expect(rare.pro).toBe(true)
    expect(RARE_PHRASES).toContain(rare.phrase)
  })

  test('без юбилея при rng 0.99 редких нет', () => {
    const r = computeAudit({ axes: HEALTHY }, { pro: true, rng: () => 0.99 })
    expect(r.systems.some((s) => s.rare)).toBe(false)
  })

  test('бесплатнику гарантия редких не выдаёт', () => {
    const r = computeAudit({ axes: HEALTHY }, { pro: false, rng: () => 0.99, guaranteeRare: true })
    expect(r.systems.some((s) => s.rare)).toBe(false)
  })

  test('если редкие выпали сами — принудительный не добавляется', () => {
    const r = computeAudit({ axes: HEALTHY }, { pro: true, rng: () => 0.05, guaranteeRare: true })
    // все 3 Premium-системы редкие естественным розыгрышем
    expect(r.systems.filter((s) => s.rare)).toHaveLength(3)
  })
})

describe('weekdayLetterOf / auditDateLabel / dateKeyOf', () => {
  test('буквы дней недели (3 ноября 2026 — вторник)', () => {
    expect(weekdayLetterOf('2026-11-03')).toBe('Вт')
    expect(weekdayLetterOf('2026-11-01')).toBe('Вс')
    expect(weekdayLetterOf('2026-11-08')).toBe('Вс')
    expect(weekdayLetterOf('мусор')).toBe('')
  })

  test('подпись даты для шаринга', () => {
    expect(auditDateLabel('2026-11-03')).toBe('3 ноября')
    expect(auditDateLabel('')).toBe('')
  })

  test('ключ дня из даты — с ведущими нулями', () => {
    expect(dateKeyOf(new Date(2026, 10, 3))).toBe('2026-11-03')
    expect(dateKeyOf(new Date(2026, 0, 9))).toBe('2026-01-09')
  })
})

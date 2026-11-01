// Юнит-тесты игровых систем организма: эволюция, рейд стаи, капсулы, комбо.
import {
  BRANCHES,
  EVOLVE_COST,
  EVOLVE_GENOME,
  GENOME_MAX,
  genomeAvg70,
  tendencyOf,
  formName,
  nextEvolution,
  PACK_SIZE,
  BOSSES,
  RAID_REWARD,
  mondayKeyOf,
  weekDayIdx,
  botDayDamage,
  packDamage,
  myWeekTotals,
  dayRaidDamage,
  DROPS,
  rollDrop,
  COMBO_GOAL,
  STREAK_FOR_CAPSULE,
  dayCombo,
  yesterdayKeyOf,
  EXPEDITIONS,
  EXPEDITION_TALES,
  expeditionOf,
  expeditionProgress,
  expeditionTale,
  genesLabel,
  crystalsLabel,
  fmtRemaining,
} from '@/lib/data/organism-game'

describe('геном', () => {
  test('средний геном из осей: ×0.7, потолок 70', () => {
    expect(genomeAvg70({ hydration: 50, protein: 50, energy: 50, activity: 50 })).toBe(35)
    expect(genomeAvg70({ hydration: 100, protein: 100, energy: 100, activity: 100 })).toBe(GENOME_MAX)
    expect(genomeAvg70({ hydration: 0, protein: 0, energy: 0, activity: 0 })).toBe(0)
    expect(genomeAvg70({ hydration: 60, protein: 40, energy: 50, activity: 50 })).toBe(35)
    expect(genomeAvg70({ hydration: 50, protein: 45, energy: 48, activity: 47 })).toBe(33) // 47.5·0.7 = 33.25
  })

  test('склонность — самая сильная ось', () => {
    const t = tendencyOf({ hydration: 40, protein: 80, energy: 50, activity: 60 })
    expect(t.key).toBe('protein')
    expect(t.name).toBe('Силач')
    expect(t.v).toBe(80)
  })

  test('названия форм по стадиям', () => {
    expect(formName(0)).toBe('Протоплазма')
    expect(formName(1, 'Силач')).toBe('Силач I')
    expect(formName(3, 'Стайер')).toBe('Стайер III')
    expect(formName(4)).toBe('Титан')
  })

  test('цена и геном следующей стадии; у Титана её нет', () => {
    expect(nextEvolution(0)).toEqual({ cost: 25, genome: 0, to: 1 })
    expect(nextEvolution(2)).toEqual({ cost: 100, genome: 35, to: 3 })
    expect(nextEvolution(3)).toEqual({ cost: 200, genome: 45, to: 4 })
    expect(nextEvolution(4)).toBeNull()
    expect(EVOLVE_COST).toEqual([25, 50, 100, 200])
    expect(EVOLVE_GENOME).toEqual([0, 25, 35, 45])
  })

  test('четыре ветки с уникальными осями', () => {
    const axes = Object.values(BRANCHES).map((b) => b.axis).sort()
    expect(axes).toEqual(['activity', 'energy', 'hydration', 'protein'])
  })
})

describe('неделя рейда', () => {
  test('mondayKeyOf: Пн–Вс одной недели дают один понедельник', () => {
    expect(mondayKeyOf(new Date(2026, 10, 2))).toBe('2026-11-02') // пн
    expect(mondayKeyOf(new Date(2026, 10, 4))).toBe('2026-11-02') // ср
    expect(mondayKeyOf(new Date(2026, 10, 8))).toBe('2026-11-02') // вс
    expect(mondayKeyOf(new Date(2026, 10, 9))).toBe('2026-11-09') // уже новая неделя
  })

  test('weekDayIdx: понедельник 0, воскресенье 6', () => {
    expect(weekDayIdx(new Date(2026, 10, 2))).toBe(0)
    expect(weekDayIdx(new Date(2026, 10, 8))).toBe(6)
  })

  test('вклад бота детерминирован и в рамках 0 / 12…54', () => {
    const weeks = ['2026-11-02', '2026-10-05', '2026-09-07']
    for (const w of weeks) {
      for (let day = 0; day < 7; day++) {
        for (let bot = 0; bot < PACK_SIZE - 1; bot++) {
          const v = botDayDamage(w, day, bot)
          expect(v).toBe(botDayDamage(w, day, bot)) // повтор — то же число
          expect(v === 0 || (v >= 12 && v <= 54)).toBe(true)
        }
      }
    }
  })

  test('packDamage: 5 ботов × прошедшие дни, без рандома', () => {
    const a = packDamage('2026-11-02', 6)
    const b = packDamage('2026-11-02', 6)
    expect(a).toBe(b)
    expect(a).toBeGreaterThan(0)
    expect(a).toBeLessThanOrEqual((PACK_SIZE - 1) * 7 * 54)
    expect(packDamage('2026-11-02', 0)).toBeLessThanOrEqual((PACK_SIZE - 1) * 54)
  })

  test('myWeekTotals берёт только дни текущей недели', () => {
    const raidDays = {
      '2026-11-02': { weekKey: '2026-11-02', dmg: 50, shield: 10, crit: 1 },
      '2026-10-26': { weekKey: '2026-10-26', dmg: 999, shield: 0, crit: 0 },
    }
    expect(myWeekTotals(raidDays, '2026-11-02')).toEqual({ dmg: 50, shield: 10, crit: 1 })
    expect(myWeekTotals(raidDays, '2026-10-26')).toEqual({ dmg: 999, shield: 0, crit: 0 })
    expect(myWeekTotals(null, '2026-11-02')).toEqual({ dmg: 0, shield: 0, crit: 0 })
  })

  test('урон дня: еда = ккал/40, тренировка = +15', () => {
    expect(dayRaidDamage(2000, 2)).toBe(80) // 50 + 30
    expect(dayRaidDamage(95, 0)).toBe(2) // round(2.375)
    expect(dayRaidDamage(0, 0)).toBe(0)
    expect(dayRaidDamage()).toBe(0)
  })

  test('боссы и награда на месте', () => {
    expect(BOSSES).toHaveLength(4)
    expect(BOSSES.every((b) => b.hp >= 1000 && b.hp <= 1400)).toBe(true)
    expect(RAID_REWARD).toEqual({ genes: 15, crystals: 5 })
  })
})

describe('капсулы и комбо', () => {
  test('шансы дропа сходятся в 1 и дают 60/25/10/5', () => {
    const ps = DROPS.map((d) => d.p)
    expect(ps.reduce((a, b) => a + b, 0)).toBeCloseTo(1)
    expect(ps).toEqual([0.6, 0.25, 0.1, 0.05])
  })

  test('rollDrop режет диапазон по честным весам', () => {
    expect(rollDrop(0.5).key).toBe('common')
    expect(rollDrop(0.6).key).toBe('rare') // граница: 0.6 < 0.6 — false
    expect(rollDrop(0.7).key).toBe('rare')
    expect(rollDrop(0.9).key).toBe('artifact')
    expect(rollDrop(0.96).key).toBe('aura')
    expect(rollDrop(0.999).key).toBe('aura')
  })

  test('комбо дня: 22·записи + 8·стаканы + 20·тренировки, потолок 100', () => {
    expect(dayCombo(2, 1, 1)).toBe(72)
    expect(dayCombo(0, 0, 0)).toBe(0)
    expect(dayCombo(10, 10, 10)).toBe(COMBO_GOAL) // 500 → зажим
    expect(dayCombo()).toBe(0)
    expect(STREAK_FOR_CAPSULE).toBe(7)
  })

  test('вчерашний ключ: границы месяцев и года', () => {
    expect(yesterdayKeyOf('2026-11-01')).toBe('2026-10-31')
    expect(yesterdayKeyOf('2026-03-01')).toBe('2026-02-28') // 2026 не високосный
    expect(yesterdayKeyOf('2026-01-01')).toBe('2025-12-31')
  })
})

describe('экспедиции', () => {
  const HOUR = 3600000

  test('три маршрута: 4/8/12 ч, добыча растёт быстрее времени', () => {
    expect(EXPEDITIONS.map((e) => e.hours)).toEqual([4, 8, 12])
    expect(new Set(EXPEDITIONS.map((e) => e.key)).size).toBe(3)
    // за час: 0.5 / 0.63 / 0.75 гена — длинный путь выгоднее
    const perHour = EXPEDITIONS.map((e) => e.genes / e.hours)
    expect(perHour[1]).toBeGreaterThan(perHour[0])
    expect(perHour[2]).toBeGreaterThan(perHour[1])
    expect(EXPEDITIONS.every((e) => e.crystals > 0 && e.name && e.emoji)).toBe(true)
  })

  test('экспедиция прогресса: половина пути, финиш, будущий старт', () => {
    const now = 1_700_000_000_000
    const half = expeditionProgress({ key: 'walk', startedAt: now - 2 * HOUR }, now)
    expect(half).toEqual({ done: false, remainingMs: 2 * HOUR, fraction: 0.5 })

    const done = expeditionProgress({ key: 'walk', startedAt: now - 5 * HOUR }, now)
    expect(done.done).toBe(true)
    expect(done.remainingMs).toBe(0)
    expect(done.fraction).toBe(1)

    // скачок часов (startedAt в будущем) — «только ушёл», без читов
    const future = expeditionProgress({ key: 'hike', startedAt: now + HOUR }, now)
    expect(future.done).toBe(false)
    expect(future.remainingMs).toBe(8 * HOUR)
    expect(future.fraction).toBe(0)
  })

  test('нет похода или битый ключ — null', () => {
    expect(expeditionProgress(null)).toBeNull()
    expect(expeditionProgress(undefined)).toBeNull()
    expect(expeditionProgress({ key: 'walk', startedAt: 0 })).toBeNull()
    expect(expeditionProgress({ key: 'nope', startedAt: 1_700_000_000_000 })).toBeNull()
    expect(expeditionOf('nope')).toBeNull()
    expect(expeditionOf('quest').hours).toBe(12)
  })

  test('лор возвращения — фраза из списка своего маршрута', () => {
    expect(expeditionTale('walk', 0)).toBe(EXPEDITION_TALES.walk[0])
    expect(expeditionTale('quest', 0.99)).toBe(EXPEDITION_TALES.quest[2]) // floor(0.99·3) = 2
    // неизвестный маршрут — честный фолбэк на прогулку
    expect(EXPEDITION_TALES.walk).toContain(expeditionTale('nope', 0.5))
    // внутри диапазона rand всегда строка списка
    expect(EXPEDITION_TALES.hike).toContain(expeditionTale('hike', 0.4))
  })

  test('формы слов и таймер', () => {
    expect(genesLabel(1)).toBe('1 ген')
    expect(genesLabel(2)).toBe('2 гена')
    expect(genesLabel(5)).toBe('5 генов')
    expect(genesLabel(11)).toBe('11 генов')
    expect(genesLabel(21)).toBe('21 ген')
    expect(crystalsLabel(3)).toBe('3 кристалла')
    expect(crystalsLabel(12)).toBe('12 кристаллов')
    expect(fmtRemaining(4 * HOUR)).toBe('4 ч 0 м')
    expect(fmtRemaining(2 * HOUR + 12 * 60000)).toBe('2 ч 12 м')
    expect(fmtRemaining(45 * 60000)).toBe('45 м')
    expect(fmtRemaining(0)).toBe('0 м')
  })
})

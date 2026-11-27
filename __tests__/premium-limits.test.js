// Лимиты бесплатного тарифа после усиления Premium (задача Кати 23.11:
// «усилить Premium — неограниченная история/комбо, оформление, экспорт
// отчётов в файл»): значения FREE_LIMITS, соответствие подписей
// в PREMIUM_PERKS, и доступ к журналу (history-access.js — отображение
// режется, данные НЕ удаляются).

const {
  FREE_LIMITS,
  PREMIUM_PERKS,
} = require('../src/lib/entitlements')
const {
  localDayKey,
  historyCutoffKey,
  filterHistoryByCutoff,
} = require('../src/lib/data/history-access')

describe('FREE_LIMITS после усиления Premium', () => {
  test('новые лимиты: 2 комбо, 14 дней журнала', () => {
    expect(FREE_LIMITS.combos).toBe(2)
    expect(FREE_LIMITS.historyDays).toBe(14)
  })

  test('старые лимиты ИИ не тронуты (матрица 14.11)', () => {
    expect(FREE_LIMITS.chat).toBe(15)
    expect(FREE_LIMITS.photo).toBe(3)
    expect(FREE_LIMITS.voice).toBe(10)
  })

  test('PREMIUM_PERKS: новые выгоды с верными цифрами бесплатного тарифа', () => {
    const byText = Object.fromEntries(PREMIUM_PERKS.map((p) => [p.text, p.sub]))
    expect(byText['Вся история приёмов пищи']).toContain('14 дней')
    expect(byText['Комбо без ограничений']).toContain('2')
    expect(byText['Шесть Premium-тем оформления']).toBeTruthy()
    expect(byText['Шесть Premium-тем оформления']).toContain('Лайм')
    expect(byText['Шесть Premium-тем оформления']).toContain('Приглушённая')
    expect(byText['Шесть Premium-тем оформления']).toContain('Кремовая')
    // Бесплатная тема в перке помечена честно (правка Кати 27.11:
    // «Классика будет бело-черная тема» — бесплатная одна)
    expect(byText['Шесть Premium-тем оформления']).toContain('Классика')
    expect(byText['Экспорт отчётов в файл']).toBeTruthy()
  })

  test('PREMIUM_PERKS: старые выгоды на месте', () => {
    expect(PREMIUM_PERKS.length).toBeGreaterThanOrEqual(10)
    expect(PREMIUM_PERKS.some((p) => p.text.includes('чат с напарником'))).toBe(true)
    expect(PREMIUM_PERKS.some((p) => p.text.includes('ИИ-меню'))).toBe(true)
    expect(PREMIUM_PERKS.some((p) => p.text.includes('медведей'))).toBe(true)
  })
})

describe('history-access: локальный ключ дня', () => {
  test('ключ — локальная дата «ГГГГ-ММ-ДД» (без UTC-сдвига)', () => {
    expect(localDayKey(new Date(2026, 10, 23, 1, 30))).toBe('2026-11-23')
    expect(localDayKey(new Date(2026, 0, 5))).toBe('2026-01-05')
  })
})

describe('history-access: граница бесплатного просмотра журнала', () => {
  // 14 дней бесплатно: сегодня + 13 прошлых → граница «сегодня − 13 дн»
  const now = new Date(2026, 10, 23, 15, 0)

  test('Premium — границы нет (null)', () => {
    expect(historyCutoffKey(now, true)).toBeNull()
  })

  test('бесплатно — «сегодня − 13 дней» (14 дней вместе с сегодня)', () => {
    expect(historyCutoffKey(now, false)).toBe('2026-11-10')
  })

  test('первый день ведения дневника: граница не уходит в минус', () => {
    const early = new Date(2026, 10, 5)
    expect(historyCutoffKey(early, false)).toBe('2026-10-23')
  })
})

describe('history-access: фильтрация отображения журнала', () => {
  const rows = [
    { id: 'a', day: '2026-11-09', name: 'старое' },
    { id: 'b', day: '2026-11-10', name: 'на границе' },
    { id: 'c', day: '2026-11-23', name: 'сегодня' },
    { id: 'd', day: null, name: 'без дня' },
  ]

  test('Premium: массив без изменений (та же ссылка)', () => {
    expect(filterHistoryByCutoff(rows, null)).toBe(rows)
  })

  test('бесплатно: дни до границы скрыты, граница и новее — видны', () => {
    const visible = filterHistoryByCutoff(rows, '2026-11-10')
    expect(visible.map((r) => r.id)).toEqual(['b', 'c', 'd'])
  })

  test('данные НЕ удаляются: исходный массив остаётся полным', () => {
    filterHistoryByCutoff(rows, '2026-11-10')
    expect(rows).toHaveLength(4)
  })
})

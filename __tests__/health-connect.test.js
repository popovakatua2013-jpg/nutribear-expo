// Юнит-тесты чистых функций Health Connect. Нативный модуль
// react-native-health-connect не трогаем: в тесты попадают только
// чистые части src/lib/healthConnect.js (суммирование записей, ключи
// дней, полночь локального дня).

import {
  sumStepRecords,
  dayKeyStartMs,
  lastDayKeys,
  HC_OK,
  HC_NOT_ANDROID,
} from '@/lib/healthConnect'
import { dayKeyOf } from '@/store/useHistoryStore'

describe('sumStepRecords — сумма шагов из записей Steps', () => {
  test('пустые и битые входы дают 0', () => {
    expect(sumStepRecords()).toBe(0)
    expect(sumStepRecords(null)).toBe(0)
    expect(sumStepRecords('не массив')).toBe(0)
    expect(sumStepRecords([])).toBe(0)
    expect(sumStepRecords([{}])).toBe(0)
    expect(sumStepRecords([{ count: 'abc' }])).toBe(0)
    expect(sumStepRecords([{ count: undefined }, { count: null }])).toBe(0)
  })

  test('складывает count всех записей (дробные округляются)', () => {
    expect(sumStepRecords([{ count: 100 }, { count: 250 }])).toBe(350)
    expect(sumStepRecords([{ count: 8432 }])).toBe(8432)
    // каждая запись округляется отдельно: 3.9 → 4, 2.2 → 2
    expect(sumStepRecords([{ count: 3.9 }, { count: 2.2 }])).toBe(6)
  })

  test('отрицательные и NaN-значения отбрасываются — сумма не падает', () => {
    expect(sumStepRecords([{ count: 100 }, { count: -50 }])).toBe(100)
    expect(sumStepRecords([{ count: -10 }, { count: -20 }])).toBe(0)
  })
})

describe('dayKeyStartMs — полночь локального дня', () => {
  test('разбирает «ГГГГ-ММ-ДД» в полночь локального времени', () => {
    const d = new Date(dayKeyStartMs('2026-11-05'))
    expect(d.getFullYear()).toBe(2026)
    expect(d.getMonth()).toBe(10) // ноябрь
    expect(d.getDate()).toBe(5)
    expect(d.getHours()).toBe(0)
    expect(d.getMinutes()).toBe(0)
    expect(d.getSeconds()).toBe(0)
    expect(d.getMilliseconds()).toBe(0)
  })

  test('битые ключи дают null', () => {
    expect(dayKeyStartMs('')).toBe(null)
    expect(dayKeyStartMs(null)).toBe(null)
    expect(dayKeyStartMs('неделя')).toBe(null)
    expect(dayKeyStartMs('2026-11')).toBe(null)
  })

  test('полночь попадает в тот же локальный день по dayKeyOf', () => {
    const key = '2026-02-14'
    expect(dayKeyOf(new Date(dayKeyStartMs(key)))).toBe(key)
  })
})

describe('lastDayKeys — ключи последних N дней', () => {
  const fixed = new Date(2026, 10, 5, 15, 30, 0) // 5 ноября 2026, день

  test('возвращает N ключей по возрастанию, последний — сегодня', () => {
    expect(lastDayKeys(3, { now: fixed })).toEqual([
      '2026-11-03',
      '2026-11-04',
      '2026-11-05',
    ])
    expect(lastDayKeys(1, { now: fixed })).toEqual(['2026-11-05'])
  })

  test('без N и now работает от текущего момента (n=0 → пусто)', () => {
    expect(lastDayKeys(0)).toEqual([])
    expect(lastDayKeys(-5)).toEqual([])
  })

  test('кастомная функция дня подставляется для каждой даты', () => {
    const keys = lastDayKeys(2, { now: fixed, dayKeyFn: () => 'X' })
    expect(keys).toEqual(['X', 'X'])
  })
})

describe('константы статусов', () => {
  test('HC_OK и HC_NOT_ANDROID различаются', () => {
    expect(HC_OK).not.toBe(HC_NOT_ANDROID)
    expect(typeof HC_OK).toBe('string')
    expect(typeof HC_NOT_ANDROID).toBe('string')
  })
})

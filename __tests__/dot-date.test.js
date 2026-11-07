// Тесты dotDateFromKey — числовые подписи дней «7.11» в окнах истории
// (отзыв Кати: «1 …» из «1 ноя» в узких колонках графика обрезалось
// до точек; должен быть месяц или «7.11 8.11 9.11»).

// RN-стабы до импортов стора (activity.js живёт рядом с useHistoryStore)
jest.requireActual('./helpers/react-native-stub')
jest.requireActual('./helpers/async-storage-stub')

const { dotDateFromKey } = require('@/lib/data/activity')

describe('dotDateFromKey — числовые даты «7.11» в окнах истории', () => {
  test('день и месяц без ведущих нулей — как просила Катя', () => {
    expect(dotDateFromKey('2026-11-07')).toBe('7.11')
    expect(dotDateFromKey('2026-11-08')).toBe('8.11')
    expect(dotDateFromKey('2026-11-09')).toBe('9.11')
  })

  test('однозначные месяц и день, нули не добавляются', () => {
    expect(dotDateFromKey('2026-01-05')).toBe('5.1')
    expect(dotDateFromKey('2025-12-31')).toBe('31.12')
  })

  test('дата берётся из ключа дня, а не из часового пояса рендера', () => {
    // Ключ «ГГГГ-ММ-ДД» разбирается как местная полночь — день и месяц
    // совпадают с ключом в любой таймзоне (UTC+3 и иначе)
    expect(dotDateFromKey('2026-02-28')).toBe('28.2')
    expect(dotDateFromKey('2024-07-01')).toBe('1.7')
  })

  test('мусорный ключ — пустая строка: подпись просто не рисуется', () => {
    expect(dotDateFromKey('')).toBe('')
    expect(dotDateFromKey('мусор')).toBe('')
    expect(dotDateFromKey('2026-13-99')).toBe('')
  })
})

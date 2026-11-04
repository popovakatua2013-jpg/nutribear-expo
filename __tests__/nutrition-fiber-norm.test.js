// Тесты рейтинга питания: своя норма клетчатки из целей «Съедено
// за сегодня» (macroNorms.fib) переопределяет стандартные 25 г/день —
// и в балле клетчатки, и в подписи (parts.fiber.norm).

jest.requireActual('./helpers/react-native-stub')
jest.requireActual('./helpers/async-storage-stub')

describe('nutritionRating: своя норма клетчатки', () => {
  let nutritionRating

  beforeAll(() => {
    ;({ nutritionRating } = require('@/lib/data/nutrition'))
  })

  const rows = (fib) => ({
    kcal: 1800, p: 90, f: 60, c: 225, fib, sug: 30,
    fe: 5, ca: 400, k: 1500, mg: 200, vitc: 40, vita: 300,
    rows: 3, mk: 3,
  })

  test('по умолчанию — 25 г/день (ВОЗ)', () => {
    const r = nutritionRating(rows(20))
    expect(r.fiber.norm).toBe(25)
    expect(r.fiber.score).toBe(80) // 20 из 25 г
  })

  test('своя норма 20 г: 20 г клетчатки — балл 100', () => {
    const r = nutritionRating(rows(20), { fiberNorm: 20 })
    expect(r.fiber.norm).toBe(20)
    expect(r.fiber.score).toBe(100)
  })

  test('своя норма 30 г: 20 г клетчатки — балл 67', () => {
    const r = nutritionRating(rows(20), { fiberNorm: 30 })
    expect(r.fiber.norm).toBe(30)
    expect(r.fiber.score).toBe(67)
  })

  test('невалидная своя норма (0) — откат к 25 г', () => {
    const r = nutritionRating(rows(20), { fiberNorm: 0 })
    expect(r.fiber.norm).toBe(25)
    expect(r.fiber.score).toBe(80)
  })
})

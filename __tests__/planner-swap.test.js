// Тесты замен блюд (lib/data/swap.js, просьба Кати 10.11: «заменить на
// похожее по ккал, приложение предлагает 2–3 варианта из базы»):
// подбор по калорийности на 100 г без самого блюда, граммовка замены
// под те же ккал порции с границами 10…2000 г.

const { swapCandidates, gramsForSameKcal } = require('@/lib/data/swap')

// Мини-база для управляемых проверок
const POOL = [
  { id: 'a', name: 'Кефир 1%', kcal: 40 },
  { id: 'b', name: 'Овощной салат', kcal: 52 },
  { id: 'c', name: 'Яблоко', kcal: 52 },
  { id: 'd', name: 'Гречка отварная', kcal: 110 },
  { id: 'e', name: 'Паста болоньезе', kcal: 158 },
  { id: 'f', name: 'Сырники', kcal: 183 },
  { id: 'g', name: 'Грецкие орехи', kcal: 654 },
]

describe('swapCandidates: похожие по ккал из базы', () => {
  test('возвращает до 3 вариантов, отсортированных по близости ккал/100 г', () => {
    const list = swapCandidates({ name: 'Треска запечённая', kcal100: 105 }, POOL)
    expect(list.length).toBeGreaterThanOrEqual(2)
    expect(list.length).toBeLessThanOrEqual(3)
    // ближайшие к 105 — гречка 110, потом паста 158 и салат/яблоко 52
    expect(list[0].id).toBe('d')
  })

  test('само блюдо исключается по названию (регистр и ё не важны)', () => {
    const list = swapCandidates({ name: 'Гречка Отварная', kcal100: 110 }, POOL)
    expect(list.some((f) => f.name === 'Гречка отварная')).toBe(false)
    const withYo = swapCandidates({ name: 'Ёлка', kcal100: 200 }, [
      { id: 'y1', name: 'Елка', kcal: 200 },
      { id: 'y2', name: 'Сырники', kcal: 183 },
    ])
    expect(withYo.map((f) => f.id)).toEqual(['y2'])
  })

  test('если близких (±50 %) меньше двух — расширяет поиск, но не пусто', () => {
    // у 100 ккал близкие в ±50 %: 52…150 → гречка 110 и салат/яблоко 52 — есть
    const ok = swapCandidates({ name: 'Рис', kcal100: 100 }, POOL)
    expect(ok.length).toBeGreaterThanOrEqual(2)
    // у 600 ккал в базе только орехи 654 в ±50 % (300…900) → расширение
    const wide = swapCandidates({ name: 'Халва', kcal100: 600 }, POOL)
    expect(wide.length).toBeGreaterThanOrEqual(2)
  })

  test('некорректное блюдо (без ккал) — пусто; count ограничивает выборку', () => {
    expect(swapCandidates({ name: 'Хм', kcal100: 0 }, POOL)).toEqual([])
    expect(swapCandidates(null, POOL)).toEqual([])
    const one = swapCandidates({ name: 'Треска', kcal100: 105 }, POOL, 1)
    expect(one).toHaveLength(1)
  })
})

describe('gramsForSameKcal: порция замены под те же ккал', () => {
  test('ккал/100 г × граммы = те же ккал порции', () => {
    // текущее блюдо 220 ккал; замена 110 ккал/100 г → 200 г
    expect(gramsForSameKcal(110, 220)).toBe(200)
    // 52 ккал/100 г → 220 ккал ≈ 423 г
    expect(gramsForSameKcal(52, 220)).toBe(423)
  })

  test('границы 10…2000 г и защита от мусора', () => {
    expect(gramsForSameKcal(10, 2200)).toBe(2000) // 22 000 г → не больше 2000
    expect(gramsForSameKcal(700, 5)).toBe(10) // не меньше 10
    expect(gramsForSameKcal(0, 220)).toBe(100)
    expect(gramsForSameKcal(110, 0)).toBe(100)
  })
})

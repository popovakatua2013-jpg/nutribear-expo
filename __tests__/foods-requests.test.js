// Тесты нового набора продуктов (foods-requests.js) и порций рецептов:
// уникальные id, полнота полей, ключевые позиции присутствуют, БЖУ в
// разумных пределах; граммовка порции рецепта делится на число порций.

import { REQUESTED_FOODS } from '@/lib/data/foods-requests'
import { FOODS } from '@/lib/data/foods'
import { gramsPerServing } from '@/store/useRecipesStore'

describe('REQUESTED_FOODS — набор по запросам', () => {
  test('каждый продукт: уникальный id, все ключевые поля', () => {
    const ids = new Set()
    for (const f of REQUESTED_FOODS) {
      expect(f.id).toBeTruthy()
      expect(ids.has(f.id)).toBe(false)
      ids.add(f.id)
      expect(f.name).toBeTruthy()
      expect(f.emoji).toBeTruthy()
      expect(f.kcal).toBeGreaterThan(0)
      expect(f.kcal).toBeLessThan(950)
      expect(f.defaultGrams).toBeGreaterThan(0)
      expect(Array.isArray(f.tags)).toBe(true)
      expect(f.tags.length).toBeGreaterThan(0)
    }
  })

  test('в базе нет дубликатов с существующими продуктами', () => {
    const existing = new Set(FOODS.map((f) => f.id))
    const requested = REQUESTED_FOODS.map((f) => f.id)
    // REQUESTED_FOODS уже входят в FOODS — дубликатом считается повторный id
    // внутри самой базы
    expect(existing.size).toBe(FOODS.length)
    expect(new Set(requested).size).toBe(requested.length)
  })

  test('молочка всей линейки жирности присутствует', () => {
    const names = REQUESTED_FOODS.map((f) => f.name)
    for (const name of [
      'Молоко 0.5%',
      'Молоко 1%',
      'Молоко 1.5%',
      'Молоко 3.2%',
      'Молоко 3.5%',
      'Молоко топлёное 4%',
    ]) {
      expect(names).toContain(name)
    }
  })

  test('ключевые запросы пользователя на месте', () => {
    const names = REQUESTED_FOODS.map((f) => f.name)
    for (const name of [
      'Кофе с молоком и сахаром',
      'Сахар-песок',
      'Яйцо жареное',
      'Лаваш армянский',
      'Лазанья',
      'Плов со свининой',
      'Плов с бараниной',
      'Пирог Зебра',
      'Манник',
      'Торт Медовик',
      'Торт Молочная девочка',
      'Торт Красный бархат',
      'Лук зелёный (перо)',
      'Петрушка',
      'Кинза',
      'Томатная паста',
      'Томатный сок',
      'Огурцы маринованные',
      'Капуста свежая',
      'Капуста тушёная',
      'Капуста квашеная',
    ]) {
      expect(names).toContain(name)
    }
  })

  test('молоко: чем выше жирность, тем выше калорийность (монотонность)', () => {
    const kcal = (id) => REQUESTED_FOODS.find((f) => f.id === id).kcal
    expect(kcal('milk-05')).toBeLessThan(kcal('milk-1'))
    expect(kcal('milk-1')).toBeLessThan(kcal('milk-15'))
    expect(kcal('milk-15')).toBeLessThan(kcal('milk-32'))
    expect(kcal('milk-32')).toBeLessThan(kcal('milk-35'))
    expect(kcal('milk-35')).toBeLessThan(kcal('milk-baked'))
  })

  test('добавленных продуктов в полной базе стало больше 150', () => {
    expect(FOODS.length).toBeGreaterThan(150)
  })
})

describe('gramsPerServing — порции рецептов', () => {
  test('выход делится на порции и округляется', () => {
    expect(gramsPerServing({ grams: 1200, servings: 6 })).toBe(200)
    expect(gramsPerServing({ grams: 1000, servings: 3 })).toBe(333)
    expect(gramsPerServing({ grams: 500, servings: 1 })).toBe(500)
  })

  test('старые рецепты без поля servings — как одна порция', () => {
    expect(gramsPerServing({ grams: 450 })).toBe(450)
    expect(gramsPerServing({ grams: 450, servings: undefined })).toBe(450)
  })

  test('битые значения не ломают расчёт', () => {
    expect(gramsPerServing({ grams: 0, servings: 4 })).toBe(0)
    expect(gramsPerServing(null)).toBe(0)
    // число порций зажимается в 1–24: 99 → 24, 100/24 ≈ 4 г
    expect(gramsPerServing({ grams: 100, servings: 99 })).toBe(4)
    expect(gramsPerServing({ grams: 100, servings: 0 })).toBe(100)
  })
})

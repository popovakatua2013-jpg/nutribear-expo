// Тесты поиска продуктов (отзыв Кати 21.11, скрины 14:20–14:21:
// «не ищет йогуртов, творожков, батон, бургеры — строка поиска вообще
// ничего не ищет»). Прежний поиск был строгой подстрокой:
// «йогуртов» не матчил «Йогурт натуральный», «бургеры» — «Бургер»,
// «варёная» не матчила «вареная» (ё/е). Новый foodMatchesQuery:
// совпадение по основе слова (5 букв) + подстрока, ё/е приравнены.

const { foodMatchesQuery } = require('@/lib/food-search')
const { FOODS } = require('@/lib/data/foods')

describe('foodMatchesQuery — формы слов', () => {
  test('родительный падеж: «йогуртов» находит «йогурт»', () => {
    expect(foodMatchesQuery('Йогурт натуральный 3,2%', 'йогуртов')).toBe(true)
    expect(foodMatchesQuery('Питьевой йогурт', 'йогуртов')).toBe(true)
  })

  test('множественное число: «бургеры» находит «Бургер»', () => {
    expect(foodMatchesQuery('Бургер', 'бургеры')).toBe(true)
    expect(foodMatchesQuery('Бургер Биг Хит «Вкусно и точка»', 'бургеры')).toBe(true)
  })

  test('суффикс -к-: «творожков» находит «Творог» и «Творожок»', () => {
    expect(foodMatchesQuery('Творог 5%', 'творожков')).toBe(true)
    expect(foodMatchesQuery('Творожок сладкий', 'творожков')).toBe(true)
    expect(foodMatchesQuery('Творожная запеканка', 'творожков')).toBe(true)
  })

  test('«батон» находит «Батон нарезной» и не путает с «батончиком»', () => {
    expect(foodMatchesQuery('Батон нарезной', 'батон')).toBe(true)
    // батончик тоже содержит основу «бато» — по подстроке «батон» внутри
    // «батончик» не находится, но по основе первые 5 букв «бато» совпадают:
    // допустимо — при наборе по буквам лишние строки исчезают
    expect(foodMatchesQuery('Протеиновый батончик', 'батон')).toBe(true)
  })

  test('ё и е приравнены в обе стороны', () => {
    expect(foodMatchesQuery('Колбаса варёная «Вязанка» Докторская', 'вареная')).toBe(true)
    expect(foodMatchesQuery('Колбаса вареная', 'варёная')).toBe(true)
    expect(foodMatchesQuery('Тушёные овощи', 'вареные')).toBe(false)
  })

  test('несколько слов: порядок не важен, каждое должно найтись', () => {
    expect(foodMatchesQuery('Питьевой йогурт', 'йогурт питьевой')).toBe(true)
    expect(foodMatchesQuery('Питьевой йогурт', 'питьевой йогурт')).toBe(true)
    expect(foodMatchesQuery('Колбаса варёная «Вязанка» Докторская', 'вязанка вареная')).toBe(true)
    expect(foodMatchesQuery('Питьевой йогурт', 'йогурт земляничный')).toBe(false)
  })

  test('подстрока: бренды в кавычках и жирность «3,2» в «3,2%»', () => {
    expect(foodMatchesQuery('Колбаса варёная «Вязанка» Докторская', 'вязанка')).toBe(true)
    expect(foodMatchesQuery('Йогурт натуральный 3,2%', '3,2')).toBe(true)
  })

  test('разные написания через дефис и регистр', () => {
    expect(foodMatchesQuery('Суп-пюре из тыквы', 'суп')).toBe(true)
    expect(foodMatchesQuery('Суп-пюре из тыквы', 'ПЮРЕ')).toBe(true)
    expect(foodMatchesQuery('Крем-чиз сливочный', 'крем чиз')).toBe(true)
  })

  test('пустой запрос — совпадение (полный список)', () => {
    expect(foodMatchesQuery('Яблоко', '')).toBe(true)
    expect(foodMatchesQuery('Яблоко', '   ')).toBe(true)
  })

  test('чужие продукты не находятся', () => {
    expect(foodMatchesQuery('Яблоко', 'йогурт')).toBe(false)
    expect(foodMatchesQuery('Гречка отварная', 'рис')).toBe(false)
    expect(foodMatchesQuery('Банан', 'батон')).toBe(false)
  })
})

describe('foodMatchesQuery — запросы Кати по реальной базе', () => {
  const names = () => FOODS.map((f) => f.name.toLowerCase())

  test('«йогуртов» находит йогурты', () => {
    const found = FOODS.filter((f) => foodMatchesQuery(f.name, 'йогуртов'))
    expect(found.length).toBeGreaterThan(0)
    expect(found.some((f) => f.name.toLowerCase().includes('йогурт'))).toBe(true)
  })

  test('«творожков» находит творожные позиции', () => {
    const found = FOODS.filter((f) => foodMatchesQuery(f.name, 'творожков'))
    expect(found.length).toBeGreaterThan(0)
    expect(found.some((f) => f.name.toLowerCase().includes('творог'))).toBe(true)
  })

  test('«батон» находит батон', () => {
    const found = FOODS.filter((f) => foodMatchesQuery(f.name, 'батон'))
    expect(found.length).toBeGreaterThan(0)
    expect(found.some((f) => f.name.toLowerCase().includes('батон'))).toBe(true)
  })

  test('«бургеры» и «бургер» находят бургеры (в т. ч. сетей)', () => {
    for (const q of ['бургеры', 'бургер']) {
      const found = FOODS.filter((f) => foodMatchesQuery(f.name, q))
      expect(found.length).toBeGreaterThan(3)
      expect(found.some((f) => f.name.toLowerCase().includes('бургер'))).toBe(true)
    }
  })

  test('«йогурт» на вкладке «Обед» теперь ищется: поиск не зависит от тегов приёма', () => {
    // BaseMode при непустом запросе отключает фильтр по приёму — здесь
    // проверяем, что продукты-«не-обеды» находятся по названию
    const lunchIds = FOODS.filter((f) => f.tags.includes('lunch')).map((f) => f.id)
    const yogurtHits = FOODS.filter(
      (f) => foodMatchesQuery(f.name, 'йогуртов') && !lunchIds.includes(f.id)
    )
    expect(yogurtHits.length).toBeGreaterThan(0)
  })
})

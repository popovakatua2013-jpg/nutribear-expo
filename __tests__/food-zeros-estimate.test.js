// Блок нутриентов — отзыв Кати 21.11 17:21–17:22 (скрины: «В Селёдка
// не считает жиры и другие. Аудит блок нутриенты»; в отчётах за день
// «У 6 г» при 3310 ккал — жиры/белки/углеводы терялись, калории
// считались «сами по себе»).
//
// Причина: свой продукт записывается одними калориями (форма «Свой
// продукт» сохраняет пустые БЖУ как 0), а buildFood считал «0 != null»
// признаком известного состава — в дневник уходили нули.
//
// Правки:
// 1) buildFood: без положительных БЖУ состав наследуется от встроенного
//    тёзки (по имени или псевдониму al), иначе оценивается по
//    калорийности; 0 ккал (вода) остаются нулевыми.
// 2) 0 ккал не превращаются в 100 (было «kcal100 || 100»).
// 3) Поиск понимает псевдонимы: «селёдка» находит «Сельдь солёная».
// 4) Повторное добавление из журнала (foodFromRow) тоже восстанавливает
//    нутриенты нулевых записей.

const { buildFood, findFoodDuplicate } = require('@/lib/data/pick')
const { foodMatchesQueryAnyAlias } = require('@/lib/food-search')
const { foodFromRow } = require('@/lib/data/readd')
const { FOODS } = require('@/lib/data/foods')
const { estimateBju } = require('@/lib/data/bju')

describe('buildFood — нули БЖУ у своих продуктов больше не теряются', () => {
  test('свой «Селёдка» (только калории) наследует состав встроенной сельди', () => {
    const base = FOODS.find((f) => f.id === 'herring')
    expect(base.p).toBe(20)
    expect(base.f).toBe(15)
    const food = buildFood({
      id: 'user-herring',
      name: 'Селёдка',
      kcal100: 217,
      p: 0,
      f: 0,
      c: 0,
      source: 'user',
    })
    expect(food.kcal).toBe(217)
    expect(food.p).toBe(20)
    expect(food.f).toBe(15)
    expect(food.c).toBe(0)
    // вместе с составом — витамины тёзки
    expect(food.ca).toBe(base.ca)
    expect(food.k).toBe(base.k)
    expect(food.mk).toBe(1)
  })

  test('незнакомое имя с пустыми БЖУ — оценка по калорийности', () => {
    const food = buildFood({ name: 'Запеканка тёти', kcal100: 217, p: 0, f: 0, c: 0, source: 'user' })
    expect(food.p).toBeGreaterThan(0)
    expect(food.f).toBeGreaterThan(0)
    expect(food.c).toBeGreaterThan(0)
    // калории из макронутриентов сходятся с заявленными
    const calc = food.p * 4 + food.f * 9 + food.c * 4
    expect(Math.abs(calc - 217)).toBeLessThanOrEqual(3)
  })

  test('вода (0 ккал, без БЖУ) — нули без выдуманных граммов', () => {
    const food = buildFood({ name: 'Вода из фильтра', kcal100: 0, source: 'user' })
    expect(food.kcal).toBe(0)
    expect(food.p).toBe(0)
    expect(food.f).toBe(0)
    expect(food.c).toBe(0)
  })

  test('«Кола без сахара» из базы: 0 ккал не превращаются в 100', () => {
    const zero = FOODS.find((f) => f.id === 'big-cola-zero')
    const food = buildFood({
      id: zero.id,
      name: zero.name,
      kcal100: zero.kcal,
      p: zero.p,
      f: zero.f,
      c: zero.c,
      source: 'local',
    })
    expect(zero.kcal).toBe(0)
    expect(food.kcal).toBe(0)
    expect(food.p).toBe(0)
    expect(food.f).toBe(0)
    expect(food.c).toBe(0)
  })

  test('положительные БЖУ остаются как введены (данные Кати не трогаем)', () => {
    const food = buildFood({ name: 'Сырники', kcal100: 380, p: 25, f: 2, c: 2, source: 'user' })
    expect(food.p).toBe(25)
    expect(food.f).toBe(2)
    expect(food.c).toBe(2)
  })

  test('ИИ-продукт без БЖУ — оценка по калорийности (прежний путь)', () => {
    const est = estimateBju(300)
    const food = buildFood({ name: 'Неизвестное блюдо с фото', kcal100: 300, source: 'ai' })
    expect(food.p).toBe(est.p)
    expect(food.f).toBe(est.f)
    expect(food.c).toBe(est.c)
  })

  test('частичный состав (только углеводы у водки) — без выдуманных жиров', () => {
    const food = buildFood({ name: 'Водка домашняя 40%', kcal100: 235, p: 0, f: 0, c: 0.1, source: 'user' })
    expect(food.c).toBe(0.1)
    expect(food.f).toBe(0)
    expect(food.p).toBe(0)
  })
})

describe('foodFromRow — повторное добавление восстанавливает нутриенты', () => {
  test('запись с нулевыми БЖУ получает оценку по калорийности', () => {
    const row = { name: 'Запеканка тёти', kcal: 174, p: 0, f: 0, c: 0, grams: 80 }
    const food = foodFromRow(row)
    expect(food.kcal).toBe(218) // 174 * 100/80
    expect(food.f).toBeGreaterThan(0)
    expect(food.p).toBeGreaterThan(0)
    expect(food.c).toBeGreaterThan(0)
  })

  test('полная запись сохраняет свои БЖУ на 100 г', () => {
    const row = { name: 'Овсянка', kcal: 132, p: 7.5, f: 4.3, c: 16.3, grams: 150 }
    const food = foodFromRow(row)
    expect(food.kcal).toBe(88) // 132 * 100/150
    expect(food.p).toBeCloseTo(5, 1) // 7.5 * 100/150
    expect(food.f).toBeCloseTo(2.9, 1)
    expect(food.c).toBeCloseTo(10.9, 1)
  })

  test('нулевая запись с именем тёзки наследует встроенный состав', () => {
    const row = { name: 'Сырники', kcal: 274, p: 0, f: 0, c: 0, grams: 150 }
    const food = foodFromRow(row)
    expect(food.p).toBe(14)
    expect(food.f).toBe(9)
    expect(food.c).toBe(11)
    expect(food.fib).toBe(0.4)
  })

  test('свой «Селёдка» из журнала — жиры сельди, а не нули', () => {
    const row = { name: 'Селёдка', kcal: 174, p: 0, f: 0, c: 0, grams: 80, mk: 1 }
    const food = foodFromRow(row)
    expect(food.p).toBe(20)
    expect(food.f).toBe(15)
    expect(food.mk).toBe(1)
  })
})

describe('foodMatchesQueryAnyAlias — поиск по псевдонимам', () => {
  const herring = FOODS.find((f) => f.id === 'herring')

  test('у встроенной сельди есть алиас «селёдка» (данные)', () => {
    expect(herring.al).toContain('селёдка')
    expect(herring.al).toContain('селедка')
  })

  test('«селёдка» находит «Сельдь солёная»', () => {
    expect(foodMatchesQueryAnyAlias(herring, 'селёдка')).toBe(true)
    expect(foodMatchesQueryAnyAlias(herring, 'селедка')).toBe(true)
    // по имени — как раньше
    expect(foodMatchesQueryAnyAlias(herring, 'сельдь')).toBe(true)
    expect(foodMatchesQueryAnyAlias(herring, 'соленая')).toBe(true)
  })

  test('чужой запрос — мимо; пустой food — false', () => {
    expect(foodMatchesQueryAnyAlias(herring, 'бургер')).toBe(false)
    expect(foodMatchesQueryAnyAlias(null, 'хлеб')).toBe(false)
  })

  test('форма «Свой продукт» предупредит о тёзке по псевдониму', () => {
    const dup = findFoodDuplicate('Селёдка', [])
    expect(dup).not.toBeNull()
    expect(dup.from).toBe('base')
    expect(dup.kcal).toBe(217)
    expect(dup.micros).toBe(true)
  })
})

describe('аудит базы — согласованность БЖУ и калорий', () => {
  test('у встроенных продуктов с калориями есть хоть один макронутриент', () => {
    // вода и соль с 0 ккал — исключены: у них 0/0/0 законно
    const broken = FOODS.filter((f) => f.kcal > 0 && !(f.p > 0 || f.f > 0 || f.c > 0))
    expect(broken).toEqual([])
  })

  test('все алиасы заполнены строками (без пустышек)', () => {
    const bad = FOODS.filter((f) => (f.al || []).some((a) => !a || !String(a).trim()))
    expect(bad).toEqual([])
  })
})

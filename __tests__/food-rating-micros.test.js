// Рейтинг питания и свои продукты — отзыв Кати 21.11 17:04–17:08
// (скрины: записала свой продукт «Сырники» 380 ккал/100 г —
// в «Рейтинге питания» железо/кальций/калий/магний/витамины C и A по нулям:
// «Ввела сырники что ела. В рейтинг питания не считает», плюс абсурдные
// «Белки 79%» при 75 г белка на 1140 ккал).
//
// 1) Свои и внешние продукты без витаминных данных наследуют
//    микроэлементы встроенной базы при точном совпадении названия
//    (нормализация: регистр, ё/е, пробелы).
// 2) Доли БЖУ считаются от общей калорийности дня, а не от суммы
//    калорий макронутриентов — иначе неполные БЖУ «разгоняют» проценты.
// 3) findFoodDuplicate — предупреждение о дубликате в форме «Свой
//    продукт»: свой «Сырники» перебивает встроенный в поиске.

const { buildFood, normFoodName, findFoodDuplicate } = require('@/lib/data/pick')
const { macroShares } = require('@/lib/data/nutrition')
const { FOODS } = require('@/lib/data/foods')

describe('normFoodName — регистр, ё/е, пробелы', () => {
  test('приводит к единому виду', () => {
    expect(normFoodName('Сырники')).toBe('сырники')
    expect(normFoodName('  СЫРНИКИ ')).toBe('сырники')
    expect(normFoodName('Варёная колбаса')).toBe('вареная колбаса')
    expect(normFoodName('')).toBe('')
    expect(normFoodName(undefined)).toBe('')
  })
})

describe('buildFood — наследование микроэлементов по названию', () => {
  test('свой продукт «Сырники» получает витамины встроенных сырников', () => {
    const base = FOODS.find((f) => f.id === 'syrniki')
    expect(base).toBeTruthy()
    expect(base.ca).toBeGreaterThan(0)
    const food = buildFood({
      id: 'user-abc',
      name: 'Сырники',
      kcal100: 380,
      p: 25,
      f: 2,
      c: 2,
      source: 'user',
    })
    expect(food.ca).toBe(base.ca)
    expect(food.fe).toBe(base.fe)
    expect(food.vita).toBe(base.vita)
    expect(food.mk).toBe(1)
    // свои калории и БЖУ не перекрываются витаминным наследованием
    expect(food.kcal).toBe(380)
    expect(food.p).toBe(25)
  })

  test('совпадение без учёта регистра, пробелов и ё/е', () => {
    const base = FOODS.find((f) => f.id === 'syrniki')
    const food = buildFood({ name: '  СЫРНИКИ  ', kcal100: 350, source: 'user' })
    expect(food.ca).toBe(base.ca)
    expect(food.mk).toBe(1)
  })

  test('незнакомое название — микроэлементов нет, mk не ставится', () => {
    const food = buildFood({ name: 'Каша бабушкина по-домашнему', kcal100: 120, source: 'user' })
    expect(food.ca).toBe(0)
    expect(food.fe).toBe(0)
    expect(food.mk).toBeUndefined()
  })

  test('продукты базы со своими витаминами наследования не меняют', () => {
    const base = FOODS.find((f) => f.id === 'syrniki')
    const food = buildFood({
      id: base.id,
      name: base.name,
      kcal100: base.kcal,
      p: base.p,
      f: base.f,
      c: base.c,
      fe: base.fe,
      ca: base.ca,
      k: base.k,
      mg: base.mg,
      vitc: base.vitc,
      vita: base.vita,
      source: 'local',
    })
    expect(food.ca).toBe(base.ca)
    expect(food.mk).toBe(1)
  })
})

describe('findFoodDuplicate — свой продукт перебивает встроенный в поиске', () => {
  const OWN = [
    { id: 'user-1', name: 'Сырники', kcal: 380 },
    { id: 'user-2', name: 'Каша мама', kcal: 100 },
  ]

  test('находит дубликат среди своих', () => {
    const dup = findFoodDuplicate('сырники', OWN)
    expect(dup.from).toBe('own')
    expect(dup.kcal).toBe(380)
  })

  test('находит дубликат во встроенной базе (помечает витамины)', () => {
    const dup = findFoodDuplicate('Овсянка на молоке', [])
    expect(dup.from).toBe('base')
    expect(dup.kcal).toBeGreaterThan(0)
    expect(dup.micros).toBe(true)
  })

  test('исключает редактируемый продукт по id, но встроенный дубликат виден', () => {
    // свой «Сырники» исключён — но во встроенной базе тоже есть «Сырники»,
    // о нём форма обязана предупредить
    const dup = findFoodDuplicate('Сырники', OWN, 'user-1')
    expect(dup.from).toBe('base')
    expect(dup.kcal).toBe(183)
    // свой без встроенного тёзки — дубликата нет
    expect(findFoodDuplicate('Каша мама', OWN, 'user-2')).toBeNull()
  })

  test('уникальное название — дубликата нет', () => {
    expect(findFoodDuplicate('Сырники бабушкина рецептура', OWN)).toBeNull()
    expect(findFoodDuplicate('', OWN)).toBeNull()
  })
})

describe('macroShares — доли БЖУ от общей калорийности', () => {
  test('день Кати: БЖУ не сходятся с калорийностью — доли честные', () => {
    // 1140 ккал; Б 75 г (300 ккал), Ж 6 г (54), У 6 г (24)
    const shares = macroShares({ kcal: 1140, p: 75, f: 6, c: 6 })
    expect(shares.pPct).toBe(26) // 300/1140, а не 79% от суммы БЖУ
    expect(shares.fPct).toBe(5)
    expect(shares.cPct).toBe(2)
  })

  test('полные согласованные данные — те же проценты, что и раньше', () => {
    // 549 ккал ≈ Б 42·4 + Ж 27·9 + У 33·4 = 543
    const shares = macroShares({ kcal: 549, p: 42, f: 27, c: 33 })
    expect(shares.pPct).toBe(31)
    expect(shares.fPct).toBe(44)
    expect(shares.cPct).toBe(24)
  })

  test('без калорийности — запасной путь по сумме БЖУ', () => {
    const shares = macroShares({ kcal: 0, p: 50, f: 0, c: 50 })
    expect(shares.pPct).toBe(50)
    expect(shares.fPct).toBe(0)
    expect(shares.cPct).toBe(50)
  })

  test('завышенное БЖУ не уводит долю за 100%', () => {
    const shares = macroShares({ kcal: 100, p: 200, f: 0, c: 0 })
    expect(shares.pPct).toBe(100)
  })
})

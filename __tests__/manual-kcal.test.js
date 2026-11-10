// Тесты parseManualKcal — ручной ввод калорий в окне счётчика тренировки
// (просьба Кати 11.11: «править ккал вручную», скриншот шторки «Бег»).
// Помощник превращает строку поля в целое число от 1 до 10000,
// пусто/мусор/выход за диапазон → null (значит «автоподсчёт»).

const { parseManualKcal, kcalBurned } = require('@/lib/data/exercises')

describe('parseManualKcal: ручные калории в счётчике тренировки', () => {
  test('обычное целое число принимается', () => {
    expect(parseManualKcal('170')).toBe(170)
  })

  test('пробелы вокруг числа не мешают', () => {
    expect(parseManualKcal('  170  ')).toBe(170)
  })

  test('число можно передать уже числом (не строкой)', () => {
    expect(parseManualKcal(170)).toBe(170)
  })

  test('запятая — разделитель дробной части, результат округляется', () => {
    expect(parseManualKcal('170,5')).toBe(171)
    expect(parseManualKcal('170,4')).toBe(170)
  })

  test('точка тоже принимается как десятичный разделитель', () => {
    expect(parseManualKcal('12.7')).toBe(13)
  })

  test('пустая строка — это «автоподсчёт» (null)', () => {
    expect(parseManualKcal('')).toBeNull()
    expect(parseManualKcal('   ')).toBeNull()
  })

  test('нулевой и отрицательный ввод — «автоподсчёт»', () => {
    expect(parseManualKcal('0')).toBeNull()
    expect(parseManualKcal('-5')).toBeNull()
  })

  test('мусор в поле — «автоподсчёт», а не NaN', () => {
    expect(parseManualKcal('abc')).toBeNull()
    expect(parseManualKcal('12abc')).toBeNull()
  })

  test('null и undefined — «автоподсчёт»', () => {
    expect(parseManualKcal(null)).toBeNull()
    expect(parseManualKcal(undefined)).toBeNull()
  })

  test('верхняя граница по умолчанию — 10000 ккал (как лимит формы)', () => {
    expect(parseManualKcal('10000')).toBe(10000)
    expect(parseManualKcal('10001')).toBeNull()
  })

  test('границу можно задать свою (запас на будущее)', () => {
    expect(parseManualKcal('500', 400)).toBeNull()
    expect(parseManualKcal('400', 400)).toBe(400)
  })

  test('стыковка с формулой MET: авто и ручное значения взаимозаменяемы', () => {
    // Реальный сценарий Кати: барабаны дали 170, а тренажёр показал 250 —
    // она вписывает 250, и это число применяется вместо расчёта
    const auto = kcalBurned(5.5, 42, 41) // средняя интенсивность, как на скриншоте
    expect(auto).toBeGreaterThan(0)
    expect(parseManualKcal(String(auto))).toBe(auto)
    expect(parseManualKcal('250')).toBe(250)
  })
})

// Тесты калибровки «Моих тренировок» по вписанной вручную цифре калорий
// (просьба Кати 11.11: «чтобы ручная цифра запоминалась для
// "Моих тренировок", как калорий за 30 мин»). Ручные ккал за N минут
// переводятся в MET тренировки и запоминаются: следующий автоподсчёт
// для этой тренировки начинается с откалиброванной интенсивности.

// RN-стабы должны встать до импортов стора
jest.requireActual('./helpers/react-native-stub')
jest.requireActual('./helpers/async-storage-stub')

describe('metFromKcal: обратная формула MET', () => {
  const { metFromKcal, kcalBurned } = require('@/lib/data/exercises')

  test('формула MET и metFromKcal — взаимные обратные', () => {
    // Реальный сценарий Кати: свои 42 кг, 42 минуты, вписано 250 ккал
    const met = metFromKcal(250, 42, 42)
    expect(met).toBeCloseTo(8.1, 1)
    expect(kcalBurned(met, 42, 42)).toBe(250)
  })

  test('без веса, минут или калорий — null', () => {
    expect(metFromKcal(250, 0, 42)).toBeNull()
    expect(metFromKcal(250, 42, 0)).toBeNull()
    expect(metFromKcal(0, 42, 42)).toBeNull()
  })
})

describe('calibrateCustomFromKcal: ручная цифра запоминается', () => {
  let useExerciseStore, calibrateCustomFromKcal

  beforeAll(() => {
    ;({ useExerciseStore, calibrateCustomFromKcal } = require('@/store/useExerciseStore'))
  })

  beforeEach(() => {
    useExerciseStore.setState({
      logs: {},
      custom: [
        { id: 'custom-box', name: 'Бокс', emoji: '🥊', met: 5.5 },
        { id: 'custom-pad', name: 'Падел', emoji: '🏸', met: 7 },
      ],
    })
  })

  test('ручные ккал за N минут запоминаются как новый MET тренировки', () => {
    const met = calibrateCustomFromKcal('custom-box', 250, 42, 42)
    expect(met).not.toBeNull()
    const box = useExerciseStore.getState().custom.find((c) => c.id === 'custom-box')
    expect(box.met).toBe(met)
    // Следующий автоподсчёт для этих же минут даёт вписанную цифру
    const { kcalBurned } = require('@/lib/data/exercises')
    expect(kcalBurned(box.met, 42, 42)).toBe(250)
    // Другая тренировка не тронута
    expect(useExerciseStore.getState().custom.find((c) => c.id === 'custom-pad').met).toBe(7)
  })

  test('существенное отличие запоминается даже после округления MET', () => {
    // Тренажёр показал 300 ккал, а расчёт по MET 5.5 давал ~190 —
    // цифра отличается сильно, калибровка обязана примениться
    const met = calibrateCustomFromKcal('custom-box', 300, 42, 42)
    expect(met).not.toBeNull()
    expect(met).toBeGreaterThan(5.5)
  })

  test('цифра в пределах 2% от текущей — калибровка не нужна (null)', () => {
    // MET 5.5 при 42 кг и 42 минутах даёт ≈ 170 ккал — отличие меньше 2%
    expect(calibrateCustomFromKcal('custom-box', 170, 42, 42)).toBeNull()
    const box = useExerciseStore.getState().custom.find((c) => c.id === 'custom-box')
    expect(box.met).toBe(5.5)
  })

  test('абсурдная интенсивность (MET вне 1..25) не запоминается', () => {
    // 5000 ккал за 5 минут — такого MET не бывает
    expect(calibrateCustomFromKcal('custom-box', 5000, 5, 42)).toBeNull()
    expect(useExerciseStore.getState().custom.find((c) => c.id === 'custom-box').met).toBe(5.5)
  })

  test('каталожная тренировка не калибруется — только «Мои»', () => {
    expect(calibrateCustomFromKcal('run', 300, 42, 42)).toBeNull()
  })

  test('неизвестный id — null', () => {
    expect(calibrateCustomFromKcal('custom-ghost', 300, 42, 42)).toBeNull()
  })

  test('без веса в профиле калибровка невозможна — null', () => {
    expect(calibrateCustomFromKcal('custom-box', 300, 42, 0)).toBeNull()
    expect(calibrateCustomFromKcal('custom-box', 300, 42, undefined)).toBeNull()
  })

  test('повторная калибровка перезаписывает MET на новую цифру', () => {
    calibrateCustomFromKcal('custom-box', 250, 42, 42)
    const met2 = calibrateCustomFromKcal('custom-box', 320, 42, 42)
    expect(met2).not.toBeNull()
    const box = useExerciseStore.getState().custom.find((c) => c.id === 'custom-box')
    expect(box.met).toBe(met2)
  })
})

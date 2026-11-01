// Юнит-тесты мозга организма: оси, состояния, позы, фразы и подсказки.
import {
  computeOrganism,
  proteinGoalG,
  PROTEIN_RATIO,
  ORG_THRESHOLDS,
  BODY_STATE,
} from '@/lib/data/organism'

describe('proteinGoalG', () => {
  test('25% ккал из белка по 4 ккал/г', () => {
    expect(PROTEIN_RATIO).toBe(0.25)
    expect(proteinGoalG(2180)).toBe(136) // 2180·0.25/4 = 136.25 → 136
    expect(proteinGoalG(2000)).toBe(125)
    expect(proteinGoalG(0)).toBe(0)
  })
})

describe('computeOrganism — оси', () => {
  test('оси считаются от целей и зажимаются в 0…100', () => {
    const r = computeOrganism({
      waterMl: 1000,
      waterGoalMl: 2000,
      proteinG: 30,
      kcal: 1000,
      kcalGoal: 2000,
      steps: 2000,
      stepsGoal: 7000,
    })
    expect(r.axes).toEqual({ hydration: 50, protein: 24, energy: 50, activity: 29 })
  })

  test('перебор калорий не поднимает ось энергии выше 100', () => {
    const r = computeOrganism({ kcal: 4000, kcalGoal: 2000 })
    expect(r.axes.energy).toBe(100)
  })

  test('нулевые цели не дают деления на ноль', () => {
    const r = computeOrganism({ waterGoalMl: 0, kcalGoal: 0, stepsGoal: 0 })
    expect(r.axes).toEqual({ hydration: 0, protein: 0, energy: 0, activity: 0 })
  })
})

describe('computeOrganism — состояния', () => {
  test('расцвет: вода ≥60, белок ≥70, энергия в коридоре', () => {
    const r = computeOrganism({
      waterMl: 2000,
      waterGoalMl: 2000,
      proteinG: 100,
      kcal: 2000,
      kcalGoal: 2000,
      steps: 7000,
      stepsGoal: 7000,
    })
    expect(r.state).toBe(BODY_STATE.BLOOM)
    expect(r.flex).toBe(true)
    expect(r.wet).toBe(true)
  })

  test('расцвет на границе: калории 105% ещё не перебор', () => {
    const r = computeOrganism({
      waterMl: 2000,
      waterGoalMl: 2000,
      proteinG: 100,
      kcal: 2100,
      kcalGoal: 2000,
      steps: 7000,
      stepsGoal: 7000,
    })
    expect(r.state).toBe(BODY_STATE.BLOOM)
  })

  test('упадок при обезвоживании (<25% воды)', () => {
    const r = computeOrganism({ waterMl: 400, waterGoalMl: 2000 })
    expect(r.state).toBe(BODY_STATE.DECLINE)
    expect(r.wet).toBe(false)
  })

  test('упадок при переборе калорий (>120% нормы)', () => {
    const r = computeOrganism({ waterMl: 2000, waterGoalMl: 2000, kcal: 2500, kcalGoal: 2000 })
    expect(r.state).toBe(BODY_STATE.DECLINE)
  })

  test('в упадке нет позы силы, даже если белка много', () => {
    const r = computeOrganism({ waterMl: 400, waterGoalMl: 2000, proteinG: 300, kcalGoal: 2000 })
    expect(r.state).toBe(BODY_STATE.DECLINE)
    expect(r.flex).toBe(false)
  })

  test('норма между упадком и расцветом', () => {
    const r = computeOrganism({
      waterMl: 1000,
      waterGoalMl: 2000,
      proteinG: 30,
      kcal: 1000,
      kcalGoal: 2000,
      steps: 2000,
      stepsGoal: 7000,
    })
    expect(r.state).toBe(BODY_STATE.NORMAL)
    expect(r.flex).toBe(false)
    expect(r.wet).toBe(false)
  })
})

describe('computeOrganism — границы порогов', () => {
  test('влажность ровно на пороге 60', () => {
    const r = computeOrganism({ waterMl: 1200, waterGoalMl: 2000 })
    expect(r.axes.hydration).toBe(ORG_THRESHOLDS.hydrationWet)
    expect(r.wet).toBe(true)
  })

  test('поза силы ровно на пороге 70', () => {
    const r = computeOrganism({
      waterMl: 2000,
      waterGoalMl: 2000,
      proteinG: 87.5,
      kcalGoal: 2000,
    }) // 87.5/125 = 70%
    expect(r.axes.protein).toBe(ORG_THRESHOLDS.proteinFlex)
    expect(r.flex).toBe(true)
  })
})

describe('computeOrganism — фразы и подсказки', () => {
  test('пустой день — упадок и просьба попить', () => {
    const r = computeOrganism()
    expect(r.state).toBe(BODY_STATE.DECLINE)
    expect(r.phrase).toBe('Мне грустно… Попей водички, пожалуйста')
    expect(r.hint).toBe('Срочно выпей воды — организм обезвожен')
  })

  test('перебор — совет лёгкого дня', () => {
    const r = computeOrganism({ waterMl: 2000, waterGoalMl: 2000, kcal: 3000, kcalGoal: 2000 })
    expect(r.hint).toBe('Калории сильно выше нормы — устроим лёгкий день')
    expect(r.phrase).toBe('Перебор… Дай мне лёгкий день и прогулку')
  })

  test('норма с низким белком — подсказка про белок (самая слабая ось)', () => {
    const r = computeOrganism({
      waterMl: 1000,
      waterGoalMl: 2000,
      proteinG: 30,
      kcal: 1000,
      kcalGoal: 2000,
      steps: 2000,
      stepsGoal: 7000,
    })
    expect(r.phrase).toBe('Неплохо! Белок сделает меня сильнее')
    expect(r.hint).toBe('Добавь белок 🍳 — организм скажет спасибо')
  })

  test('расцвет — реплика из списка расцвета', () => {
    const r = computeOrganism({
      waterMl: 2000,
      waterGoalMl: 2000,
      proteinG: 100,
      kcal: 2000,
      kcalGoal: 2000,
      steps: 7000,
      stepsGoal: 7000,
    })
    expect(r.phrase).toBe('Смотри, как светится мой геном!') // hydration 100 % 3 = 1
  })

  test('все оси в силе — «держи ритм»', () => {
    const r = computeOrganism({
      waterMl: 2000,
      waterGoalMl: 2000,
      proteinG: 100,
      kcal: 2000,
      kcalGoal: 2000,
      steps: 7000,
      stepsGoal: 7000,
    })
    expect(r.hint).toBe('Все показатели в норме — держи ритм!')
  })
})

// Аудит нормы калорий/БЖУ (отзыв Кати 27.11: «по-моему неверно
// рассчитывается норма бжу при регистрации пользователя»):
// пересчёт «Мой цели» (recommendedKcal из lib/goal.js) и план
// регистрации (calcPlan из lib/data/onboarding.js) теперь считаются
// ОДНОЙ формулой — дефицит/профицит от выбранного темпа
// (pace × 7700 ккал/кг ÷ 7 дней), а не фиксированными −500/−400/+300.
// Раньше при темпе 0,25 или 1 кг/нед пересчёт в «Записать вес»
// предлагал норму, не совпадающую с планом онбординга, — норма и БЖУ
// «сами менялись» после регистрации.

import { recommendedKcal } from '@/lib/goal'
import { calcPlan, calcBmr, calcTdee } from '@/lib/data/onboarding'
import { macroNormsFor } from '@/lib/data/bju'

const BIO = { sex: 'female', age: 30, heightCm: 165, weightKg: 70, activity: 'light' }

describe('аудит БЖУ: план регистрации и пересчёт цели совпадают (правка Кати 27.11)', () => {
  test.each([0.25, 0.5, 1])('темп %s кг/нед: recommendedKcal == calcPlan.targetKcal (lose)', (pace) => {
    const plan = calcPlan({ ...BIO, goalId: 'lose', pace, special: [], workouts: '0' })
    const recalc = recommendedKcal({
      sex: BIO.sex,
      age: BIO.age,
      heightCm: BIO.heightCm,
      weightKg: BIO.weightKg,
      activityId: BIO.activity,
      goalId: 'lose',
      paceKgPerWeek: pace,
    })
    expect(recalc).toBe(plan.targetKcal)
  })

  test('темп влияет на норму: 0,25 и 1 кг/нед дают разные дефициты', () => {
    // Профиль с высоким TDEE — чтобы безопасный пол не ограничивал
    const base = { sex: 'male', age: 25, heightCm: 180, weightKg: 85, activityId: 'moderate' }
    const soft = recommendedKcal({ ...base, goalId: 'lose', paceKgPerWeek: 0.25 })
    const fast = recommendedKcal({ ...base, goalId: 'lose', paceKgPerWeek: 1 })
    // 7700/7 ≈ 1100 ккал на каждый кг/нед: разница 0,75 кг/нед ≈ 825 ккал
    // (быстрый темп — больше дефицит — МЕНЬШЕ норма)
    expect(soft - fast).toBe(825)
  })

  test('дефицит считается от темпа, а не фиксированными −500 ккал', () => {
    const bmr = calcBmr(BIO)
    const tdee = calcTdee(bmr, BIO.activity, '0')
    // темп 0,25 → дефицит ≈ 275 ккал (старая формула давила −500 всегда)
    const target = recommendedKcal({ ...BIO, goalId: 'lose', paceKgPerWeek: 0.25 })
    expect(tdee - target).toBe(275)
  })

  test('БЖУ плана сходится в норму калорий (30/30/40, у «Сушки» 35/25/40)', () => {
    for (const goalId of ['lose', 'cut', 'maintain', 'gain']) {
      const plan = calcPlan({ ...BIO, goalId, pace: 0.5, special: [], workouts: '0' })
      const norms = macroNormsFor(plan.targetKcal, goalId)
      expect(plan.protein).toBe(norms.p)
      expect(plan.fat).toBe(norms.f)
      expect(plan.carbs).toBe(norms.c)
      const kcalFromMacros = plan.protein * 4 + plan.fat * 9 + plan.carbs * 4
      // Округление граммов даёт расхождение не больше ±12 ккал
      expect(Math.abs(kcalFromMacros - plan.targetKcal)).toBeLessThanOrEqual(12)
    }
  })

  test('поддержка — TDEE как есть; безопасный пол 1200/1500 соблюдён', () => {
    const bmr = calcBmr(BIO)
    const tdee = calcTdee(bmr, BIO.activity, '0')
    expect(recommendedKcal({ ...BIO, goalId: 'keep' })).toBe(tdee)
    const tiny = recommendedKcal({
      sex: 'female', age: 30, heightCm: 150, weightKg: 40,
      activityId: 'sedentary', goalId: 'lose', paceKgPerWeek: 1,
    })
    expect(tiny).toBeGreaterThanOrEqual(1200)
    const tinyMale = recommendedKcal({
      sex: 'male', age: 30, heightCm: 150, weightKg: 40,
      activityId: 'sedentary', goalId: 'lose', paceKgPerWeek: 1,
    })
    expect(tinyMale).toBeGreaterThanOrEqual(1500)
  })
})

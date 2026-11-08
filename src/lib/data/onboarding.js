// Расчёт плана онбординга: BMR по Миффлину–Сан Жеору, TDEE с учётом
// активности, целевые КБЖУ и прогнозная кривая веса к цели.

import { ACTIVITY_LEVELS } from './onboarding-options'
import { getDailyTarget } from './goals'

const KCAL_PER_KG = 7700 // энергетическая ценность 1 кг жира
const num = (v) => Number(String(v).replace(',', '.')) || 0
const round1 = (v) => Math.round(v * 10) / 10

// Единицы измерения: всегда храним метрику, на экране конвертируем
export const kgToLb = (kg) => round1(kg * 2.20462)
export const lbToKg = (lb) => round1(lb / 2.20462)
export const cmToIn = (cm) => round1(cm / 2.54)
export const inToCm = (inch) => round1(inch * 2.54)

// Миффлин–Сан Жеор: 10·W + 6.25·H − 5·A ± 5 / −161
export function calcBmr({ sex, weightKg, heightCm, age }) {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age
  return Math.round(sex === 'male' ? base + 5 : base - 161)
}

export function calcTdee(bmr, activityId, workouts) {
  const level = ACTIVITY_LEVELS.find((a) => a.id === activityId)
  let mult = level ? level.mult : 1.375
  // частые тренировки поднимают «лёгкую» активность до средней
  if (workouts === '4+' && (activityId === 'sedentary' || activityId === 'light')) mult = 1.55
  return Math.round(bmr * mult)
}

// Доли БЖУ от калорий: при «Сушке» белка больше (35%) — на сохранение
// мышц в дефиците, жиров меньше (25%); в остальных целях — классика 30/30/40
const macroSplit = (goalId) =>
  goalId === 'cut' ? { p: 0.35, f: 0.25, c: 0.4 } : { p: 0.3, f: 0.3, c: 0.4 }

// Полный план по ответам анкеты. Беременность/ГВ — калории НЕ режем.
// Анкету можно пропустить (кнопка «Пропустить» на «Расскажи о себе»):
// без биоданных возвращаем пресетную норму по цели (у «Похудения»
// это 1800 ккал/день), BMR/TDEE и прогноз не считаем.
export function calcPlan(answers) {
  const a = answers
  const noDeficit = a.special.includes('pregnant') || a.special.includes('lactating')
  const dailyDelta =
    a.goalId === 'maintain' || noDeficit ? 0 : (a.pace * KCAL_PER_KG) / 7

  const hasBio =
    (a.sex === 'female' || a.sex === 'male') &&
    a.age >= 10 && a.age <= 90 &&
    a.heightCm >= 120 && a.heightCm <= 230 &&
    a.weightKg >= 35 && a.weightKg <= 250

  if (!hasBio) {
    const targetKcal = getDailyTarget(a.goalId)
    const split = macroSplit(a.goalId)
    return {
      bmr: null,
      tdee: null,
      targetKcal,
      protein: Math.round((targetKcal * split.p) / 4),
      fat: Math.round((targetKcal * split.f) / 9),
      carbs: Math.round((targetKcal * split.c) / 4),
      dailyDelta: 0,
      deltaLabel: a.goalId === 'gain' ? 'Профицит' : 'Дефицит',
      pace: a.pace,
      weeks: null,
      projection: null,
      preset: true,
    }
  }

  const bmr = calcBmr(a)
  const tdee = calcTdee(bmr, a.activity, a.workouts)
  const raw = a.goalId === 'gain' ? tdee + dailyDelta : tdee - dailyDelta
  const floor = a.sex === 'female' ? 1200 : 1500 // пол безопасности
  const targetKcal = Math.max(Math.round(raw), floor)
  const split = macroSplit(a.goalId)

  const plan = {
    bmr,
    tdee,
    targetKcal,
    protein: Math.round((targetKcal * split.p) / 4),
    fat: Math.round((targetKcal * split.f) / 9),
    carbs: Math.round((targetKcal * split.c) / 4),
    dailyDelta: Math.round(dailyDelta),
    deltaLabel: a.goalId === 'gain' ? 'Профицит' : 'Дефицит',
    pace: a.pace,
  }

  const cur = a.weightKg
  const target = a.targetWeightKg || cur
  const diff = Math.abs(cur - target)
  plan.weeks = diff > 0.1 && a.goalId !== 'maintain' ? Math.ceil(diff / a.pace) : null
  if (plan.weeks) {
    const d = new Date(Date.now() + plan.weeks * 7 * 86400000)
    plan.goalDate = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
  }

  // Прогнозная кривая веса — ПО МЕСЯЦАМ (отзыв Кати: «показывать
  // месяцы», а не «1 нед / 2 нед…»); точек немного — график чистый,
  // без пунктиров на каждый шаг (точки рисуются только на краях —
  // см. dots="ends" в RevealStep)
  const months = plan.weeks ? Math.max(1, Math.min(12, Math.round(plan.weeks / 4.345))) : 2
  plan.projection = Array.from({ length: months + 1 }, (_, i) => ({
    label: i === 0 ? 'Сейчас' : `${i} мес`,
    kg: round1(cur + (target - cur) * (i / months)),
  }))
  return plan
}

export function planDoneText(plan) {
  if (plan.preset) {
    return 'Данные не заполнены — пока держим среднюю норму для вашей цели. Заполните профиль позже, и мишка посчитает точнее.'
  }
  if (plan.weeks && plan.goalDate) {
    return `При текущем темпе вы достигнете цели к ${plan.goalDate}`
  }
  return 'Ваш план поддерживает текущую форму — двигаемся вместе!'
}

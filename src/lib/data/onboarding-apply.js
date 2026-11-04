// Применение плана онбординга к существующим сторам:
// норма калорий, вода, шаги, профиль и цель питания.

import { useFoodStore } from '@/store/useFoodStore'
import { useProfileStore } from '@/store/useProfileStore'
import { useGoalsStore } from '@/store/useGoalsStore'
import { WATER_BY_ANSWER, STEPS_BY_ANSWER } from './onboarding-options'
import { TDEE_LEVELS } from './bmi'

// answers — ответы анкеты, plan — сохранённый план (calcPlan)
export function applyOnboarding(answers, plan) {
  const a = answers
  const goals = useGoalsStore.getState().goals

  useGoalsStore.getState().setGoals({
    kcal: plan.targetKcal,
    waterMl: WATER_BY_ANSWER[a.waterDay] || goals.waterMl,
    steps: STEPS_BY_ANSWER[a.stepsDay] || goals.steps,
    minutes: Math.max(30, Math.round((STEPS_BY_ANSWER[a.stepsDay] || goals.steps) / 100)),
  })

  if (a.heightCm && a.weightKg) {
    useProfileStore.getState().setProfile({
      heightCm: a.heightCm,
      weightKg: a.weightKg,
    })
  }

  // Биоданные для калькулятора ИМТ: пол, возраст, уровень активности.
  // hasBio честный: анкету могли пропустить — тогда данных нет,
  // и калькулятор ИМТ остаётся «без данных», а не падает на пустых.
  const validSex = a.sex === 'female' || a.sex === 'male'
  const ageNum = Number(a.age)
  const validAge = Number.isFinite(ageNum) && ageNum >= 10 && ageNum <= 90
  const validBody =
    Number(a.heightCm) >= 120 && Number(a.heightCm) <= 230 &&
    Number(a.weightKg) >= 35 && Number(a.weightKg) <= 250
  const bioPatch = { hasBio: validSex && validAge && validBody }
  if (validSex) bioPatch.sex = a.sex
  if (validAge) bioPatch.age = ageNum
  if (TDEE_LEVELS.some((l) => l.id === a.activity)) bioPatch.activityId = a.activity
  useProfileStore.getState().setProfile(bioPatch)

  // Цель питания: id совпадают с пресетами (lose / maintain / gain)
  if (a.goalId) useFoodStore.getState().setGoal(a.goalId)

  // Доп. слоты перекусов («Перекус 2, 3…») больше не создаются: все
  // перекусы живут в одной карточке «Перекус/Полдник» (4 приёма пищи)
}

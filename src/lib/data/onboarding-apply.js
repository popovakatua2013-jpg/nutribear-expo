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

  // Биоданные для калькулятора ИМТ: пол, возраст, уровень активности
  const bioPatch = { hasBio: true }
  if (a.sex === 'female' || a.sex === 'male') bioPatch.sex = a.sex
  const ageNum = Number(a.age)
  if (Number.isFinite(ageNum) && ageNum >= 10 && ageNum <= 90) bioPatch.age = ageNum
  if (TDEE_LEVELS.some((l) => l.id === a.activity)) bioPatch.activityId = a.activity
  useProfileStore.getState().setProfile(bioPatch)

  // Цель питания: id совпадают с пресетами (lose / maintain / gain)
  if (a.goalId) useFoodStore.getState().setGoal(a.goalId)

  // «3 + 2 перекуса» — добавить один дополнительный перекус, если его нет
  if (a.mealsDay === '3+2' && useFoodStore.getState().customMeals.length === 0) {
    useFoodStore.getState().addCustomMeal()
  }
}

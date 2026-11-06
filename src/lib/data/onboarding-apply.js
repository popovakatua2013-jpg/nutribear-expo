// Применение плана онбординга к существующим сторам:
// норма калорий, вода, шаги, профиль и цель питания.

import { useProfileStore } from '@/store/useProfileStore'
import { useGoalsStore } from '@/store/useGoalsStore'
import { applyGoalChoice } from '@/lib/data/goals-apply'
import { WATER_BY_ANSWER, STEPS_BY_ANSWER } from './onboarding-options'
import { TDEE_LEVELS } from './bmi'

// answers — ответы анкеты, plan — сохранённый план (calcPlan)
export function applyOnboarding(answers, plan) {
  const a = answers
  const goals = useGoalsStore.getState().goals

  // Норма калорий придёт ниже через applyGoalChoice — вместе с id цели,
  // чтобы пара «id пресета + ккал» не рассинхронилась
  useGoalsStore.getState().setGoals({
    waterMl: WATER_BY_ANSWER[a.waterDay] || goals.waterMl,
    steps: STEPS_BY_ANSWER[a.stepsDay] || goals.steps,
    minutes: Math.max(30, Math.round((STEPS_BY_ANSWER[a.stepsDay] || goals.steps) / 100)),
  })

  if (a.heightCm && a.weightKg) {
    const profilePatch = {
      heightCm: a.heightCm,
      weightKg: a.weightKg,
    }
    // Цель по весу из анкеты — теперь видна на вкладке «Тело» (отзыв
    // Кати: «цель по весу вводила в онбординге, но на вкладке Тело
    // её нет»). Границы — как у веса в калькуляторе ИМТ
    const tw = Number(a.targetWeightKg)
    if (Number.isFinite(tw) && tw >= 35 && tw <= 250) profilePatch.goalWeightKg = tw
    useProfileStore.getState().setProfile(profilePatch)
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

  // Цель питания: id и норма калорий меняются всегда вместе. Цель могли
  // пропустить — тогда просто личная норма калорий без смены пресета
  if (a.goalId) applyGoalChoice(a.goalId, plan.targetKcal)
  else useGoalsStore.getState().setGoals({ kcal: plan.targetKcal })

  // Доп. слоты перекусов («Перекус 2, 3…») больше не создаются: все
  // перекусы живут в одной карточке «Перекус/Полдник» (4 приёма пищи)
}

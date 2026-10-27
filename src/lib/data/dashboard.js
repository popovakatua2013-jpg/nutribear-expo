// Числа для главного экрана: вода, калории, шаги, активность.
// Всё считается из реального состояния (сторы) — без «магических» значений.

import { WATER_GLASS } from '@/lib/data/activity'

// Процент выполнения цели (0…100)
export function pct(cur, goal) {
  if (!goal) return 0
  return Math.min(100, Math.round((cur / goal) * 100))
}

function sumKcal(entries) {
  return Object.values(entries)
    .flat()
    .reduce((sum, e) => sum + e.kcal, 0)
}

// Сводка показателей за сегодня для карточек и блока «Ваши цели».
// Цели (калории/вода/шаги/минуты) приходят из useGoalsStore.
export function buildDashboard({ hydrated, entries, waterMl, extraSteps, goals }) {
  const g = goals || { kcal: 2180, waterMl: 2000, steps: 7000, minutes: 60 }
  const kcalTarget = g.kcal
  const kcal = hydrated ? sumKcal(entries) : 0

  // Шаги — только реально добавленные пользователем (кнопка «+»)
  const steps = hydrated ? extraSteps || 0 : 0
  const minutes = Math.round(steps / 100) // ~100 шагов ≈ 1 минута ходьбы

  const ml = hydrated ? waterMl || 0 : 0
  const glasses = Math.round(ml / WATER_GLASS)
  const glassesGoal = Math.max(1, Math.round(g.waterMl / WATER_GLASS))

  return {
    // Вода
    glasses,
    glassesGoal,
    ml,
    waterGoalMl: g.waterMl,
    waterPct: pct(ml, g.waterMl),
    // Калории
    kcal,
    kcalTarget,
    kcalPct: pct(kcal, kcalTarget),
    // Шаги
    steps,
    stepsGoal: g.steps,
    stepsPct: pct(steps, g.steps),
    // Активность (минуты)
    minutes,
    minutesGoal: g.minutes,
    minutesPct: pct(minutes, g.minutes),
  }
}

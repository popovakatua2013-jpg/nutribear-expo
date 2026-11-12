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

// Минуты тренировок за сегодня из журнала (массив записей дня).
// Каждая запись: { id, exId, name, emoji, minutes, kcal, manual? }
// Используется и в карточке «Активность», и в окне «Активность за сегодня»:
// раньше в «0/70 мин» на главной учитывались только шаги (steps/100), и
// пользователь с записанной тренировкой видел «0 мин» — вводило в заблуждение.
// Теперь минуты = шаги/100 + сумма минут тренировок за день.
export function exerciseMinutes(logs = []) {
  if (!Array.isArray(logs)) return 0
  return logs.reduce((s, e) => s + (Number(e?.minutes) || 0), 0)
}

// Сводка показателей за сегодня для карточек и блока «Ваши цели».
// Цели (калории/вода/шаги/минуты) приходят из useGoalsStore.
// exLogs — тренировки за сегодня (массив записей); если не передан,
// минуты учитываются только из шагов (старое поведение).
export function buildDashboard({ hydrated, entries, waterMl, extraSteps, goals, exLogs = [] }) {
  const g = goals || { kcal: 2180, waterMl: 2000, steps: 7000, minutes: 60 }
  const kcalTarget = g.kcal
  const kcal = hydrated ? sumKcal(entries) : 0

  // Шаги — только реально добавленные пользователем (кнопка «+»)
  const steps = hydrated ? extraSteps || 0 : 0
  // Минуты активности = ходьба (100 шагов ≈ 1 минута) + тренировки
  const minutes = Math.round(steps / 100) + exerciseMinutes(exLogs)

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

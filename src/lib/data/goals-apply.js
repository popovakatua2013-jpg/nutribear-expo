// Единая точка смены цели питания: id пресета в дневнике (useFoodStore)
// и норма калорий в «Питании» (useGoalsStore) меняются ВСЕГДА вместе.
// Раньше их синхронизировали вручную в трёх местах (выбор цели,
// поздравление о достижении веса, онбординг) — новая точка записи могла
// молча рассинхронить норму и ориентиры приёмов.

import { useFoodStore } from '@/store/useFoodStore'
import { useGoalsStore } from '@/store/useGoalsStore'
import { getDailyTarget } from './goals'

// goalId — 'lose' | 'maintain' | 'gain'; kcalOverride — личная норма
// (расчёт по биоданным), иначе берётся сумма пресета цели
export function applyGoalChoice(goalId, kcalOverride) {
  const kcal =
    kcalOverride != null && Number.isFinite(Number(kcalOverride))
      ? Math.round(Number(kcalOverride))
      : getDailyTarget(goalId)
  useFoodStore.getState().setGoal(goalId)
  useGoalsStore.getState().setGoals({ kcal })
}

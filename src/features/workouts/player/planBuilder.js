// src/features/workouts/player/planBuilder.js — сборка плана плеера
// (по референсу плеера, раздел 6.2). Правило одно: если в тренировке задан
// явный список упражнений — используем его; иначе детерминированно собираем
// план из библиотеки так, чтобы суммарная активная длительность совпала с
// durationMin. Никакого Math.random: план одной и той же тренировки всегда
// одинаков (важно для тестов и «Продолжить»).
import { LIBRARY } from '../data/exerciseLibrary'

/** Целевая активная длительность плана, секунды */
export function targetActiveSec(workout) {
  return workout.durationMin * 60
}

/** Сумма активных секунд плана (без отдыха) */
export function planActiveSec(plan) {
  return plan.reduce((acc, e) => acc + e.durationSec, 0)
}

/** Сумма секунд отдыха плана (после последнего упражнения отдыха нет) */
export function planRestSec(plan) {
  return plan.reduce(
    (acc, e, i) => (i === plan.length - 1 ? acc : acc + e.restSec),
    0,
  )
}

/** Приблизительная полная длительность плана: активная фаза + отдых */
export function planTotalSec(plan) {
  return planActiveSec(plan) + planRestSec(plan)
}

/**
 * Детерминированный план из библиотеки: идём по упражнениям нужного типа
 * по кругу, пока не наберём целевую длительность. Со 2-го круга слегка
 * меняем длительность подходов, чтобы план не был монотонным.
 */
export function generatePlan(workout) {
  const pool = LIBRARY[workout.type]
  const target = targetActiveSec(workout)
  const plan = []
  let acc = 0

  for (let i = 0; acc < target; i++) {
    const base = pool[i % pool.length]
    const round = Math.floor(i / pool.length)
    const durationSec =
      round === 0 ? base.durationSec : base.durationSec + (i % 2 === 0 ? 10 : -5)
    const isLast = acc + durationSec >= target
    plan.push({
      ...base,
      id: `${base.id}#${i + 1}`,
      durationSec,
      restSec: isLast ? 0 : base.restSec,
    })
    acc += durationSec
  }
  return plan
}

/** Публичный вход плеера: явные упражнения или сгенерированный план */
export function buildPlan(workout) {
  if (workout.exercises && workout.exercises.length > 0) {
    // Гарантируем контракт: у последнего упражнения отдыха нет
    return workout.exercises.map((e, i) => ({
      ...e,
      restSec: i === workout.exercises.length - 1 ? 0 : e.restSec,
    }))
  }
  return generatePlan(workout)
}

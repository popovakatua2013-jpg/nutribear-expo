// src/features/workouts/player/planBuilder.js — сборка плана плеера
// (по референсу плеера, раздел 6.2). Правила:
//  1) если в тренировке задан явный список упражнений — используем его как есть;
//  2) иначе детерминированно собираем план из пула: собственный набор
//     workout.exerciseIds (индивидуальные тренировки — пресс, спина…) или
//     библиотека по типу. Никакого Math.random: план одной и той же
//     тренировки всегда одинаков (важно для тестов и «Продолжить»).
//  3) для обычных тренировок автоматически добавляем разминку в начало
//     и заминку в конец (йога и растяжка обходятся без них — они сами
//     мягкие; «Утренняя зарядка» — флаг noWarmup, она сама разминка).
import { EXERCISE_BY_ID, LIBRARY, WARMUP, COOLDOWN } from '../data/exerciseLibrary'

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

/** Пул упражнений: собственный набор тренировки или библиотека по типу */
export function poolFor(workout) {
  const custom = (workout.exerciseIds || [])
    .map((id) => EXERCISE_BY_ID[id])
    .filter(Boolean)
  return custom.length > 0 ? custom : LIBRARY[workout.type]
}

/**
 * Детерминированный план из пула: идём по упражнениям по кругу, пока не
 * наберём целевую длительность. Со 2-го круга слегка меняем длительность
 * подходов, чтобы план не был монотонным.
 */
export function generatePlan(workout) {
  const pool = poolFor(workout)
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

/** Нужны ли тренировке автоматическая разминка и заминка */
export function wantsWarmup(workout) {
  return workout.type !== 'yoga' && !workout.noWarmup
}

export function wantsCooldown(workout) {
  return workout.type !== 'yoga' && workout.type !== 'stretch'
}

/** Публичный вход плеера: явные упражнения или собранный план */
export function buildPlan(workout) {
  if (workout.exercises && workout.exercises.length > 0) {
    // Гарантируем контракт: у последнего упражнения отдыха нет
    return workout.exercises.map((e, i) => ({
      ...e,
      restSec: i === workout.exercises.length - 1 ? 0 : e.restSec,
    }))
  }

  const main = generatePlan(workout).map((e) => ({ ...e, kind: 'main' }))
  const warmup = wantsWarmup(workout)
    ? WARMUP.map((e, i) => ({ ...e, id: `${e.id}#w${i + 1}`, kind: 'warmup' }))
    : []
  const cooldown = wantsCooldown(workout)
    ? COOLDOWN.map((e, i) => ({ ...e, id: `${e.id}#c${i + 1}`, kind: 'cooldown' }))
    : []

  return [...warmup, ...main, ...cooldown]
}

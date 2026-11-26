// Награда за достижение цели по весу: чистые правила, когда ставить
// и чистить goalReachedAt при сохранении модалки «Записать вес».
// Цель считается достигнутой, если вес отличается от цели меньше 0,05 кг
// (на практике — совпадает с точностью одного знака после запятой).

import { bmrMifflin, tdeeKcal, tdeeMult } from '@/lib/data/bmi'
import { getDailyTarget } from '@/lib/data/goals'

export const AT_GOAL_EPS = 0.05

// Стрик удержания честный, когда вес фиксируется хотя бы раз в неделю:
// если измерений нет дольше — карточка празднования мягко напоминает
export const WEIGH_NUDGE_DAYS = 7

const DAY_MS = 24 * 60 * 60 * 1000

export function isAtGoal(weightKg, goalKg) {
  return goalKg != null && Math.abs(weightKg - goalKg) < AT_GOAL_EPS
}

// Полных дней с момента ISO-даты; в будущее время (сбой часов) — 0
export function daysSince(iso, now = Date.now()) {
  const t = new Date(iso).getTime()
  if (!Number.isFinite(t)) return Infinity
  return Math.max(0, Math.floor((now - t) / DAY_MS))
}

// Что сделать с наградой после сохранения модалки веса.
//   prevGoal / prevReachedAt / prevWeight — состояние до сохранения;
//   weight / weightChanged — новый вес и изменился ли он вообще;
//   goalKg — цель из модалки: undefined — поле не трогали, null — сняли.
// Возвращает { reachedAt, celebrate }:
//   reachedAt — новое значение goalReachedAt
//     (undefined — не менять, null — забыть, ISO-строка — поставить);
//   celebrate — был переход «не достиг → достиг», можно поздравить.
export function goalRewardAfterSave({
  prevGoal,
  prevReachedAt,
  prevWeight,
  weight,
  weightChanged,
  goalKg,
}) {
  const goal = goalKg === undefined ? prevGoal : goalKg
  const wasReached = isAtGoal(prevWeight, prevGoal)

  // Цель изменили или сняли: старая дата относится к прежней цели,
  // поэтому честно ставим свежую дату либо забываем награду
  if (goalKg !== undefined) {
    const reachedNow = isAtGoal(weight, goal)
    return {
      reachedAt: reachedNow ? new Date().toISOString() : null,
      celebrate: reachedNow && !wasReached,
    }
  }

  // Цель не трогали: награда только при переходе «не достиг → достиг».
  // Вес снова у цели после отката — дата ставится заново: «стриком»
  // считаем непрерывное удержание результата, а не первое попадание
  if (weightChanged && !wasReached && isAtGoal(weight, goal)) {
    return { reachedAt: new Date().toISOString(), celebrate: true }
  }

  return { reachedAt: undefined, celebrate: false }
}

// Личная норма калорий под цель (Миффлин — Сан Жеор). ДЕФИЦИТ/ПРОФИЦИТ —
// от темпа пользователя (аудит Кати 27.11: «по-моему неверно
// рассчитывается норма бжу» — раньше здесь был ФИКСИРОВАННЫЙ дефицит
// ≈ 500 ккал, а план онбординга считается от выбранного темпа
// (pace × 7700 ккал на кг жира ÷ 7 дней): при темпе 0,25 или 1 кг/нед
// пересчёт в «Записать вес» предлагал норму, не совпадающую с планом
// регистрации — норма и БЖУ «сами менялись»). Теперь формулы совпадают
// дословно с calcPlan (lib/data/onboarding.js): lose/cut — TDEE − дефицит
// от темпа, gain — TDEE + профицит от темпа, поддержка — TDEE как есть.
// Ниже безопасного пола (1200/1500 ккал) не опускаемся.
// goalId: 'lose' | 'cut' | 'gain' | 'maintain'/'keep'/пусто — поддержка;
// paceKgPerWeek — темп из анкеты (answers.pace), по умолчанию 0,5 кг/нед
export function recommendedKcal({
  sex,
  age,
  heightCm,
  weightKg,
  activityId,
  goalId,
  paceKgPerWeek = 0.5,
}) {
  const bmr = bmrMifflin(sex, age, heightCm, weightKg)
  const tdee = tdeeKcal(bmr, tdeeMult(activityId))
  const floor = sex === 'male' ? 1500 : 1200
  const pace = Math.max(0.1, Math.min(1.5, Number(paceKgPerWeek) || 0.5))
  const delta = Math.round((pace * 7700) / 7) // ≈ 1100 ккал на каждый 1 кг/нед
  const raw =
    goalId === 'gain'
      ? tdee + delta
      : goalId === 'lose' || goalId === 'cut'
        ? tdee - delta
        : tdee
  return Math.max(Math.round(raw), floor)
}

// План перехода «на поддержку» после достижения цели по весу: норма
// калорий без дефицита/профицита. С заполненными биоданными — личный
// TDEE по Миффлину, без них — средний пресет поддержки. Уже на
// поддержке возвращаем null — кнопка перехода не нужна.
export function supportSwitchPlan({ goalId, hasBio, sex, age, heightCm, weightKg, activityId }) {
  if (goalId === 'maintain') return null
  if (hasBio) {
    return {
      kcal: recommendedKcal({ sex, age, heightCm, weightKg, activityId, goalId: 'maintain' }),
      personal: true,
    }
  }
  return { kcal: getDailyTarget('maintain'), personal: false }
}

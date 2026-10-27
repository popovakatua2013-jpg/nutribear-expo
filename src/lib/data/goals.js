// Цели пользователя: похудение, поддержка, набор веса.
// Для каждой цели — свои ориентиры калорий по приёмам пищи (ккал).

export const GOALS = [
  {
    id: 'lose',
    label: 'Похудение',
    hint: 'мягкий дефицит калорий',
    icon: 'trending-down',
    emoji: '🔥',
    targets: { breakfast: 450, lunch: 620, dinner: 530, snack: 200 },
  },
  {
    id: 'maintain',
    label: 'Поддержка',
    hint: 'держим форму, как есть',
    icon: 'scale',
    emoji: '⚖️',
    targets: { breakfast: 550, lunch: 760, dinner: 650, snack: 220 },
  },
  {
    id: 'gain',
    label: 'Набор веса',
    hint: 'профицит для роста мышц',
    icon: 'trending-up',
    emoji: '💪',
    targets: { breakfast: 700, lunch: 950, dinner: 820, snack: 330 },
  },
]

export const DEFAULT_GOAL = 'maintain'

export function getGoal(goalId) {
  return GOALS.find((g) => g.id === goalId) || GOALS[1]
}

// Ориентиры по приёмам пищи для выбранной цели
export function getTargets(goalId) {
  return getGoal(goalId).targets
}

// Суммарная дневная цель
export function getDailyTarget(goalId) {
  const t = getTargets(goalId)
  return Object.values(t).reduce((sum, n) => sum + n, 0)
}

// Ориентиры по приёмам для произвольной дневной нормы:
// пропорции берём от пресета «Поддержка» (550/760/650/220 из 2180)
const RATIO_BASE = getDailyTarget('maintain')

export function targetsFromKcal(kcal) {
  const base = getTargets('maintain')
  const keys = Object.keys(base)
  const out = {}
  let used = 0
  keys.forEach((k, i) => {
    if (i === keys.length - 1) {
      out[k] = Math.max(0, Math.round(kcal) - used)
      return
    }
    out[k] = Math.max(0, Math.round((base[k] / RATIO_BASE) * kcal))
    used += out[k]
  })
  return out
}

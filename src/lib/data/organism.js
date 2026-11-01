// Мозг организма: превращает реальные данные дня (вода, белок, калории, шаги)
// в состояние двойника: bloom | normal | decline + оси 0…100 и подсказки.
// Чистые функции без сторов — удобно тестировать и настраивать пороги.

import { pct } from './dashboard'

// Состояния организма
export const BODY_STATE = {
  BLOOM: 'bloom', // расцвет — всё идёт отлично
  NORMAL: 'normal', // норма — жить можно, но есть рост
  DECLINE: 'decline', // упадок — организму плохо
}

// Пороги (можно крутить без правки компонентов)
export const ORG_THRESHOLDS = {
  hydrationWet: 60, // влажный блеск при гидратации ≥ 60
  proteinFlex: 70, // поза силы при белке ≥ 70
  declineWater: 25, // упадок при гидратации < 25
  declineOvereat: 1.2, // упадок при калориях > 120% нормы
  bloomEnergyMin: 55, // расцвет при энергии 55…105% нормы
  bloomEnergyMax: 105,
}

// Дневная цель по белку: 25% ккал из белка (4 ккал на грамм)
export const PROTEIN_RATIO = 0.25
export function proteinGoalG(kcalGoal) {
  return Math.round((kcalGoal * PROTEIN_RATIO) / 4)
}

const clamp = (n) => Math.max(0, Math.min(100, Math.round(n)))

// Главная функция: оси + состояние + фраза + подсказка
export function computeOrganism({
  waterMl = 0,
  waterGoalMl = 2000,
  proteinG = 0,
  kcal = 0,
  kcalGoal = 2180,
  steps = 0,
  stepsGoal = 7000,
} = {}) {
  const hydration = clamp(pct(waterMl, waterGoalMl))
  const protein = clamp(pct(proteinG, proteinGoalG(kcalGoal)))
  const energy = clamp(pct(kcal, kcalGoal))
  const activity = clamp(pct(steps, stepsGoal))

  const axes = { hydration, protein, energy, activity }
  const t = ORG_THRESHOLDS

  // Упадок: обезвоживание или сильный перебор калорий
  const decline =
    hydration < t.declineWater ||
    (kcalGoal > 0 && kcal > kcalGoal * t.declineOvereat)

  // Расцвет: вода и белок в силе, энергия в здоровом коридоре
  const bloom =
    !decline &&
    hydration >= t.hydrationWet &&
    protein >= t.proteinFlex &&
    energy >= t.bloomEnergyMin &&
    energy <= t.bloomEnergyMax

  const state = decline ? BODY_STATE.DECLINE : bloom ? BODY_STATE.BLOOM : BODY_STATE.NORMAL

  // Позы и эффекты (как в веб-прототипе)
  const flex = protein >= t.proteinFlex && !decline
  const wet = hydration >= t.hydrationWet && !decline

  // Фраза-реплика организма
  const phrase = organismPhrase(state, { hydration, protein, energy, activity })

  // Подсказка: что улучшить первым (самая слабая ось)
  const hint = organismHint(axes, state, kcalGoal)

  return { state, axes, flex, wet, phrase, hint }
}

function organismPhrase(state, a) {
  if (state === BODY_STATE.BLOOM) {
    const list = [
      'Я цвету! Ты в идеальном ритме',
      'Смотри, как светится мой геном!',
      'Такое чувство, что я умею летать',
    ]
    return list[a.hydration % list.length]
  }
  if (state === BODY_STATE.DECLINE) {
    return a.hydration < 25
      ? 'Мне грустно… Попей водички, пожалуйста'
      : 'Перебор… Дай мне лёгкий день и прогулку'
  }
  // норма — намекаем на самую слабую ось
  if (a.protein < 40) return 'Неплохо! Белок сделает меня сильнее'
  if (a.hydration < 50) return 'Хорошо! Добавь пару стаканов воды'
  if (a.activity < 40) return 'Годы идут… Прогуляемся вместе?'
  return 'Всё хорошо, но я знаю, что ты можешь больше'
}

function organismHint(axes, state, kcalGoal) {
  if (state === BODY_STATE.DECLINE) {
    return axes.hydration < ORG_THRESHOLDS.declineWater
      ? 'Срочно выпей воды — организм обезвожен'
      : 'Калории сильно выше нормы — устроим лёгкий день'
  }
  const items = [
    { key: 'hydration', label: 'воду', emoji: '💧', v: axes.hydration },
    { key: 'protein', label: 'белок', emoji: '🍳', v: axes.protein },
    { key: 'energy', label: 'энергетический баланс', emoji: '⚡', v: energyHint(axes.energy) },
    { key: 'activity', label: 'шаги', emoji: '👣', v: axes.activity },
  ]
  const worst = items.filter((i) => i.v < 60).sort((a, b) => a.v - b.v)[0]
  if (!worst) return 'Все показатели в норме — держи ритм!'
  return `Добавь ${worst.label} ${worst.emoji} — организм скажет спасибо`
}

// Энергия считается «хорошей», когда близка к 100% (и не перебор)
function energyHint(v) {
  return v <= 100 ? v : Math.max(0, 200 - v)
}

// Персональные подсказки по дневнику питания (отзыв Кати: «могу сделать
// их персональными по дневнику питания — например, „за 3 дня белка
// меньше нормы — вес стоит“»). Чистая функция: на вход — последние
// дни дневника (еда + вода), цели и вес; на выходе — ОДНА самая важная
// подсказка или null (похваливать и выдумывать проблемы не нужно —
// подсказка появляется только на реальном повторяющемся отклонении).
//
// Правила смотрят на 3 ПОСЛЕДНИХ ВЕДЁННЫХ дня (день «ведён» — была еда
// или вода; пустые дни среднее не топят, как в дисциплине отчётов):
//   1. protein-low — белок ниже 80% нормы все 3 дня (+ «вес стоит»,
//      если последние взвешивания не двигаются — ровно пример Кати)
//   2. sleep-low  — последние 3 записанные ночи короче нормы по сну
//      (цель goals.sleepMin, по умолчанию 7 ч) — трекер «лёг/встал»;
//      если вес при этом стоит — отдельная версия с «вес стоит»
//   3. goal-below-habit — ВСЕ 3 дня выше цели и в СРЕДНЕМ на 25%+:
//      похоже, дело не в дисциплине, а в самой цели («строгий режим
//      всегда красный») — мягкая подсказка пересобрать цель в
//      калькуляторе на «Теле» вместо ежедневного «сделайте легче»
//   4. kcal-over  — калории выше цели на 15%+ все 3 дня
//   5. water-low  — воды меньше половины нормы все 3 дня
//   6. kcal-low   — калории ниже 70% цели все 3 дня (голодание тормозит)
//   7. fib-low    — клетчатка ниже 60% нормы все 3 дня
// Приоритет сверху вниз: показываем одну — самую важную.

import { FIBER_NORM } from './nutrition'
import { SLEEP_NORM_MIN } from './sleep'

// Автонормы от цели по калориям — как в «Съедено за сегодня»
// (тарелка 20/30/50 %, клетчатка 25 г)
function macroTargets(kcal) {
  return {
    p: Math.round((kcal * 0.2) / 4),
    fib: FIBER_NORM,
  }
}

// Нормы с учётом своих значений из целей (0 = авто)
export function insightNorms(goals) {
  const g = goals || {}
  const auto = macroTargets(g.kcal || 0)
  const norms = g.macroNorms || {}
  return {
    kcal: g.kcal > 0 ? g.kcal : 0,
    waterMl: g.waterMl > 0 ? g.waterMl : 0,
    p: norms.p > 0 ? norms.p : auto.p,
    fib: norms.fib > 0 ? norms.fib : auto.fib,
  }
}

// «Вес стоит»: есть хотя бы два взвешивания, оба свежие (последние
// 14 дней), разница между двумя последними ≤ 0,3 кг
export function weightStands(weights, now = Date.now()) {
  const list = Array.isArray(weights) ? weights.filter((w) => w && Number.isFinite(w.kg)) : []
  if (list.length < 2) return false
  const [a, b] = list
  if (Math.abs(a.kg - b.kg) > 0.3) return false
  const fresh = Math.abs(a.date ? now - new Date(a.date).getTime() : Infinity) <= 14 * 86400000
  return fresh
}

// Склонение «3 дня / дня» — только для 3, окно фиксированное
const THREE_DAYS_WORD = 'дня'

// Главная подсказка: { id, title, text } | null
export function foodInsight({ rows = [], goals = null, weights = [] }) {
  const norms = insightNorms(goals)
  // Ночи по трекеру сна: строки с записанным sleepMin (в minutes).
  // Ночь живёт в дне пробуждения — считаем по последним записанным.
  // Правило сна независимо от дневника питания: вести еду не обязательно
  const nights = rows.filter((r) => r && Number(r.sleepMin) > 0).slice(-3)
  const sleepGoalMin =
    goals && Number(goals.sleepMin) > 0 ? Number(goals.sleepMin) : SLEEP_NORM_MIN
  const sleepLow = nights.length >= 3 && nights.every((r) => Number(r.sleepMin) < sleepGoalMin)

  // Только ведённые дни — пустые не считаем отклонением
  const led = rows.filter((r) => r && (Number(r.kcal) > 0 || Number(r.waterMl) > 0))
  // Пищевых правил нет (меньше 3 ведённых дней) и ночей мало — подсказки
  // пока не о чем: не выдумываем проблемы
  if (led.length < 3 && nights.length < 3) return null
  const last3 = led.slice(-3)

  // Пищевые правила считаются только по ТРЁМ ведённым дням — даже когда
  // сработало правило сна (например, ведено 2 дня и 3 короткие ночи:
  // подсказка про сон, а не про белок по двум дням)
  const enoughFood = led.length >= 3
  const pLow =
    enoughFood &&
    norms.p > 0 && last3.every((r) => Number(r.p) < norms.p * 0.8)
  const kcalOver =
    enoughFood && norms.kcal > 0 && last3.every((r) => Number(r.kcal) > norms.kcal * 1.15)
  const waterLow =
    enoughFood &&
    norms.waterMl > 0 && last3.every((r) => Number(r.waterMl) < norms.waterMl * 0.5)
  const kcalLow =
    enoughFood &&
    norms.kcal > 0 && last3.every((r) => Number(r.kcal) > 0 && Number(r.kcal) < norms.kcal * 0.7)
  const fibLow =
    enoughFood &&
    norms.fib > 0 && last3.every((r) => Number(r.fib) < norms.fib * 0.6)

  // «Цель ниже привычной калорийности»: каждый из 3 дней выше цели и
  // в среднем на 25%+ (пример Кати: цель 1200, съедено ~1725 три дня
  // подряд — строгий остаток всегда красный). Это не про дисциплину —
  // это про саму цель: честнее её пересобрать, чем каждый день видеть
  // перебор. Среднее за 3 дня, а не каждый день ≥25%: один спокойный
  // день перебора не отменяет того, что привычка выше цели
  const avgKcal = last3.reduce((s, r) => s + (Number(r.kcal) || 0), 0) / last3.length
  const goalBelowHabit =
    enoughFood &&
    norms.kcal > 0 &&
    last3.every((r) => Number(r.kcal) > norms.kcal) &&
    avgKcal >= norms.kcal * 1.25

  if (pLow) {
    return weightStands(weights)
      ? {
          id: 'protein-low-stall',
          title: 'Мало белка — и вес стоит',
          text: `Уже 3 ${THREE_DAYS_WORD} белка меньше нормы, а вес не двигается. Белок держит сытость и мышцы: добавьте творог, яйца, рыбу или курицу — и вес снова сдвинется.`,
        }
      : {
          id: 'protein-low',
          title: 'Мало белка',
          text: `Белка ниже нормы 3 ${THREE_DAYS_WORD} подряд. Добавьте творог, яйца, рыбу или бобовые — белок держит сытость и помогает весу уходить.`,
        }
  }
  if (sleepLow) {
    const goalH = Math.round((sleepGoalMin / 60) * 10) / 10
    return weightStands(weights)
      ? {
          id: 'sleep-low-stall',
          title: 'Мало сна — и вес стоит',
          text: `3 ночи подряд короче ${goalH} ч, а вес не двигается. Недосып усиливает аппетит и тормозит вес: сегодня лечь пораньше — и организм скажет спасибо.`,
        }
      : {
          id: 'sleep-low',
          title: 'Мало сна',
          text: `3 ночи подряд короче ${goalH} ч. Недосып усиливает голод и подтачивает силы: попробуйте сегодня лечь на час раньше — цель 7–8 часов.`,
        }
  }
  if (goalBelowHabit) {
    // Мягкая подсказка (отзыв Кати): без «сделайте легче» — дело в цели,
    // а не в дне; цель пересобирается в калькуляторе на вкладке «Тело»
    return {
      id: 'goal-below-habit',
      title: 'Может, цель слишком низкая?',
      text: `Уже 3 ${THREE_DAYS_WORD} подряд съедено заметно больше цели — похоже, цель ниже вашей обычной калорийности. Пересоберите её в калькуляторе на вкладке «Тело»: честная цель полезнее ежедневного красного перебора.`,
    }
  }
  if (kcalOver) {
    return {
      id: 'kcal-over',
      title: 'Калории выше цели',
      text: `3 ${THREE_DAYS_WORD} подряд выше цели больше чем на 15%. Сегодня сделайте легче: овощи и белок вместо сладкого — и дневник снова позеленеет.`,
    }
  }
  if (waterLow) {
    return {
      id: 'water-low',
      title: 'Мало воды',
      text: `Воды меньше половины нормы уже 3 ${THREE_DAYS_WORD}. Стакан воды перед каждым приёмом пищи — и норма наберётся незаметно.`,
    }
  }
  if (kcalLow) {
    return {
      id: 'kcal-low',
      title: 'Слишком мало калорий',
      text: `Калории сильно ниже цели 3 ${THREE_DAYS_WORD} подряд. На голодном пайке вес останавливается: добавьте сытный завтрак и не урезайте белок.`,
    }
  }
  if (fibLow) {
    return {
      id: 'fib-low',
      title: 'Мало клетчатки',
      text: `Клетчатки ниже нормы 3 ${THREE_DAYS_WORD} подряд. Овощи, ягоды и цельнозерновое — и пищеварение скажет спасибо.`,
    }
  }
  return null
}

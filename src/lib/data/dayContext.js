// Особый день: тип (менструация / командировка / праздник) и пересчитанная
// норма калорий. Ответ на отзыв Кати: «менструальный календарь добавили,
// чтобы корректировать калории, но это нигде не фиксируется; так же можно
// выбрать командировки и праздники — в этот день делать перерасчёт».
// Как работает:
//  1. Ручная метка дня (командировка/праздник/менструация) — сильнее всего,
//     ставится с Главной (чип «Особый день» в «Съедено за сегодня»).
//  2. Без ручной метки дни менструации выводятся из трекера цикла
//     автоматически (включён в «Ещё → Цикл»): начало + первые bleed дней,
//     как в бейдже фазы на Главной.
//  3. Норма особого дня = базовая цель + прибавка типа (настройки прибавок —
//     «Ещё → Дневник питания → Особые дни»). От пересчитанной нормы живут
//     остаток и кольца сводки, «из N ккал», БЖУ-тарелка и «Цель: N/7 дн»
//     в отчётах — перерасчёт везде один и тот же (kcalWithDayMark).

import { bleedDayKeys } from '@/store/useCycleStore'

// Витрина типов: эмодзи, название, цвет бейджа на Главной
export const DAY_TYPES = {
  cycle: { emoji: '🌙', label: 'Менструация', color: '#F472B6' },
  trip: { emoji: '✈️', label: 'Командировка', color: '#38BDF8' },
  holiday: { emoji: '🎉', label: 'Праздник', color: '#FBBF24' },
}

export function normalizeType(t) {
  return DAY_TYPES[t] ? t : null
}

// Чистая функция: метка дня { type, delta, auto } или null.
// ctx — { marks, deltas } из useDayTypesStore; cycle — снимок useCycleStore
// { enabled, lastStart, length, bleed, history } (может быть null).
// Ручная метка всегда побеждает автопо циклу — на командировку в дни
// месячных пользователь сам решает, что важнее.
export function dayMark(dayKey, ctx, cycle = null) {
  if (!dayKey) return null
  const marks = (ctx && ctx.marks) || {}
  const deltas = (ctx && ctx.deltas) || {}
  const manual = normalizeType(marks[dayKey])
  if (manual) return { type: manual, delta: deltas[manual] || 0, auto: false }
  if (cycle && cycle.enabled && cycle.lastStart) {
    // В bleedDayKeys отдаём историю ПЛЮС текущий lastStart: он попадает
    // в history только со следующего отмеченного цикла
    const history = [...(cycle.history || [])]
    if (!history.some((r) => r && r.start === cycle.lastStart)) {
      history.unshift({ start: cycle.lastStart })
    }
    const keys = bleedDayKeys(history, cycle.length, cycle.bleed, dayKey, dayKey)
    if (keys.includes(dayKey)) {
      return { type: 'cycle', delta: deltas.cycle || 0, auto: true }
    }
  }
  return null
}

// Норма калорий дня с учётом особого дня: база + прибавка.
// База не задана (0) — возвращаем как есть (перерасчёт не от чего считать)
export function kcalWithDayMark(baseKcal, dayKey, ctx, cycle = null) {
  const base = Math.round(Number(baseKcal) || 0)
  if (!(base > 0)) return base
  const mark = dayMark(dayKey, ctx, cycle)
  return mark ? base + (mark.delta || 0) : base
}

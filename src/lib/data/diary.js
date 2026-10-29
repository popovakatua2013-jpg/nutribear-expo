// Помощники дневника питания: суммы калорий, БЖУ и пересчёт порции.

import { bjuSum, round1 } from './bju'

// Сумма калорий по приёму пищи
export function mealConsumed(entries, mealId) {
  return (entries[mealId] || []).reduce((sum, e) => sum + e.kcal, 0)
}

// Общая сумма калорий за день
export function totalConsumed(entries) {
  return Object.values(entries)
    .flat()
    .reduce((sum, e) => sum + e.kcal, 0)
}

// Суммарные белки/жиры/углеводы за день (по всем записям)
export function dayBju(entries) {
  return bjuSum(Object.values(entries).flat())
}

// Новая граммовка записи: ккал, БЖУ, клетчатка/сахар и витамины/
// минералы пересчитываются пропорционально. Возвращает исходный объект
// без изменений, если это другая запись (или запись без граммовки)
export function rescaleEntry(entry, entryId, newGrams) {
  if (entry.id !== entryId || !entry.grams) return entry
  const k = newGrams / entry.grams
  return {
    ...entry,
    grams: newGrams,
    kcal: Math.max(1, Math.round(entry.kcal * k)),
    p: round1((entry.p || 0) * k),
    f: round1((entry.f || 0) * k),
    c: round1((entry.c || 0) * k),
    fib: round1((entry.fib || 0) * k),
    sug: round1((entry.sug || 0) * k),
    fe: round1((entry.fe || 0) * k),
    ca: round1((entry.ca || 0) * k),
    k: round1((entry.k || 0) * k),
    mg: round1((entry.mg || 0) * k),
    vitc: round1((entry.vitc || 0) * k),
    vita: round1((entry.vita || 0) * k),
  }
}

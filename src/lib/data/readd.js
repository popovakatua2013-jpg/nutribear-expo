// Повторное добавление блюда из журнала (истории приёмов) или комбо.
// В журнале БЖУ хранятся на порцию — восстанавливаем «продукт» с
// значениями на 100 г, чтобы addEntry пересчитал всё корректно.

import { round1 } from './bju'

export function foodFromRow(row) {
  const g = row.grams > 0 ? row.grams : 0
  const k = g > 0 ? 100 / g : 0
  const per = (v) => round1((v || 0) * k)
  return {
    id: row.foodId || `recent-${row.id || Math.random().toString(36).slice(2, 8)}`,
    name: row.name,
    emoji: row.emoji,
    kcal: Math.round((row.kcal || 0) * k),
    p: per(row.p),
    f: per(row.f),
    c: per(row.c),
    fib: per(row.fib),
    sug: per(row.sug),
    fe: per(row.fe),
    ca: per(row.ca),
    k: per(row.k),
    mg: per(row.mg),
    vitc: per(row.vitc),
    vita: per(row.vita),
    mk: row.mk,
  }
}

// Добавить запись (из журнала/комбо) в приём пищи с той же граммовкой
export function readdRow(addEntry, mealId, row) {
  addEntry(mealId, {
    food: foodFromRow(row),
    grams: row.grams > 0 ? row.grams : 0,
    kcal: Math.max(1, Math.round(row.kcal || 0)),
    desc: row.desc,
  })
}

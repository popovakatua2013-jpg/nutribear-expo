// Повторное добавление блюда из журнала (истории приёмов) или комбо.
// В журнале БЖУ хранятся на порцию — восстанавливаем «продукт» с
// значениями на 100 г, чтобы addEntry пересчитал всё корректно.
// Восстановление идёт через buildFood (pick.js): записи с БЖУ по нулям
// (свои продукты, записанные одними калориями — отзыв Кати 21.11:
// «Селёдка не считает жиры и другие») при повторном добавлении тоже
// получают нутриенты — наследование от встроенного тёзки или оценка
// по калорийности, как при первом добавлении.

import { round1 } from './bju'
import { buildFood } from './pick'

export function foodFromRow(row) {
  const g = row.grams > 0 ? row.grams : 0
  const k = g > 0 ? 100 / g : 0
  const per = (v) => round1((v || 0) * k)
  const food = buildFood({
    id: row.foodId || `recent-${row.id || Math.random().toString(36).slice(2, 8)}`,
    name: row.name,
    emoji: row.emoji,
    kcal100: Math.round((row.kcal || 0) * k),
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
    defaultGrams: g > 0 ? g : 100,
    source: 'recent',
  })
  // mk из записи надёжнее пересчёта: у коротких порций витамины могли
  // округлиться до нуля, а факт «они известны» остался
  return { ...food, mk: row.mk != null ? row.mk : food.mk }
}

// Добавить запись (из журнала/комбо) в приём пищи с той же граммовкой.
// dayOff — «за какой день» (0 = сегодня, 1 = вчера), пробрасывается в стор.
// Комментарий (note) переносится: «Овсянка на воде» записывается снова
// со своим примечанием. Возвращает созданную запись (с её id) — чтобы
// тост мог предложить «Отменить» и убрать только что добавленное.
export function readdRow(addEntry, mealId, row, dayOff = 0) {
  return addEntry(
    mealId,
    {
      food: foodFromRow(row),
      grams: row.grams > 0 ? row.grams : 0,
      kcal: Math.max(1, Math.round(row.kcal || 0)),
      desc: row.desc,
      note: row.note,
    },
    dayOff
  )
}

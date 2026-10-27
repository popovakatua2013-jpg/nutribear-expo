// Экспорт дневника питания в CSV (Excel-совместимый) через
// системное окно «Поделиться» (файл можно сохранить куда угодно).

import { Share } from 'react-native'

const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`

const dateFmt = (iso) => {
  const [y, m, d] = String(iso || '').split('-')
  return y ? `${d}.${m}.${y}` : ''
}

// rows — записи истории [{day, time, mealId, name, grams, kcal, p, f, c}]
// mealName(id) — человекочитаемое название приёма пищи
export function buildCsv(rows, mealName) {
  const head = 'Дата;Время;Приём;Продукт;Граммы;Ккал;Белки;Жиры;Углеводы'
  const lines = rows.map((r) =>
    [
      dateFmt(r.day),
      r.time,
      mealName(r.mealId),
      r.name,
      r.grams,
      r.kcal,
      r.p != null ? r.p : '',
      r.f != null ? r.f : '',
      r.c != null ? r.c : '',
    ]
      .map(esc)
      .join(';')
  )
  return [head, ...lines].join('\r\n')
}

// «Поделиться» CSV-текстом: в системном меню есть «Сохранить в файл»
export async function shareCsv(filename, csv) {
  await Share.share({ title: filename, message: csv })
}

// Данные раздела «Отчёты»: итоги за период, сравнение с прошлым
// периодом и недельное сравнение показателей (шаги, калории, вода, опыт).
// Прошлые дни без записей считаются нулями — только реальные данные.

const FIELDS = ['steps', 'kcal', 'waterMl', 'xp']

function emptyTotals() {
  return { steps: 0, kcal: 0, waterMl: 0, xp: 0 }
}

function addRow(acc, row) {
  FIELDS.forEach((f) => {
    acc[f] += row[f] || 0
  })
}

// Итоги за `days` дней со сдвигом `offset` (offset=0 — текущий период,
// offset=days — предыдущий). Реальные данные есть только за сегодня.
export function periodTotals(days, offset, today) {
  const acc = emptyTotals()
  if (offset === 0 && today) {
    addRow(acc, today)
  }
  return acc
}

// Изменение в процентах: (текущий − прошлый) / прошлый
export function changePct(cur, prev) {
  if (!prev) return 0
  return Math.round(((cur - prev) / prev) * 100)
}

// 12450 -> «12,4 л», 14000 -> «14 л»
export function formatLiters(ml) {
  const l = (ml || 0) / 1000
  if (l >= 100) return `${Math.round(l)} л`
  return `${l.toFixed(1).replace('.', ',').replace(',0', '')} л`
}

// Недельные корзины для графика «Сравнение по неделям»: последние
// `weeks` недель, старые раньше. Текущая неделя — с реальным сегодня.
export function weeksComparison(weeks, today) {
  const out = []
  for (let w = weeks - 1; w >= 0; w--) {
    const bucket = emptyTotals()
    if (w === 0 && today) {
      addRow(bucket, today)
    }
    out.push({ label: `${weeks - w} нед`, ...bucket })
  }
  return out
}

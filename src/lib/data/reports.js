// Данные раздела «Отчёты»: итоги за период, сравнение с прошлым
// периодом и недельное сравнение показателей.
// Прошлые дни — из дневной истории (useHistoryStore), дни без
// записей считаются нулями — только реальные данные пользователя.
// Склейку «история + живое сегодня» берём из activity.js (dayRow) —
// раньше одна и та же логика была написана здесь второй раз.

import { useHistoryStore } from '@/store/useHistoryStore'
import { dayRow } from './activity'

const FIELDS = ['steps', 'kcal', 'waterMl', 'burned', 'xp']

function emptyTotals() {
  return { steps: 0, kcal: 0, waterMl: 0, burned: 0, xp: 0 }
}

// Показатель дня `daysAgo` дней назад; для «сегодня» поверх истории
// подмешиваются живые значения из сторов (today)
function dayValue(daysAgo, today) {
  if (daysAgo === 0 && today) return dayRow(new Date(), today)
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return dayRow(d, null)
}

// Итоги за `days` дней со сдвигом `offset` (offset=0 — текущий период
// включая сегодня, offset=days — предыдущий период)
export function periodTotals(days, offset, today) {
  const acc = emptyTotals()
  for (let i = offset; i < offset + days; i++) {
    const row = dayValue(i, today)
    FIELDS.forEach((f) => {
      acc[f] += row[f] || 0
    })
  }
  return acc
}

// Изменение в процентах: (текущий − прошлый) / прошлый
export function changePct(cur, prev) {
  if (!prev) return 0
  return Math.round(((cur - prev) / prev) * 100)
}

// Цвет изменения: зелёный — «хорошо», красный — «плохо», серый — нет
// изменений. invert — когда рост плох (калории). Единая логика для
// карточек отчётов и панели недельного сравнения.
export function deltaTone(pct, invert, muted = '#7c87a8') {
  if (!pct) return muted
  const good = invert ? pct < 0 : pct > 0
  return good ? '#4ade80' : '#f87171'
}

// 12450 -> «12,5 л», 14000 -> «14 л»
export function formatLiters(ml) {
  const l = (ml || 0) / 1000
  if (l >= 100) return `${Math.round(l)} л`
  return `${l.toFixed(1).replace('.', ',').replace(',0', '')} л`
}

// Недельные корзины для графика «Сравнение по неделям»: последние
// `weeks` недель, старые раньше. Текущая неделя — с живым «сегодня».
export function weeksComparison(weeks, today) {
  const out = []
  for (let w = weeks - 1; w >= 0; w--) {
    const bucket = emptyTotals()
    for (let d = w * 7; d < w * 7 + 7; d++) {
      const row = dayValue(d, d === 0 ? today : null)
      FIELDS.forEach((f) => {
        bucket[f] += row[f] || 0
      })
    }
    out.push({ label: `${weeks - w} нед`, ...bucket })
  }
  return out
}

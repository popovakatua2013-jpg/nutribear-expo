// Данные раздела «Отчёты»: итоги за период, сравнение с прошлым
// периодом и недельное сравнение показателей.
// Прошлые дни — из дневной истории (useHistoryStore), дни без
// записей считаются нулями — только реальные данные пользователя.
// Склейку «история + живое сегодня» берём из activity.js (dayRow) —
// раньше одна и та же логика была написана здесь второй раз.

import { useHistoryStore, dayKeyOf } from '@/store/useHistoryStore'
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

// ===== Дисциплина, теплокарта, рекорды, нутриенты периода =====

// Дисциплина периода: сколько дней дневник вели (есть любая запись —
// шаги, еда, вода, тренировка) и сколько дней дневная цель достигнута.
// Калории считаются достигнутыми, когда еда записана и не выше цели —
// пустой день не «автоматически молодец», а честно не считается.
export function discipline(rows, goals) {
  const days = rows.length
  const recorded = rows.filter((r) => r.steps || r.kcal || r.waterMl || r.burned).length
  const g = goals || {}
  const met = {
    steps: g.steps > 0 ? rows.filter((r) => r.steps >= g.steps).length : 0,
    waterMl: g.waterMl > 0 ? rows.filter((r) => r.waterMl >= g.waterMl).length : 0,
    kcal: g.kcal > 0 ? rows.filter((r) => r.kcal > 0 && r.kcal <= g.kcal).length : 0,
  }
  return { days, recorded, met }
}

// Уровень дня для теплокарты: met — цель достигнута, mid — не меньше
// половины цели (для калорий — в пределах +15% сверх), low — записи были,
// но совсем мало, over — перебор калорий, none — день без записей.
// Цель не задана (0) — любой ненулевой день считается достигнутым.
export function dayLevel(key, value, goal) {
  if (!value || value <= 0) return 'none'
  if (key === 'kcal') {
    if (!(goal > 0)) return 'met'
    if (value <= goal) return 'met'
    if (value <= goal * 1.15) return 'mid'
    return 'over'
  }
  if (!(goal > 0)) return 'met'
  if (value >= goal) return 'met'
  if (value >= goal / 2) return 'mid'
  return 'low'
}

// Лучший день периода: максимум показателя по дням (0 — записей нет).
// Для «калорий» не показываем: есть больше всех — не достижение.
export function bestDay(rows, key) {
  return (rows || []).reduce((mx, r) => Math.max(mx, r[key] || 0), 0)
}

// День «с записями» — дневник хоть что-то фиксировал (та же честная
// проверка, что у дисциплины и стрика; нулевой показатель дня с
// едой/водой — не «простой», а честный ноль)
export function dayHasRecords(row) {
  return !!(row && (row.steps || row.kcal || row.waterMl || row.burned))
}

// Сжатый список «по дням» для истории показателя: дни с записями идут
// по одному, а подряд идущие дни без записей сворачиваются в один
// пролёт {type:'gap', from, to, count} — вместо десятка строк «нет
// записей» одна строка «нет записей · 7 авг – 27 авг».
// Сегодня (последняя строка) не прячется в пролёт: он всегда виден
// отдельной строкой, пусть даже «нет записей».
// Возвращает чередование {type:'day', row, index} и {type:'gap', …}.
export function compressDayRows(rows) {
  const segs = []
  let gap = null
  ;(rows || []).forEach((row, index) => {
    const isLast = index === (rows.length || 1) - 1
    if (dayHasRecords(row) || isLast) {
      if (gap) {
        segs.push(gap)
        gap = null
      }
      segs.push({ type: 'day', row, index })
    } else if (gap) {
      gap.to = row
      gap.count += 1
    } else {
      gap = { type: 'gap', from: row, to: row, count: 1 }
    }
  })
  if (gap) segs.push(gap)
  return segs
}

// Подпись пролёта без записей: один день — «нет записей · 4 ноя»,
// несколько — «нет записей · 7 авг – 27 авг»
export function gapLabel(from, to) {
  if (!from || !to || from.key === to.key) return `нет записей · ${from?.label || ''}`
  return `нет записей · ${from.label} – ${to.label}`
}

// Нутриенты по дням из журнала приёмов (useFoodStore.history — у записей
// есть день «ГГГГ-ММ-ДД» и БЖУ с клетчаткой). Старые записи без fib/sug
// считаются нулями — как в «Рейтинге питания».
export function nutrientsByDay(foodHistory) {
  const out = {}
  for (const e of foodHistory || []) {
    if (!e || typeof e.day !== 'string') continue
    const b = out[e.day] || (out[e.day] = { kcal: 0, p: 0, f: 0, c: 0, fib: 0 })
    b.kcal += e.kcal || 0
    b.p += e.p || 0
    b.f += e.f || 0
    b.c += e.c || 0
    b.fib += e.fib || 0
  }
  return out
}

// Итоги нутриентов за `days` дней со сдвигом `offset` (0 — текущий период,
// days — предыдущий). recorded — только дни, где еда действительно была:
// среднее делится на них, простои среднее не топят.
export function nutrientTotals(byDay, days, offset = 0) {
  const acc = { kcal: 0, p: 0, f: 0, c: 0, fib: 0, recorded: 0 }
  const now = new Date()
  for (let i = offset; i < offset + days; i++) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const row = byDay[dayKeyOf(d)]
    if (row && (row.kcal > 0 || row.p > 0 || row.f > 0 || row.c > 0 || row.fib > 0)) {
      acc.recorded += 1
      acc.kcal += row.kcal
      acc.p += row.p
      acc.f += row.f
      acc.c += row.c
      acc.fib += row.fib
    }
  }
  return acc
}

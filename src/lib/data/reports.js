// Данные раздела «Отчёты»: итоги за период, сравнение с прошлым
// периодом и недельное сравнение показателей.
// Прошлые дни — из дневной истории (useHistoryStore), дни без
// записей считаются нулями — только реальные данные пользователя.
// Склейку «история + живое сегодня» берём из activity.js (dayRow) —
// раньше одна и та же логика была написана здесь второй раз.

import { useHistoryStore, dayKeyOf } from '@/store/useHistoryStore'
import { dayRow } from './activity'

const FIELDS = ['steps', 'kcal', 'waterMl', 'burned', 'xp', 'sleepMin']

function emptyTotals() {
  return { steps: 0, kcal: 0, waterMl: 0, burned: 0, xp: 0, sleepMin: 0 }
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
// шаги, еда, вода, тренировка, сон) и сколько дней дневная цель достигнута.
// Калории считаются достигнутыми, когда еда записана и не выше цели —
// пустой день не «автоматически молодец», а честно не считается.
// Сожжённые — от цели burnKcal (отзыв Кати: в карточке «Сожжено»
// футер с целью был пуст — цели не считались вовсе)
export function discipline(rows, goals) {
  const days = rows.length
  const recorded = rows.filter((r) => r.steps || r.kcal || r.waterMl || r.burned || r.sleepMin).length
  const g = goals || {}
  const met = {
    steps: g.steps > 0 ? rows.filter((r) => r.steps >= g.steps).length : 0,
    waterMl: g.waterMl > 0 ? rows.filter((r) => r.waterMl >= g.waterMl).length : 0,
    kcal: g.kcal > 0 ? rows.filter((r) => r.kcal > 0 && r.kcal <= g.kcal).length : 0,
    burned: g.burnKcal > 0 ? rows.filter((r) => r.burned >= g.burnKcal).length : 0,
  }
  return { days, recorded, met }
}

// Сколько дней пользователь ведёт дневник: от ПЕРВОЙ записи в истории
// до сегодняшнего дня включительно. Основа «разблокировки» периодов
// (отзыв Кати: «зачем динамика за 90 дней, если он ещё только на 7 дне»):
// 30 дней открываются на 30-й день ведения дневника, 90 — на 90-й.
// Записей нет — считаем первым днём сегодняшний (пользователь в начале пути).
export function diaryAgeDays(savedDays, now = new Date()) {
  const keys = Object.keys(savedDays || {})
    .filter((k) => /^\d{4}-\d{2}-\d{2}$/.test(k))
    .sort()
  const first = keys.length ? new Date(`${keys[0]}T00:00:00`) : now
  if (Number.isNaN(first.getTime())) return 1
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.max(1, Math.round((today - first) / 86400000) + 1)
}

// Замок периода. Неделя ОТКРЫТА ВСЕГДА (отзыв Кати: на первых 7 днях
// замок на вкладке «7 дней» выглядел как поломка — базовый вид должен
// работать с первого дня), под замком только 30/90 — пока дневник не
// дожил до этих дней. Одна функция на все места: пилюли «Отчётов»,
// окна истории и чипы «Графика веса».
export function periodLocked(days, diaryAge) {
  return days > 7 && days > diaryAge
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

// Топ дней периода по показателю — для списка «Лучшие дни» в окне
// истории. Пустые дни не участвуют; равные значения сохраняют
// хронологический порядок (сортировка стабильна): раньше — выше.
export function bestDays(rows, key, n = 3) {
  return (rows || [])
    .map((r) => ({ row: r, value: r[key] || 0 }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, n)
}

// Среднее за день по показателю — для карточки «В среднем за день»
// в окне истории. Делится только на дни, которые велись (dayHasRecords):
// простои среднее не топят, а ноль в ведённый день — честный ноль
// (та же философия, что у nutrientTotals и дисциплины).
export function dailyAverage(rows, key) {
  const kept = (rows || []).filter(dayHasRecords)
  if (!kept.length) return 0
  const sum = kept.reduce((acc, r) => acc + (r[key] || 0), 0)
  return Math.round(sum / kept.length)
}

// Сетка точечной теплокарты «по дням недели» (окно истории): столбцы
// Пн…Вс, строки — недели периода, старшая сверху. Начало дополняется
// пустыми клетками до понедельника, конец — до полной недели.
// День недели берётся из ключа «ГГГГ-ММ-ДД», поэтому функция чистая.
export function weekdayMatrix(rows) {
  const list = rows || []
  if (!list.length) return []
  const pad = (new Date(`${list[0].key}T00:00:00`).getDay() + 6) % 7
  const cells = [...Array.from({ length: pad }, () => null), ...list]
  while (cells.length % 7 !== 0) cells.push(null)
  const grid = []
  for (let i = 0; i < cells.length; i += 7) grid.push(cells.slice(i, i + 7))
  return grid
}

// Подпись сравнения: с каким прошлым периодом сравниваем — общая
// для карточек-итогов и окна истории (раньше жила в ReportCards)
export function prevLabel(days) {
  if (days <= 7) return 'к прошлой неделе'
  if (days === 30) return 'к прошлому месяцу'
  return `к предыдущим ${days} дням`
}

// ===== Окно истории показателя: вес, «ближе к цели», дни недели =====

// Вес по дням: журнал взвешиваний (useProfileStore.weights — новые
// сверху, date — ISO) → карта «ГГГГ-ММ-ДД» → кг. Несколько взвешиваний
// за один день — в карте ПОСЛЕДНЕЕ (первое в массиве — оно новое).
// Переноса на соседние дни нет: где не взвешивалась — там пусто,
// честная история, а не разглаженная линия.
export function weightByDay(weights) {
  const out = {}
  for (const w of weights || []) {
    if (!w || !w.date || !(w.kg > 0)) continue
    const d = new Date(w.date)
    if (Number.isNaN(d.getTime())) continue
    const k = dayKeyOf(d)
    if (!out[k]) out[k] = Math.round(w.kg * 10) / 10
  }
  return out
}

// Дни периода, БЛИЖЕ ВСЕГО к цели по калориям — для блока «Ближе к цели»
// в окне истории: «лучший» день по максимуму калорий — это перебор,
// а вот минимальное отклонение от цели — аккуратный день. Пустые дни
// не участвуют; равное отклонение — раньше по хронологии выше.
export function closestToGoal(rows, key, goal, n = 3) {
  return (rows || [])
    .map((r) => ({ row: r, value: r[key] || 0, dev: Math.abs((r[key] || 0) - goal) }))
    .filter((d) => d.value > 0)
    .sort((a, b) => a.dev - b.dev || (a.row.key < b.row.key ? -1 : 1))
    .slice(0, n)
}

// Среднее по дням недели (Пн…Вс) за период — ряд точек в окне истории
// по макету пользователя: одна строка из семи точек вместо сетки недель.
// Делится только на ведённые дни (dayHasRecords) — та же философия,
// что у dailyAverage: простои среднее не топят. recorded — был ли
// у дня недели хотя бы один ведённый день.
export function weekdayAverages(rows, key) {
  const buckets = Array.from({ length: 7 }, () => ({ sum: 0, n: 0 }))
  for (const r of rows || []) {
    if (!dayHasRecords(r)) continue
    const wd = (new Date(`${r.key}T00:00:00`).getDay() + 6) % 7
    buckets[wd].sum += r[key] || 0
    buckets[wd].n += 1
  }
  return buckets.map((b) => ({ avg: b.n ? Math.round(b.sum / b.n) : 0, recorded: b.n > 0 }))
}

// День «с записями» — дневник хоть что-то фиксировал (та же честная
// проверка, что у дисциплины и стрика; нулевой показатель дня с
// едой/водой — не «простой», а честный ноль)
export function dayHasRecords(row) {
  return !!(row && (row.steps || row.kcal || row.waterMl || row.burned || row.sleepMin))
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

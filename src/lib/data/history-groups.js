// Группировка журнала приёмов по дням для карточки «История» в окне
// добавления еды (отзыв Кати 20.11: «нужно перенести историю» — у
// конкурента список ранее съеденного виден прямо из окна добавления).
// Журнал «новые сверху» — группы идут в порядке журнала, внутри дня
// порядок тоже сохраняется. Метки дней: «Сегодня», «Вчера»,
// «Позавчера», дальше «дд.мм.гггг» — как в полном окне «История приёмов».

import { dayKeyOf } from '@/store/useHistoryStore'

const DAY_MS = 86400000

// Ключ дня со сдвигом назад от todayKey: keyAgo(0) = сегодня,
// keyAgo(1) = вчера. todayKey парсится в местный полдень — сдвиг на
// сутки не прыгает через летнее время и границы месяца
function keyAgo(offsetDays, todayKey) {
  if (offsetDays === 0) return todayKey
  const d = new Date(`${todayKey}T12:00:00`)
  d.setDate(d.getDate() - offsetDays)
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

// Человекочитаемая метка дня журнала. todayKey — для тестов
export function dayLabelOf(key, todayKey = dayKeyOf()) {
  if (key === keyAgo(0, todayKey)) return 'Сегодня'
  if (key === keyAgo(1, todayKey)) return 'Вчера'
  if (key === keyAgo(2, todayKey)) return 'Позавчера'
  const [y, m, d] = String(key).split('-')
  return d && m ? `${d}.${m}.${y}` : String(key)
}

// Дневные группы журнала с лимитом строк: [{day, label, rows}]
export function historyGroups(history, limit = 20, todayKey = dayKeyOf()) {
  const groups = []
  let cur = null
  for (const row of (history || []).slice(0, limit)) {
    if (!cur || cur.day !== row.day) {
      cur = { day: row.day, label: dayLabelOf(row.day, todayKey), rows: [] }
      groups.push(cur)
    }
    cur.rows.push(row)
  }
  return groups
}

export { DAY_MS as HISTORY_DAY_MS }

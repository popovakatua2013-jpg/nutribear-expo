// Доступ к журналу приёмов по тарифу (задача Кати 23.11: «усилить
// Premium — неограниченная история»): бесплатно журнал показывает
// последние FREE_LIMITS.historyDays дней, Premium — всю историю.
//
// ВАЖНО: данные НЕ удаляются — режется только отображение (история в
// useFoodStore хранится как раньше, до лимита хранения 900 записей).
// После оплаты Premium вся история видна сразу, без восстановления.
// Файл чистый (без react-native) — тестируется в
// __tests__/premium-limits.test.js.

import { FREE_LIMITS } from '@/lib/entitlements'

const DAY_MS = 86400000

// Локальный ключ дня «ГГГГ-ММ-ДД» — тем же способом, что в
// useHistoryStore и модалке «История приёмов» (UTC не годится:
// записи после полуночи уезжали «во вчера»)
export function localDayKey(date) {
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`
}

// Граница бесплатного просмотра: ключ самого старого ВИДИМОГО дня.
// null — ограничения нет (Premium). Пример: historyDays=14, сегодня
// 2026-11-23 → граница 2026-11-10 (сегодня + 13 прошлых дней видно)
export function historyCutoffKey(now, pro) {
  if (pro) return null
  return localDayKey(new Date(now.getTime() - (FREE_LIMITS.historyDays - 1) * DAY_MS))
}

// Отфильтровать строки журнала по границе (r.day — «ГГГГ-ММ-ДД»).
// Строки без дня (битые записи) не прячем — пусть видны
export function filterHistoryByCutoff(rows, cutoff) {
  if (!cutoff) return rows
  return rows.filter((r) => !r.day || r.day >= cutoff)
}

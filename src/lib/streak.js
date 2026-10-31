// Стрик — сколько дней подряд пользователь ведёт дневник.
// День считается «живым», если в нём есть хоть что-то: еда, вода,
// шаги или тренировка (любая активность в дневной истории).
// Пустой СЕГОДНЯШНИЙ день стрик не рвёт — день ещё не закончился.
// Отдельный стор не нужен: считаем по истории (useHistoryStore.days),
// которая и так пишется с главного экрана и «Активности».

import { dayKeyOf } from '@/store/useHistoryStore'

function isLiveDay(row) {
  return Boolean(
    row &&
      ((row.kcal || 0) > 0 ||
        (row.waterMl || 0) > 0 ||
        (row.steps || 0) > 0 ||
        (row.burned || 0) > 0)
  )
}

// days — вся история: { '2026-10-24': { steps, kcal, waterMl, burned, xp } }
export function streakOf(days, today = new Date()) {
  if (!days) return 0
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  // Сегодня ещё пустой — начинаем со вчерашнего дня (не наказываем)
  if (!isLiveDay(days[dayKeyOf(d)])) d.setDate(d.getDate() - 1)
  let streak = 0
  for (let guard = 0; guard < 400; guard += 1) {
    if (!isLiveDay(days[dayKeyOf(d)])) break
    streak += 1
    d.setDate(d.getDate() - 1)
  }
  return streak
}

// 1 день / 2 дня / 5 дней — русские склонения для чипа
export function daysLabel(n) {
  const m10 = n % 10
  const m100 = n % 100
  if (m10 === 1 && m100 !== 11) return 'день'
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return 'дня'
  return 'дней'
}

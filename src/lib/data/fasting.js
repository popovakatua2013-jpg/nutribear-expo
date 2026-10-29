// Хелперы времени для таймера голодания.

export const two = (n) => String(n).padStart(2, '0')

// Миллисекунды → «5 ч 12 мин»
export function fmtH(ms) {
  const min = Math.max(0, Math.round(ms / 60000))
  return `${Math.floor(min / 60)} ч ${two(min % 60)} мин`
}

// Timestamp → «01:07» локального времени
export function fmtClock(ms) {
  const d = new Date(ms)
  return `${two(d.getHours())}:${two(d.getMinutes())}`
}

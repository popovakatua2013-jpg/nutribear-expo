// Форматирование чисел и дат (русская локаль)

// 2180 -> «2 180»
export function formatNum(n) {
  return Math.round(n || 0).toLocaleString('ru-RU')
}

// Подпись даты: «Сегодня, 22 октября»
export function todayLabel() {
  const now = new Date()
  const dayMonth = new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
  }).format(now)
  return `Сегодня, ${dayMonth}`
}

// Русское склонение дней: 1 день / 2 дня / 5 дней
export function pluralDays(n) {
  const m10 = Math.abs(Math.round(n)) % 10
  const m100 = Math.abs(Math.round(n)) % 100
  if (m10 === 1 && m100 !== 11) return 'день'
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return 'дня'
  return 'дней'
}

// Генерация простого id записи
export function makeId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

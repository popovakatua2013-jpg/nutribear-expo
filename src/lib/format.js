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

// Генерация простого id записи
export function makeId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

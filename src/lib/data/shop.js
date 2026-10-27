// Магазин наград: товары покупаются за монетки,
// которые зарабатываются за полезные действия в приложении.

export const SHOP_ITEMS = [
  { id: 'honey', emoji: '🍯', name: 'Банка мёда', desc: 'Любимое лакомство мишки', price: 30, tag: 'Еда' },
  { id: 'book', emoji: '📖', name: 'Книга рецептов', desc: '10 здоровых рецептов на каждый день', price: 100, tag: 'Бонус' },
  { id: 'scarf', emoji: '🧣', name: 'Тёплый шарф', desc: 'Для прогулок в прохладную погоду', price: 120, tag: 'Гардероб' },
  { id: 'cap', emoji: '🧢', name: 'Кепка', desc: 'Стильный аксессуар для пробежек', price: 150, tag: 'Гардероб' },
  { id: 'ball', emoji: '⚽', name: 'Футбольный мяч', desc: 'Активные игры на свежем воздухе', price: 180, tag: 'Спорт' },
  { id: 'rest', emoji: '🛌', name: 'Купон «Отдых»', desc: 'День без тренировок — и без угрызений', price: 200, tag: 'Купон' },
  { id: 'cheat', emoji: '🎟️', name: 'Купон «Читмил»', desc: 'Один свободный приём пищи', price: 250, tag: 'Купон' },
  { id: 'trophy', emoji: '🏆', name: 'Кубок финишёра', desc: 'Награда для настоящих чемпионов', price: 350, tag: 'Легенда' },
]

// Сколько монеток приносит каждое действие
export const EARN = {
  water: 2,   // стакан воды (250 мл)
  steps: 5,   // 1 000 шагов
  meal: 3,    // запись блюда в дневник
  weight: 10, // запись веса в разделе ИМТ
}

export const EARN_RULES = [
  { emoji: '💧', label: 'Стакан воды', coins: EARN.water },
  { emoji: '🚶', label: '1 000 шагов', coins: EARN.steps },
  { emoji: '🍽️', label: 'Блюдо в дневник', coins: EARN.meal },
  { emoji: '⚖️', label: 'Запись веса', coins: EARN.weight },
]

export function findItem(id) {
  return SHOP_ITEMS.find((i) => i.id === id)
}

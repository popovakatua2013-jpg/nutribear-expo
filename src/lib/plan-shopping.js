// «Из плана» → список покупок: собираем блюда недельного меню,
// одинаковые названия объединяем (каждая позиция в плане = 1 шт),
// категорию определяем по названию (как при ручном добавлении).
// Чистая функция — удобно тестировать; вызывается из экрана «Покупки».

import { MEAL_IDS } from '@/store/useMealPlanStore'
import { guessCategory, normName } from '@/store/useShoppingStore'

/** plan — объект недели из useMealPlanStore (plans[weekKey]) */
export function planToShopping(plan) {
  const byName = new Map()
  for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
    const day = plan?.[dayIdx]
    if (!day) continue
    for (const mealId of MEAL_IDS) {
      for (const it of day[mealId] || []) {
        const key = normName(it.name)
        if (!key) continue
        const cur = byName.get(key)
        if (cur) cur.qty += 1
        else byName.set(key, { name: it.name, qty: 1 })
      }
    }
  }
  return [...byName.values()].map((x) => ({ ...x, category: guessCategory(x.name) }))
}

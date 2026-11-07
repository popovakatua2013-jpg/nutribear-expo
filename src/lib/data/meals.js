// Приёмы пищи — как на макете: Завтрак, Обед, Ужин, Перекус/Полдник
// В Expo картинки подключаются через require()

export const MEALS = [
  {
    id: 'breakfast',
    name: 'Завтрак',
    image: require('../../../assets/images/breakfast.webp'),
    alt: 'Овсяная каша с ягодами',
  },
  {
    id: 'lunch',
    name: 'Обед',
    image: require('../../../assets/images/lunch.webp'),
    alt: 'Куриная грудка с овощами и рисом',
  },
  {
    id: 'dinner',
    name: 'Ужин',
    image: require('../../../assets/images/dinner.webp'),
    alt: 'Лосось с зелёной фасолью и овощами',
  },
  {
    id: 'snack',
    name: 'Перекус/Полдник',
    // короткое имя для узкой плитки на главной (MealCard)
    short: 'Перекус',
    image: require('../../../assets/images/snack.webp'),
    alt: 'Йогурт с ягодами и орехами',
  },
]

export const MEAL_IDS = MEALS.map((m) => m.id)

// Карточка своего перекуса («Перекус 2», «Перекус 3»…) для секций
// дневника: та же круглая картинка, что у «Перекус/Полдник», короткое
// имя равно полному — теперь каждый свой перекус виден ОТДЕЛЬНОЙ
// секцией (отзыв Кати: «все перекусы сохраняются в один»)
export function customMealCard(m) {
  return {
    id: m.id,
    name: m.name,
    short: m.name,
    image: require('../../../assets/images/snack.webp'),
  }
}

// Приём пищи по id: встроенный, свой перекус (если передан список) или
// завтрак как безопасный фолбэк — старые вызовы с одним аргументом
// работают как раньше
export function getMeal(mealId, customMeals = []) {
  const base = MEALS.find((m) => m.id === mealId)
  if (base) return base
  const custom = customMeals.find((m) => m.id === mealId)
  if (custom) return customMealCard(custom)
  return MEALS[0]
}

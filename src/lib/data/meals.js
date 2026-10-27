// Приёмы пищи — как на макете: Завтрак, Обед, Ужин, Перекус/Полдник
// В Expo картинки подключаются через require()

export const MEALS = [
  {
    id: 'breakfast',
    name: 'Завтрак',
    image: require('../../../assets/images/breakfast.jpg'),
    alt: 'Овсяная каша с ягодами',
  },
  {
    id: 'lunch',
    name: 'Обед',
    image: require('../../../assets/images/lunch.jpg'),
    alt: 'Куриная грудка с овощами и рисом',
  },
  {
    id: 'dinner',
    name: 'Ужин',
    image: require('../../../assets/images/dinner.jpg'),
    alt: 'Лосось с зелёной фасолью и овощами',
  },
  {
    id: 'snack',
    name: 'Перекус/Полдник',
    image: require('../../../assets/images/snack.jpg'),
    alt: 'Йогурт с ягодами и орехами',
  },
]

export const MEAL_IDS = MEALS.map((m) => m.id)

export function getMeal(mealId) {
  return MEALS.find((m) => m.id === mealId) || MEALS[0]
}

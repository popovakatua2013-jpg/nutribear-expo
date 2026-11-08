// Вкладка «План» (нижняя панель; маршрут /workouts сохранён, чтобы не
// ломать возможные ссылки). Раньше это была вкладка «Тренировки»:
// тренировочный контент полностью убран по решению Кати — тренировки
// живут блоком на «Главной», референсный модуль остался в
// features/workouts. Затем здесь были сегменты «Меню | Покупки», но
// «Покупки» вынесены в отдельную нижнюю вкладку (app/shopping.jsx) —
// теперь вкладка «План» целиком про питание: план на неделю
// (components/planner).

import { View } from 'react-native'
import { MealPlanScreen } from '@/components/planner/MealPlanScreen'
import { colors } from '@/features/workouts/theme'

export default function PlanTab() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <MealPlanScreen />
    </View>
  )
}

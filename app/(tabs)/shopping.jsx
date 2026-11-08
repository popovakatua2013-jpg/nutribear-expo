// Экран «Покупки» — отдельной вкладки в нижней панели больше нет
// (решение Кати): маршрут /shopping скрыт из панели (href: null) и
// открывается с карточки «Список покупок» на вкладке «План». Экран —
// ShoppingListScreen (components/planner): список по отделам магазина,
// количества, автодополнение из плана недели.

import { View } from 'react-native'
import { ShoppingListScreen } from '@/components/planner/ShoppingListScreen'
import { colors } from '@/features/workouts/theme'

export default function ShoppingTab() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ShoppingListScreen />
    </View>
  )
}

// Вкладка «Покупки» (нижняя панель) — вынесена из вкладки «План» по
// решению Кати: раньше список покупок был сегментом рядом с «Меню»,
// теперь до него один тап от любой точки приложения. Экран —
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

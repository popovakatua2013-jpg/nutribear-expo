// Экран «Покупки» — отдельная страница корневого стека (app/shopping.jsx
// вне группы (tabs)), открывается с карточки «Список покупок» на «Плане»
// (router.push) и возвращается кнопкой «‹ План».
// Почему не скрытая вкладка: раньше /shopping прятали из панели через
// href: null, но expo-router исключает такие экраны из linking — переход
// по маршруту падал на начальный («Главную»), что и увидела Катя.
// Внутри — ShoppingListScreen (components/planner): список по отделам
// магазина, количества, автодополнение из плана недели.

import { Pressable, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { ChevronLeft } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ShoppingListScreen } from '@/components/planner/ShoppingListScreen'
import { colors, spacing, F } from '@/features/workouts/theme'

export default function ShoppingPage() {
  const router = useRouter()
  const insets = useSafeAreaInsets()

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      {/* Кнопка «назад» — в стиле возврата «‹ План» у интервального питания */}
      <Pressable
        onPress={() => router.back()}
        style={styles.back}
        accessibilityRole="button"
        accessibilityLabel="Назад к плану"
      >
        <ChevronLeft size={18} color={colors.accent} />
        <Text style={styles.backText}>План</Text>
      </Pressable>
      <ShoppingListScreen />
    </View>
  )
}

const styles = {
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginHorizontal: spacing.xl,
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  backText: { fontSize: 14, fontWeight: '700', fontFamily: F[700], color: colors.accent },
}

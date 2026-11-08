// Вкладка «План» (нижняя панель; маршрут /workouts сохранён, чтобы не
// ломать возможные ссылки). По макетам Кати вкладка стала обзором
// питания одним экраном (PlanScreen): цели, прогресс дня, динамика
// недели, меню на неделю, покупки и голодание. Раньше здесь были
// сегменты «Меню | Голодание» — теперь полный экран интервального
// голодания открывается с карточки «Голодание» и возвращается кнопкой
// «‹ План». Тренировки живут блоком на «Главной»; «Покупки» —
// экран с карточки на «Плане», из нижней панели убраны (решение Кати).

import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { ChevronLeft } from 'lucide-react-native'
import { PlanScreen } from '@/components/planner/PlanScreen'
import { FastingScreen } from '@/components/planner/FastingScreen'
import { colors, spacing, F } from '@/features/workouts/theme'

export default function PlanTab() {
  const [screen, setScreen] = useState('plan') // 'plan' | 'fasting'

  if (screen === 'fasting') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <Pressable
          onPress={() => setScreen('plan')}
          style={styles.back}
          accessibilityRole="button"
          accessibilityLabel="Назад к обзору плана"
        >
          <ChevronLeft size={18} color={colors.accent} />
          <Text style={styles.backText}>План</Text>
        </Pressable>
        <FastingScreen />
      </View>
    )
  }

  return <PlanScreen onOpenFasting={() => setScreen('fasting')} />
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

// Вкладка «План» (нижняя панель; маршрут /workouts сохранён, чтобы не
// ломать возможные ссылки). По макетам Кати вкладка стала обзором
// питания одним экраном (PlanScreen): цели, прогресс дня, динамика
// недели, меню на неделю, покупки и интервальное питание. Полный экран
// интервального питания (название по просьбе Кати) открывается с
// карточки «Интервальное питание» ОКНОМ ПОВЕРХ ПЛАНА — отзыв Кати:
// «при нажатии на интервальное питание пропадает остальной план»
// (страница с покупками), раньше экран подменял собой всю вкладку и
// план терялся; теперь план остаётся на месте, окно закрывается
// крестиком (как все окна в приложении) и системной кнопкой «назад».
// Тренировки живут блоком на «Главной»; «Покупки» — отдельная страница
// app/shopping.jsx, из нижней панели убраны (Кати).

import { useState } from 'react'
import { Modal, Pressable, View } from 'react-native'
import { X } from 'lucide-react-native'
import { PlanScreen } from '@/components/planner/PlanScreen'
import { FastingScreen } from '@/components/planner/FastingScreen'
import { colors, spacing } from '@/features/workouts/theme'

export default function PlanTab() {
  const [fastOpen, setFastOpen] = useState(false)

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Обзор плана — всегда остаётся под окном голодания */}
      <PlanScreen onOpenFasting={() => setFastOpen(true)} />

      {/* Интервальное питание — окно поверх плана (план не пропадает) */}
      <Modal
        visible={fastOpen}
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setFastOpen(false)}
      >
        <View style={{ flex: 1, backgroundColor: colors.bg }}>
          <View style={styles.closeRow}>
            <Pressable
              onPress={() => setFastOpen(false)}
              style={styles.xbtn}
              accessibilityRole="button"
              accessibilityLabel="Закрыть интервальное питание"
              hitSlop={8}
            >
              <X size={20} color={colors.text2} />
            </Pressable>
          </View>
          <FastingScreen />
        </View>
      </Modal>
    </View>
  )
}

const styles = {
  closeRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.xl,
    paddingTop: 12,
  },
  xbtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
}

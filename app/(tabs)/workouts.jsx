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
// Крестик — под статус-баром (insets.top): Modal statusBarTranslucent
// рисует контент с нулевой координаты, без отступа кнопка уезжала
// В САМ статус-бар и ложилась на индикатор батареи (отзыв Кати 09.11).
// Окно открывается и тапом по пушу «цель голодания достигнута»
// (reminders.js → navEvents.requestOpenFasting): двойной механизм —
// живое событие для смонтированной вкладки + отложенный флаг,
// который вкладка забирает первым маунтом (открытие приложения по
// пушу, когда вкладка ещё лениво не смонтирована).
// Тренировки живут блоком на «Главной»; «Покупки» — отдельная страница
// app/shopping.jsx, из нижней панели убраны (Кати).

import { useEffect, useState } from 'react'
import { DeviceEventEmitter, Modal, Pressable, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { X } from 'lucide-react-native'
import { PlanScreen } from '@/components/planner/PlanScreen'
import { FastingScreen } from '@/components/planner/FastingScreen'
import { spacing } from '@/features/workouts/theme'
// Фон вкладки и окна голодания — палитра приложения (planPalette):
// вкладка «План» одного цвета с остальным приложением (просьба Кати 09.11),
// раньше здесь был фон design-системы «Тренировок» (#0A0C10).
// Правка Кати 25.11 («вкладка план полностью не в теме»): палитра
// строится из АКТИВНОЙ ТЕМЫ (usePlanPalette) — раньше всегда были
// цвета «Классики»
import { usePlanPalette } from '@/components/planner/planPalette'
import { AiChat } from '@/components/home/AiChat'
import { consumeOpenFasting } from '@/lib/navEvents'

export default function PlanTab() {
  const { P } = usePlanPalette()
  const [fastOpen, setFastOpen] = useState(false)
  const insets = useSafeAreaInsets()
  const closeRowStyle = [styles.closeRow, { paddingTop: insets.top + 6 }]

  // Пуш «цель голодания достигнута»: открыть окно интервального
  // питания. consumeOpenFasting — случай, когда вкладку смонтировали
  // ПОСЛЕ тапа по пушу (флаг переживает ленивый маунт)
  useEffect(() => {
    if (consumeOpenFasting()) setFastOpen(true)
    const sub = DeviceEventEmitter.addListener('nutribear/open-fasting', () =>
      setFastOpen(true)
    )
    return () => sub.remove()
  }, [])

  return (
    <View style={{ flex: 1, backgroundColor: P.bg }}>
      {/* Обзор плана — всегда остаётся под окном голодания */}
      <PlanScreen onOpenFasting={() => setFastOpen(true)} />

      {/* Интервальное питание — окно поверх плана (план не пропадает) */}
      <Modal
        visible={fastOpen}
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setFastOpen(false)}
      >
        <View style={{ flex: 1, backgroundColor: P.bg }}>
          <View style={closeRowStyle}>
            <Pressable
              onPress={() => setFastOpen(false)}
              style={styles.xbtn}
              accessibilityRole="button"
              accessibilityLabel="Закрыть интервальное питание"
              hitSlop={8}
            >
              <X size={20} color={P.text2} />
            </Pressable>
          </View>
          <FastingScreen />
        </View>
      </Modal>

      {/* Конвертик ИИ-чата — на всех вкладках (просьба Кати от 11.11) */}
      <AiChat />
    </View>
  )
}

const styles = {
  closeRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.xl,
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

// Вкладка «План» (нижняя панель; маршрут /workouts сохранён, чтобы не
// ломать возможные ссылки). Раньше это была вкладка «Тренировки» —
// тренировочный контент убран по решению Кати: тренировки живут блоком
// на «Главной», референсный модуль остался в features/workouts. Затем
// здесь были «Меню | Покупки», но «Покупки» уехали в отдельную вкладку —
// теперь переключатель «Меню | Голодание»: план питания на неделю и
// интервальное голодание (components/planner).

import { useState } from 'react'
import { Text, View } from 'react-native'
import { PressableScale } from '@/features/workouts/components/PressableScale'
import { MealPlanScreen } from '@/components/planner/MealPlanScreen'
import { FastingScreen } from '@/components/planner/FastingScreen'
import { usePrefsStore } from '@/features/workouts/store/useWorkoutsStore'
import { colors, spacing, F } from '@/features/workouts/theme'

export default function PlanTab() {
  const lang = usePrefsStore((s) => s.lang)
  const [screen, setScreen] = useState('menu') // 'menu' | 'fasting'

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Сегменты «Меню / Голодание» — один таб, два экрана */}
      <View style={styles.segWrap}>
        {[
          ['menu', lang === 'ru' ? 'Меню' : 'Menu'],
          ['fasting', lang === 'ru' ? 'Голодание' : 'Fasting'],
        ].map(([id, label]) => {
          const active = screen === id
          return (
            <PressableScale
              key={id}
              onPress={() => setScreen(id)}
              style={[styles.seg, active && styles.segActive]}
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.segText, active && styles.segTextActive]}>
                {label}
              </Text>
            </PressableScale>
          )
        })}
      </View>

      {screen === 'menu' ? <MealPlanScreen /> : <FastingScreen />}
    </View>
  )
}

const styles = {
  segWrap: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 999,
    padding: 4,
    marginHorizontal: spacing.xl,
    marginTop: 10,
  },
  seg: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 999,
    alignItems: 'center',
  },
  segActive: { backgroundColor: colors.accent },
  segText: { fontSize: 13, fontWeight: '700', fontFamily: F[700], color: colors.text2 },
  segTextActive: { color: colors.accentInk },
}

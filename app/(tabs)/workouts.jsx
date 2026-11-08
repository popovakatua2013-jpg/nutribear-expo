// Вкладка «План» (нижняя панель; маршрут /workouts сохранён, чтобы не
// ломать возможные ссылки). Раньше это была вкладка «Тренировки»:
// программы, поиск, «Рекомендуем», каталог, плеер и «Прогресс»
// полностью убраны по решению Кати — тренировки живут блоком на
// «Главной» (каталог активностей + запись вручную). Здесь два
// планировочных экрана: «Меню» — план питания на неделю, «Покупки» —
// список для магазина (components/planner). Референсный модуль
// тренировок остался в features/workouts — для отдельной страницы.

import { useState } from 'react'
import { Text, View } from 'react-native'
import { PressableScale } from '@/features/workouts/components/PressableScale'
import { MealPlanScreen } from '@/components/planner/MealPlanScreen'
import { ShoppingListScreen } from '@/components/planner/ShoppingListScreen'
import { usePrefsStore } from '@/features/workouts/store/useWorkoutsStore'
import { colors, spacing, F } from '@/features/workouts/theme'

export default function WorkoutsTab() {
  const lang = usePrefsStore((s) => s.lang)
  const [screen, setScreen] = useState('menu') // 'menu' | 'shopping'

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Сегменты «Меню / Покупки» — один таб, два экрана */}
      <View style={styles.segWrap}>
        {[
          ['menu', lang === 'ru' ? 'Меню' : 'Menu'],
          ['shopping', lang === 'ru' ? 'Покупки' : 'Shopping'],
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

      {screen === 'menu' ? <MealPlanScreen /> : <ShoppingListScreen />}
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

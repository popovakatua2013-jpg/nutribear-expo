// Вкладка «Тренировки»: прежний блок тренировок с «Главной» — каталог
// активностей (ходьба, бег, велосипед, плавание и т.д.), ручная запись
// (вид, время, калории — пустые считаются по MET), неделя к норме ВОЗ,
// серия и динамика. По просьбе Кати блок вернулся отдельным экраном
// на время, пока не начнём делать страницу тренировок в отдельной
// вкладке; референсный каталог/прогресс/плеер (features/workouts/screens)
// остаются в репозитории, но во вкладке не показаны. Тап по пинку о
// тренировке по-прежнему открывает эту вкладку (reminders.js →
// router.navigate('/workouts')).

import { ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ExerciseSection } from '@/components/activity/ExerciseSection'

export default function WorkoutsTab() {
  const insets = useSafeAreaInsets()
  return (
    <View className="flex-1 bg-bear-bg">
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingHorizontal: 16,
          gap: 16,
          paddingBottom: 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Тот же блок, что жил на «Главной»: своя карточка, шапка с
            мини-кольцом недели, записи, форма добавления и динамика */}
        <ExerciseSection />
      </ScrollView>
    </View>
  )
}

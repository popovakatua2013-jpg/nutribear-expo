// Экран «Активность»: календарь (перенесён с главной), баннер с мишкой,
// закономерности (перенесены с главной), общая сводка, тренировки и отчёты.
// Карточки показателей (шаги, калории, вода, активность) перенесены на главную.
// Все показатели дня автоматически пишутся в историю (useHistoryStore) —
// поэтому графики и отчёты видят реальные данные за прошедшие дни.

import { useEffect } from 'react'
import { ScrollView, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { HomeCalendar } from '@/components/home/HomeCalendar'
import { HomeInsights } from '@/components/home/HomeInsights'
import { MotivationBanner } from '@/components/activity/MotivationBanner'
import { SummarySection } from '@/components/activity/SummarySection'
import { ExerciseSection } from '@/components/activity/ExerciseSection'
import { ReportsSection } from '@/components/activity/reports/ReportsSection'
import { useActivityStore } from '@/store/useActivityStore'
import { useExerciseStore } from '@/store/useExerciseStore'
import { useHistoryStore, dayKeyOf } from '@/store/useHistoryStore'
import { useFoodStore } from '@/store/useFoodStore'
import { totalConsumed } from '@/lib/data/diary'
import { dayBurned } from '@/store/useExerciseStore'
import { WATER_GLASS } from '@/lib/data/activity'

export default function ActivityScreen() {
  const insets = useSafeAreaInsets()

  const waterMl = useActivityStore((s) => s.waterMl)
  const extraSteps = useActivityStore((s) => s.extraSteps)
  const exLogs = useExerciseStore((s) => s.logs)
  const recordToday = useHistoryStore((s) => s.record)
  const entries = useFoodStore((s) => s.entries)

  // Шаги за сегодня — только реально добавленные пользователем
  const steps = extraSteps
  const kcal = totalConsumed(entries)
  const burned = dayBurned(exLogs, dayKeyOf()) // тренировки за сегодня
  const glasses = Math.round(waterMl / WATER_GLASS)
  const mealCount = Object.values(entries).flat().length
  // Опыт: шаги + стаканы воды + приёмы пищи + тренировки (1 ккал ≈ 0.1 опыта)
  const xp =
    Math.round(steps / 500) * 2 + glasses * 5 + mealCount * 10 + Math.round(burned / 10)

  // Пишем день в историю — графики и отчёты строятся по этим данным
  useEffect(() => {
    recordToday(dayKeyOf(), { steps, kcal, waterMl, burned, xp })
  }, [steps, kcal, waterMl, burned, xp, recordToday])

  const today = { steps, kcal, waterMl, burned, xp }

  return (
    <View className="flex-1 bg-bear-bg">
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingHorizontal: 16,
          gap: 20,
          paddingBottom: 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="font-extrabold text-[19px] tracking-tight text-bear-text">
          Активность
        </Text>

        {/* Календарь: строка недели / полный месяц (перенесён с главной) */}
        <HomeCalendar />

        <MotivationBanner />

        {/* Закономерности: мишка подмечает связи в данных (перенесено с главной) */}
        <HomeInsights />

        <SummarySection today={today} />

        <ExerciseSection />

        <ReportsSection today={today} />

        <Text className="text-center font-sans text-[11px] leading-relaxed text-bear-dim">
          Шаги, вода и тренировки попадают в сводку и отчёты.
          {'\n'}
          Прошлые дни накапливаются сами, пока вы пользуетесь приложением.
        </Text>
      </ScrollView>
    </View>
  )
}

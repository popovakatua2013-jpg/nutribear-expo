// Экран «Активность»: баннер с мишкой, карточки показателей за сегодня
// (шаги, калории, опыт, вода), общая сводка, тренировки и отчёты.
// Все показатели дня автоматически пишутся в историю (useHistoryStore) —
// поэтому графики и отчёты видят реальные данные за прошедшие дни.

import { useEffect } from 'react'
import { ScrollView, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { MotivationBanner } from '@/components/activity/MotivationBanner'
import { ActivityStats } from '@/components/activity/ActivityStats'
import { SummarySection } from '@/components/activity/SummarySection'
import { ExerciseSection } from '@/components/activity/ExerciseSection'
import { ReportsSection } from '@/components/activity/reports/ReportsSection'
import { useActivityStore } from '@/store/useActivityStore'
import { useExerciseStore } from '@/store/useExerciseStore'
import { useHistoryStore, dayKeyOf } from '@/store/useHistoryStore'
import { useFoodStore } from '@/store/useFoodStore'
import { useGoalsStore } from '@/store/useGoalsStore'
import { totalConsumed } from '@/lib/data/diary'
import { dayBurned } from '@/store/useExerciseStore'
import { useToast } from '@/components/ui/Toast'
import { WATER_GLASS, KCAL_PER_STEP } from '@/lib/data/activity'

export default function ActivityScreen() {
  const insets = useSafeAreaInsets()
  const { toast } = useToast()

  const waterMl = useActivityStore((s) => s.waterMl)
  const extraSteps = useActivityStore((s) => s.extraSteps)
  const addWater = useActivityStore((s) => s.addWater)
  const addSteps = useActivityStore((s) => s.addSteps)
  const exLogs = useExerciseStore((s) => s.logs)
  const recordToday = useHistoryStore((s) => s.record)
  const entries = useFoodStore((s) => s.entries)
  const goals = useGoalsStore((s) => s.goals)

  // Шаги за сегодня — только реально добавленные пользователем
  const steps = extraSteps
  const kcal = totalConsumed(entries)
  const burned = dayBurned(exLogs, dayKeyOf()) // тренировки за сегодня
  const glasses = Math.round(waterMl / WATER_GLASS)
  const mealCount = Object.values(entries).flat().length
  // Опыт: шаги + стаканы воды + приёмы пищи + тренировки (1 ккал ≈ 0.1 опыта)
  const xp =
    Math.round(steps / 500) * 2 + glasses * 5 + mealCount * 10 + Math.round(burned / 10)
  const waterPct = Math.min(
    100,
    Math.round((waterMl / Math.max(1, goals.waterMl)) * 100)
  )

  // Пишем день в историю — графики и отчёты строятся по этим данным
  useEffect(() => {
    recordToday(dayKeyOf(), { steps, kcal, waterMl, burned, xp })
  }, [steps, kcal, waterMl, burned, xp, recordToday])

  function handleAddWater() {
    addWater(WATER_GLASS)
    toast({
      title: '💧 Стакан воды выпит!',
      description: `+${WATER_GLASS} мл · ${Math.min(
        100,
        Math.round(((waterMl + WATER_GLASS) / Math.max(1, goals.waterMl)) * 100)
      )}% нормы`,
    })
  }

  function handleAddSteps() {
    addSteps(1000)
    toast({
      title: '🚶 +1 000 шагов!',
      description: 'Маленькие шаги приводят к большим результатам',
    })
  }

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

        <MotivationBanner />

        <ActivityStats
          steps={steps}
          kcal={kcal}
          burned={burned}
          xp={xp}
          waterPct={waterPct}
          waterMl={waterMl}
          stepsGoal={goals.steps}
          waterGoalMl={goals.waterMl}
          onAddSteps={handleAddSteps}
          onAddWater={handleAddWater}
        />

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

// Главный экран: 4 карточки показателей дня (шаги, калории, активность,
// вода), сводка «Съедено за сегодня» над планом питания, приёмы пищи,
// голодание, цели, цитата. Календарь и «Закономерности» — на вкладке
// «Активность». Модалки: еда (хаб), все приёмы. Показатели дня пишутся
// в историю — для отчётов.

import { useCallback, useEffect, useState } from 'react'
import { ScrollView, View } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ActivityStats } from '@/components/activity/ActivityStats'
import { DailySummary } from '@/components/home/DailySummary'
import { MealPlanCard } from '@/components/home/MealPlanCard'
import { FastingCard } from '@/components/home/FastingCard'
import { GoalsCard } from '@/components/home/GoalsCard'
import { QuoteCard } from '@/components/home/QuoteCard'
import { AllMealsModal } from '@/components/home/AllMealsModal'
import { AddFoodModal } from '@/components/food/AddFoodModal'
import { AiChat } from '@/components/home/AiChat'
import { useFoodStore } from '@/store/useFoodStore'
import { useActivityStore } from '@/store/useActivityStore'
import { useExerciseStore, dayBurned } from '@/store/useExerciseStore'
import { useGoalsStore } from '@/store/useGoalsStore'
import { useOnboardingStore } from '@/store/useOnboardingStore'
import { useHistoryStore, dayKeyOf } from '@/store/useHistoryStore'
import { buildDashboard } from '@/lib/data/dashboard'
import { totalConsumed, dayBju } from '@/lib/data/diary'
import { WATER_GLASS } from '@/lib/data/activity'
import { useToast } from '@/components/ui/Toast'

export default function HomeScreen() {
  const insets = useSafeAreaInsets()
  const { toast } = useToast()
  const [addOpen, setAddOpen] = useState(false)
  const [allOpen, setAllOpen] = useState(false)
  const [mealId, setMealId] = useState('breakfast')

  const entries = useFoodStore((s) => s.entries)
  const removeEntry = useFoodStore((s) => s.removeEntry)
  const waterMl = useActivityStore((s) => s.waterMl)
  const extraSteps = useActivityStore((s) => s.extraSteps)
  const addWater = useActivityStore((s) => s.addWater)
  const addSteps = useActivityStore((s) => s.addSteps)
  const exLogs = useExerciseStore((s) => s.logs)
  const recordToday = useHistoryStore((s) => s.record)
  const goals = useGoalsStore((s) => s.goals)

  const d = buildDashboard({ hydrated: true, entries, waterMl, extraSteps, goals })
  const consumed = totalConsumed(entries)
  const day = dayBju(entries)
  const burned = dayBurned(exLogs, dayKeyOf()) // тренировки за сегодня
  const glasses = Math.round(waterMl / WATER_GLASS)
  const mealCount = Object.values(entries).flat().length
  // Опыт: шаги + стаканы воды + приёмы пищи + тренировки (1 ккал ≈ 0.1 опыта)
  const xp =
    Math.round(extraSteps / 500) * 2 + glasses * 5 + mealCount * 10 + Math.round(burned / 10)
  const waterPct = Math.min(
    100,
    Math.round((waterMl / Math.max(1, goals.waterMl)) * 100)
  )
  // Активность (минуты): ~100 шагов ≈ 1 минута ходьбы (как в dashboard.js)
  const minutes = Math.round(extraSteps / 100)
  const minutesPct = Math.min(
    100,
    Math.round((minutes / Math.max(1, goals.minutes)) * 100)
  )

  // Съеденное, вода и шаги за сегодня — в дневную историю (для отчётов)
  useEffect(() => {
    recordToday(dayKeyOf(), { kcal: consumed, waterMl, steps: extraSteps, burned, xp })
  }, [consumed, waterMl, extraSteps, burned, xp, recordToday])

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

  // Активация онбординга: «Добавить свой завтрак» — окно открытия блюда
  const openBreakfast = useOnboardingStore((s) => s.openBreakfast)
  const consumeOpenBreakfast = useOnboardingStore((s) => s.consumeOpenBreakfast)
  useEffect(() => {
    if (openBreakfast) {
      consumeOpenBreakfast()
      setMealId('breakfast')
      setAddOpen(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Уход с экрана закрывает модалки (иначе они висят над другими вкладками)
  useFocusEffect(
    useCallback(
      () => () => {
        setAddOpen(false)
        setAllOpen(false)
      },
      []
    )
  )

  function openAdd(id) {
    setMealId(id)
    setAddOpen(true)
  }

  return (
    <View className="flex-1 bg-bear-bg">
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 16, gap: 16, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* 4 карточки показателей дня: шаги, калории, активность, вода */}
        <ActivityStats
          steps={extraSteps}
          kcal={consumed}
          burned={burned}
          minutes={minutes}
          minutesGoal={goals.minutes}
          minutesPct={minutesPct}
          waterPct={waterPct}
          waterMl={waterMl}
          stepsGoal={goals.steps}
          waterGoalMl={goals.waterMl}
          onAddSteps={handleAddSteps}
          onAddWater={handleAddWater}
        />

        {/* Съедено за сегодня — сводка над планом питания */}
        <DailySummary consumed={consumed} target={goals.kcal} bju={day} />

        {/* План питания: 4 приёма пищи */}
        <MealPlanCard
          onAdd={openAdd}
          onRemove={removeEntry}
          onViewAll={() => setAllOpen(true)}
        />

        {/* Голодание и Ваши цели — по порядку на всю ширину */}
        <FastingCard />
        <GoalsCard d={d} />

        {/* Баннер-мотивация под «Вашими целями» */}
        <QuoteCard />
      </ScrollView>

      {/* Плавающий ИИ-чат, как в веб-версии */}
      <AiChat />

      <AddFoodModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        mealId={mealId}
        onMealIdChange={setMealId}
      />

      <AllMealsModal
        open={allOpen}
        onClose={() => setAllOpen(false)}
        kcal={goals.kcal}
        onAddToMeal={(id) => {
          setAllOpen(false)
          openAdd(id)
        }}
      />
    </View>
  )
}
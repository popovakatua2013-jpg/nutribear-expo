// Главный экран: мишка-герой, календарь, сводка, план питания,
// голодание, цели, цитата. Метрики (шаги, вода, активность) — на вкладке
// «Активность» (4 карточки), чтобы не дублировать числа. Модалки: еда (хаб),
// все приёмы. Показатели дня (еда, вода, шаги) пишутся в историю — для отчётов.

import { useCallback, useEffect, useState } from 'react'
import { ScrollView, View } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { DailySummary } from '@/components/home/DailySummary'
import { MealPlanCard } from '@/components/home/MealPlanCard'
import { HomeCalendar } from '@/components/home/HomeCalendar'
import { HomeInsights } from '@/components/home/HomeInsights'
import { FastingCard } from '@/components/home/FastingCard'
import { GoalsCard } from '@/components/home/GoalsCard'
import { QuoteCard } from '@/components/home/QuoteCard'
import { AllMealsModal } from '@/components/home/AllMealsModal'
import { AddFoodModal } from '@/components/food/AddFoodModal'
import { AiChat } from '@/components/home/AiChat'
import { useFoodStore } from '@/store/useFoodStore'
import { useActivityStore } from '@/store/useActivityStore'
import { useGoalsStore } from '@/store/useGoalsStore'
import { useOnboardingStore } from '@/store/useOnboardingStore'
import { useHistoryStore, dayKeyOf } from '@/store/useHistoryStore'
import { buildDashboard } from '@/lib/data/dashboard'
import { totalConsumed } from '@/lib/data/diary'

export default function HomeScreen() {
  const insets = useSafeAreaInsets()
  const [addOpen, setAddOpen] = useState(false)
  const [allOpen, setAllOpen] = useState(false)
  const [mealId, setMealId] = useState('breakfast')

  const entries = useFoodStore((s) => s.entries)
  const removeEntry = useFoodStore((s) => s.removeEntry)
  const waterMl = useActivityStore((s) => s.waterMl)
  const extraSteps = useActivityStore((s) => s.extraSteps)
  const recordToday = useHistoryStore((s) => s.record)
  const goals = useGoalsStore((s) => s.goals)

  const d = buildDashboard({ hydrated: true, entries, waterMl, extraSteps, goals })
  const consumed = totalConsumed(entries)

  // Съеденное, вода и шаги за сегодня — в дневную историю (для отчётов)
  useEffect(() => {
    recordToday(dayKeyOf(), { kcal: consumed, waterMl, steps: extraSteps })
  }, [consumed, waterMl, extraSteps, recordToday])

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
        {/* Календарь: месяц и дни недели (блок с медведем удалён по запросу) */}
        <HomeCalendar />

        {/* Закономерности: мишка подмечает связи в данных */}
        <HomeInsights />

        <DailySummary consumed={consumed} target={goals.kcal} />

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
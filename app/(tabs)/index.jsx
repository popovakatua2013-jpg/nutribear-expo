// Главный экран: мишка-герой, календарь, сводка, показатели, план питания,
// прогресс, голодание, цели, цитата. Модалки: еда (хаб), все приёмы, вода

import { useCallback, useEffect, useState } from 'react'
import { ScrollView, View } from 'react-native'
import { useFocusEffect, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { DailySummary } from '@/components/home/DailySummary'
import { HomeStats } from '@/components/home/HomeStats'
import { MealPlanCard } from '@/components/home/MealPlanCard'
import { HomeCalendar } from '@/components/home/HomeCalendar'
import { ProgressCard } from '@/components/home/ProgressCard'
import { FastingCard } from '@/components/home/FastingCard'
import { GoalsCard } from '@/components/home/GoalsCard'
import { QuoteCard } from '@/components/home/QuoteCard'
import { AllMealsModal } from '@/components/home/AllMealsModal'
import { WaterModal } from '@/components/home/WaterModal'
import { AddFoodModal } from '@/components/food/AddFoodModal'
import { AiChat } from '@/components/home/AiChat'
import { useFoodStore } from '@/store/useFoodStore'
import { useActivityStore } from '@/store/useActivityStore'
import { useGoalsStore } from '@/store/useGoalsStore'
import { useOnboardingStore } from '@/store/useOnboardingStore'
import { buildDashboard } from '@/lib/data/dashboard'
import { targetsFromKcal } from '@/lib/data/goals'
import { totalConsumed } from '@/lib/data/diary'

export default function HomeScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const [addOpen, setAddOpen] = useState(false)
  const [waterOpen, setWaterOpen] = useState(false)
  const [allOpen, setAllOpen] = useState(false)
  const [mealId, setMealId] = useState('breakfast')

  const goal = useFoodStore((s) => s.goal)
  const entries = useFoodStore((s) => s.entries)
  const removeEntry = useFoodStore((s) => s.removeEntry)
  const waterMl = useActivityStore((s) => s.waterMl)
  const extraSteps = useActivityStore((s) => s.extraSteps)
  const goals = useGoalsStore((s) => s.goals)

  const d = buildDashboard({ hydrated: true, entries, waterMl, extraSteps, goals })
  const targets = targetsFromKcal(goals.kcal)
  const consumed = totalConsumed(entries)

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
        setWaterOpen(false)
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

        <DailySummary consumed={consumed} target={goals.kcal} />

        <HomeStats
          d={d}
          onGoWater={() => setWaterOpen(true)}
          onGoMeals={() => openAdd('breakfast')}
          onGoActivity={() => router.navigate('/activity')}
        />

        <MealPlanCard
          onAdd={openAdd}
          onRemove={removeEntry}
          onViewAll={() => setAllOpen(true)}
        />

        <ProgressCard d={d} onGoAll={() => router.navigate('/activity')} />

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

      <WaterModal
        open={waterOpen}
        onClose={() => setWaterOpen(false)}
        goalMl={d.waterGoalMl}
        ml={d.ml}
      />
    </View>
  )
}

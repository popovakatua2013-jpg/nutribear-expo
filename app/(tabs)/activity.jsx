// Экран «Активность»: календарь (перенесён с главной), баннер с мишкой,
// закономерности (перенесены с главной), общая сводка, тренировки и отчёты.
// Карточки показателей (шаги, калории, вода, активность) перенесены на главную.
// Все показатели дня автоматически пишутся в историю (useHistoryStore) —
// поэтому графики и отчёты видят реальные данные за прошедшие дни.

import { useEffect } from 'react'
import { ScrollView, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Footprints } from 'lucide-react-native'
import { HomeCalendar } from '@/components/home/HomeCalendar'
import { HomeInsights } from '@/components/home/HomeInsights'
import { MotivationBanner } from '@/components/activity/MotivationBanner'
import { SummarySection } from '@/components/activity/SummarySection'
import { ExerciseSection } from '@/components/activity/ExerciseSection'
import { ReportsSection } from '@/components/activity/reports/ReportsSection'
import { useActivityStore, selectTotalSteps } from '@/store/useActivityStore'
import { useExerciseStore } from '@/store/useExerciseStore'
import { useHistoryStore, dayKeyOf } from '@/store/useHistoryStore'
import { useFoodStore } from '@/store/useFoodStore'
import { totalConsumed } from '@/lib/data/diary'
import { dayBurned } from '@/store/useExerciseStore'
import { WATER_GLASS } from '@/lib/data/activity'

export default function ActivityScreen() {
  const insets = useSafeAreaInsets()

  const waterMl = useActivityStore((s) => s.waterMl)
  const extraSteps = useActivityStore(selectTotalSteps) // датчик + ручные
  const exLogs = useExerciseStore((s) => s.logs)
  const recordToday = useHistoryStore((s) => s.record)
  const entries = useFoodStore((s) => s.entries)

  // Шаги за сегодня: датчик телефона (если включён) + ручные добавления
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
        {/* Шапка экрана: иконка-чип + заголовок + подзаголовок */}
        <View className="flex-row items-center gap-3">
          <View className="h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5">
            <Footprints size={19} color="#A78BFA" />
          </View>
          <View className="min-w-0 flex-1">
            <Text className="font-extrabold text-[19px] tracking-tight text-bear-text">
              Активность
            </Text>
            <Text maxFontSizeMultiplier={1.25} className="font-sans text-[11.5px] text-bear-dim">
              Шаги, вода и тренировки
            </Text>
          </View>
        </View>

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

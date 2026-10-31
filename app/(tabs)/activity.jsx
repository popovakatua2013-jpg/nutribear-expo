// Экран «Активность»: календарь (перенесён с главной), баннер с мишкой,
// закономерности (перенесены с главной), общая сводка, тренировки и отчёты.
// Карточки показателей (шаги, калории, вода, активность) перенесены на главную.
// Все показатели дня автоматически пишутся в историю (useHistoryStore) —
// поэтому графики и отчёты видят реальные данные за прошедшие дни.
// Период 7/30/90 выбирается один раз в «Общей сводке» и управляет
// и графиком, и «Отчётами» — раньше одинаковые переключатели
// дублировались в двух блоках.

import { useEffect, useState } from 'react'
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
import { useExerciseStore, totalBurned } from '@/store/useExerciseStore'
import { useHistoryStore, dayKeyOf } from '@/store/useHistoryStore'
import { useFoodStore } from '@/store/useFoodStore'
import { totalConsumed } from '@/lib/data/diary'
import { RANGES, WATER_GLASS, xpForDay } from '@/lib/data/activity'

export default function ActivityScreen() {
  const insets = useSafeAreaInsets()
  // Один период для «Общей сводки» и «Отчётов»
  const [rangeId, setRangeId] = useState('7d')
  const days = RANGES.find((r) => r.id === rangeId)?.days || 7

  const waterMl = useActivityStore((s) => s.waterMl)
  const extraSteps = useActivityStore(selectTotalSteps) // датчик + ручные
  const exLogs = useExerciseStore((s) => s.logs)
  const recordToday = useHistoryStore((s) => s.record)
  const entries = useFoodStore((s) => s.entries)

  // Шаги за сегодня: датчик телефона (если включён) + ручные добавления
  const steps = extraSteps
  const kcal = totalConsumed(entries)
  // Вся активность за сегодня: тренировки + шаги (≈0.04 ккал/шаг)
  const burned = totalBurned(exLogs, dayKeyOf(), steps)
  const mealCount = Object.values(entries).flat().length
  const xp = xpForDay({ steps, waterMl, mealCount, burned })

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

        <SummarySection today={today} rangeId={rangeId} onRangeChange={setRangeId} />

        <ExerciseSection />

        <ReportsSection today={today} days={days} />

        <Text className="text-center font-sans text-[11px] leading-relaxed text-bear-dim">
          Шаги, вода и тренировки попадают в сводку и отчёты.
          {'\n'}
          Прошлые дни накапливаются сами, пока вы пользуетесь приложением.
        </Text>
      </ScrollView>
    </View>
  )
}

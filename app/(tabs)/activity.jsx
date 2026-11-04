// Экран «Активность» (вкладка «Дневник»): баннер с мишкой и отчёты.
// Календарь и «Закономерности» удалены по решению, тренировки перенесены
// на «Главную»: здесь осталась аналитика — «Отчёты» с итогами, дисциплиной,
// панелью истории показателя (дни периода + календарь месяца, разворачивается
// тапом по карточке) и нутриентами. Все показатели дня автоматически пишутся
// в историю (useHistoryStore) — поэтому графики и отчёты видят реальные данные,
// где бы ни были записаны: на «Главной» или в «Отчётах».
// Период (7/30/90) выбирается пилюлями в шапке «Отчётов».

import { useEffect, useState } from 'react'
import { ScrollView, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Footprints } from 'lucide-react-native'
import { MotivationBanner } from '@/components/activity/MotivationBanner'
import { ReportsSection } from '@/components/activity/reports/ReportsSection'
import { SoftGlow } from '@/components/ui/SoftGlow'
import { useActivityStore, selectTotalSteps } from '@/store/useActivityStore'
import { useExerciseStore, totalBurned } from '@/store/useExerciseStore'
import { useHistoryStore, dayKeyOf } from '@/store/useHistoryStore'
import { useFoodStore } from '@/store/useFoodStore'
import { totalConsumed } from '@/lib/data/diary'
import { RANGES, xpForDay } from '@/lib/data/activity'

export default function ActivityScreen() {
  const insets = useSafeAreaInsets()
  // Один период и один показатель для всей вкладки: период — пилюли
  // в шапке «Отчётов», показатель — тап по карточке-итогу (общий
  // с календарём-теплокартой)
  const [rangeId, setRangeId] = useState('7d')
  const [metricId, setMetricId] = useState('steps')
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
      {/* Неоновая дымка в шапке — единый стиль страниц (как на «Теле») */}
      <SoftGlow id="glowDiaryTR" w={190} h={160} peak={0.3} color="#4D7CFE" style={{ top: -26, right: -46 }} />
      <SoftGlow id="glowDiaryL" w={120} h={150} peak={0.14} color="#8B5CF6" style={{ top: 60, left: -40 }} />
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

        <MotivationBanner />

        <ReportsSection
          today={today}
          days={days}
          rangeId={rangeId}
          onRangeChange={setRangeId}
          metricId={metricId}
          onMetricChange={setMetricId}
        />

        <Text className="text-center font-sans text-[11px] leading-relaxed text-bear-dim">
          Показатели дня пишутся в историю сами — отчёты видят шаги, воду,
          еду и тренировки, где бы они ни были записаны (тренировки теперь
          на «Главной»).
        </Text>
      </ScrollView>
    </View>
  )
}

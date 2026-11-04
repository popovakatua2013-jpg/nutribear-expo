// Секция «Отчёты»: дисциплина периода, карточки итогов с Δ% и рекордом,
// календарь-теплокарта выбранного показателя и нутриенты из журнала
// питания. Период (7/30/90) выбирается пилюлями в шапке секции,
// показатель — тапом по карточке-итогу (подсвечивается рамкой).
// Тап по клетке календаря открывает сводку этого дня, кнопка «История»
// в шапке календаря — значения по дням. Кнопка «Итоги» — шеринговая
// PNG-карточка периода (медведь + цифры + сравнение).

import { useMemo, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { Share2 } from 'lucide-react-native'
import { GoalCelebration } from './GoalCelebration'
import { ReportCards } from './ReportCards'
import { DisciplineCard } from './DisciplineCard'
import { HeatmapCard } from './HeatmapCard'
import { NutrientsCard } from './NutrientsCard'
import { WeeklyShareCard } from './WeeklyShareCard'
import { MetricDaysModal } from './MetricDaysModal'
import { DayDetailsModal } from '../../home/DayDetailsModal'
import { Pills } from '../../ui/Pills'
import { periodTotals } from '@/lib/data/reports'
import { METRICS } from '@/lib/data/metrics'
import { history, RANGES } from '@/lib/data/activity'
import { useHistoryStore } from '@/store/useHistoryStore'
import { useProfileStore } from '@/store/useProfileStore'
import { useGoalsStore } from '@/store/useGoalsStore'
import { streakOf } from '@/lib/streak'

export function ReportsSection({
  today,
  days,
  rangeId = '7d',
  onRangeChange = () => {},
  metricId = 'steps',
  onMetricChange = () => {},
}) {
  const [shareOpen, setShareOpen] = useState(false)
  const [dayKey, setDayKey] = useState(null)
  const [histOpen, setHistOpen] = useState(false)
  const metric = METRICS.find((m) => m.key === metricId) || METRICS[0]
  const savedDays = useHistoryStore((s) => s.days) // карта истории: { 'ГГГГ-ММ-ДД': … }
  const weights = useProfileStore((s) => s.weights)
  const goals = useGoalsStore((s) => s.goals)
  const streak = streakOf(savedDays)

  // Дневные строки периода — один обход истории на все блоки секции:
  // дисциплина, рекорды карточек и теплокарта читают одни и те же rows
  const rows = useMemo(() => history(days, today), [days, today])
  // Итоги периода для шеринга: текущий и прошлый (для Δ на карточке)
  const totals = useMemo(() => periodTotals(days, 0, today), [days, today])
  const prev = useMemo(() => periodTotals(days, days), [days])
  // Сколько дней периода велся дневник — для шерингового чипа
  const recorded = rows.filter((r) => r.steps || r.kcal || r.waterMl || r.burned).length

  return (
    <View accessibilityLabel="Отчёты" className="gap-3">
      <View className="flex-row items-center justify-between gap-2">
        <View className="min-w-0 flex-1">
          <Text className="font-extrabold text-[17px] tracking-tight text-bear-text">
            Отчёты
          </Text>
          <Text className="mt-0.5 font-sans text-[10.5px] leading-snug text-bear-sub">
            Итоги, дисциплина, календарь и нутриенты из дневника за период
          </Text>
        </View>
        <Pressable
          onPress={() => setShareOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Поделиться итогами периода"
          className="shrink-0 flex-row items-center gap-1.5 rounded-full bg-white/[0.06] px-3 py-1.5 active:opacity-70"
        >
          <Share2 size={13} color="#8DABFF" />
          <Text className="font-semibold text-[11.5px] text-[#8DABFF]">Итоги</Text>
        </Pressable>
      </View>

      {/* Период — единственный переключатель на вкладке: управляет
        // карточками, дисциплиной, нутриентами, историей и шеринговым «Итогами» */}
      <Pills
        items={RANGES.map((r) => ({ id: r.id, label: r.label }))}
        value={rangeId}
        onChange={onRangeChange}
        accessibilityLabel="Период"
      />

      <GoalCelebration />

      <DisciplineCard rows={rows} />

      <ReportCards
        today={today}
        days={days}
        rows={rows}
        metricId={metricId}
        onSelectMetric={onMetricChange}
      />

      <HeatmapCard
        today={today}
        metricId={metricId}
        onPickDay={setDayKey}
        onOpenHistory={() => setHistOpen(true)}
      />

      <NutrientsCard days={days} />

      <WeeklyShareCard
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        totals={totals}
        prev={prev}
        recorded={recorded}
        streak={streak}
        days={days}
      />

      {/* Сводка дня по тапу на клетку календаря */}
      <DayDetailsModal
        open={Boolean(dayKey)}
        onClose={() => setDayKey(null)}
        dayKey={dayKey}
        history={savedDays}
        goals={goals}
        weights={weights}
      />

      {/* История показателя по дням — кнопка «История» в шапке календаря */}
      <MetricDaysModal
        open={histOpen}
        onClose={() => setHistOpen(false)}
        metric={metric}
        days={days}
        rows={rows}
      />
    </View>
  )
}

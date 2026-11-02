// Секция «Отчёты» — объединённый блок. Раньше на вкладке было два
// почти одинаковых раздела: «Сводка» (график показателя по дням и
// сравнение по неделям) и «Отчёты» (итоговые карточки за период) —
// по просьбе пользователя все функции «Сводки» переехали сюда.
// Теперь один блок: период (7/30/90), режимы «По дням»/«По неделям»,
// переключатель показателя с графиком — и под ними итоговые карточки
// с Δ% к прошлому периоду, «Весом» и «Аудитом организма».
// Кнопка «Итоги» открывает шеринговую карточку (медведь + цифры).

import { useMemo, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { Share2 } from 'lucide-react-native'
import { GoalCelebration } from './GoalCelebration'
import { ReportCards } from './ReportCards'
import { WeeklyShareCard } from './WeeklyShareCard'
import { WeeksChart } from './WeeksChart'
import { SvgAreaChart } from '@/components/ui/SvgAreaChart'
import { Pills } from '@/components/ui/Pills'
import { periodTotals } from '@/lib/data/reports'
import { RANGES, history } from '@/lib/data/activity'
import { METRICS } from '@/lib/data/metrics'
import { useHistoryStore } from '@/store/useHistoryStore'
import { streakOf } from '@/lib/streak'

const MODES = [
  { id: 'days', label: 'По дням' },
  { id: 'weeks', label: 'По неделям' },
]

export function ReportsSection({ today }) {
  const [shareOpen, setShareOpen] = useState(false)
  // Период (7/30/90) — единственный переключатель периода: управляет
  // и графиками, и итоговыми карточками. Режим и показатель —
  // только для графической части.
  const [rangeId, setRangeId] = useState('7d')
  const [mode, setMode] = useState('days')
  const [metricId, setMetricId] = useState('steps')

  const range = RANGES.find((r) => r.id === rangeId) || RANGES[0]
  const days = range.days
  const metric = METRICS.find((m) => m.key === metricId) || METRICS[0]

  // Режим «По дням»: реальные дни периода (для 90 точек подписи
  // прореживаются самим графиком, точки-кружки прячем — шумно)
  const rows = useMemo(() => history(days, today), [days, today])

  const historyDays = useHistoryStore((s) => s.days)
  const streak = streakOf(historyDays)
  // Итоги выбранного периода (включая живое «сегодня») для шеринга
  const totals = useMemo(() => periodTotals(days, 0, today), [days, today])

  return (
    <View accessibilityLabel="Отчёты" className="gap-3">
      <View className="flex-row items-center justify-between gap-2">
        <View className="min-w-0 flex-1">
          <Text className="font-extrabold text-[17px] tracking-tight text-bear-text">
            Отчёты
          </Text>
          <Text className="mt-0.5 font-sans text-[10.5px] leading-snug text-bear-sub">
            Графики и итоги дневника за период — шаги, калории, вода, сожжено, вес и аудит,
            со сравнением с прошлым периодом
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

      {/* Графическая часть (бывшая «Сводка»): период, режим, показатель */}
      <View
        accessibilityLabel="Графики отчётов"
        className="rounded-3xl border border-white/5 bg-bear-card p-5"
      >
        <Pills
          items={RANGES.map((r) => ({ id: r.id, label: r.label }))}
          value={rangeId}
          onChange={setRangeId}
          accessibilityLabel="Период"
        />

        {/* Режим: дни / недели */}
        <View className="mt-2.5">
          <Pills
            items={MODES}
            value={mode}
            onChange={setMode}
            accessibilityLabel="Режим отчётов"
          />
        </View>

        {mode === 'days' ? (
          <>
            {/* Переключатель показателя */}
            <View className="mt-2.5">
              <Pills
                items={METRICS.map((m) => ({ id: m.key, label: m.label, color: m.color }))}
                value={metricId}
                onChange={setMetricId}
                accessibilityLabel="Показатель"
              />
            </View>

            {/* Что именно на графике: выбранный показатель за каждый день */}
            <Text className="mt-1.5 px-1 font-sans text-[10.5px] text-bear-sub">
              {`${metric.label} за каждый день периода — одна точка = один день`}
            </Text>

            {/* График выбранного показателя по дням */}
            <SvgAreaChart
              data={rows.map((r) => ({ label: r.label, value: r[metric.key] || 0 }))}
              color={metric.color}
              height={170}
              yFmt={metric.yFmt}
              dot={rows.length <= 31}
            />
          </>
        ) : (
          /* Сравнение по неделям: тап по неделе — панель со всеми показателями */
          <View className="mt-3">
            <WeeksChart today={today} embedded />
          </View>
        )}
      </View>

      <GoalCelebration />
      <ReportCards today={today} days={days} />

      <WeeklyShareCard
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        totals={totals}
        streak={streak}
        days={days}
      />
    </View>
  )
}

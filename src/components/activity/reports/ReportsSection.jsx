// Секция «Отчёты» — объединённый блок. Раньше на вкладке было два
// почти одинаковых раздела: «Сводка» (график показателя по дням и
// сравнение по неделям) и «Отчёты» (итоговые карточки за период) —
// по просьбе пользователя все функции «Сводки» переехали сюда.
// Управление без дублей: период (7/30/90) — над итоговыми карточками,
// а показатель выбирается тапом по самой карточке (выбранная
// подсвечена рамкой в цвет метрики) — отдельных пилюль
// «шаги/калории/вода/сожжено» больше нет, они дублировали карточки.
// История показателя по дням — кнопка «История» под графиком
// (MetricDaysModal). Кнопка «Итоги» открывает шеринговую карточку.
// Данные периода считаются здесь ОДИН раз и раздаются детям:
// rows (дни) → график и MetricDaysModal, totals (итоги) → шеринговая
// карточка и ReportCards — раньше periodTotals звался в двух местах.

import { useMemo, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { History, Share2 } from 'lucide-react-native'
import { GoalCelebration } from './GoalCelebration'
import { ReportCards } from './ReportCards'
import { WeeklyShareCard } from './WeeklyShareCard'
import { WeeksChart } from './WeeksChart'
import { MetricDaysModal } from './MetricDaysModal'
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
  // Период (7/30/90) — единственный переключатель периода на вкладке:
  // живёт над итоговыми карточками и управляет и графиками, и итогами.
  // Режим «По дням/По неделям» — только для графической части.
  const [rangeId, setRangeId] = useState('7d')
  const [mode, setMode] = useState('days')
  // Один показатель на оба режима: выбирается тапом по карточке-итогу
  // ниже, выбранная карточка подсвечена рамкой в цвет метрики
  const [metricId, setMetricId] = useState('steps')
  // История показателя по дням: кнопка «История» под графиком
  const [detail, setDetail] = useState(null)

  const range = RANGES.find((r) => r.id === rangeId) || RANGES[0]
  const days = range.days
  const metric = METRICS.find((m) => m.key === metricId) || METRICS[0]

  // Режим «По дням»: реальные дни периода (для 90 точек подписи
  // прореживаются самим графиком, точки-кружки прячем — шумно)
  const rows = useMemo(() => history(days, today), [days, today])

  const historyDays = useHistoryStore((s) => s.days)
  const streak = useMemo(() => streakOf(historyDays), [historyDays])
  // Итоги выбранного периода (включая живое «сегодня») — единственный
  // расчёт на экран: и для шеринга, и для карточек отчётов
  const totals = useMemo(() => periodTotals(days, 0, today), [days, today])

  return (
    <View accessibilityLabel="Отчёты" className="gap-3">
      <View className="flex-row items-center justify-between gap-2">
        <View className="min-w-0 flex-1">
          <Text className="font-extrabold text-[17px] tracking-tight text-bear-text">
            Отчёты
          </Text>
          <Text className="mt-0.5 font-sans text-[10.5px] leading-snug text-bear-sub">
            Графики и итоги дневника за период, со сравнением с прошлым.
            Тап по карточке меняет показатель на графике выше
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
        {/* Режим: дни / недели. Показатель — тап по карточке-итогу ниже */}
        <Pills
          items={MODES}
          value={mode}
          onChange={setMode}
          accessibilityLabel="Режим отчётов"
        />

        {mode === 'days' ? (
          <>
            {/* Что на графике + кнопка «История»: вся сохранённая история
                выбранного показателя по дням (MetricDaysModal) */}
            <Pressable
              onPress={() => setDetail(metric)}
              accessibilityRole="button"
              accessibilityLabel={`${metric.label} — открыть историю по дням`}
              className="mt-1.5 flex-row flex-wrap items-center justify-between gap-1.5 px-1 active:opacity-70"
            >
              <Text className="min-w-0 flex-1 font-sans text-[10.5px] text-bear-sub">
                {`${metric.label} за каждый день периода — одна точка = один день`}
              </Text>
              <View className="shrink-0 flex-row items-center gap-1 rounded-full bg-white/[0.06] px-2 py-1">
                <History size={11} color="#8DABFF" />
                <Text className="font-semibold text-[10px] text-[#8DABFF]">История</Text>
              </View>
            </Pressable>

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
            <WeeksChart today={today} metric={metric} />
          </View>
        )}
      </View>

      <GoalCelebration />

      {/* Период — над итоговыми карточками: один переключатель управляет
          и графиком выше, и итогами. Раньше он жил в шапке графиков */}
      <Pills
        items={RANGES.map((r) => ({ id: r.id, label: r.label }))}
        value={rangeId}
        onChange={setRangeId}
        accessibilityLabel="Период"
      />

      <ReportCards
        days={days}
        totals={totals}
        metricId={metricId}
        onSelectMetric={setMetricId}
      />

      <WeeklyShareCard
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        totals={totals}
        streak={streak}
        days={days}
      />

      {/* История показателя по дням — кнопка «История» под графиком;
          период и дни общие с графиком */}
      <MetricDaysModal
        open={!!detail}
        metric={detail}
        days={days}
        rows={rows}
        onClose={() => setDetail(null)}
      />
    </View>
  )
}

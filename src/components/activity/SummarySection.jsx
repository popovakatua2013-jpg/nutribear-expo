// Карточка «Общая сводка»: период (7/30/90 — единственный переключатель
// периода на вкладке, он же управляет «Отчётами») и показатель
// (шаги/ккал/вода/сожжено/опыт) + график по реальной истории.
// Итоги за период показывает блок «Отчёты» (ReportCards) — раньше
// одинаковые итоги дублировались в двух местах.

import { useMemo, useState } from 'react'
import { Text, View } from 'react-native'
import { SvgAreaChart } from '../ui/SvgAreaChart'
import { Pills } from '../ui/Pills'
import { RANGES, history, weeklyHistory } from '@/lib/data/activity'
import { METRICS } from '@/lib/data/metrics'

export function SummarySection({ today, rangeId = '7d', onRangeChange = () => {} }) {
  const [metricId, setMetricId] = useState('steps')
  const range = RANGES.find((r) => r.id === rangeId) || RANGES[0]
  const metric = METRICS.find((m) => m.key === metricId) || METRICS[0]

  const rows = useMemo(
    () => (range.days > 7 ? weeklyHistory(range.days, today) : history(range.days, today)),
    [range.days, today]
  )

  return (
    <View
      accessibilityLabel="Общая сводка"
      className="rounded-3xl border border-white/5 bg-bear-card p-5"
    >
      {/* Заголовок + период (один на всю вкладку) */}
      <View className="mb-3 flex-row flex-wrap items-center justify-between gap-2">
        <Text className="font-bold text-[15px] tracking-tight text-bear-text">
          Общая сводка
        </Text>
        <Pills
          items={RANGES.map((r) => ({ id: r.id, label: r.label }))}
          value={rangeId}
          onChange={onRangeChange}
          accessibilityLabel="Период"
        />
      </View>

      {/* Переключатель показателя */}
      <Pills
        items={METRICS.map((m) => ({ id: m.key, label: m.label, color: m.color }))}
        value={metricId}
        onChange={setMetricId}
        accessibilityLabel="Показатель"
      />

      {/* График выбранного показателя */}
      <SvgAreaChart
        data={rows.map((r) => ({ label: r.label, value: r[metric.key] || 0 }))}
        color={metric.color}
        height={170}
        yFmt={metric.yFmt}
      />
    </View>
  )
}

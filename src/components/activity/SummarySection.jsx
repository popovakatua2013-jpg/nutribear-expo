// Карточка «Сводка»: период (7/30/90 — единственный переключатель
// периода на вкладке, он же управляет «Отчётами») и два режима —
// «По дням» (график показателя по дням) и «По неделям» (сравнение
// недель с Δ%). Раньше это были два отдельных блока («Общая сводка»
// и «Сравнение по неделям») с одинаковыми переключателями показателя —
// теперь один блок, режимы не дублируют друг друга.

import { useMemo, useState } from 'react'
import { Text, View } from 'react-native'
import { SvgAreaChart } from '../ui/SvgAreaChart'
import { Pills } from '../ui/Pills'
import { WeeksChart } from './reports/WeeksChart'
import { RANGES, history } from '@/lib/data/activity'
import { METRICS } from '@/lib/data/metrics'

const MODES = [
  { id: 'days', label: 'По дням' },
  { id: 'weeks', label: 'По неделям' },
]

export function SummarySection({
  today,
  rangeId = '7d',
  onRangeChange = () => {},
  // Показатель можно поднять на экран (общий с теплокартой «Отчётов»);
  // если пропсы не переданы — локальное состояние, как раньше
  metricId: metricIdProp,
  onMetricChange,
}) {
  const [mode, setMode] = useState('days')
  const [localMetricId, setLocalMetricId] = useState('steps')
  const metricId = metricIdProp ?? localMetricId
  const setMetricId = onMetricChange || setLocalMetricId
  const range = RANGES.find((r) => r.id === rangeId) || RANGES[0]
  const metric = METRICS.find((m) => m.key === metricId) || METRICS[0]

  // Режим «По дням»: реальные дни периода (для 90 точек подписи
  // прореживаются самим графиком, точки-кружки прячем — шумно)
  const rows = useMemo(() => history(range.days, today), [range.days, today])

  return (
    <View
      accessibilityLabel="Сводка"
      className="rounded-3xl border border-white/5 bg-bear-card p-5"
    >
      {/* Заголовок + период (один на всю вкладку) */}
      <View className="mb-3 flex-row flex-wrap items-center justify-between gap-2">
        <View className="min-w-0 flex-1">
          <Text className="font-bold text-[15px] tracking-tight text-bear-text">
            Сводка
          </Text>
          <Text className="mt-0.5 font-sans text-[10.5px] leading-snug text-bear-sub">
            Показатели дневника за период: шаги, вода, калории, активность
          </Text>
        </View>
        <Pills
          items={RANGES.map((r) => ({ id: r.id, label: r.label }))}
          value={rangeId}
          onChange={onRangeChange}
          accessibilityLabel="Период"
        />
      </View>

      {/* Режим: дни / недели */}
      <Pills
        items={MODES}
        value={mode}
        onChange={setMode}
        accessibilityLabel="Режим сводки"
      />

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
        /* Сравнение по неделям — бывший отдельный блок, теперь режим */
        <View className="mt-3">
          <WeeksChart today={today} embedded />
        </View>
      )}
    </View>
  )
}

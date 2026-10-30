// Карточка «Общая сводка»: заголовок + период (7/30/90),
// переключатель показателя (шаги/ккал/вода/сожжено/опыт),
// график по реальной истории и итоги за период.

import { useMemo, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Droplets, Flame, Footprints, Sparkles } from 'lucide-react-native'
import { SvgAreaChart } from '../ui/SvgAreaChart'
import { RANGES, history, weeklyHistory, blendedTotals } from '@/lib/data/activity'
import { formatLiters } from '@/lib/data/reports'
import { formatNum } from '@/lib/format'

// Показатели графика: ключ в данных, цвет, формат подписи оси Y
const METRICS = [
  { key: 'steps', label: 'Шаги', color: '#4ade80', yFmt: (v) => (v >= 1000 ? `${Math.round(v / 1000)}к` : `${v}`) },
  { key: 'kcal', label: 'Ккал', color: '#f87171', yFmt: (v) => `${Math.round(v)}` },
  { key: 'waterMl', label: 'Вода', color: '#38bdf8', yFmt: (v) => (v >= 1000 ? `${Math.round(v / 1000)}л` : `${v}`) },
  { key: 'burned', label: 'Сожжено', color: '#fb923c', yFmt: (v) => `${Math.round(v)}` },
  { key: 'xp', label: 'Опыт', color: '#a78bfa', yFmt: (v) => `${Math.round(v)}` },
]

export function SummarySection({ today }) {
  const [rangeId, setRangeId] = useState('7d')
  const [metricId, setMetricId] = useState('steps')
  const range = RANGES.find((r) => r.id === rangeId) || RANGES[0]
  const metric = METRICS.find((m) => m.key === metricId) || METRICS[0]

  const rows = useMemo(
    () => (range.days > 7 ? weeklyHistory(range.days, today) : history(range.days, today)),
    [range.days, today]
  )
  const totals = useMemo(() => blendedTotals(range.days, today), [range.days, today])

  return (
    <View
      accessibilityLabel="Общая сводка"
      className="rounded-3xl border border-white/5 bg-bear-card p-5"
    >
      {/* Заголовок + период */}
      <View className="mb-3 flex-row flex-wrap items-center justify-between gap-2">
        <Text className="font-bold text-[15px] tracking-tight text-bear-text">
          Общая сводка
        </Text>

        <View className="flex-row gap-1.5" accessibilityLabel="Период">
          {RANGES.map((r) => {
            const active = r.id === rangeId
            const pill = (
              <Text className={`px-3 py-1.5 font-semibold text-[11px] ${active ? 'text-white' : 'text-bear-dim'}`}>
                {r.label}
              </Text>
            )
            return (
              <Pressable
                key={r.id}
                onPress={() => setRangeId(r.id)}
                accessibilityLabel={`Период ${r.label}`}
                className="overflow-hidden rounded-full"
              >
                {active ? (
                  <LinearGradient start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} colors={['#4D7CFE', '#8B5CF6', '#A45BFF']}>
                    {pill}
                  </LinearGradient>
                ) : (
                  <View className="bg-white/5">{pill}</View>
                )}
              </Pressable>
            )
          })}
        </View>
      </View>

      {/* Переключатель показателя */}
      <View className="mb-1 flex-row flex-wrap gap-1.5" accessibilityLabel="Показатель">
        {METRICS.map((m) => {
          const active = m.key === metricId
          const pill = (
            <Text className={`px-2.5 py-1 font-semibold text-[11px] ${active ? 'text-white' : 'text-bear-dim'}`}>
              {m.label}
            </Text>
          )
          return (
            <Pressable
              key={m.key}
              onPress={() => setMetricId(m.key)}
              accessibilityLabel={`Показатель ${m.label}`}
              className="overflow-hidden rounded-full"
            >
              {active ? (
                <LinearGradient start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} colors={[m.color, `${m.color}99`]}>
                  {pill}
                </LinearGradient>
              ) : (
                <View className="bg-white/5">{pill}</View>
              )}
            </Pressable>
          )
        })}
      </View>

      {/* График выбранного показателя */}
      <SvgAreaChart
        data={rows.map((r) => ({ label: r.label, value: r[metric.key] || 0 }))}
        color={metric.color}
        height={170}
        yFmt={metric.yFmt}
      />

      {/* Итоги за период */}
      <View className="mt-3 gap-2" accessibilityLabel="Итоги за период">
        <View className="flex-row gap-2">
          <SummaryCell Icon={Footprints} color="#4ade80" label="Шаги" value={formatNum(totals.steps)} />
          <SummaryCell Icon={Flame} color="#f87171" label="Ккал съедено" value={formatNum(totals.kcal)} />
        </View>
        <View className="flex-row gap-2">
          <SummaryCell Icon={Sparkles} color="#fb923c" label="Сожжено" value={formatNum(totals.burned)} />
          <SummaryCell Icon={Droplets} color="#38bdf8" label="Вода" value={formatLiters(totals.waterMl)} />
        </View>
      </View>
    </View>
  )
}

function SummaryCell({ Icon, color, label, value }) {
  return (
    <View className="min-w-0 flex-1 flex-row items-center gap-2.5 rounded-xl bg-white/[0.04] px-3 py-2.5">
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 9,
          backgroundColor: `${color}1f`,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon size={16} color={color} />
      </View>
      <View className="min-w-0 flex-1">
        <Text numberOfLines={1} className="font-sans text-[10.5px] text-bear-sub">
          {label}
        </Text>
        <Text numberOfLines={1} maxFontSizeMultiplier={1.25} className="font-bold text-[14.5px] text-bear-text">
          {value}
        </Text>
      </View>
    </View>
  )
}

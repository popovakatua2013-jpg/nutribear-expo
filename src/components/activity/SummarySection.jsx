// Карточка «Общая сводка»: заголовок + переключатель периода,
// зелёный график шагов слева и итоги справа

import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { SummaryChart } from './SummaryChart'
import { SummaryStats } from './SummaryStats'
import { RANGES, blendedTotals } from '@/lib/data/activity'

export function SummarySection({ today }) {
  const [rangeId, setRangeId] = useState('7d')
  const range = RANGES.find((r) => r.id === rangeId) || RANGES[0]

  return (
    <View
      accessibilityLabel="Общая сводка"
      className="rounded-3xl border border-white/5 bg-bear-card p-5"
    >
      <View className="mb-4 flex-row flex-wrap items-center justify-between gap-2">
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

      <View className="flex-row items-center gap-3">
        <View className="w-[58%]">
          <SummaryChart today={today} days={range.days} weekly={range.days > 7} />
        </View>
        <View className="min-w-0 flex-1">
          <SummaryStats totals={blendedTotals(range.days, today)} />
        </View>
      </View>
    </View>
  )
}

// Секция «Отчёты»: заголовок с фильтром периода (7/30/90 дней),
// карточки итогов, недельное сравнение и мотивационный баннер

import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { ReportCards } from './ReportCards'
import { WeeksChart } from './WeeksChart'
import { ReportsBanner } from './ReportsBanner'
import { RANGES } from '@/lib/data/activity'

export function ReportsSection({ today }) {
  const [rangeId, setRangeId] = useState('7d')
  const days = RANGES.find((r) => r.id === rangeId)?.days || 7

  return (
    <View accessibilityLabel="Отчёты" className="gap-3">
      <View className="flex-row items-center justify-between gap-2">
        <Text className="font-extrabold text-[17px] tracking-tight text-bear-text">
          Отчёты
        </Text>
        <View className="flex-row gap-1.5" accessibilityLabel="Период отчёта">
          {RANGES.map((r) => {
            const active = r.id === rangeId
            const pill = (
              <Text className={`px-3 py-1.5 font-semibold text-[11.5px] ${active ? 'text-white' : 'text-bear-sub2'}`}>
                {r.label}
              </Text>
            )
            return (
              <Pressable key={r.id} onPress={() => setRangeId(r.id)} className="overflow-hidden rounded-full">
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

      <ReportCards today={today} days={days} />
      <WeeksChart today={today} />
      <ReportsBanner />
    </View>
  )
}

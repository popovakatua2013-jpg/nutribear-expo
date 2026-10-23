// «Сравнение по неделям»: 4 линии (шаги, калории, вода, опыт) за
// последние 6 недель. Легенда — цветные точки в шапке карточки.

import { useMemo } from 'react'
import { Text, View } from 'react-native'
import { SvgLineChart } from '@/components/ui/SvgLineChart'
import { weeksComparison } from '@/lib/data/reports'

const SERIES = [
  { key: 'steps', name: 'Шаги', color: '#4ade80' },
  { key: 'kcal', name: 'Калории', color: '#f87171' },
  { key: 'waterMl', name: 'Вода', color: '#38bdf8' },
  { key: 'xp', name: 'Опыт', color: '#a78bfa' },
]

export function WeeksChart({ today }) {
  const rows = useMemo(() => weeksComparison(6, today), [today])

  return (
    <View className="rounded-2xl border border-white/5 bg-bear-card p-4">
      <View className="flex-row flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
        <Text className="font-bold text-[14px] tracking-tight text-bear-text">
          Сравнение по неделям
        </Text>
        <View className="flex-row flex-wrap items-center gap-x-3 gap-y-1">
          {SERIES.map((s) => (
            <View key={s.key} className="flex-row items-center gap-1.5">
              <View className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
              <Text className="font-sans text-[11px] text-[#aab4d4]">{s.name}</Text>
            </View>
          ))}
        </View>
      </View>

      <View className="mt-3">
        <SvgLineChart data={rows} series={SERIES} height={210} />
      </View>
    </View>
  )
}

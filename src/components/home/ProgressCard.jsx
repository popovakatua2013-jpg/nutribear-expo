// Карточка «Прогресс»: кольцо по 4 показателям, остаток до цели
// по шагам и фиолетовый тренд шагов за неделю. «Все» → раздел Активность.

import { Pressable, Text, View } from 'react-native'
import { Footprints, Maximize2 } from 'lucide-react-native'
import { ProgressRing } from './ProgressRing'
import { ProgressChart } from './ProgressChart'
import { formatNum } from '@/lib/format'

// Порядок дуг кольца — с верхней точки по часовой
const PARTS = [
  { key: 'steps', color: '#4ade80', label: 'Шаги' },
  { key: 'kcal', color: '#fbbf24', label: 'Калории' },
  { key: 'minutes', color: '#f472b6', label: 'Минуты' },
  { key: 'water', color: '#38bdf8', label: 'Вода' },
]

export function ProgressCard({ d, onGoAll }) {
  const parts = PARTS.map((p) => ({ ...p, value: d[`${p.key}Pct`] || 0 }))
  const remain = Math.max(0, (d.stepsGoal || 0) - (d.steps || 0))

  return (
    <View
      accessibilityLabel="Прогресс"
      className="rounded-3xl border border-bear-line bg-bear-card p-5"
    >
      <View className="flex-row items-center justify-between gap-2">
        <View className="flex-row items-center gap-2">
          <Footprints size={18} color="#4ade80" />
          <Text className="font-bold text-[15px] tracking-tight text-bear-text">
            Прогресс
          </Text>
        </View>
        <Pressable
          onPress={onGoAll}
          accessibilityLabel="Открыть всю статистику активности"
          accessibilityRole="button"
          className="flex-row items-center gap-1"
        >
          <Maximize2 size={12} color="#7C87A8" />
          <Text className="font-medium text-[12px] text-bear-sub2">Все</Text>
        </Pressable>
      </View>

      <View className="mt-4 flex-row items-center gap-4">
        <ProgressRing parts={parts} percent={d.stepsPct || 0} />

        <View className="shrink-0">
          <Text className="font-sans text-[13px] text-bear-sub2">До цели</Text>
          <Text className="mt-0.5 font-bold text-[16px] leading-tight text-bear-text">
            {formatNum(remain)} шагов
          </Text>
          <View className="mt-2 flex-row items-center">
            <Footprints size={16} color="#4ade80" />
            <Footprints size={16} color="#4ade80" opacity={0.7} style={{ marginLeft: -6 }} />
          </View>
        </View>

        <ProgressChart steps={d.steps || 0} />
      </View>
    </View>
  )
}

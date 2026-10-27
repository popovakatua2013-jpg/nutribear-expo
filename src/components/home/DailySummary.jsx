// Сводка за день: сколько съедено, сколько осталось, полоса прогресса

import { Text, View } from 'react-native'
import { Flame } from 'lucide-react-native'
import { formatNum } from '@/lib/format'
import { ProgressBar } from '../ui/ProgressBar'

export function DailySummary({ consumed = 0, target = 0 }) {
  const pct = target > 0 ? Math.min(100, (consumed / target) * 100) : 0
  const remaining = Math.max(0, target - consumed)
  const over = Math.max(0, consumed - target)
  const done = consumed > 0 && remaining === 0 && over === 0

  return (
    <View
      accessibilityLabel="Сводка за день"
      className="rounded-3xl border border-bear-line bg-bear-card p-5"
    >
      <View className="flex-row items-end justify-between gap-3">
        <View className="flex-1">
          <Text className="font-medium text-xs text-bear-sub">Съедено за сегодня</Text>
          <Text className="mt-1 font-extrabold text-[24px] tracking-tight text-bear-text">
            {formatNum(consumed)}
            <Text className="font-semibold text-[15px] text-bear-sub">
              {'  '}/ {formatNum(target)} ккал
            </Text>
          </Text>
        </View>

        <View
          className={`flex-row items-center gap-1.5 rounded-full px-3 py-1.5 ${
            over > 0 ? 'bg-amber-400/10' : done ? 'bg-emerald-400/10' : 'bg-[#1A2647]'
          }`}
        >
          <Flame size={14}
            color={over > 0 ? '#FCD34D' : done ? '#6EE7B7' : '#AEB9D9'}
          />
          <Text
            className={`font-semibold text-xs ${
              over > 0 ? 'text-amber-300' : done ? 'text-emerald-300' : 'text-bear-soft'
            }`}
          >
            {over > 0 ? `+${formatNum(over)} ккал` : `Осталось ${formatNum(remaining)}`}
          </Text>
        </View>
      </View>

      <View className="mt-4">
        <ProgressBar pct={pct} h={10} tone={done ? 'emerald' : over > 0 ? 'amber' : 'grad'} />
      </View>
    </View>
  )
}

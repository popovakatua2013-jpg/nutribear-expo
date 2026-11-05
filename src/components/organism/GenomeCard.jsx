// Карточка генома: 4 оси организма из реальных данных дня + подсказка.
// Гидратация — вода; белок — из дневника; энергия — калории к норме;
// активность — шаги к цели.

import { Text, View } from 'react-native'
import { formatNum } from '@/lib/format'
import { proteinGoalG } from '@/lib/data/organism'

const ROWS = [
  { key: 'hydration', emoji: '💧', label: 'Гидратация', color: '#38BDF8' },
  { key: 'protein', emoji: '🍳', label: 'Белок', color: '#A3E635' },
  { key: 'energy', emoji: '⚡', label: 'Энергия', color: '#FBBF24' },
  { key: 'activity', emoji: '👣', label: 'Активность', color: '#A78BFA' },
]

function Bar({ pct, color }) {
  return (
    <View className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.07]">
      <View
        className="h-full rounded-full"
        style={{ width: `${Math.max(2, pct)}%`, backgroundColor: color }}
      />
    </View>
  )
}

export function GenomeCard({ org, stats }) {
  const { axes, hint } = org
  const { kcal, kcalGoal, proteinG, steps } = stats
  const pGoal = proteinGoalG(kcalGoal)

  const values = {
    hydration: `${formatNum(stats.waterMl)} из ${formatNum(stats.waterGoalMl)} мл`,
    protein: `${formatNum(proteinG)} из ${formatNum(pGoal)} г`,
    energy: `${formatNum(kcal)} из ${formatNum(kcalGoal)} ккал`,
    activity: `${formatNum(steps)} из ${formatNum(stats.stepsGoal)} шагов`,
  }

  return (
    <View className="rounded-3xl border border-bear-line bg-bear-card p-4">
      <View className="flex-row items-center justify-between">
        <Text className="font-extrabold text-[20px] text-bear-text">Геном</Text>
        <Text className="font-sans text-[15px] text-bear-dim">сегодня</Text>
      </View>

      <View className="mt-3 gap-3.5">
        {ROWS.map((r) => (
          <View key={r.key}>
            <View className="flex-row items-baseline justify-between">
              <Text className="font-semibold text-[17.5px] text-bear-bright">
                {r.emoji} {r.label}
              </Text>
              <Text className="font-sans text-[15px] text-bear-sub2">{values[r.key]}</Text>
            </View>
            <Bar pct={axes[r.key]} color={r.color} />
          </View>
        ))}
      </View>

      {/* подсказка: что улучшить первым */}
      <View className="mt-3.5 rounded-2xl bg-white/[0.04] px-3.5 py-2.5">
        <Text className="font-medium text-[16.5px] leading-snug text-bear-soft">{hint}</Text>
      </View>
    </View>
  )
}

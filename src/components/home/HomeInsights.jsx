// Карточка «Закономерности»: мишка подмечает связи в данных — динамика
// веса, удачные дни недели, привычка с водой и ритм тренировок.
// Наблюдения считаются в src/lib/data/insights.js из уже собираемых
// данных (история, взвешивания, тренировки) — новые сторы не нужны.

import { Text, View } from 'react-native'
import { Sparkles } from 'lucide-react-native'
import { buildInsights } from '@/lib/data/insights'
import { useHistoryStore } from '@/store/useHistoryStore'
import { useGoalsStore } from '@/store/useGoalsStore'
import { useProfileStore } from '@/store/useProfileStore'
import { useExerciseStore } from '@/store/useExerciseStore'

export function HomeInsights() {
  const days = useHistoryStore((s) => s.days)
  const goals = useGoalsStore((s) => s.goals)
  const weights = useProfileStore((s) => s.weights)
  const exLogs = useExerciseStore((s) => s.logs)

  const insights = buildInsights({ days, goals, weights, exLogs })

  return (
    <View
      accessibilityLabel="Закономерности"
      className="rounded-3xl border border-bear-line bg-bear-card px-4 py-3.5"
    >
      <View className="flex-row items-center gap-2">
        <Sparkles size={18} color="#A78BFA" />
        <Text className="font-bold text-[15px] tracking-tight text-bear-text">
          Закономерности
        </Text>
      </View>

      {insights.length > 0 ? (
        <View className="mt-2 gap-1.5">
          {insights.map((it, i) => (
            <View key={i} className="flex-row items-start gap-2">
              <Text className="text-[12.5px] leading-snug">{it.emoji}</Text>
              <Text className="flex-1 text-[12.5px] leading-snug text-bear-dim">
                {it.text}
              </Text>
            </View>
          ))}
        </View>
      ) : (
        <Text className="mt-2 text-[12.5px] leading-snug text-bear-dim">
          Пока мало данных для наблюдений. Пользуйтесь дневником пару дней —
          и мишка подметит первые закономерности 🐻
        </Text>
      )}
    </View>
  )
}
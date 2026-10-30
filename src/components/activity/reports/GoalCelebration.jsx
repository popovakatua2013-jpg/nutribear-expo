// Празднование цели по весу в «Отчётах». Вес у цели — золотая карточка
// с датой достижения и «стриком» удержания результата; если после
// достижения вес снова ушёл от цели — мягкое напоминание вернуться.
// Без цели карточка не показывается вовсе.

import { Text, View } from 'react-native'
import { PartyPopper, Target } from 'lucide-react-native'
import { useProfileStore } from '@/store/useProfileStore'
import { fmtDecimal, shortDate } from '@/lib/data/bmi'
import { isAtGoal } from '@/lib/goal'
import { pluralDays } from '@/lib/format'

const DAY_MS = 24 * 60 * 60 * 1000

export function GoalCelebration() {
  const weightKg = useProfileStore((s) => s.weightKg)
  const goalWeightKg = useProfileStore((s) => s.goalWeightKg)
  const goalReachedAt = useProfileStore((s) => s.goalReachedAt)

  if (goalWeightKg == null) return null

  // Цель достигнута: дата награды + сколько дней результат держится
  if (isAtGoal(weightKg, goalWeightKg)) {
    const heldDays = goalReachedAt
      ? Math.max(0, Math.floor((Date.now() - new Date(goalReachedAt).getTime()) / DAY_MS))
      : 0
    return (
      <View
        accessibilityLabel="Цель по весу достигнута"
        className="rounded-2xl border border-[#fbbf24]/25 bg-[#fbbf24]/[0.08] p-4"
      >
        <View className="flex-row items-center gap-2.5">
          <View className="h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#fbbf24]/15">
            <PartyPopper size={20} color="#fbbf24" />
          </View>
          <View className="min-w-0 flex-1">
            <Text className="font-bold text-[14px] leading-snug text-[#fbbf24]">
              Цель по весу достигнута!
            </Text>
            <Text className="mt-0.5 font-sans text-[11.5px] leading-snug text-bear-sub">
              Вес {fmtDecimal(weightKg)} кг
              {goalReachedAt ? ` · достигнута ${shortDate(new Date(goalReachedAt))}` : ''}
            </Text>
          </View>
        </View>
        <Text className="mt-2.5 font-sans text-[11.5px] leading-snug text-bear-sub">
          {heldDays >= 1
            ? `🏅 Результат держится: ${heldDays} ${pluralDays(heldDays)}. `
            : '🏅 Результат взят — с этого дня держим его. '}
          Дальше — удержание: взвешивайся раз в неделю и держи норму калорий.
        </Text>
      </View>
    )
  }

  // Цель когда-то была достигнута, но вес снова ушёл — зовём вернуться
  if (goalReachedAt) {
    const diff = Math.round((weightKg - goalWeightKg) * 10) / 10
    return (
      <View
        accessibilityLabel="Цель по весу была достигнута"
        className="flex-row items-center gap-2.5 rounded-2xl border border-white/5 bg-bear-card p-4"
      >
        <View className="h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#8DABFF]/15">
          <Target size={20} color="#8DABFF" />
        </View>
        <View className="min-w-0 flex-1">
          <Text className="font-bold text-[14px] leading-snug text-bear-text">
            Возвращаемся к результату
          </Text>
          <Text className="mt-0.5 font-sans text-[11.5px] leading-snug text-bear-sub">
            Цель {fmtDecimal(goalWeightKg)} кг была достигнута{' '}
            {shortDate(new Date(goalReachedAt))} · до неё {diff > 0 ? '−' : '+'}
            {fmtDecimal(Math.abs(diff))} кг
          </Text>
        </View>
      </View>
    )
  }

  // Цель есть, но до неё ещё идти — прогресс виден на плашке во вкладке ИМТ
  return null
}

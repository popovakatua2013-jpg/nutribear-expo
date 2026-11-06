// Мягкий бейдж фазы цикла на Главной (трекер по отзыву из Google Play):
// показывается только если цикл включён и рассчитана фаза. Тон —
// поддержка и объяснение аппетита/веса, без медицинских рекомендаций.

import { Text, View } from 'react-native'
import { useCycleStore, phaseOf, phaseHint, daysToNext } from '@/store/useCycleStore'

export function CycleBadge() {
  const enabled = useCycleStore((s) => s.enabled)
  const lastStart = useCycleStore((s) => s.lastStart)
  const length = useCycleStore((s) => s.length)
  const bleed = useCycleStore((s) => s.bleed)

  if (!enabled || !lastStart) return null
  const phase = phaseOf(lastStart, length, bleed)
  if (!phase) return null
  const hint = phaseHint(phase.phase)
  if (!hint) return null

  const toNext = daysToNext(lastStart, length)

  return (
    <View
      accessibilityLabel={`Цикл: ${hint.title}, день ${phase.dayInCycle}`}
      className="rounded-3xl border border-[#F472B6]/25 bg-[#F472B6]/[0.06] p-4"
    >
      <View className="flex-row items-start gap-3">
        <Text className="text-[22px]">{hint.emoji}</Text>
        <View className="min-w-0 flex-1">
          <Text className="font-bold text-[14px] leading-snug text-bear-text">
            {`${hint.title} · день ${phase.dayInCycle}`}
            {toNext != null && toNext > 0 ? ` · до следующего ≈ ${toNext} дн.` : ''}
          </Text>
          <Text className="mt-0.5 font-sans text-[12px] leading-snug text-bear-sub">
            {hint.text}
          </Text>
        </View>
      </View>
    </View>
  )
}

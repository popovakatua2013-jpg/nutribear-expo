// Этап 1. «Твоя цель»: витринный первый экран — мишка, заголовок
// «Похудей, поддерживай или набирай вес» и выбор цели чипами прямо
// здесь (по макету). Выбор сразу пишется в стор, поэтому отдельный
// шаг «Какая у вас цель?» из цепочки удалён.

import { Image, Pressable, Text, View } from 'react-native'
import { Check } from 'lucide-react-native'
import { ObShell } from './ObShell'
import { useOnboardingStore } from '@/store/useOnboardingStore'

const BEAR = require('../../../../assets/images/bear.webp')

const CHIPS = [
  { id: 'lose', emoji: '🔥', label: 'Похудеть' },
  { id: 'maintain', emoji: '⚖️', label: 'Поддерживать' },
  { id: 'gain', emoji: '💪', label: 'Набрать вес' },
]

export function WelcomeStep({ onNext }) {
  const goalId = useOnboardingStore((s) => s.answers.goalId)
  const patch = useOnboardingStore((s) => s.patchAnswers)

  return (
    <ObShell title="NutriBear" onNext={onNext} nextDisabled={!goalId} nextLabel="Далее">
      <View className="items-center pt-1">
        {/* Мишка со свечением, как на макете */}
        <View className="h-[148px] w-[200px] items-center justify-center">
          <View className="absolute h-[92px] w-[176px] rounded-full bg-[#7C5CFC]/25" />
          <View className="absolute h-[60px] w-[132px] rounded-full bg-[#8B6CFF]/25" />
          <Image source={BEAR} style={{ width: 126, height: 126 }} resizeMode="contain" />
        </View>

        <Text className="mt-1 text-center font-extrabold text-[26px] leading-[32px] tracking-tight text-bear-text">
          Похудей, поддерживай{'\n'}
          <Text className="text-[#A78BFA]">или набирай вес</Text>
        </Text>
        <Text className="mx-auto mt-2 max-w-[280px] text-center font-sans text-[17.5px] leading-relaxed text-[#aab4d4]">
          Персональный план питания и тренировок под твои цели
        </Text>

        {/* Карточка «Твоя цель» с тремя чипами */}
        <View className="mt-5 w-full rounded-3xl border border-white/5 bg-bear-card p-4">
          <Text className="font-bold text-[17.5px] text-bear-sub2">Твоя цель</Text>
          <View className="mt-3 flex-row gap-2.5">
            {CHIPS.map((c) => (
              <GoalChip
                key={c.id}
                chip={c}
                active={goalId === c.id}
                onPress={() => patch({ goalId: c.id })}
              />
            ))}
          </View>
        </View>
      </View>
    </ObShell>
  )
}

function GoalChip({ chip, active, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={chip.label}
      accessibilityState={{ selected: active }}
      className="min-w-0 flex-1"
    >
      <View
        className={`items-center rounded-2xl border px-1 pb-3 pt-3.5 ${
          active ? 'border-[#A45BFF] bg-[#A45BFF]/10' : 'border-white/10 bg-white/[0.03]'
        }`}
      >
        {active ? (
          <View className="absolute right-1.5 top-1.5 h-[18px] w-[18px] items-center justify-center rounded-full bg-[#A45BFF]">
            <Check size={15} color="#FFFFFF" strokeWidth={3.2} />
          </View>
        ) : null}
        <Text className="text-[26px]">{chip.emoji}</Text>
        <Text
          numberOfLines={2}
          className={`mt-1.5 text-center font-bold text-[15px] leading-[18px] ${
            active ? 'text-white' : 'text-bear-sub'
          }`}
        >
          {chip.label}
        </Text>
      </View>
    </Pressable>
  )
}

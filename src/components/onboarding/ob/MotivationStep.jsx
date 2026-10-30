// Этап 2б. Мотивация: «Почему вы хотите похудеть?» — здоровье,
// уверенность, событие, энергия (повышает вовлечённость).

import { Text, View } from 'react-native'
import { ObShell } from './ObShell'
import { ChipMulti } from './ObOptions'
import { WHY_OPTIONS } from '@/lib/data/onboarding-options'
import { useOnboardingStore } from '@/store/useOnboardingStore'

export function MotivationStep({ onNext, onBack }) {
  const why = useOnboardingStore((s) => s.answers.why)
  const patch = useOnboardingStore((s) => s.patchAnswers)

  function toggle(id) {
    patch({ why: why.includes(id) ? why.filter((w) => w !== id) : [...why, id] })
  }

  return (
    <ObShell sub="Шаг 2 из 12" title="Почему вы хотите похудеть?" onBack={onBack} onNext={onNext}>
      <Text className="font-sans text-[13px] leading-relaxed text-bear-sub2">
        Выберите всё, что откликается. Мы будем напоминать о вашей цели,
        когда мотивация будет падать.
      </Text>
      <View className="mt-5">
        <ChipMulti options={WHY_OPTIONS} values={why} onToggle={toggle} />
      </View>
      <View className="mt-6 rounded-3xl border border-white/5 bg-bear-card p-4">
        <Text className="font-sans text-[12px] leading-relaxed text-[#aab4d4]">
          🐻 Мишка будет рядом: маленькие шаги каждый день дают больший
          результат, чем редкие рывки.
        </Text>
      </View>
    </ObShell>
  )
}

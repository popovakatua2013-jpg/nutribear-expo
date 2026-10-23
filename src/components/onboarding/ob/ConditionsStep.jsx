// Этап 7. Особые состояния (опционально): беременность / ГВ, диабет,
// СПКЯ, давление, GLP-1. Только флаги + обязательный дисклеймер —
// без медицинских советов и корректировок назначений.

import { Text, View } from 'react-native'
import { ObShell } from './ObShell'
import { ChipMulti } from './ObOptions'
import { SPECIAL_OPTIONS } from '@/lib/data/onboarding-options'
import { useOnboardingStore } from '@/store/useOnboardingStore'
import { DISCLAIMER } from '@/lib/data/disclaimer'

export function ConditionsStep({ onNext, onBack }) {
  const special = useOnboardingStore((s) => s.answers.special)
  const patch = useOnboardingStore((s) => s.patchAnswers)

  function toggle(id) {
    patch({
      special: special.includes(id)
        ? special.filter((x) => x !== id)
        : [...special, id],
    })
  }

  return (
    <ObShell sub="Шаг 7 из 12" title="Особые состояния" onBack={onBack} onNext={onNext}>
      <Text className="font-sans text-[13px] leading-relaxed text-bear-sub2">
        Отметьте, если что-то относится к вам — при беременности и ГВ мы
        не будем урезать калории. Можно пропустить.
      </Text>
      <View className="mt-5">
        <ChipMulti options={SPECIAL_OPTIONS} values={special} onToggle={toggle} />
      </View>
      <View className="mt-6 rounded-3xl border border-amber-400/20 bg-amber-400/[0.06] p-4">
        <Text className="font-sans text-[11px] leading-relaxed text-amber-200/90">
          ⚠️ {DISCLAIMER}
        </Text>
      </View>
    </ObShell>
  )
}

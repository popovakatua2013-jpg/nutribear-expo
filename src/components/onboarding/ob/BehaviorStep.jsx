// Этап 6. Поведенческие вопросы (Noom-style): ночной зажор, стресс,
// вода, алкоголь, прошлые диеты, сон. Нужны для коучинговых подсказок,
// а не для расчёта калорий.

import { Text, View } from 'react-native'
import { ObShell } from './ObShell'
import { PillRow } from './ObOptions'
import { BEHAVIOR } from '@/lib/data/onboarding-options'
import { useOnboardingStore } from '@/store/useOnboardingStore'

export function BehaviorStep({ onNext, onBack }) {
  const a = useOnboardingStore((s) => s.answers)
  const patch = useOnboardingStore((s) => s.patchAnswers)

  return (
    <ObShell sub="Шаг 6 из 12" title="Пара вопросов о привычках" onBack={onBack} onNext={onNext}>
      <View className="gap-4">
        {BEHAVIOR.map((item) => (
          <View key={item.key} className="rounded-3xl border border-white/5 bg-bear-card p-4">
            <PillRow
              label={item.q}
              options={item.options}
              value={a[item.key]}
              onChange={(v) => patch({ [item.key]: v })}
            />
          </View>
        ))}
        <Text className="px-1 font-sans text-[11px] leading-relaxed text-bear-dim">
          Ответы помогают мишке давать персональные подсказки и ничего не
          отправляют в интернет — всё остаётся на устройстве.
        </Text>
      </View>
    </ObShell>
  )
}

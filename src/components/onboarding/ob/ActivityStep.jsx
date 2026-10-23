// Этап 4. Активность: 5 уровней (от «сидячей работы» до тяжёлого
// физического труда) + уточнения: шаги в день и тренировки в неделю.

import { View } from 'react-native'
import { ObShell } from './ObShell'
import { OptionGrid, PillRow } from './ObOptions'
import { ACTIVITY_LEVELS, STEPS_OPTIONS, WORKOUT_OPTIONS } from '@/lib/data/onboarding-options'
import { useOnboardingStore } from '@/store/useOnboardingStore'

export function ActivityStep({ onNext, onBack }) {
  const a = useOnboardingStore((s) => s.answers)
  const patch = useOnboardingStore((s) => s.patchAnswers)

  return (
    <ObShell
      sub="Шаг 4 из 12"
      title="Уровень активности"
      onBack={onBack}
      onNext={onNext}
      nextDisabled={!a.activity}
    >
      <View className="gap-5">
        <OptionGrid options={ACTIVITY_LEVELS} value={a.activity} onChange={(id) => patch({ activity: id })} />
        <View className="gap-4 rounded-3xl border border-white/5 bg-bear-card p-4">
          <PillRow
            label="Сколько шагов в день ходите?"
            options={STEPS_OPTIONS}
            value={a.stepsDay}
            onChange={(v) => patch({ stepsDay: v })}
          />
          <PillRow
            label="Тренируетесь ли?"
            options={WORKOUT_OPTIONS}
            value={a.workouts}
            onChange={(v) => patch({ workouts: v })}
          />
        </View>
      </View>
    </ObShell>
  )
}

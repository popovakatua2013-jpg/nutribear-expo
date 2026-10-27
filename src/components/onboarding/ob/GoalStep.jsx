// Этап 2. Цель: похудеть / поддержать / набрать + целевой вес и темп
// (0.25 / 0.5 / 1 кг в неделю — от него считается дефицит).

import { Text, View } from 'react-native'
import { ObShell } from './ObShell'
import { OptionGrid, PillRow } from './ObOptions'
import { ObField } from './ObField'
import { GOAL_OPTIONS, PACE_OPTIONS } from '@/lib/data/onboarding-options'
import { useOnboardingStore } from '@/store/useOnboardingStore'
import { kgToLb } from '@/lib/data/onboarding'

export function GoalStep({ onNext, onBack }) {
  const a = useOnboardingStore((s) => s.answers)
  const patch = useOnboardingStore((s) => s.patchAnswers)
  const imperial = a.units === 'imperial'

  const displayTarget =
    a.targetWeightKg === '' || a.targetWeightKg == null
      ? ''
      : String(imperial ? kgToLb(a.targetWeightKg) : a.targetWeightKg)

  function setTarget(raw) {
    const v = Number(raw.replace(',', '.'))
    if (!raw) return patch({ targetWeightKg: '' })
    patch({ targetWeightKg: imperial ? Math.round((v / 2.20462) * 10) / 10 : v })
  }

  return (
    <ObShell
      sub="Шаг 2 из 12"
      title="Какая у вас цель?"
      onBack={onBack}
      onNext={onNext}
      nextDisabled={!a.goalId}
    >
      <View className="gap-5">
        <OptionGrid options={GOAL_OPTIONS} value={a.goalId} onChange={(id) => patch({ goalId: id })} />

        {a.goalId && a.goalId !== 'maintain' && (
          <View className="gap-4 rounded-3xl border border-white/5 bg-bear-card p-4">
            <ObField
              label="Целевой вес"
              value={displayTarget}
              onChange={setTarget}
              suffix={imperial ? 'фунт' : 'кг'}
              placeholder={imperial ? '130' : '60'}
            />
            <PillRow
              label="Темп (влияет на дефицит калорий)"
              options={PACE_OPTIONS}
              value={a.pace}
              onChange={(v) => patch({ pace: v })}
            />
          </View>
        )}
      </View>
    </ObShell>
  )
}

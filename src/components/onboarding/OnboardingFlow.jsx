// Онбординг NutriBear: 12 этапов полного флоу (приветствие → цель →
// данные → активность → привычки → поведение → состояния → план →
// пейволл → регистрация → разрешения → активация). Ответы хранятся
// анонимно на устройстве, регистрация — в конце флоу.

import { View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useOnboardingStore } from '@/store/useOnboardingStore'
import { ObProgress } from './ob/ObProgress'
import { WelcomeStep } from './ob/WelcomeStep'
import { GoalStep } from './ob/GoalStep'
import { MotivationStep } from './ob/MotivationStep'
import { BodyStep } from './ob/BodyStep'
import { ActivityStep } from './ob/ActivityStep'
import { DietStep } from './ob/DietStep'
import { BehaviorStep } from './ob/BehaviorStep'
import { ConditionsStep } from './ob/ConditionsStep'
import { RevealStep } from './ob/RevealStep'
import { PaywallStep } from './ob/PaywallStep'
import { RegisterStep } from './ob/RegisterStep'
import { PermissionsStep } from './ob/PermissionsStep'
import { ActivationStep } from './ob/ActivationStep'

const STEPS = [
  WelcomeStep, GoalStep, MotivationStep, BodyStep, ActivityStep,
  DietStep, BehaviorStep, ConditionsStep, RevealStep, PaywallStep,
  RegisterStep, PermissionsStep, ActivationStep,
]

export function OnboardingFlow() {
  const insets = useSafeAreaInsets()
  const step = useOnboardingStore((s) => s.step)
  const setStep = useOnboardingStore((s) => s.setStep)
  const Current = STEPS[Math.min(step, STEPS.length - 1)]

  const onNext = () => setStep(Math.min(STEPS.length - 1, step + 1))
  const onBack = () => setStep(Math.max(0, step - 1))

  return (
    <View
      className="flex-1 bg-bear-bg"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      <ObProgress current={step} total={STEPS.length} />
      <View key={step} className="flex-1">
        <Current onBack={onBack} onNext={onNext} />
      </View>
    </View>
  )
}

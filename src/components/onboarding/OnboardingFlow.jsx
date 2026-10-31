// Онбординг NutriBear: максимально быстрый опрос (9 этапов вместо 13):
// приветствие → цель → данные → активность → особые состояния → план →
// пейволл → разрешения → активация. Срезаны шаги-фильтры: «Мотивация»
// (не влияет на план), «Пищевые привычки» и «Привычки» (6 вопросов —
// дефолты уже в сторе), мок-«Регистрация» (тормозила вход; аккаунт
// появится, когда будет реальный бэкенд — подписки RevenueCat работают
// и без него). Ответы хранятся анонимно на устройстве.

import { View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useOnboardingStore } from '@/store/useOnboardingStore'
import { ObProgress } from './ob/ObProgress'
import { WelcomeStep } from './ob/WelcomeStep'
import { GoalStep } from './ob/GoalStep'
import { BodyStep } from './ob/BodyStep'
import { ActivityStep } from './ob/ActivityStep'
import { ConditionsStep } from './ob/ConditionsStep'
import { RevealStep } from './ob/RevealStep'
import { PaywallStep } from './ob/PaywallStep'
import { PermissionsStep } from './ob/PermissionsStep'
import { ActivationStep } from './ob/ActivationStep'

const STEPS = [
  WelcomeStep, GoalStep, BodyStep, ActivityStep, ConditionsStep,
  RevealStep, PaywallStep, PermissionsStep, ActivationStep,
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

// Онбординг NutriBear: быстрый запуск в 5 шагов (по витринному
// макету): «Твоя цель» → «Расскажи о себе» → «Отлично!» (план) →
// пейволл → разрешения. Цель выбирается чипом на первом экране,
// анкета собрана в один экран строками-карточками, финальный шаг
// «Всё готово!» удалён: план применяется сразу после разрешений,
// а первый завтрак пользователь добавит с Главной (подсказка).
// Ответы хранятся анонимно на устройстве.

import { View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useOnboardingStore } from '@/store/useOnboardingStore'
import { ObProgress } from './ob/ObProgress'
import { WelcomeStep } from './ob/WelcomeStep'
import { ProfileStep } from './ob/ProfileStep'
import { CompanionStep } from './ob/CompanionStep'
import { RevealStep } from './ob/RevealStep'
import { PaywallStep } from './ob/PaywallStep'
import { PermissionsStep } from './ob/PermissionsStep'

const STEPS = [WelcomeStep, ProfileStep, CompanionStep, RevealStep, PaywallStep, PermissionsStep]

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

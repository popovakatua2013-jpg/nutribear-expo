// Этап 12. Активация — первая цель: «Добавьте свой завтрак».
// Пользователи, залогировавшие еду в первой сессии, удерживаются
// лучше. Здесь план применяется к целям, профилю и дневнику.

import { Pressable, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { ObShell } from './ObShell'
import { useOnboardingStore } from '@/store/useOnboardingStore'
import { applyOnboarding } from '@/lib/data/onboarding-apply'

export function ActivationStep({ onBack }) {
  const answers = useOnboardingStore((s) => s.answers)
  const plan = useOnboardingStore((s) => s.plan)
  const finish = useOnboardingStore((s) => s.finish)

  function done(openBreakfast) {
    if (plan) applyOnboarding(answers, plan)
    finish({ openBreakfast })
  }

  return (
    <ObShell
      sub="Шаг 12 из 12"
      title="Всё готово!"
      onBack={onBack}
      footer={
        <View className="gap-2.5">
          <Pressable onPress={() => done(true)} className="overflow-hidden rounded-2xl">
            <LinearGradient start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} colors={['#4D7CFE', '#8B5CF6', '#A45BFF']}>
              <Text className="py-4 text-center font-bold text-[15px] text-white">
                🍳 Добавить свой завтрак
              </Text>
            </LinearGradient>
          </Pressable>
          <Pressable onPress={() => done(false)} className="py-2.5">
            <Text className="text-center font-semibold text-[13px] text-bear-sub2">
              Сначала осмотрюсь
            </Text>
          </Pressable>
        </View>
      }
    >
      <View className="min-h-[300px] items-center justify-center rounded-3xl border border-white/5 bg-bear-card p-6">
        <Text className="text-[64px]">🍳</Text>
        <Text className="mt-4 font-extrabold text-[20px] tracking-tight text-bear-text">
          Добавьте свой завтрак
        </Text>
        <Text className="mx-auto mt-2 max-w-[280px] text-center font-sans text-[13px] leading-relaxed text-[#aab4d4]">
          Первая запись в дневнике — самая важная. Мишка уже посчитал вашу
          норму калорий и БЖУ, осталось начать.
        </Text>
        {plan ? (
          <View className="mt-4 rounded-full bg-[#6c8cff]/10 px-4 py-2">
            <Text className="font-bold text-[13px] text-[#8dabff]">
              Ваша норма: {plan.targetKcal} ккал в день
            </Text>
          </View>
        ) : null}
      </View>
    </ObShell>
  )
}

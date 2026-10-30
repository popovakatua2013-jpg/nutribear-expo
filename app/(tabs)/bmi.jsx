// Экран «ИМТ»: датчик индекса массы тела, категории,
// динамика веса и рекомендации

import { ScrollView, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useProfileStore } from '@/store/useProfileStore'
import { calcBmi } from '@/lib/data/bmi'
import { BmiGauge } from '@/components/bmi/BmiGauge'
import { BmiLegend } from '@/components/bmi/BmiLegend'
import { BmiCalculator } from '@/components/bmi/BmiCalculator'
import { WeightCard } from '@/components/bmi/WeightCard'
import { AdviceCard } from '@/components/bmi/AdviceCard'

export default function BmiScreen() {
  const insets = useSafeAreaInsets()
  const heightCm = useProfileStore((s) => s.heightCm)
  const weightKg = useProfileStore((s) => s.weightKg)

  const bmi = calcBmi(weightKg, heightCm)

  return (
    <View className="flex-1 bg-bear-bg">
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingHorizontal: 16,
          gap: 16,
          paddingBottom: 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="font-extrabold text-[19px] tracking-tight text-bear-text">
          Индекс массы тела
        </Text>

        {/* Датчик + категории */}
        <View accessibilityLabel="Индекс массы тела" className="rounded-3xl border border-white/5 bg-bear-card p-5">
          <View className="items-center gap-5">
            <BmiGauge bmi={bmi} />
            <View className="w-full">
              <BmiLegend bmi={bmi} />
            </View>
          </View>
        </View>

        {/* Калькулятор по полным данным: пол, возраст, рост, вес, активность */}
        <BmiCalculator />

        <WeightCard />
        <AdviceCard bmi={bmi} />
      </ScrollView>
    </View>
  )
}

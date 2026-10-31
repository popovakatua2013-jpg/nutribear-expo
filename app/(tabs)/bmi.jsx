// Экран «ИМТ»: датчик индекса массы тела, категории,
// динамика веса и рекомендации

import { ScrollView, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Scale } from 'lucide-react-native'
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
        {/* Шапка экрана: иконка-чип + заголовок + подзаголовок */}
        <View className="flex-row items-center gap-3">
          <View className="h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5">
            <Scale size={19} color="#A78BFA" />
          </View>
          <View className="min-w-0 flex-1">
            <Text className="font-extrabold text-[19px] tracking-tight text-bear-text">
              Индекс массы тела
            </Text>
            <Text maxFontSizeMultiplier={1.25} className="font-sans text-[11.5px] text-bear-dim">
              Датчик, норма и динамика веса
            </Text>
          </View>
        </View>

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

// Экран «ИМТ» в стиле фото-макета: сверху переключатель-пилюли
// («Динамика веса» → скролл к карточке веса, «ИМТ и состав тела» — активна,
// «Подробнее» — советы), главный блок: крупный неоновый силуэт слева,
// градиентное кольцо ИМТ с легендой справа, карточки «Вес / Рост» внутри;
// блок «Рекомендации» с полосой идеального диапазона. Ниже — калькулятор,
// динамика веса и фото-прогресс.

import { useRef, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ChartColumn, ChevronRight, Scale } from 'lucide-react-native'
import { useProfileStore } from '@/store/useProfileStore'
import { calcBmi } from '@/lib/data/bmi'
import { BmiDonut } from '@/components/bmi/BmiDonut'
import { BmiLegend } from '@/components/bmi/BmiLegend'
import { BmiStatCards } from '@/components/bmi/BmiStatCards'
import { BmiAdvice } from '@/components/bmi/BmiAdvice'
import { BmiCalculator } from '@/components/bmi/BmiCalculator'
import { WeightCard } from '@/components/bmi/WeightCard'
import { ProgressPhotos } from '@/components/bmi/ProgressPhotos'
import { AdviceModal } from '@/components/bmi/AdviceCard'
import { BodySilhouette } from '@/components/bmi/BodySilhouette'

const CARD_STYLE = {
  backgroundColor: '#1D1240',
  borderColor: 'rgba(168,85,247,0.28)',
  borderWidth: 1,
}

// Неактивная пилюля переключателя
function NavPill({ label, icon, chevron, onPress, accessibilityLabel }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      className="min-w-0 shrink flex-row items-center gap-1 rounded-full border px-2 py-[7px] active:opacity-70"
      style={{ backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.10)' }}
    >
      {icon}
      <Text numberOfLines={1} maxFontSizeMultiplier={1.2} className="font-semibold text-[11px] text-[#D6DCF2]">
        {label}
      </Text>
      {chevron}
    </Pressable>
  )
}

export default function BmiScreen() {
  const insets = useSafeAreaInsets()
  const heightCm = useProfileStore((s) => s.heightCm)
  const weightKg = useProfileStore((s) => s.weightKg)
  const [detailsOpen, setDetailsOpen] = useState(false)

  const bmi = calcBmi(weightKg, heightCm)

  // Скролл к карточке «Динамика веса» по пилюле-переключателю
  const scrollRef = useRef(null)
  const weightY = useRef(0)

  const scrollToWeight = () =>
    scrollRef.current?.scrollTo({ y: Math.max(0, weightY.current - 8), animated: true })

  return (
    <View className="flex-1 bg-bear-bg">
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingHorizontal: 16,
          gap: 14,
          paddingBottom: 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Переключатель-пилюли как на макете */}
        <View accessibilityLabel="Разделы: ИМТ и динамика веса" className="flex-row items-center gap-1">
          <NavPill
            label="Динамика веса"
            icon={<ChartColumn size={12} color="#A78BFA" />}
            onPress={scrollToWeight}
            accessibilityLabel="Перейти к динамике веса"
          />
          {/* Активная пилюля: градиент + свечение */}
          <View
            accessibilityLabel="ИМТ и состав тела — текущий раздел"
            accessibilityState={{ selected: true }}
            className="flex-row items-center gap-1 overflow-hidden rounded-full border px-2 py-[7px]"
            style={{
              borderColor: 'rgba(216,180,254,0.45)',
              shadowColor: '#8B5CF6',
              shadowOpacity: 0.5,
              shadowRadius: 13,
            }}
          >
            <LinearGradient start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} colors={['#7C3AED', '#A855F7']}>
              <View className="flex-row items-center gap-1">
                <Scale size={13} color="#FFFFFF" />
                <Text numberOfLines={1} maxFontSizeMultiplier={1.2} className="font-bold text-[11px] text-white">
                  ИМТ и состав тела
                </Text>
              </View>
            </LinearGradient>
          </View>
          <NavPill
            label="Подробнее"
            chevron={<ChevronRight size={12} color="#A5AECB" />}
            onPress={() => setDetailsOpen(true)}
            accessibilityLabel="Подробнее о категориях и рекомендациях"
          />
        </View>

        {/* Главный блок как на макете: неоновый силуэт слева через всю
            высоту, справа — градиентное кольцо ИМТ с легендой, ниже —
            карточки «Вес» и «Рост» */}
        <View
          accessibilityLabel="ИМТ и состав тела"
          className="overflow-hidden rounded-[26px]"
          style={CARD_STYLE}
        >
          {/* Фиолетовое свечение фона, как на макете — насыщеннее */}
          <LinearGradient
            start={{ x: 0, y: 0 }}
            end={{ x: 0.85, y: 1 }}
            colors={['rgba(139,92,246,0.32)', 'rgba(139,92,246,0.10)', 'rgba(168,85,247,0.22)']}
            style={StyleSheet.absoluteFill}
          />
          <View className="flex-row gap-1.5 p-3">
            {/* Силуэт: крупный неоновый, тянется от кольца до низа карточек */}
            <View className="shrink-0" style={{ width: 74 }}>
              <View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  top: 4,
                  left: -22,
                  width: 118,
                  height: 118,
                  borderRadius: 59,
                  backgroundColor: 'rgba(139,92,246,0.28)',
                }}
              />
              <BodySilhouette width={74} height={200} />
            </View>
            {/* Правая колонка: кольцо + легенда, ниже — Вес и Рост */}
            <View className="min-w-0 flex-1 gap-2">
              <View className="flex-row flex-wrap items-center gap-1.5">
                <BmiDonut bmi={bmi} />
                <View className="min-w-0 flex-1" style={{ minWidth: 100 }}>
                  <BmiLegend bmi={bmi} />
                </View>
              </View>
              <BmiStatCards />
            </View>
          </View>
        </View>

        {/* Рекомендации + идеальный диапазон ИМТ */}
        <BmiAdvice bmi={bmi} onDetails={() => setDetailsOpen(true)} />

        {/* Калькулятор: пол, возраст, рост, вес */}
        <BmiCalculator />

        {/* Динамика веса (пилюля «Динамика веса» скроллит сюда) */}
        <View
          onLayout={(e) => {
            weightY.current = e.nativeEvent.layout.y
          }}
        >
          <WeightCard />
        </View>
        <ProgressPhotos />
      </ScrollView>

      <AdviceModal bmi={bmi} open={detailsOpen} onClose={() => setDetailsOpen(false)} />
    </View>
  )
}

// Экран «ИМТ» в стиле фото-макета: сверху переключатель-пилюли
// («Динамика веса» → скролл к карточке веса, «ИМТ и состав тела» — активна,
// «Подробнее» — советы), главный блок БЕЗ карточки — силуэт, кольцо ИМТ
// и легенда свободно парят на тёмном фоне (как на макете), ниже — тёмные
// карточки «Вес / Рост», блок «Рекомендации» с полосой идеального диапазона.
// Ниже — калькулятор, динамика веса и фото-прогресс.

import { useRef, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
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
          {/* Активная пилюля: чистый яркий градиент без обводки — как на макете */}
          <View
            accessibilityLabel="ИМТ и состав тела — текущий раздел"
            accessibilityState={{ selected: true }}
            className="overflow-hidden rounded-full"
            style={{
              shadowColor: '#8B5CF6',
              shadowOpacity: 0.55,
              shadowRadius: 12,
            }}
          >
            <LinearGradient
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              colors={['#A855F7', '#7C3AED']}
              style={{ paddingHorizontal: 9, paddingVertical: 7 }}
            >
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

        {/* Главный блок как на макете: БЕЗ карточки — силуэт, кольцо
            и легенда свободно парят на тёмном фоне; ниже — тёмные
            карточки «Вес» и «Рост» */}
        <View accessibilityLabel="ИМТ и состав тела">
          {/* Мягкое свечение справа сверху — как неоновые волны на макете */}
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: -20,
              right: -38,
              width: 175,
              height: 145,
              borderRadius: 88,
              backgroundColor: 'rgba(124,58,237,0.22)',
            }}
          />
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: 70,
              right: -24,
              width: 120,
              height: 210,
              borderRadius: 60,
              backgroundColor: 'rgba(139,92,246,0.10)',
            }}
          />
          <View className="flex-row gap-2">
            {/* Силуэт: стройная неоновая фигура через всю высоту блока,
                со свечением сверху и ореолом-платформой у ног */}
            <View className="shrink-0" style={{ width: 78 }}>
              <View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  top: -4,
                  left: -28,
                  width: 134,
                  height: 134,
                  borderRadius: 67,
                  backgroundColor: 'rgba(139,92,246,0.28)',
                }}
              />
              <BodySilhouette width={78} height={216} />
            </View>
            {/* Правая колонка: кольцо + легенда, ниже — Вес и Рост */}
            <View className="min-w-0 flex-1 gap-2.5">
              <View className="flex-row items-center gap-1.5">
                <BmiDonut bmi={bmi} />
                <View className="min-w-0 flex-1" style={{ minWidth: 96 }}>
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

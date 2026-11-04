// Карточка-цитата: «Маленькие шаги приводят к большим результатам»
// с фото мишки на скале в нижней части. Поверхность — в стиле вкладки
// «Тело» (фиолетовая bear-bodyCard); градиент перехода к фото подогнан
// под визуально непрозрачный цвет этой поверхности (#1A123A на фоне
// страницы — результат наложения rgba(29,18,64,0.82) на #0A1020)

import { Image, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'

const BEAR = require('../../../assets/images/banner-bear.webp')

export function QuoteCard() {
  return (
    <View
      accessibilityLabel="Мотивация"
      className="overflow-hidden rounded-3xl border border-bear-bodyLine bg-bear-bodyCard"
    >
      <Text className="p-5 font-extrabold text-[16px] leading-snug tracking-tight text-bear-text">
        Маленькие шаги приводят к большим результатам 💚
      </Text>

      <View className="mt-auto h-[150px] w-full">
        <Image
          source={BEAR}
          accessibilityLabel="Медвежонок сидит на скале и смотрит на закат"
          style={{ width: '100%', height: '100%' }}
          resizeMode="cover"
        />
        {/* Мягкий переход от карточки к фото */}
        <LinearGradient
          pointerEvents="none"
          colors={['#1A123A', 'rgba(26,18,58,0)']}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 40 }}
        />
      </View>
    </View>
  )
}

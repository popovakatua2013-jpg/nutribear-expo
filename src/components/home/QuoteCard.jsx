// Карточка-цитата: «Маленькие шаги приводят к большим результатам»
// с фото мишки на скале в нижней части

import { Image, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'

const BEAR = require('../../../assets/images/banner-bear.png')

export function QuoteCard() {
  return (
    <View
      accessibilityLabel="Мотивация"
      className="overflow-hidden rounded-3xl border border-bear-line bg-bear-card"
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
          colors={['#121B33', 'rgba(18,27,51,0)']}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 40 }}
        />
      </View>
    </View>
  )
}

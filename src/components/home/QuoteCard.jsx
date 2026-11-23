// Карточка-цитата: «Маленькие шаги приводят к большим результатам»
// с фото мишки на скале в нижней части. Рамка — градиент цвета активной
// темы (NeonCard, правка Кати 24.11 «сделай в точности как на скрине»);
// мягкий переход от карточки к фото — от поверхности card активной темы
// к прозрачному (в старой navy-теме цвет подгонялся вручную #1A123A).

import { Image, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { NeonCard } from '../ui/NeonCard'
import { useThemeColors } from '@/lib/use-theme'

const BEAR = require('../../../assets/images/banner-bear.webp')

export function QuoteCard() {
  const c = useThemeColors()
  return (
    <NeonCard
      accessibilityLabel="Мотивация"
      innerStyle={{ overflow: 'hidden' }}
    >
      <Text className="p-5 font-extrabold text-[21px] leading-snug tracking-tight text-bear-text">
        Маленькие шаги приводят к большим результатам 💚
      </Text>

      <View className="mt-auto h-[150px] w-full">
        <Image
          source={BEAR}
          accessibilityLabel="Медвежонок сидит на скале и смотрит на закат"
          style={{ width: '100%', height: '100%' }}
          resizeMode="cover"
        />
        {/* Мягкий переход от карточки к фото — цветом активной темы
            (полностью прозрачный стоп того же цвета — без серых
            примесей при интерполяции в transparent) */}
        <LinearGradient
          pointerEvents="none"
          colors={[c.card, `${c.card}00`]}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 40 }}
        />
      </View>
    </NeonCard>
  )
}

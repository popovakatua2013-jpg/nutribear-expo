// Баннер «Отчётов»: кубок, «Ты на правильном пути!» и выдра-талисман
// справа (левый край картинки растворяется градиентом в фон карточки)

import { Image, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { ChevronRight, Trophy } from 'lucide-react-native'

const OTTER = require('../../../../assets/images/otter.png')

export function ReportsBanner() {
  return (
    <View
      accessibilityLabel="Мотивация"
      className="flex-row items-center overflow-hidden rounded-2xl border border-white/5 bg-bear-card py-4 pl-4"
    >
      {/* Выдра — талисман отчётов (прибита справа, под контентом) */}
      <View pointerEvents="none" className="absolute bottom-0 right-0 top-0 w-[118px]">
        <Image
          source={OTTER}
          style={{ width: '100%', height: '100%', resizeMode: 'cover' }}
        />
        {/* Растворение левого края картинки в фон */}
        <LinearGradient
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          colors={['#121B33', 'rgba(18,27,51,0)']}
          style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: '45%' }}
        />
      </View>

      <View className="z-10 h-12 w-12 items-center justify-center rounded-2xl bg-[#fbbf24]/15">
        <Trophy size={24} color="#fbbf24" />
      </View>

      <View className="z-10 min-w-0 flex-1 pl-3.5">
        <Text className="font-bold text-[14px] leading-snug text-bear-text">
          Ты на правильном пути!
        </Text>
        <Text className="mt-0.5 font-sans text-[12px] leading-snug text-[#aab4d4]">
          Твои результаты растут каждую неделю. Продолжай!
        </Text>
      </View>

      <View className="z-10 pr-2">
        <ChevronRight size={20} color="#98A2C2" />
      </View>
    </View>
  )
}

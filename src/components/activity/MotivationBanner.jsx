// Мотивационный баннер: мишка на скале, закат в горах и цитата дня

import { Image, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Heart } from 'lucide-react-native'

const SCENE = require('../../../assets/images/banner-bear.png')

const QUOTE = 'Маленькие шаги приводят к большим результатам'

export function MotivationBanner() {
  return (
    <View
      accessibilityLabel="Мотивационная цитата"
      className="overflow-hidden rounded-3xl border border-white/5"
      style={{ height: 150 }}
    >
      <Image
        source={SCENE}
        style={{ width: '100%', height: '100%', resizeMode: 'cover' }}
      />

      {/* Градиент слева — чтобы текст читался */}
      <LinearGradient
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        colors={['rgba(10,16,32,0.95)', 'rgba(10,16,32,0.6)', 'transparent']}
        style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }}
      />
      <LinearGradient
        start={{ x: 0, y: 1 }}
        end={{ x: 0, y: 0 }}
        colors={['rgba(10,16,32,0.5)', 'transparent']}
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 40 }}
      />

      <View className="absolute inset-0 flex-row items-center px-5 py-6">
        <View className="max-w-[250px] flex-row items-end">
          <Text className="font-extrabold text-[17px] leading-snug text-white">
            {QUOTE}
          </Text>
          <View className="ml-1.5 mb-0.5">
            <Heart size={18} color="#4ade80" fill="#4ade80" />
          </View>
        </View>
      </View>
    </View>
  )
}

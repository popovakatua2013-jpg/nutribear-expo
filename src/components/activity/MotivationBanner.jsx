// Мотивационный баннер: мишка на скале, закат в горах и цитата дня.
// Правка Кати 25.11 («все уведомления тоже подогнать по цвету тем»):
// рамка и сердечко — токены темы. Правка Кати 28.11 («Медведь банер
// живёт отдельной жизнью»): затемняющие градиенты поверх фото были
// захардкожены тёмно-синими rgba(10,16,32,…) — на цветных темах баннер
// выпадал чужой синевой; теперь затемнение — полупрозрачный deep
// активной темы (в «Лайме» оливковый, в «Лазури» сине-глубокий и
// т.д.), рамка — тонкая line темы; читаемость белой цитаты
// сохраняется (deep почти чёрный у всех тёмных тем)

import { Image, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Heart } from 'lucide-react-native'
import { useThemeColors } from '@/lib/use-theme'
import { withAlpha } from '@/lib/themes'

const SCENE = require('../../../assets/images/banner-bear.webp')

const QUOTE = 'Маленькие шаги приводят к большим результатам'

export function MotivationBanner() {
  const c = useThemeColors()
  return (
    <View
      accessibilityLabel="Мотивационная цитата"
      className="overflow-hidden rounded-3xl"
      style={{ height: 150, borderWidth: 1, borderColor: c.line }}
    >
      <Image
        source={SCENE}
        style={{ width: '100%', height: '100%', resizeMode: 'cover' }}
      />

      {/* Градиент слева — чтобы текст читался; цвет — deep активной
          темы (28.11: был захардкожен тёмно-синий — баннер «жил
          отдельной жизнью» на цветных темах) */}
      <LinearGradient
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        colors={[withAlpha(c.deep, 0.95), withAlpha(c.deep, 0.6), 'transparent']}
        style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }}
      />
      <LinearGradient
        start={{ x: 0, y: 1 }}
        end={{ x: 0, y: 0 }}
        colors={[withAlpha(c.deep, 0.5), 'transparent']}
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 40 }}
      />

      <View className="absolute inset-0 flex-row items-center px-5 py-6">
        <View className="max-w-[250px] flex-row items-end">
          <Text className="font-extrabold text-[22px] leading-snug text-white">
            {QUOTE}
          </Text>
          <View className="ml-1.5 mb-0.5">
            <Heart size={20} color={c.good} fill={c.good} />
          </View>
        </View>
      </View>
    </View>
  )
}

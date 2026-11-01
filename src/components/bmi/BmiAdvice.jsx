// Блок «Рекомендации» как на фото-макете: звезда и заголовок, сердце
// и персональный совет по категории ИМТ, кнопка-лотос открывает подробные
// советы. Внизу — «Идеальный диапазон ИМТ»: градиентная полоса
// (голубой → зелёный → фиолетовый) с белым бегунком на позиции
// текущего ИМТ (шкала 15–35: норма приходится на зелёный участок).

import { Pressable, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Flower2, Heart, Star } from 'lucide-react-native'
import { bmiCategory, RECOMMENDATIONS } from '@/lib/data/bmi'

const CARD = {
  backgroundColor: '#181031',
  borderColor: 'rgba(168,85,247,0.20)',
  borderWidth: 1,
}

const BMI_MIN = 15
const BMI_MAX = 35

export function BmiAdvice({ bmi, onDetails }) {
  const cat = bmiCategory(bmi)
  const rec = RECOMMENDATIONS[cat.id]

  // Позиция бегунка на шкале 15–35
  const pos = Math.min(1, Math.max(0, ((bmi || BMI_MIN) - BMI_MIN) / (BMI_MAX - BMI_MIN)))

  return (
    <View accessibilityLabel="Рекомендации по индексу массы тела" className="rounded-[24px] p-4" style={CARD}>
      {/* Шапка: звезда + заголовок + кнопка-лотос (подробные советы) */}
      <View className="flex-row items-center gap-2">
        <Star size={18} color="#A78BFA" fill="#A78BFA" />
        <Text className="min-w-0 flex-1 font-bold text-[15px] tracking-tight text-white">
          Рекомендации
        </Text>
        <Pressable
          onPress={onDetails}
          accessibilityRole="button"
          accessibilityLabel="Открыть подробные рекомендации"
          className="h-[44px] w-[44px] items-center justify-center rounded-[14px] border active:opacity-70"
          style={{ backgroundColor: 'rgba(139,92,246,0.14)', borderColor: 'rgba(168,85,247,0.32)' }}
        >
          <Flower2 size={21} color="#C4B5FD" />
        </Pressable>
      </View>

      {/* Совет по категории */}
      <View className="mt-2 flex-row items-start gap-2">
        <View className="mt-[3px] shrink-0">
          <Heart size={15} color="#A855F7" fill="#A855F7" />
        </View>
        <Text
          accessibilityLabel={rec.main}
          maxFontSizeMultiplier={1.3}
          className="min-w-0 flex-1 font-sans text-[12.5px] leading-relaxed text-[#E4DBFF]"
        >
          {rec.main}
        </Text>
      </View>

      {/* Идеальный диапазон ИМТ: подпись + полоса с бегунком */}
      <View className="mt-3 border-t pt-3" style={{ borderTopColor: 'rgba(255,255,255,0.06)' }}>
        <View className="flex-row items-center justify-between">
          <Text maxFontSizeMultiplier={1.2} className="font-medium text-[11.5px] text-bear-sub">
            Идеальный диапазон ИМТ
          </Text>
          <Text className="font-bold text-[12.5px] text-white">18,5 – 24,9</Text>
        </View>
        <View className="mt-2.5">
          <View className="h-[9px] overflow-hidden rounded-full">
            <LinearGradient
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              colors={['#22D3EE', '#4ADE80', '#4ADE80', '#A855F7']}
              locations={[0, 0.18, 0.5, 1]}
              style={{ flex: 1 }}
            />
          </View>
          {/* Белый бегунок на позиции текущего ИМТ */}
          <View
            accessibilityLabel={`Ваш ИМТ ${Math.round(bmi * 10) / 10} — отметка на шкале идеального диапазона`}
            style={{
              position: 'absolute',
              left: `${pos * 100}%`,
              top: -4,
              width: 5,
              height: 17,
              borderRadius: 3,
              backgroundColor: '#FFFFFF',
              transform: [{ translateX: -2.5 }],
              shadowColor: '#FFFFFF',
              shadowOpacity: 0.9,
              shadowRadius: 6,
            }}
          />
        </View>
      </View>
    </View>
  )
}

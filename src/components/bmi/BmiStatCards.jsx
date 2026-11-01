// Карточки «Вес» и «Рост» как на фото-макете: фиолетовая чип-иконка,
// крупное значение и зелёная строка снизу. У веса — изменение за неделю
// (стрелка ↑/↓, зелёное если движение к норме, красное — от неё), тап по
// карточке открывает окно записи веса. У роста — «✓ Постоянный».

import { DeviceEventEmitter, Pressable, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Check, Ruler, TrendingDown, TrendingUp, Weight } from 'lucide-react-native'
import { useProfileStore } from '@/store/useProfileStore'
import { fmtDecimal, healthyRange, weekWeights } from '@/lib/data/bmi'

const CARD = {
  backgroundColor: '#181031',
  borderColor: 'rgba(168,85,247,0.20)',
  borderWidth: 1,
}

function Chip({ children }) {
  return (
    <View className="h-[34px] w-[34px] overflow-hidden rounded-[12px]">
      <LinearGradient start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} colors={['#8B5CF6', '#6D28D9']}>
        <View className="h-[34px] w-[34px] items-center justify-center">{children}</View>
      </LinearGradient>
    </View>
  )
}

export function BmiStatCards() {
  const heightCm = useProfileStore((s) => s.heightCm)
  const weightKg = useProfileStore((s) => s.weightKg)
  const weights = useProfileStore((s) => s.weights)

  // Изменение веса за неделю — как в карточке «Динамика веса»
  const week = weekWeights(weightKg, weights)
  const delta = Math.round((week[week.length - 1].kg - week[0].kg) * 10) / 10
  const { min, max } = healthyRange(heightCm)
  const towardNorm =
    (delta < 0 && week[week.length - 1].kg >= min) ||
    (delta > 0 && week[week.length - 1].kg <= max)
  const deltaColor = delta === 0 ? '#8B96B8' : towardNorm ? '#4ADE80' : '#FB7185'

  return (
    <View className="flex-row items-stretch gap-3">
      {/* Вес — тап открывает окно записи веса */}
      <Pressable
        onPress={() => DeviceEventEmitter.emit('nutribear/open-weight')}
        accessibilityRole="button"
        accessibilityLabel={`Вес ${fmtDecimal(weightKg)} кг — нажмите, чтобы записать новый вес`}
        className="min-w-0 flex-1 rounded-[22px] p-3.5 active:opacity-80"
        style={CARD}
      >
        <View className="flex-row items-center gap-2.5">
          <Chip>
            <Weight size={17} color="#FFFFFF" />
          </Chip>
          <Text className="font-semibold text-[12.5px] text-bear-sub">Вес</Text>
        </View>
        <View className="mt-2.5 flex-row items-baseline gap-1">
          <Text className="font-extrabold text-[23px] leading-none tracking-tight text-white">
            {fmtDecimal(weightKg)}
          </Text>
          <Text className="font-semibold text-[13px] text-bear-sub2">кг</Text>
        </View>
        <View className="mt-1.5 flex-row items-center gap-1">
          {delta < 0 && <TrendingDown size={13} color={deltaColor} />}
          {delta > 0 && <TrendingUp size={13} color={deltaColor} />}
          <Text className="font-bold text-[12px]" style={{ color: deltaColor }}>
            {delta === 0
              ? 'без изм.'
              : `${delta > 0 ? '+' : '−'}${fmtDecimal(Math.abs(delta))}`}
          </Text>
        </View>
      </Pressable>

      {/* Рост — справочный показатель */}
      <View accessibilityLabel={`Рост ${heightCm} сантиметров`} className="min-w-0 flex-1 rounded-[22px] p-3.5" style={CARD}>
        <View className="flex-row items-center gap-2.5">
          <Chip>
            <Ruler size={17} color="#FFFFFF" />
          </Chip>
          <Text className="font-semibold text-[12.5px] text-bear-sub">Рост</Text>
        </View>
        <View className="mt-2.5 flex-row items-baseline gap-1">
          <Text className="font-extrabold text-[23px] leading-none tracking-tight text-white">
            {heightCm}
          </Text>
          <Text className="font-semibold text-[13px] text-bear-sub2">см</Text>
        </View>
        <View className="mt-1.5 flex-row items-center gap-1">
          <Check size={13} color="#4ADE80" strokeWidth={3} />
          <Text className="font-bold text-[12px] text-[#4ADE80]">Постоянный</Text>
        </View>
      </View>
    </View>
  )
}

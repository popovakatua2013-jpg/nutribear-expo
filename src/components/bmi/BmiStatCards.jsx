// Компактные карточки «Вес» и «Рост» как на фото-макете — живут внутри
// главного блока, под кольцом ИМТ (справа от силуэта). Фиолетовая
// чип-иконка, крупное значение и строка снизу. У веса — изменение за
// неделю (стрелка ↑/↓, зелёное если движение к норме, красное — от неё),
// тап по карточке открывает окно записи веса. У роста — «✓ Постоянный».

import { DeviceEventEmitter, Pressable, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Check, Ruler, TrendingDown, TrendingUp, Weight } from 'lucide-react-native'
import { useProfileStore } from '@/store/useProfileStore'
import { fmtDecimal, healthyRange, weekWeights } from '@/lib/data/bmi'

// Заметно светлее фона блока — карточки «читаются» на нём, как на макете
const CARD = {
  backgroundColor: 'rgba(139,92,246,0.16)',
  borderColor: 'rgba(196,132,252,0.30)',
  borderWidth: 1,
}

function Chip({ children }) {
  return (
    <View className="h-[26px] w-[26px] overflow-hidden rounded-[9px]">
      <LinearGradient start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} colors={['#8B5CF6', '#6D28D9']}>
        <View className="h-[26px] w-[26px] items-center justify-center">{children}</View>
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
  // Пилюля под дельтой — как на макете («↑ +0,5» в цветной капсуле)
  const deltaBg =
    delta === 0
      ? 'rgba(139,150,184,0.14)'
      : towardNorm
        ? 'rgba(74,222,128,0.14)'
        : 'rgba(251,113,133,0.14)'

  return (
    <View className="flex-row items-stretch gap-2">
      {/* Вес — тап открывает окно записи веса */}
      <Pressable
        onPress={() => DeviceEventEmitter.emit('nutribear/open-weight')}
        accessibilityRole="button"
        accessibilityLabel={`Вес ${fmtDecimal(weightKg)} кг — нажмите, чтобы записать новый вес`}
        className="min-w-0 flex-1 rounded-[16px] p-2 active:opacity-80"
        style={CARD}
      >
        <View className="flex-row items-center gap-1.5">
          <Chip>
            <Weight size={13} color="#FFFFFF" />
          </Chip>
          <Text maxFontSizeMultiplier={1.1} numberOfLines={1} className="font-semibold text-[11.5px] text-bear-sub">
            Вес
          </Text>
        </View>
        <View className="mt-1.5 flex-row items-baseline gap-1">
          <Text maxFontSizeMultiplier={1.15} numberOfLines={1} className="font-extrabold text-[22px] leading-none tracking-tight text-white">
            {fmtDecimal(weightKg)}
          </Text>
          <Text className="font-semibold text-[11px] text-bear-sub2">кг</Text>
        </View>
        <View
          className="mt-1.5 flex-row items-center gap-1 self-start rounded-full px-1.5 py-[2px]"
          style={{ backgroundColor: deltaBg }}
        >
          {delta < 0 && <TrendingDown size={11} color={deltaColor} />}
          {delta > 0 && <TrendingUp size={11} color={deltaColor} />}
          <Text maxFontSizeMultiplier={1.1} numberOfLines={1} className="font-bold text-[10.5px]" style={{ color: deltaColor }}>
            {delta === 0
              ? 'без изм.'
              : `${delta > 0 ? '+' : '−'}${fmtDecimal(Math.abs(delta))}`}
          </Text>
        </View>
      </Pressable>

      {/* Рост — справочный показатель */}
      <View accessibilityLabel={`Рост ${heightCm} сантиметров`} className="min-w-0 flex-1 rounded-[16px] p-2" style={CARD}>
        <View className="flex-row items-center gap-1.5">
          <Chip>
            <Ruler size={13} color="#FFFFFF" />
          </Chip>
          <Text maxFontSizeMultiplier={1.1} numberOfLines={1} className="font-semibold text-[11.5px] text-bear-sub">
            Рост
          </Text>
        </View>
        <View className="mt-1.5 flex-row items-baseline gap-1">
          <Text maxFontSizeMultiplier={1.15} numberOfLines={1} className="font-extrabold text-[22px] leading-none tracking-tight text-white">
            {heightCm}
          </Text>
          <Text className="font-semibold text-[11px] text-bear-sub2">см</Text>
        </View>
        <View
          className="mt-1.5 flex-row items-center gap-1 self-start rounded-full px-1.5 py-[2px]"
          style={{ backgroundColor: 'rgba(74,222,128,0.12)' }}
        >
          <Check size={11} color="#4ADE80" strokeWidth={3} />
          <Text maxFontSizeMultiplier={1.05} numberOfLines={1} className="font-bold text-[10.5px] text-[#4ADE80]">
            Постоянный
          </Text>
        </View>
      </View>
    </View>
  )
}

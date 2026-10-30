// Итоги за выбранный период: шаги, калории, вода, опыт.
// Двухстрочные строки (название над значением) — компактно в узкой колонке.

import { Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Footprints, Flame, Droplets, Star } from 'lucide-react-native'

function StatRow({ Icon, iconColors, label, value }) {
  return (
    <View className="flex-row items-center gap-2.5 rounded-xl bg-white/[0.03] px-2.5 py-2">
      <LinearGradient
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        colors={iconColors}
        style={{ width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }}
      >
        <Icon size={16} color="#FFFFFF" />
      </LinearGradient>
      <View className="min-w-0 flex-1">
        <Text numberOfLines={1} className="font-sans text-[11px] text-bear-sub">
          {label}
        </Text>
        <Text numberOfLines={1} className="font-bold text-[14px] text-white">
          {value}
        </Text>
      </View>
    </View>
  )
}

export function SummaryStats({ totals }) {
  return (
    <View className="gap-2" accessibilityLabel="Итоги за период">
      <StatRow Icon={Footprints} iconColors={['#FBBF24', '#F97316']} label="Шаги" value={totals.steps.toLocaleString('ru-RU')} />
      <StatRow Icon={Flame} iconColors={['#F97316', '#E11D48']} label="Калории" value={totals.kcal.toLocaleString('ru-RU')} />
      <StatRow Icon={Droplets} iconColors={['#38BDF8', '#2563EB']} label="Вода" value={`${Math.round(totals.waterMl / 1000)} л`} />
      <StatRow Icon={Star} iconColors={['#A78BFA', '#9333EA']} label="Опыт" value={`+${totals.xp.toLocaleString('ru-RU')}`} />
    </View>
  )
}

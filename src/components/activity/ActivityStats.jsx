// Четыре карточки показателей за сегодня: шаги, калории, опыт, вода.
// Карточки шагов и воды интерактивные (кнопка «+»)

import { Pressable, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Footprints, Flame, Star, Droplets, Plus } from 'lucide-react-native'
import { formatNum } from '@/lib/format'

function StatCard({ colors, Icon, label, value, sub, onPlus, plusLabel }) {
  return (
    <View className={`relative rounded-2xl border p-3.5 ${colors.border} ${colors.bg}`}>
      <View className="flex-row items-center gap-2.5">
        <LinearGradient
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          colors={colors.icon}
          style={{ width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon size={20} color="#FFFFFF" />
        </LinearGradient>
        <View className="min-w-0 flex-1">
          <Text numberOfLines={1} className="font-medium text-[11px] text-bear-soft">
            {label}
          </Text>
          <Text className="font-extrabold text-[19px] leading-tight tracking-tight text-bear-text">
            {value}
          </Text>
          <Text numberOfLines={1} className="font-sans text-[10px] text-bear-sub2">
            {sub}
          </Text>
        </View>
      </View>

      {onPlus && (
        <Pressable
          onPress={onPlus}
          accessibilityLabel={plusLabel}
          className="absolute right-2.5 top-2.5 h-6 w-6 items-center justify-center rounded-full bg-white/10 active:opacity-70"
        >
          <Plus size={14} color="rgba(255,255,255,0.8)" />
        </Pressable>
      )}
    </View>
  )
}

export function ActivityStats({
  steps, kcal, burned, xp, waterPct, waterMl, stepsGoal, waterGoalMl,
  onAddSteps, onAddWater,
}) {
  const cards = [
    {
      colors: { border: 'border-emerald-400/20', bg: 'bg-emerald-400/[0.06]', icon: ['#34D399', '#16A34A'] },
      Icon: Footprints,
      label: 'Шаги сегодня',
      value: formatNum(steps),
      sub: `/ ${formatNum(stepsGoal)}`,
      onPlus: onAddSteps,
      plusLabel: 'Добавить 1 000 шагов',
    },
    {
      colors: { border: 'border-rose-400/20', bg: 'bg-rose-400/[0.06]', icon: ['#FB923C', '#E11D48'] },
      Icon: Flame,
      label: 'Калории',
      value: formatNum(kcal),
      sub: `сожжено +${formatNum(burned)}`,
    },
    {
      colors: { border: 'border-violet-400/20', bg: 'bg-violet-400/[0.06]', icon: ['#A78BFA', '#9333EA'] },
      Icon: Star,
      label: 'Опыт',
      value: `+${formatNum(xp)}`,
      sub: 'за сегодня!',
    },
    {
      colors: { border: 'border-sky-400/20', bg: 'bg-sky-400/[0.06]', icon: ['#38BDF8', '#2563EB'] },
      Icon: Droplets,
      label: 'Вода',
      value: `${waterPct}%`,
      sub: `из ${formatNum(waterGoalMl / 1000)} л · ${formatNum(waterMl)} мл`,
      onPlus: onAddWater,
      plusLabel: 'Выпить стакан воды',
    },
  ]

  return (
    <View className="gap-3">
      <View className="flex-row gap-3">
        {cards.slice(0, 2).map((c) => <StatCard key={c.label} {...c} />)}
      </View>
      <View className="flex-row gap-3">
        {cards.slice(2, 4).map((c) => <StatCard key={c.label} {...c} />)}
      </View>
    </View>
  )
}

// Четыре карточки показателей за сегодня: шаги, калории, активность, вода.
// У шагов и воды — аккуратная кнопка «+» в цвет карточки (36px,
// с обводкой): нажатие добавляет 1 000 шагов / стакан воды.
// Тап по карточке «Вода» открывает окно воды (добавить/изменить/удалить)

import { Pressable, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Footprints, Flame, Dumbbell, Droplets, Plus } from 'lucide-react-native'
import { formatNum } from '@/lib/format'

function StatCard({ colors, Icon, label, value, sub, onPlus, plusLabel, onPress }) {
  const Root = onPress ? Pressable : View
  return (
    <Root
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={onPress ? `Открыть: ${label}` : undefined}
      className={`flex-1 rounded-2xl border p-3.5 ${colors.border} ${colors.bg} ${onPress ? 'active:opacity-80' : ''}`}
    >
      <View className="flex-row items-center gap-2.5">
        <LinearGradient
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          colors={colors.icon}
          style={{ width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon size={19} color="#FFFFFF" />
        </LinearGradient>
        <View className="min-w-0 flex-1">
          <Text numberOfLines={1} maxFontSizeMultiplier={1.25} className="font-medium text-[11px] text-bear-soft">
            {label}
          </Text>
          <Text
            numberOfLines={1}
            maxFontSizeMultiplier={1.2}
            className="font-extrabold text-[19px] leading-tight tracking-tight text-bear-text"
          >
            {value}
          </Text>
          <Text numberOfLines={1} maxFontSizeMultiplier={1.25} className="font-sans text-[10px] text-bear-sub2">
            {sub}
          </Text>
        </View>

        {onPlus && (
          <Pressable
            onPress={onPlus}
            accessibilityRole="button"
            accessibilityLabel={plusLabel}
            hitSlop={6}
            className={`h-9 w-9 shrink-0 items-center justify-center rounded-full border active:opacity-70 ${colors.btn}`}
          >
            <Plus size={17} color={colors.tint} strokeWidth={2.5} />
          </Pressable>
        )}
      </View>
    </Root>
  )
}

export function ActivityStats({
  steps, kcal, burned, minutes, minutesGoal, minutesPct, waterPct, waterMl,
  stepsGoal, waterGoalMl,
  onAddSteps, onAddWater, onOpenWater,
}) {
  const cards = [
    {
      colors: {
        border: 'border-emerald-400/20',
        bg: 'bg-emerald-400/[0.06]',
        icon: ['#34D399', '#16A34A'],
        btn: 'border-emerald-400/30 bg-emerald-400/10',
        tint: '#34D399',
      },
      Icon: Footprints,
      label: 'Шаги сегодня',
      value: formatNum(steps),
      sub: `/ ${formatNum(stepsGoal)}`,
      onPlus: onAddSteps,
      plusLabel: 'Добавить 1 000 шагов',
    },
    {
      colors: {
        border: 'border-rose-400/20',
        bg: 'bg-rose-400/[0.06]',
        icon: ['#FB923C', '#E11D48'],
      },
      Icon: Flame,
      label: 'Калории',
      value: formatNum(kcal),
      sub: `сожжено +${formatNum(burned)}`,
    },
    {
      colors: {
        border: 'border-violet-400/20',
        bg: 'bg-violet-400/[0.06]',
        icon: ['#A78BFA', '#9333EA'],
      },
      Icon: Dumbbell,
      label: 'Активность',
      value: `${minutes} мин`,
      sub: `из ${formatNum(minutesGoal)} мин · ${minutesPct}%`,
    },
    {
      colors: {
        border: 'border-sky-400/20',
        bg: 'bg-sky-400/[0.06]',
        icon: ['#38BDF8', '#2563EB'],
        btn: 'border-sky-400/30 bg-sky-400/10',
        tint: '#38BDF8',
      },
      Icon: Droplets,
      label: 'Вода',
      value: `${waterPct}%`,
      sub: `из ${formatNum(waterGoalMl / 1000)} л · ${formatNum(waterMl)} мл`,
      onPlus: onAddWater,
      plusLabel: 'Выпить стакан воды',
      onPress: onOpenWater, // тап по карточке — окно воды (добавить/изменить/удалить)
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

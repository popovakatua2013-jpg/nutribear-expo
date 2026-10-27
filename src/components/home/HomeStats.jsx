// Четыре карточки показателей: Вода / Калории / Шаги / Активность

import { Pressable, Text, View } from 'react-native'
import {
  ChevronRight,
  Droplets,
  Dumbbell,
  Flame,
  Star,
} from 'lucide-react-native'
import { formatNum } from '@/lib/format'

// Ограничиваем рост текста при крупном системном шрифте,
// чтобы значения не обрезались и не «схлопывали» карточки
const MAX = 1.25

function StatCard({ tint, iconBg, Icon, label, value, target, sub, onClick }) {
  return (
    <Pressable
      onPress={onClick}
      accessibilityRole="button"
      className={`flex-1 rounded-2xl border p-3.5 active:opacity-80 ${tint}`}
    >
      {/* шапка: иконка + стрелка */}
      <View className="flex-row items-center justify-between gap-2">
        <View className={`h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
          <Icon size={20} color="#fff" />
        </View>
        <ChevronRight size={16} color="#5C668A" />
      </View>

      {/* подпись — на всю ширину карточки */}
      <Text
        numberOfLines={1}
        maxFontSizeMultiplier={MAX}
        className="mt-2.5 font-medium text-[11px] text-bear-soft"
      >
        {label}
      </Text>

      {/* значение — на всю ширину, при нехватке места переносится, а не обрезается */}
      <Text
        numberOfLines={2}
        maxFontSizeMultiplier={MAX}
        className="font-extrabold text-[19px] leading-tight tracking-tight text-bear-text"
      >
        {value}
        <Text maxFontSizeMultiplier={MAX} className="font-semibold text-[13px] text-bear-sub2"> / {target}</Text>
      </Text>

      {/* процент — на всю ширину */}
      <Text
        numberOfLines={2}
        maxFontSizeMultiplier={MAX}
        className="mt-1 font-sans text-[10px] text-bear-sub2"
      >
        {sub}
      </Text>
    </Pressable>
  )
}

export function HomeStats({ d, onGoActivity, onGoWater, onGoMeals }) {
  return (
    <View className="gap-3">
      <View className="flex-row gap-3">
        <StatCard
          tint="border-emerald-400/20 bg-emerald-400/10"
          iconBg="bg-emerald-500"
          Icon={Droplets}
          label="Вода"
          value={d.glasses}
          target={`${d.glassesGoal} ст.`}
          sub={`💧 ${d.ml} мл · ${d.waterPct}%`}
          onClick={onGoWater}
        />
        <StatCard
          tint="border-rose-400/20 bg-rose-400/10"
          iconBg="bg-rose-500"
          Icon={Flame}
          label="Калории"
          value={formatNum(d.kcal)}
          target={`${formatNum(d.kcalTarget)} ккал`}
          sub={`🔥 ${d.kcalPct}%`}
          onClick={onGoMeals}
        />
      </View>
      <View className="flex-row gap-3">
        <StatCard
          tint="border-violet-400/20 bg-violet-400/10"
          iconBg="bg-violet-500"
          Icon={Star}
          label="Шаги"
          value={formatNum(d.steps)}
          target={`${formatNum(d.stepsGoal)} шагов`}
          sub={`👣 ${d.stepsPct}%`}
          onClick={onGoActivity}
        />
        <StatCard
          tint="border-sky-400/20 bg-sky-400/10"
          iconBg="bg-sky-500"
          Icon={Dumbbell}
          label="Активность"
          value={d.minutes}
          target={`${d.minutesGoal} мин`}
          sub={`⏱ ${d.minutesPct}%`}
          onClick={onGoActivity}
        />
      </View>
    </View>
  )
}
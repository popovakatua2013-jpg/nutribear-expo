// Вечерняя подсказка на главной: с 19:00 мягко напоминает, если что-то
// из целей дня серьёзно отстаёт — вода или калории. Показываем только
// одну подсказку (вода важнее), если обе в порядке — не показываем ничего.

import { useEffect, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { formatNum } from '@/lib/format'

// Тикаем раз в минуту, чтобы карточка сама появлялась к вечеру
function useNowMinute() {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60 * 1000)
    return () => clearInterval(t)
  }, [])
  return now
}

export function EveningNudge({
  waterPct,
  waterMl,
  waterGoalMl,
  kcal,
  kcalGoal,
  onAddWater,
  onAddFood,
}) {
  const now = useNowMinute()
  const hour = new Date(now).getHours()

  // Подсказка живёт с 19:00 до полуночи
  if (hour < 19) return null

  const waterLeft = Math.max(0, (waterGoalMl || 0) - (waterMl || 0))
  const kcalPct = kcalGoal > 0 ? Math.round(((kcal || 0) / kcalGoal) * 100) : 100

  // Вода важнее: сначала догоняем её, потом говорим про еду
  let kind = null
  if (waterPct < 60 && waterLeft > 0) kind = 'water'
  else if (kcalPct < 50) kind = 'food'
  if (!kind) return null

  return (
    <View
      accessibilityLabel="Вечерняя подсказка"
      className="rounded-3xl border border-[#7B6CF6]/30 bg-[#7B6CF6]/10 p-4"
    >
      <View className="flex-row items-start gap-3">
        <Text className="text-[22px]">{kind === 'water' ? '💧' : '🍽'}</Text>
        <View className="min-w-0 flex-1">
          <Text className="font-bold text-[14px] leading-snug text-bear-text">
            {kind === 'water' ? 'Вечер — догоняем норму воды' : 'Похоже, вы мало ели сегодня'}
          </Text>
          <Text className="mt-0.5 font-sans text-[12px] leading-snug text-bear-sub">
            {kind === 'water'
              ? `Осталось ${formatNum(waterLeft)} мл из ${formatNum(waterGoalMl)}. Стакан воды — и мишка доволен!`
              : `Записано ${formatNum(kcal || 0)} из ${formatNum(kcalGoal)} ккал. Если ещё не ужинали — самое время!`}
          </Text>
          <Pressable
            onPress={kind === 'water' ? onAddWater : onAddFood}
            accessibilityRole="button"
            accessibilityLabel={
              kind === 'water' ? 'Добавить стакан воды' : 'Добавить ужин'
            }
            className="mt-2.5 self-start rounded-full bg-[#7B6CF6] px-4 py-2 active:opacity-80"
          >
            <Text className="font-bold text-[12px] text-white">
              {kind === 'water' ? '+ Стакан воды' : 'Добавить ужин'}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  )
}

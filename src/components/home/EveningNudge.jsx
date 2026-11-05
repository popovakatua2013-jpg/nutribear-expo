// Вечерняя подсказка на главной: с 19:00 мягко напоминает, если что-то
// из целей дня серьёзно отстаёт — вода или калории. Показываем только
// одну подсказку (вода важнее), если обе в порядке — не показываем ничего.
// Крестик справа сверху прячет подсказку до конца дня: дату закрытия
// помним в AsyncStorage, на следующий вечер напоминание снова работает.

import { useEffect, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { X } from 'lucide-react-native'
import { formatNum } from '@/lib/format'

const HIDDEN_KEY = 'nutribear.evening-nudge.hidden-date'

// Тикаем раз в минуту, чтобы карточка сама появлялась к вечеру
function useNowMinute() {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60 * 1000)
    return () => clearInterval(t)
  }, [])
  return now
}

// Локальная дата «ГГГГ-ММ-ДД»: закрытие живёт до полуночи
function todayStr(ms) {
  const d = new Date(ms)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
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

  // undefined — ещё читаем хранилище, строка — дата закрытия ('' — не закрывали)
  const [hiddenDate, setHiddenDate] = useState(undefined)

  useEffect(() => {
    let alive = true
    AsyncStorage.getItem(HIDDEN_KEY)
      .then((v) => {
        if (alive) setHiddenDate(v || '')
      })
      .catch(() => {
        if (alive) setHiddenDate('')
      })
    return () => {
      alive = false
    }
  }, [])

  // Крестик: спрятать до конца дня
  const close = () => {
    const today = todayStr(now)
    setHiddenDate(today)
    AsyncStorage.setItem(HIDDEN_KEY, today).catch(() => {})
  }

  // Подсказка живёт с 19:00 до полуночи
  if (hour < 19) return null

  // Пока читаем хранилище — рисуем ничего (нет мигания после закрытия)
  if (hiddenDate === undefined) return null
  // Уже закрывали сегодня — не показываем до завтра
  if (hiddenDate === todayStr(now)) return null

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
      <Pressable
        onPress={close}
        accessibilityRole="button"
        accessibilityLabel="Скрыть подсказку до завтра"
        hitSlop={10}
        className="absolute right-2 top-2 rounded-full p-1.5 active:opacity-60"
      >
        <X hitSlop={10} size={18} color="#A5AECB" />
      </Pressable>
      <View className="flex-row items-start gap-3">
        <Text className="text-[26px]">{kind === 'water' ? '💧' : '🍽'}</Text>
        <View className="min-w-0 flex-1 pr-5">
          <Text className="font-bold text-[17px] leading-snug text-bear-text">
            {kind === 'water' ? 'Вечер — догоняем норму воды' : 'Похоже, вы мало ели сегодня'}
          </Text>
          <Text className="mt-0.5 font-sans text-[14.5px] leading-snug text-bear-sub">
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
            <Text className="font-bold text-[14.5px] text-white">
              {kind === 'water' ? '+ Стакан воды' : 'Добавить ужин'}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  )
}

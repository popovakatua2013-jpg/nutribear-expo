// Карточка «Календарь»: месяц и дни недели видны всегда, сетка чисел
// свёрнута — раскрывается по шеврону

import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
} from 'lucide-react-native'
import { DaysGrid, WeekdayRow } from './CalendarGrid'

const MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
]

export function HomeCalendar() {
  const today = new Date()
  const [view, setView] = useState({ y: today.getFullYear(), m: today.getMonth() })
  const [open, setOpen] = useState(false)

  const shift = (delta) =>
    setView(({ y, m }) => {
      const d = new Date(y, m + delta, 1)
      return { y: d.getFullYear(), m: d.getMonth() }
    })

  const chevronBtn =
    'h-8 w-8 items-center justify-center rounded-full active:bg-white/5'

  return (
    <View
      accessibilityLabel="Календарь"
      className="rounded-3xl border border-bear-line bg-bear-card p-5"
    >
      <View className="flex-row items-center gap-2">
        <CalendarDays size={18} color="#A78BFA" />
        <Text className="font-bold text-[15px] tracking-tight text-bear-text">
          Календарь
        </Text>
      </View>

      <View className="mt-3 flex-row items-center justify-between">
        <Pressable
          onPress={() => shift(-1)}
          accessibilityLabel="Предыдущий месяц"
          accessibilityRole="button"
          className={chevronBtn}
        >
          <ChevronLeft size={16} color="#8A94B3" />
        </Pressable>
        <Text className="font-bold text-[14px] tracking-tight text-bear-text">
          {MONTHS[view.m]} {view.y}
        </Text>
        <View className="flex-row items-center">
          <Pressable
            onPress={() => shift(1)}
            accessibilityLabel="Следующий месяц"
            accessibilityRole="button"
            className={chevronBtn}
          >
            <ChevronRight size={16} color="#8A94B3" />
          </Pressable>
          <Pressable
            onPress={() => setOpen((v) => !v)}
            accessibilityLabel={open ? 'Свернуть календарь' : 'Развернуть календарь'}
            accessibilityRole="button"
            className={chevronBtn}
          >
            {open ? (
              <ChevronUp size={16} color="#8A94B3" />
            ) : (
              <ChevronDown size={16} color="#8A94B3" />
            )}
          </Pressable>
        </View>
      </View>

      <View className="mt-2">
        <WeekdayRow />
        {open && (
          <View className="pt-1.5">
            <DaysGrid view={view} today={today} />
          </View>
        )}
      </View>
    </View>
  )
}

// Компактная приветственная шапка главной: круглый аватар с мишкой,
// приветствие по времени суток («Доброе утро») и чип с сегодняшней
// датой. Строку статуса под приветствием («До нормы осталось N ккал»)
// убрали по отзыву Кати — она дублировала блок «Осталось N ккал»
// в сводке «Съедено за сегодня». Намеренно маленькая (~44 px) —
// мишка встречает, но не съедает экран.

import { Image, Text, View } from 'react-native'
import { WifiOff } from 'lucide-react-native'
import { useIsOnline } from '@/lib/useIsOnline'

const BEAR = require('../../../assets/images/bear.webp')

const WEEKDAYS = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб']
const MONTHS = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']

function greetingByHour(h) {
  if (h < 5) return 'Доброй ночи'
  if (h < 12) return 'Доброе утро'
  if (h < 18) return 'Добрый день'
  return 'Добрый вечер'
}

export function Greeting() {
  const now = new Date()
  const online = useIsOnline()
  const dateLabel = `${WEEKDAYS[now.getDay()]}, ${now.getDate()} ${MONTHS[now.getMonth()]}`

  return (
    <View
      accessibilityLabel="Приветствие"
      className="flex-row items-center gap-3"
    >
      <View className="h-11 w-11 shrink-0 overflow-hidden rounded-full border border-white/10 bg-white/5">
        <Image
          source={BEAR}
          accessibilityLabel="Медвежонок — маскот дневника"
          resizeMode="cover"
          style={{ width: '100%', height: '100%' }}
        />
      </View>

      <View className="min-w-0 flex-1">
        <Text
          numberOfLines={1}
          maxFontSizeMultiplier={1.25}
          className="font-extrabold text-[22px] leading-tight tracking-tight text-bear-text"
        >
          {greetingByHour(now.getHours())}! 👋
        </Text>
      </View>

      {/* Чипы справа: «Офлайн» (когда нет сети) над чипом с датой */}
      <View className="shrink-0 items-end gap-1">
        {!online && (
          <View
            accessibilityLabel="Нет подключения к интернету"
            className="flex-row items-center gap-1 rounded-full border border-[#F59E0B]/40 bg-[#F59E0B]/10 px-2 py-1.5"
          >
            <WifiOff size={15} color="#FBBF24" strokeWidth={2.5} />
            <Text maxFontSizeMultiplier={1.2} className="font-bold text-[15px] text-[#FBBF24]">
              Офлайн
            </Text>
          </View>
        )}
        <View className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
          <Text maxFontSizeMultiplier={1.25} className="font-medium text-[15px] text-bear-soft">
            {dateLabel}
          </Text>
        </View>
      </View>
    </View>
  )
}

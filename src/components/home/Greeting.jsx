// Компактная приветственная шапка главной: круглый аватар с мишкой,
// приветствие по времени суток («Доброе утро!»), живой статус дневника
// («До нормы осталось N ккал») и чип с сегодняшней датой.
// Намеренно маленькая (~56 px) — мишка встречает, но не съедает экран.

import { Image, Text, View } from 'react-native'
import { formatNum } from '@/lib/format'

const BEAR = require('../../../../assets/images/bear.png')

const WEEKDAYS = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб']
const MONTHS = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']

function greetingByHour(h) {
  if (h < 5) return 'Доброй ночи'
  if (h < 12) return 'Доброе утро'
  if (h < 18) return 'Добрый день'
  return 'Добрый вечер'
}

// Короткий статус по прогрессу дня — младший брат текста из BearHero
function statusLine(consumed, target) {
  if (consumed <= 0) return 'Дневник пока пуст — добавьте первое блюдо 🍽'
  const pct = target > 0 ? (consumed / target) * 100 : 0
  if (pct < 50) return `Отличное начало — ${formatNum(consumed)} ккал 💪`
  if (pct < 100) {
    const left = Math.max(0, Math.round(target - consumed))
    return `До нормы осталось ${formatNum(left)} ккал`
  }
  if (pct <= 115) return 'Норма выполнена — отличная работа! 🎉'
  return 'Небольшой перебор — завтра получится!'
}

export function Greeting({ consumed = 0, target = 0 }) {
  const now = new Date()
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
          className="font-extrabold text-[17px] leading-tight tracking-tight text-bear-text"
        >
          {greetingByHour(now.getHours())}! 👋
        </Text>
        <Text
          numberOfLines={1}
          maxFontSizeMultiplier={1.25}
          className="mt-0.5 font-sans text-[11.5px] leading-snug text-bear-dim"
        >
          {statusLine(consumed, target)}
        </Text>
      </View>

      <View className="shrink-0 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
        <Text maxFontSizeMultiplier={1.25} className="font-medium text-[11px] text-bear-soft">
          {dateLabel}
        </Text>
      </View>
    </View>
  )
}

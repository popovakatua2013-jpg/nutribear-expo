// Сетка календаря: ряд дней недели и клетки чисел с подсветкой сегодня

import { Text, View } from 'react-native'

export const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

export function WeekdayRow() {
  return (
    <View className="flex-row" accessibilityElementsHidden>
      {WEEKDAYS.map((w) => (
        <View key={w} className="flex-1 items-center">
          <Text className="font-medium text-[10px] text-bear-dim">{w}</Text>
        </View>
      ))}
    </View>
  )
}

export function DaysGrid({ view, today }) {
  // Пустые клетки до 1-го числа (неделя с понедельника)
  const lead = (new Date(view.y, view.m, 1).getDay() + 6) % 7
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate()
  const cells = [
    ...Array(lead).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  const isToday = (day) =>
    day === today.getDate() &&
    view.m === today.getMonth() &&
    view.y === today.getFullYear()

  return (
    <View accessibilityLabel="Дни месяца">
      <View className="flex-row flex-wrap gap-y-1.5">
        {cells.map((day, i) =>
          day == null ? (
            <View key={`e-${i}`} className="w-[14.28%]" />
          ) : (
            <View key={day} className="w-[14.28%] items-center">
              <View
                className="h-7 w-7 items-center justify-center rounded-lg"
                style={isToday(day) ? { backgroundColor: '#7B6CF6' } : null}
              >
                <Text
                  className={`font-semibold text-[11.5px] ${
                    isToday(day) ? 'text-white' : 'text-bear-soft'
                  }`}
                >
                  {day}
                </Text>
              </View>
            </View>
          )
        )}
      </View>
    </View>
  )
}

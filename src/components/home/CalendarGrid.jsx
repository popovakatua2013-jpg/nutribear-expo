// Сетка календаря-статистики: цвет клетки = соблюдение нормы калорий
// (зелёный — в норме, розовый — перебор), точки под числом = привычки
// (синяя — норма воды, оранжевая — тренировка, зелёная — взвешивание).
// Тап по дню (не позже сегодня) открывает сводку дня.

import { Pressable, Text, View } from 'react-native'
import { cellKey, dayData, dayMarkers, dayStatus } from '@/lib/data/calendar'

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

// Подложка клетки по статусу калорий
const BG = {
  ok: '#34D3992E',
  over: '#FB71852E',
}

const DOTS = [
  { key: 'water', color: '#38BDF8' },
  { key: 'workout', color: '#FB923C' },
  { key: 'weight', color: '#4ADE80' },
]

const CELL_H = 40

export function DaysGrid({
  view, today, history, goals, weights, exLogs, foodHistory, firstKey, todayLive, onSelectDay,
}) {
  // Пустые клетки до 1-го числа (неделя с понедельника)
  const lead = (new Date(view.y, view.m, 1).getDay() + 6) % 7
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate()
  const cells = [
    ...Array(lead).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  return (
    <View accessibilityLabel="Дни месяца">
      <View className="flex-row flex-wrap">
        {cells.map((day, i) => {
          if (day == null) {
            return <View key={`e-${i}`} className="w-[14.28%]" style={{ height: CELL_H }} />
          }
          const key = cellKey(view.y, view.m, day)
          const d = dayData(history, key, todayLive)
          const status = dayStatus(d, goals.kcal)
          const markers = dayMarkers(d, { weights, exLogs, key, waterGoalMl: goals.waterMl })
          const isToday = key === todayKey
          const isFuture = key > todayKey
          // До старта дневника (firstKey) клетки бледные — данных там ещё нет
          const isBefore = Boolean(firstKey) && key < firstKey
          const tappable = !isFuture && !isBefore && Boolean(onSelectDay)

          return (
            <View key={day} className="w-[14.28%] items-center" style={{ height: CELL_H }}>
              <Pressable
                disabled={!tappable}
                onPress={() => onSelectDay && onSelectDay(key)}
                accessibilityLabel={`Сводка за ${day} число`}
                accessibilityRole={tappable ? 'button' : undefined}
                className="h-7 w-7 items-center justify-center rounded-lg"
                style={{ backgroundColor: isToday ? '#7B6CF6' : BG[status] || 'transparent' }}
              >
                <Text
                  className={`font-semibold text-[11.5px] ${
                    isToday
                      ? 'text-white'
                      : status
                        ? 'text-bear-text'
                        : isBefore
                          ? 'text-bear-dim'
                          : 'text-bear-soft'
                  }`}
                >
                  {day}
                </Text>
              </Pressable>
              <View className="flex-row items-center" style={{ height: 5, marginTop: 2 }}>
                {DOTS.filter((dot) => markers[dot.key]).map((dot) => (
                  <View
                    key={dot.key}
                    style={{
                      width: 4, height: 4, borderRadius: 2,
                      backgroundColor: dot.color, marginHorizontal: 1,
                    }}
                  />
                ))}
              </View>
            </View>
          )
        })}
      </View>
    </View>
  )
}
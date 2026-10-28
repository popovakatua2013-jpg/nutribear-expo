// Компактная строка недели для свёрнутого календаря: только числа текущей
// недели с теми же цветами и точками, что в месячной сетке. Тап по дню —
// сводка. Кнопка ⌄ в шапке календаря разворачивает полный месяц.
// Цвета и точки дублируют CalendarGrid.jsx — держим синхронно.

import { Pressable, Text, View } from 'react-native'
import { cellKey, dayData, dayMarkers, dayStatus } from '@/lib/data/calendar'

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

const CELL_H = 30

export function WeekStrip({
  today, history, goals, weights, exLogs, foodHistory, firstKey, onSelectDay,
}) {
  // Понедельник текущей недели (неделя с понедельника — как в месячной сетке)
  const monday = new Date(today)
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7))

  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  return (
    <View accessibilityLabel="Текущая неделя">
      <View className="flex-row">
        {Array.from({ length: 7 }, (_, i) => {
          const d = new Date(monday)
          d.setDate(monday.getDate() + i)
          const key = cellKey(d.getFullYear(), d.getMonth(), d.getDate())
          const row = dayData(history, key, null)
          const status = dayStatus(row, goals.kcal)
          const markers = dayMarkers(row, { weights, exLogs, key, waterGoalMl: goals.waterMl })
          const isToday = key === todayKey
          const isFuture = key > todayKey
          // До старта дневника (firstKey) клетки бледные — как в месячной сетке
          const isBefore = Boolean(firstKey) && key < firstKey
          const tappable = !isFuture && !isBefore && Boolean(onSelectDay)

          return (
            <View key={key} className="w-[14.28%] items-center" style={{ height: CELL_H }}>
              <Pressable
                disabled={!tappable}
                onPress={() => onSelectDay && onSelectDay(key)}
                accessibilityLabel={`Сводка за ${d.getDate()} число`}
                accessibilityRole={tappable ? 'button' : undefined}
                className="h-6 w-6 items-center justify-center rounded-lg"
                style={{ backgroundColor: isToday ? '#7B6CF6' : BG[status] || 'transparent' }}
              >
                <Text
                  className={`font-semibold text-[11px] ${
                    isToday
                      ? 'text-white'
                      : status
                        ? 'text-bear-text'
                        : isBefore
                          ? 'text-bear-dim'
                          : 'text-bear-soft'
                  }`}
                >
                  {d.getDate()}
                </Text>
              </Pressable>
              <View className="flex-row items-center" style={{ height: 4, marginTop: 1 }}>
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
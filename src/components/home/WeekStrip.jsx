// Компактная строка недели для свёрнутого календаря в стиле «тетради
// в линейку»: день недели и число в одной строке, статус нормы калорий —
// цветом цифры (зелёный/розовый), сегодня — фиолетовым с подчёркиванием.
// Точки под числом = привычки (синяя — вода, оранжевая — тренировка,
// зелёная — взвешивание). Тап по дню — сводка.
// Цвета и точки дублируют CalendarGrid.jsx — держим синхронно.

import { Pressable, Text, View } from 'react-native'
import { cellKey, dayData, dayMarkers, dayStatus } from '@/lib/data/calendar'
import { WEEKDAYS } from './CalendarGrid'

// Цвет цифры по статусу калорий (без подложек — чтобы строка была тонкой)
const NUM = {
  ok: '#6EE7B7',
  over: '#FDA4AF',
}

const TODAY = '#7B6CF6'
const DIM_DAY = '#8B96B8' // до старта дневника
const PLAIN_DAY = '#AAB4D4'

const DOTS = [
  { key: 'water', color: '#38BDF8' },
  { key: 'workout', color: '#FB923C' },
  { key: 'weight', color: '#4ADE80' },
]

export function WeekStrip({
  today, history, goals, weights, exLogs, foodHistory, firstKey, onSelectDay,
}) {
  // Понедельник текущей недели (неделя с понедельника — как в месячной сетке)
  const monday = new Date(today)
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7))

  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  return (
    <View accessibilityLabel="Текущая неделя" className="flex-row">
      {Array.from({ length: 7 }, (_, i) => {
        const d = new Date(monday)
        d.setDate(monday.getDate() + i)
        const key = cellKey(d.getFullYear(), d.getMonth(), d.getDate())
        const row = dayData(history, key, null)
        const status = dayStatus(row, goals.kcal)
        const markers = dayMarkers(row, { weights, exLogs, key, waterGoalMl: goals.waterMl })
        const isToday = key === todayKey
        const isFuture = key > todayKey
        // До старта дневника (firstKey) дни бледные — как в месячной сетке
        const isBefore = Boolean(firstKey) && key < firstKey
        const tappable = !isFuture && !isBefore && Boolean(onSelectDay)

        const numColor = isToday
          ? TODAY
          : status
            ? NUM[status]
            : isBefore
              ? DIM_DAY
              : PLAIN_DAY

        return (
          <Pressable
            key={key}
            disabled={!tappable}
            onPress={() => onSelectDay && onSelectDay(key)}
            accessibilityLabel={`Сводка за ${d.getDate()} число`}
            accessibilityRole={tappable ? 'button' : undefined}
            hitSlop={4}
            className="flex-1 items-center"
          >
            {/* «Пн 27» в одну строку, как запись в тетради */}
            <View className="flex-row items-baseline">
              <Text className="font-medium text-[9px]" style={{ color: '#8B96B8' }}>
                {WEEKDAYS[i]}
              </Text>
              <Text
                className="ml-[3px] font-bold text-[12px] leading-[16px]"
                style={{ color: numColor }}
              >
                {d.getDate()}
              </Text>
            </View>

            {/* точки-привычки (слот фиксированной высоты — колонки ровные) */}
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

            {/* подчёркивание «сегодня» — как выделение ручкой */}
            {isToday && (
              <View
                style={{
                  width: 20, height: 2, borderRadius: 1,
                  backgroundColor: TODAY, marginTop: 1,
                }}
              />
            )}
          </Pressable>
        )
      })}
    </View>
  )
}

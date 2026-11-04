// Календарь-теплокарта «Отчётов»: каждый день периода — клетка,
// цвет — выполнение дневной цели по выбранному показателю (тот же
// реестр METRICS и тот же metricId, что у графика «Сводки» — дублирующих
// переключателей нет). Тап по клетке открывает сводку этого дня
// (DayDetailsModal). Сетка как в GitHub: столбцы — недели, строки —
// дни недели Пн…Вс; у калорий «перебор» подсвечен красным.

import { useMemo } from 'react'
import { Pressable, Text, View } from 'react-native'
import { METRICS } from '@/lib/data/metrics'
import { dayLevel } from '@/lib/data/reports'
import { useGoalsStore } from '@/store/useGoalsStore'

const CELL = 15 // размер клетки
const GAP = 3 // промежуток
const WEEK_ROWS = ['Пн', '', 'Ср', '', 'Пт', '', 'Вс'] // как в GitHub: через одну

// Ключ цели в useGoalsStore для каждого показателя реестра
const GOAL_KEY = { steps: 'steps', kcal: 'kcal', waterMl: 'waterMl', burned: 'burnKcal' }

// Цвет клетки по уровню дня
function levelColor(metric, level) {
  if (level === 'met') return metric.color
  if (level === 'mid') return `${metric.color}99`
  if (level === 'low') return `${metric.color}40`
  if (level === 'over') return '#f87171'
  return 'rgba(255,255,255,0.07)'
}

export function HeatmapCard({ rows = [], metricId = 'steps', onPickDay = () => {} }) {
  const goals = useGoalsStore((s) => s.goals)
  const metric = METRICS.find((m) => m.key === metricId) || METRICS[0]

  // Клетки по неделям: сначала пустые места первой недели (до понедельника),
  // затем дни периода; каждый 7-й столбец — одна неделя
  const cells = useMemo(() => {
    if (!rows.length || !rows[0]?.key) return []
    const first = new Date(`${rows[0].key}T00:00:00`)
    const offset = (first.getDay() + 6) % 7 // JS: вс=0 → Пн=0
    const pad = Array.from({ length: offset }, () => null)
    return [...pad, ...rows]
  }, [rows])
  const nCols = Math.max(1, Math.ceil(cells.length / 7))

  // Легенда: у калорий «больше» не значит «лучше» — своя шкала
  const legend =
    metric.key === 'kcal'
      ? [
          ['met', 'в норме'],
          ['mid', 'до +15%'],
          ['over', 'перебор'],
          ['none', 'нет записей'],
        ]
      : [
          ['met', 'цель'],
          ['mid', 'больше половины'],
          ['low', 'были записи'],
          ['none', 'нет записей'],
        ]

  return (
    <View
      accessibilityLabel="Календарь периода"
      className="rounded-3xl border border-white/5 bg-bear-card p-5"
    >
      <View className="flex-row items-center justify-between gap-2">
        <View className="min-w-0 flex-1">
          <Text className="font-bold text-[15px] tracking-tight text-bear-text">
            {`${metric.label} по дням`}
          </Text>
          <Text className="mt-0.5 font-sans text-[10.5px] leading-snug text-bear-sub">
            Цвет клетки — выполнение дневной цели · тап по дню — сводка дня
          </Text>
        </View>
      </View>

      {/* Сетка: подписи дней недели + клетки */}
      <View className="mt-3 flex-row">
        <View style={{ width: 16, marginRight: GAP }}>
          {WEEK_ROWS.map((w, i) => (
            <Text
              key={i}
              className="font-sans text-[8px] text-bear-dim"
              style={{ height: CELL, lineHeight: CELL }}
            >
              {w}
            </Text>
          ))}
        </View>
        <View
          style={{
            width: nCols * (CELL + GAP),
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: GAP,
          }}
        >
          {cells.map((row, i) =>
            row ? (
              <Pressable
                key={row.key}
                onPress={() => onPickDay(row.key)}
                accessibilityRole="button"
                accessibilityLabel={`${row.label}: ${metric.fmt(row[metric.key] || 0)}`}
                style={{
                  width: CELL,
                  height: CELL,
                  borderRadius: 4,
                  backgroundColor: levelColor(
                    metric,
                    dayLevel(metric.key, row[metric.key] || 0, goals[GOAL_KEY[metric.key]] || 0)
                  ),
                  borderWidth: i === cells.length - 1 ? 1 : 0,
                  borderColor: 'rgba(255,255,255,0.35)',
                }}
              />
            ) : (
              <View key={`pad-${i}`} style={{ width: CELL, height: CELL }} />
            )
          )}
        </View>
      </View>

      {/* Легенда */}
      <View className="mt-3 flex-row flex-wrap items-center gap-x-3 gap-y-1">
        {legend.map(([level, label]) => (
          <View key={level} className="flex-row items-center gap-1">
            <View
              style={{
                width: 9,
                height: 9,
                borderRadius: 3,
                backgroundColor: levelColor(metric, level),
              }}
            />
            <Text className="font-sans text-[9.5px] text-bear-dim">{label}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

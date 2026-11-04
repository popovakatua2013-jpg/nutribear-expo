// Календарь-теплокарта «Отчётов»: выбранный месяц, каждый день — клетка,
// цвет — выполнение дневной цели по выбранному показателю (показатель
// выбирается тапом по карточке-итогу выше). Месяцы листаются стрелками
// ‹ ›, «вперёд» от текущего месяца не бывает. Тап по клетке открывает
// сводку дня (DayDetailsModal), кнопка «История» — значения показателя
// за каждый день периода (MetricDaysModal). Сетка как в GitHub:
// столбцы — недели, строки — дни недели Пн…Вс; у калорий «перебор»
// подсвечен красным.

import { useMemo, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { ChevronLeft, ChevronRight, History } from 'lucide-react-native'
import { METRICS } from '@/lib/data/metrics'
import { history } from '@/lib/data/activity'
import { dayLevel } from '@/lib/data/reports'
import { dayKeyOf, useHistoryStore } from '@/store/useHistoryStore'
import { useGoalsStore } from '@/store/useGoalsStore'

const CELL = 15 // размер клетки
const GAP = 3 // промежуток
const WEEK_ROWS = ['Пн', '', 'Ср', '', 'Пт', '', 'Вс'] // как в GitHub: через одну
const MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
]
const MAX_BACK = 11 // глубина навигации: до года назад

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

export function HeatmapCard({ today, metricId = 'steps', onPickDay = () => {}, onOpenHistory = () => {} }) {
  const goals = useGoalsStore((s) => s.goals)
  const savedDays = useHistoryStore((s) => s.days) // подписка: перекрасить клетки сразу после записи дня
  const metric = METRICS.find((m) => m.key === metricId) || METRICS[0]
  const [monthOffset, setMonthOffset] = useState(0) // 0 — текущий месяц, 1 — прошлый…
  const todayKey = dayKeyOf()

  // Дни показанного месяца: history() от начала месяца до сегодня
  // (у прошлых месяцев span накрывает весь месяц), лишнее отсекаем
  // по префиксу «ГГГГ-ММ-». savedDays в deps — клетки живо реагируют
  // на новые записи, today — чтобы «сегодня» было живым значением
  const { cells, monthLabel, canPrev, canNext } = useMemo(() => {
    const now = new Date()
    const first = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1)
    const y = first.getFullYear()
    const m = first.getMonth()
    const monthLen = new Date(y, m + 1, 0).getDate()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startOfMonth = new Date(y, m, 1)
    const span = Math.max(monthLen, Math.round((startOfToday - startOfMonth) / 86400000) + 1)
    const prefix = `${y}-${String(m + 1).padStart(2, '0')}-`
    const rows = history(span, today).filter((r) => r.key.startsWith(prefix))
    // Сдвиг первой недели: до понедельника пустые клетки
    const offset = (first.getDay() + 6) % 7 // JS: вс=0 → Пн=0
    const pad = Array.from({ length: offset }, () => null)
    return {
      cells: [...pad, ...rows],
      monthLabel: `${MONTHS[m]}${y !== now.getFullYear() ? ` ${y}` : ''}`,
      canPrev: monthOffset < MAX_BACK,
      canNext: monthOffset > 0,
    }
  }, [monthOffset, savedDays, today])
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
      accessibilityLabel="Календарь месяца"
      className="rounded-3xl border border-white/5 bg-bear-card p-5"
    >
      {/* Шапка: показатель + кнопка «История» (значения по дням периода) */}
      <View className="flex-row items-center justify-between gap-2">
        <View className="min-w-0 flex-1">
          <Text className="font-bold text-[15px] tracking-tight text-bear-text">
            {`${metric.label} по дням`}
          </Text>
          <Text className="mt-0.5 font-sans text-[10.5px] leading-snug text-bear-sub">
            Цвет клетки — выполнение дневной цели · тап по дню — сводка дня
          </Text>
        </View>
        <Pressable
          onPress={onOpenHistory}
          accessibilityRole="button"
          accessibilityLabel="Открыть историю показателя по дням"
          className="shrink-0 flex-row items-center gap-1.5 rounded-full bg-white/[0.06] px-3 py-1.5 active:opacity-70"
        >
          <History size={13} color="#8DABFF" />
          <Text className="font-semibold text-[11.5px] text-[#8DABFF]">История</Text>
        </Pressable>
      </View>

      {/* Навигация по месяцам: ‹ назад, вперёд — только до текущего */}
      <View className="mt-3 flex-row items-center gap-1">
        <Pressable
          onPress={() => setMonthOffset((v) => Math.min(MAX_BACK, v + 1))}
          disabled={!canPrev}
          accessibilityRole="button"
          accessibilityLabel="Предыдущий месяц"
          className="rounded-full bg-white/[0.06] p-1.5 active:opacity-70"
          style={{ opacity: canPrev ? 1 : 0.3 }}
        >
          <ChevronLeft size={16} color="#A5AECB" />
        </Pressable>
        <Text className="min-w-[112px] text-center font-bold text-[13px] text-bear-text">
          {monthLabel}
        </Text>
        <Pressable
          onPress={() => setMonthOffset((v) => Math.max(0, v - 1))}
          disabled={!canNext}
          accessibilityRole="button"
          accessibilityLabel="Следующий месяц"
          className="rounded-full bg-white/[0.06] p-1.5 active:opacity-70"
          style={{ opacity: canNext ? 1 : 0.3 }}
        >
          <ChevronRight size={16} color="#A5AECB" />
        </Pressable>
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
                  borderWidth: row.key === todayKey ? 1 : 0,
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

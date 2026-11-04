// Панель истории показателя «Отчётов» — разворачивается тапом по
// карточке-итогу (отдельный блок «Календарь» больше не нужен).
// Две секции: «По дням» — значения показателя за каждый день периода
// (7/30/90 — пилюли в шапке секции) и «Календарь месяца» — теплокарта
// выбранного месяца: цвет клетки — выполнение дневной цели, месяцы
// листаются стрелками ‹ › (вперёд от текущего нельзя), тап по клетке
// открывает сводку дня (DayDetailsModal остаётся на секции «Отчётов»).
// Сетка как в GitHub: столбцы — недели, строки — дни недели Пн…Вс;
// у калорий «перебор» подсвечен красным.

import { useMemo, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react-native'
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

export function MetricHistoryPanel({ today, metricId = 'steps', days, rows, onPickDay = () => {}, onCollapse = () => {} }) {
  const goals = useGoalsStore((s) => s.goals)
  const savedDays = useHistoryStore((s) => s.days) // подписка: клетки и полоски живо реагируют на записи
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
    const monthRows = history(span, today).filter((r) => r.key.startsWith(prefix))
    // Сдвиг первой недели: до понедельника пустые клетки
    const offset = (first.getDay() + 6) % 7 // JS: вс=0 → Пн=0
    const pad = Array.from({ length: offset }, () => null)
    return {
      cells: [...pad, ...monthRows],
      monthLabel: `${MONTHS[m]}${y !== now.getFullYear() ? ` ${y}` : ''}`,
      canPrev: monthOffset < MAX_BACK,
      canNext: monthOffset > 0,
    }
  }, [monthOffset, savedDays, today])
  const nCols = Math.max(1, Math.ceil(cells.length / 7))

  // Значения по дням периода (для секции «По дням»)
  const dayStats = useMemo(() => {
    const values = rows.map((r) => r[metric.key] || 0)
    return { values, max: Math.max(...values, 1) }
  }, [rows, metric])

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
      accessibilityLabel={`История: ${metric.label}`}
      className="rounded-3xl border border-white/5 bg-bear-card p-5"
    >
      {/* Шапка панели: показатель + свернуть */}
      <View className="flex-row items-center justify-between gap-2">
        <View className="min-w-0 flex-1">
          <Text className="font-bold text-[15px] tracking-tight text-bear-text">
            {`${metric.label} · история`}
          </Text>
          <Text className="mt-0.5 font-sans text-[10.5px] leading-snug text-bear-sub">
            Дни периода и календарь месяца · тап по дню — сводка дня
          </Text>
        </View>
        <Pressable
          onPress={onCollapse}
          accessibilityRole="button"
          accessibilityLabel="Свернуть историю показателя"
          className="h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/5 active:opacity-70"
        >
          <ChevronDown size={16} color="#A5AECB" />
        </Pressable>
      </View>

      {/* Секция 1: дни периода — подпись, полоска от максимума, значение.
          Прокручивается только список: сворачивать панель можно всегда */}
      <Text className="mt-3 px-1 font-sans text-[10px] font-semibold uppercase tracking-wide text-bear-sub">
        По дням · {days} дн.
      </Text>
      <ScrollView
        style={{ maxHeight: 180, flexShrink: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 4, paddingBottom: 2 }}
      >
        {rows.map((r, i) => {
          const v = dayStats.values[i]
          const w = Math.max(2, Math.round((v / dayStats.max) * 100))
          const isToday = i === rows.length - 1
          // День без записей: дневник ничего не фиксировал — вместо
          // «0» честно пишем «нет записей» (нулевой показатель дня
          // с записями остаётся честным «0»)
          const emptyDay = !(r.steps || r.kcal || r.waterMl || r.burned)
          return (
            <View
              key={i}
              accessibilityLabel={`${r.label}${isToday ? ', сегодня' : ''}: ${emptyDay ? 'нет записей' : metric.fmt(v)}`}
              className="mt-1.5 flex-row items-center gap-2"
            >
              <Text
                numberOfLines={1}
                maxFontSizeMultiplier={1.1}
                className={`w-[74px] shrink-0 font-sans text-[11px] ${isToday ? 'font-bold text-[#A78BFA]' : 'text-bear-sub'}`}
              >
                {r.label}
              </Text>
              <View className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                <View
                  style={{
                    width: `${w}%`,
                    height: '100%',
                    borderRadius: 999,
                    backgroundColor: metric.color,
                    opacity: v > 0 ? 0.9 : 0,
                  }}
                />
              </View>
              <Text
                numberOfLines={1}
                maxFontSizeMultiplier={1.1}
                className={`w-[76px] shrink-0 text-right ${
                  emptyDay
                    ? 'font-sans text-[10.5px] text-bear-dim'
                    : `font-semibold text-[11.5px] ${isToday ? 'text-bear-text' : 'text-bear-soft'}`
                }`}
              >
                {emptyDay ? 'нет записей' : metric.fmt(v)}
              </Text>
            </View>
          )
        })}
      </ScrollView>

      {/* Секция 2: календарь месяца — навигация ‹ назад, вперёд до текущего */}
      <View className="mt-3 flex-row items-center justify-between">
        <Text className="px-1 font-sans text-[10px] font-semibold uppercase tracking-wide text-bear-sub">
          Календарь месяца
        </Text>
        <View className="flex-row items-center gap-1">
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
          <Text className="min-w-[104px] text-center font-bold text-[13px] text-bear-text">
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
      </View>

      {/* Сетка: подписи дней недели + клетки */}
      <View className="mt-2 flex-row">
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

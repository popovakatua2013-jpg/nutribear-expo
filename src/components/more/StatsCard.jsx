// Карточка «Статистика» на «Ещё» — по референсу Кати: шапка с чипом
// периода, светящаяся кривая и три изменения (вес, талия, активность)
// со стрелками. Цифры честные, из сторов: вес — журнал веса, талия —
// замеры, активность — изменение сожжённых к предыдущему периоду.
// Чип «За месяц ›» переключает период месяц ↔ неделя.
// Режим embedded (редизайн «Ещё» в групповое меню): без своей карточки
// и шапки — чип периода, кривая и три изменения встраиваются в строку
// меню «Статистика».

import { useMemo, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { ChartNoAxesColumn, ChevronRight } from 'lucide-react-native'
import { BodyChip } from '../ui/BodyChip'
import { SvgAreaChart } from '../ui/SvgAreaChart'
import { useProfileStore } from '@/store/useProfileStore'
import { useHistoryStore, dayKeyOf } from '@/store/useHistoryStore'
import { fmtDecimal } from '@/lib/data/bmi'
import { changePct } from '@/lib/data/reports'

const dayLabel = (d) => `${d.getDate()}.${d.getMonth() + 1}`

// Сожжённые за день из истории (тренировки + шаги)
function burnedAt(days, backDays) {
  const d = new Date()
  d.setDate(d.getDate() - backDays)
  return days[dayKeyOf(d)]?.burned || 0
}

// Дельта серии замеров [{ date (ISO), value }] за период: последняя минус первая
function seriesDelta(entries, period) {
  const from = Date.now() - period * 86400000
  const pts = entries
    .map((m) => ({ date: new Date(m.date), value: Number(m.cm ?? m.kg) }))
    .filter((p) => !Number.isNaN(p.date?.getTime()) && p.date.getTime() >= from && p.value > 0)
    .sort((a, b) => a.date - b.date)
  if (pts.length < 2) return null
  return pts[pts.length - 1].value - pts[0].value
}

// Одна дельта: значение со стрелкой + подпись. Стрелка зелёная, когда
// изменение «хорошее» (вес/талия вниз, активность вверх), красная — наоборот
function DeltaBox({ text, caption, dir, good }) {
  const arrow = dir === 'down' ? '↓' : '↑'
  const color = good ? '#34D399' : '#FB7185'
  return (
    <View className="min-w-0 flex-1 items-center rounded-2xl bg-white/[0.04] px-1 py-2">
      <View className="w-full flex-row items-center justify-center gap-0.5">
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
          maxFontSizeMultiplier={1.05}
          className="min-w-0 flex-1 text-right font-extrabold text-[15px] text-bear-text"
        >
          {text}
        </Text>
        <Text className="shrink-0 font-bold text-[14px]" style={{ color }}>
          {arrow}
        </Text>
      </View>
      <Text
        numberOfLines={1}
        maxFontSizeMultiplier={1.05}
        className="mt-0.5 w-full text-center font-sans text-[11.5px] text-bear-dim"
      >
        {caption}
      </Text>
    </View>
  )
}

export function StatsCard({ embedded = false }) {
  const days = useHistoryStore((s) => s.days)
  const weights = useProfileStore((s) => s.weights)
  const measurements = useProfileStore((s) => s.measurements)
  const [period, setPeriod] = useState(30) // 30 — месяц, 7 — неделя

  // Кривая активности: сожжённые ккал по дням за период
  const series = useMemo(() => {
    const out = []
    for (let i = period - 1; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      out.push({ label: dayLabel(d), value: burnedAt(days, i) })
    }
    return out
  }, [days, period])
  const hasData = useMemo(() => series.some((p) => p.value > 0), [series])

  // Изменения за период
  const weightDelta = useMemo(() => seriesDelta(weights, period), [weights, period])
  const waistDelta = useMemo(
    () => seriesDelta(measurements?.waist || [], period),
    [measurements, period]
  )
  // Активность: сожжённые за период против предыдущего такого же периода, %
  const actPct = useMemo(() => {
    let cur = 0
    let prev = 0
    for (let i = 0; i < period; i++) cur += burnedAt(days, i)
    for (let i = period; i < period * 2; i++) prev += burnedAt(days, i)
    return changePct(cur, prev)
  }, [days, period])

  const fmtDelta = (d, unit) => {
    if (d == null) return null
    if (Math.abs(d) < 0.05) return `0 ${unit}`
    return `${d > 0 ? '+' : '−'}${fmtDecimal(Math.abs(d))} ${unit}`
  }
  const weightText = fmtDelta(weightDelta, 'кг')
  const waistText = fmtDelta(waistDelta, 'см')

  const periodChip = (
    <Pressable
      onPress={() => setPeriod((p) => (p === 30 ? 7 : 30))}
      accessibilityRole="button"
      accessibilityLabel={`Период статистики: ${period === 30 ? 'за месяц' : 'за неделю'} — поменять`}
      hitSlop={6}
      className="flex-row shrink-0 items-center gap-0.5 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 active:opacity-70"
    >
      <Text maxFontSizeMultiplier={1.1} className="font-semibold text-[13.5px] text-bear-soft">
        {period === 30 ? 'За месяц' : 'За неделю'}
      </Text>
      <ChevronRight size={14} color="#A5AECB" />
    </Pressable>
  )

  // Кривая активности — светящаяся линия с точками, как на шаблоне
  const chartBlock = hasData ? (
    <View className="px-2">
      <SvgAreaChart
        data={series}
        color="#E879F9"
        height={118}
        yFmt={(v) => formatNumShort(v)}
        bare
        lastBadge
      />
    </View>
  ) : (
    <View className={`mt-1 items-center rounded-2xl border border-dashed border-white/10 px-3 py-4 ${embedded ? 'mx-0' : 'mx-4'}`}>
      <Text
        maxFontSizeMultiplier={1.2}
        className="text-center font-sans text-[13px] leading-snug text-bear-dim"
      >
        Пока тихо: запишите тренировки или шаги — появится кривая активности
      </Text>
    </View>
  )

  // Три изменения в ряд — как на шаблоне (вес ↓, талия ↓, активность ↑).
  // Нет данных за период — прочерк без стрелки
  const deltasRow = (
    <View className={`flex-row gap-2 pt-3 ${embedded ? '' : 'px-4 pb-4'}`}>
      <DeltaBox
        text={weightText || '—'}
        caption="вес"
        dir={weightDelta == null ? 'down' : weightDelta <= 0 ? 'down' : 'up'}
        good={weightDelta == null ? false : weightDelta <= 0}
      />
      <DeltaBox
        text={waistText || '—'}
        caption="талия"
        dir={waistDelta == null ? 'down' : waistDelta <= 0 ? 'down' : 'up'}
        good={waistDelta == null ? false : waistDelta <= 0}
      />
      <DeltaBox
        text={`${actPct > 0 ? '+' : actPct < 0 ? '−' : ''}${Math.abs(actPct)}%`}
        caption="активность"
        dir={actPct >= 0 ? 'up' : 'down'}
        good={actPct >= 0}
      />
    </View>
  )

  // Встроено в строку меню: чип периода справа, кривая и изменения
  if (embedded) {
    return (
      <View accessibilityLabel="Статистика">
        <View className="mb-1 flex-row justify-end">{periodChip}</View>
        {chartBlock}
        {deltasRow}
      </View>
    )
  }

  return (
    <View
      accessibilityLabel="Статистика"
      className="overflow-hidden rounded-3xl border border-bear-bodyLine bg-bear-bodyCard"
    >
      {/* Шапка: чип-иконка + заголовок + чип периода (как на шаблоне) */}
      <View className="flex-row items-center gap-2.5 px-4 py-3.5">
        <BodyChip icon={<ChartNoAxesColumn size={20} color="#C4B5FD" />} />
        <Text className="min-w-0 flex-1 font-extrabold text-[20px] tracking-tight text-bear-text">
          Статистика
        </Text>
        {periodChip}
      </View>

      {chartBlock}
      {deltasRow}
    </View>
  )
}

// Короткий формат для оси: 12 500 → «12,5к»
function formatNumShort(v) {
  if (v >= 10000) return `${(Math.round(v / 100) / 10).toString().replace('.', ',')}к`
  return String(Math.round(v))
}

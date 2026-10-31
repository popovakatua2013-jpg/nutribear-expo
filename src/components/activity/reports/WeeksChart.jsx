// «Сравнение по неделям»: переключатель показателя (шаги/ккал/вода/
// опыт) — каждая метрика на своей шкале со своими единицами, тап по
// неделе открывает панель со значениями всех показателей и Δ% к
// прошлой неделе. Текущая неделя помечена «идёт».

import { useMemo, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { ArrowDownRight, ArrowUpRight, Droplets, Flame, Footprints, Star } from 'lucide-react-native'
import { SvgAreaChart } from '@/components/ui/SvgAreaChart'
import { formatNum } from '@/lib/format'
import { changePct, formatLiters, weeksComparison } from '@/lib/data/reports'

const WEEKS = 6
const MONTHS = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']

// Показатели: ключ в недельных корзинах, цвет, формат оси Y (шкалы
// у метрик свои — недельные суммы: шаги ~70 тыс, ккал ~15 тыс) и
// формат значения в панели
const METRICS = [
  { key: 'steps', label: 'Шаги', Icon: Footprints, color: '#4ade80', invert: false, yFmt: (v) => (v >= 1000 ? `${Math.round(v / 1000)}к` : `${Math.round(v)}`), fmt: (v) => formatNum(v) },
  { key: 'kcal', label: 'Ккал', Icon: Flame, color: '#f87171', invert: true, yFmt: (v) => (v >= 1000 ? `${Math.round(v / 1000)}к` : `${Math.round(v)}`), fmt: (v) => formatNum(v) },
  { key: 'waterMl', label: 'Вода', Icon: Droplets, color: '#38bdf8', invert: false, yFmt: (v) => `${Math.round(v / 1000)}л`, fmt: (v) => formatLiters(v) },
  { key: 'xp', label: 'Опыт', Icon: Star, color: '#a78bfa', invert: false, yFmt: (v) => (v >= 10000 ? `${(v / 1000).toFixed(1).replace('.', ',')}к` : `${Math.round(v)}`), fmt: (v) => `+${formatNum(v)}` },
]

// Период недели i (0 — самая старая): сегодня минус N дней
function weekRange(i, now) {
  const back = (WEEKS - 1 - i) * 7
  const end = new Date(now)
  end.setDate(end.getDate() - back)
  const start = new Date(now)
  start.setDate(start.getDate() - back - 6)
  const d = (dt) => `${dt.getDate()} ${MONTHS[dt.getMonth()]}`
  return `${d(start)} – ${d(end)}`
}

export function WeeksChart({ today }) {
  const rows = useMemo(() => weeksComparison(WEEKS, today), [today])
  const [metricId, setMetricId] = useState('steps')
  const [sel, setSel] = useState(WEEKS - 1) // по умолчанию — текущая неделя
  const metric = METRICS.find((m) => m.key === metricId) || METRICS[0]

  const hasData = rows.some((r) => r.steps || r.kcal || r.waterMl || r.xp)
  const row = rows[sel] || rows[rows.length - 1]
  const prev = sel > 0 ? rows[sel - 1] : null
  const isCurrent = sel === rows.length - 1

  return (
    <View className="rounded-2xl border border-white/5 bg-bear-card p-4" accessibilityLabel="Сравнение по неделям">
      <Text className="font-bold text-[14px] tracking-tight text-bear-text">
        Сравнение по неделям
      </Text>

      {/* Переключатель показателя — у каждого своя шкала */}
      <View className="mt-2.5 flex-row flex-wrap gap-1.5" accessibilityLabel="Показатель">
        {METRICS.map((m) => {
          const active = m.key === metricId
          const pill = (
            <Text className={`px-2.5 py-1 font-semibold text-[11px] ${active ? 'text-white' : 'text-bear-dim'}`}>
              {m.label}
            </Text>
          )
          return (
            <Pressable
              key={m.key}
              onPress={() => setMetricId(m.key)}
              accessibilityLabel={`Показатель ${m.label}`}
              className="overflow-hidden rounded-full"
            >
              {active ? (
                <LinearGradient start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} colors={[m.color, `${m.color}99`]}>
                  {pill}
                </LinearGradient>
              ) : (
                <View className="bg-white/5">{pill}</View>
              )}
            </Pressable>
          )
        })}
      </View>

      {!hasData ? (
        <View className="items-center justify-center py-8" accessibilityLabel="Нет данных">
          <Text className="text-[12.5px] text-bear-sub">Пока мало данных</Text>
          <Text className="mt-1 text-[11px] text-bear-sub2">
            Заполняйте дневник — здесь появится динамика по неделям
          </Text>
        </View>
      ) : (
        <>
          {/* График выбранного показателя; тап по колонке выбирает неделю */}
          <View style={{ position: 'relative' }}>
            <SvgAreaChart
              data={rows.map((r) => ({ label: r.label, value: r[metric.key] || 0 }))}
              color={metric.color}
              height={170}
              yFmt={metric.yFmt}
              activeIndex={sel}
            />
            <View style={{ position: 'absolute', left: 24, right: 0, top: 0, bottom: 18 }} className="flex-row">
              {rows.map((_, i) => (
                <Pressable
                  key={i}
                  style={{ flex: 1 }}
                  accessibilityLabel={`Неделя ${i + 1}`}
                  onPress={() => setSel(i)}
                />
              ))}
            </View>
          </View>

          {/* Панель выбранной недели: все показатели + Δ% к прошлой неделе */}
          <View className="mt-2 rounded-xl bg-white/[0.04] p-3" accessibilityLabel="Значения недели">
            <View className="flex-row items-center justify-between">
              <Text className="font-semibold text-[12px] text-bear-text">
                {isCurrent ? 'Эта неделя' : weekRange(sel, new Date())}
              </Text>
              {isCurrent && (
                <View className="rounded-full bg-[#7B6CF6]/15 px-2 py-0.5">
                  <Text className="font-semibold text-[9.5px] text-[#A78BFA]">идёт</Text>
                </View>
              )}
            </View>
            <View className="mt-2 flex-row flex-wrap gap-2">
              {METRICS.map((m) => {
                const pct = prev ? changePct(row[m.key] || 0, prev[m.key] || 0) : 0
                const shown = prev && (row[m.key] || prev[m.key])
                const good = m.invert ? pct < 0 : pct > 0
                const tone = !prev || !shown ? '#7c87a8' : good ? '#4ade80' : '#f87171'
                const Arrow = pct < 0 ? ArrowDownRight : ArrowUpRight
                return (
                  <View key={m.key} className="min-w-0 rounded-lg bg-white/[0.03] px-2 py-1.5" style={{ width: '48.5%' }}>
                    <View className="flex-row items-center gap-1">
                      <m.Icon size={12} color={m.color} />
                      <Text className="font-sans text-[9.5px] text-bear-sub2">{m.label}</Text>
                    </View>
                    <View className="mt-0.5 flex-row items-center gap-1.5">
                      <Text numberOfLines={1} maxFontSizeMultiplier={1.2} className="flex-1 font-bold text-[13px] text-bear-text">
                        {m.fmt(row[m.key] || 0)}
                      </Text>
                      {prev && shown && <Arrow size={11} color={tone} />}
                      <Text className="font-semibold text-[9.5px]" style={{ color: tone }}>
                        {!prev || !shown ? '—' : `${pct > 0 ? '+' : ''}${pct}%`}
                      </Text>
                    </View>
                  </View>
                )
              })}
            </View>
          </View>
        </>
      )}
    </View>
  )
}

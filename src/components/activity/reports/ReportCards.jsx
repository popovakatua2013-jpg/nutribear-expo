// Четыре карточки «Отчётов»: шаги, калории, вода, опыт —
// итог за период и изменение в % к прошлому такому же периоду.
// У калорий рост отмечается красным (переедание), у остальных — зелёным.

import { Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { ArrowDownRight, ArrowUpRight, Droplets, Flame, Footprints, Star } from 'lucide-react-native'
import { formatNum } from '@/lib/format'
import { changePct, formatLiters, periodTotals } from '@/lib/data/reports'

const METRICS = [
  { key: 'steps', label: 'Шаги', Icon: Footprints, color: '#4ade80', invert: false, fmt: (v) => formatNum(v) },
  { key: 'kcal', label: 'Калории', Icon: Flame, color: '#f87171', invert: true, fmt: (v) => formatNum(v) },
  { key: 'waterMl', label: 'Вода', Icon: Droplets, color: '#38bdf8', invert: false, fmt: (v) => formatLiters(v) },
  { key: 'xp', label: 'Опыт', Icon: Star, color: '#a78bfa', invert: false, fmt: (v) => `+${formatNum(v)}` },
]

function ReportCard({ m, cur, prev }) {
  const pct = changePct(cur[m.key], prev[m.key])
  const good = m.invert ? pct < 0 : pct > 0
  const tone = pct === 0 ? '#7c87a8' : good ? '#4ade80' : '#f87171'
  const Arrow = pct < 0 ? ArrowDownRight : ArrowUpRight

  return (
    <LinearGradient
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      colors={[`${m.color}14`, '#121B33']}
      style={{ flex: 1, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', padding: 16 }}
    >
      <View className="flex-row items-start gap-3">
        <View
          style={{
            width: 44, height: 44, borderRadius: 12,
            backgroundColor: `${m.color}1f`,
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <m.Icon size={20} color={m.color} />
        </View>
        <View className="min-w-0 flex-1">
          <Text className="font-sans text-[12.5px] text-bear-soft">{m.label}</Text>
          <Text numberOfLines={1} className="mt-0.5 font-extrabold text-[19px] tracking-tight text-bear-text">
            {m.fmt(cur[m.key])}
          </Text>
        </View>
      </View>
      <View className="mt-2.5 flex-row items-center gap-1">
        <Arrow size={14} color={tone} />
        <Text className="font-medium text-[11px]" style={{ color: tone }}>
          {Math.abs(pct)}% к прошлой неделе
        </Text>
      </View>
    </LinearGradient>
  )
}

export function ReportCards({ today, days }) {
  const cur = periodTotals(days, 0, today)
  const prev = periodTotals(days, days)

  const rows = [METRICS.slice(0, 2), METRICS.slice(2, 4)]

  return (
    <View className="gap-3" accessibilityLabel="Отчёты за период">
      {rows.map((row, ri) => (
        <View key={ri} className="flex-row gap-3">
          {row.map((m) => (
            <ReportCard key={m.key} m={m} cur={cur} prev={prev} />
          ))}
        </View>
      ))}
    </View>
  )
}

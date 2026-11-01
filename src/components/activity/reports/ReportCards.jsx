// Карточки «Отчётов»: шаги, калории, вода, сожжено (+ опыт) —
// итог за период и изменение в % к прошлому такому же периоду —
// плюс отдельная карточка «Вес»: последнее взвешивание и изменение
// за период в кг (зелёным — движение к здоровому диапазону).
// Показатели и форматы берутся из общего реестра lib/data/metrics.js.

import { useMemo } from 'react'
import { Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { ArrowDownRight, ArrowUpRight, Scale } from 'lucide-react-native'
import { changePct, deltaTone, periodTotals } from '@/lib/data/reports'
import { REPORT_METRICS } from '@/lib/data/metrics'
import { useProfileStore } from '@/store/useProfileStore'
import { fmtDecimal, healthyRange } from '@/lib/data/bmi'
import { pluralDays } from '@/lib/format'

// Подпись сравнения: с каким прошлым периодом сравниваем
function prevLabel(days) {
  if (days <= 7) return 'к прошлой неделе'
  if (days === 30) return 'к прошлому месяцу'
  return `к предыдущим ${days} дням`
}

function ReportCard({ m, cur, prev, days }) {
  const pct = changePct(cur[m.key], prev[m.key])
  const tone = deltaTone(pct, m.invert)
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
          {Math.abs(pct)}% {prevLabel(days)}
        </Text>
      </View>
    </LinearGradient>
  )
}

export function ReportCards({ today, days }) {
  // periodTotals обходит до 180 дней истории — считаем только при
  // смене периода/данных, а не на каждом рендере экрана
  const cur = useMemo(() => periodTotals(days, 0, today), [days, today])
  const prev = useMemo(() => periodTotals(days, days), [days])

  // Карточки идут рядами по две: пять метрик дневника + особая карточка
  // веса ({key:'weight'}), последняя непарная тянется на всю ширину
  const rows = useMemo(() => {
    const items = [...REPORT_METRICS, { key: 'weight' }]
    const out = []
    for (let i = 0; i < items.length; i += 2) {
      out.push(items.slice(i, i + 2))
    }
    return out
  }, [])

  return (
    <View className="gap-3" accessibilityLabel="Отчёты за период">
      {rows.map((row, ri) => (
        <View key={ri} className="flex-row gap-3">
          {row.map((m) =>
            m.key === 'weight' ? (
              <WeightReportCard key={m.key} days={days} />
            ) : (
              <ReportCard key={m.key} m={m} cur={cur} prev={prev} days={days} />
            )
          )}
        </View>
      ))}
    </View>
  )
}

// Карточка «Вес»: последнее взвешивание крупно и изменение за выбранный
// период в кг — по журналу взвешиваний из профиля. Зелёное — движение
// к здоровому диапазону, красное — от него, серое — без изменений/данных
function WeightReportCard({ days }) {
  const weights = useProfileStore((s) => s.weights)
  const heightCm = useProfileStore((s) => s.heightCm)

  const cutoff = Date.now() - days * 86400000
  const inPeriod = weights.filter((w) => new Date(w.date).getTime() >= cutoff)
  const lastW = inPeriod[0] || weights[0] || null
  const firstW = inPeriod.length >= 2 ? inPeriod[inPeriod.length - 1] : null
  const delta = firstW ? Math.round((lastW.kg - firstW.kg) * 10) / 10 : null

  const { min, max } = healthyRange(heightCm)
  const towardNorm =
    delta != null && ((delta < 0 && lastW.kg >= min) || (delta > 0 && lastW.kg <= max))
  const tone = delta == null || delta === 0 ? '#8B96B8' : towardNorm ? '#4ADE80' : '#FB7185'
  const Arrow = delta != null && delta < 0 ? ArrowDownRight : ArrowUpRight

  return (
    <LinearGradient
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      colors={['#a78bfa14', '#121B33']}
      style={{ flex: 1, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', padding: 16 }}
    >
      <View className="flex-row items-start gap-3">
        <View
          style={{
            width: 44, height: 44, borderRadius: 12,
            backgroundColor: '#a78bfa1f',
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Scale size={20} color="#a78bfa" />
        </View>
        <View className="min-w-0 flex-1">
          <Text className="font-sans text-[12.5px] text-bear-soft">Вес</Text>
          <Text numberOfLines={1} className="mt-0.5 font-extrabold text-[19px] tracking-tight text-bear-text">
            {lastW ? `${fmtDecimal(lastW.kg)} кг` : '—'}
          </Text>
        </View>
      </View>
      <View className="mt-2.5 flex-row items-center gap-1">
        {delta != null && delta !== 0 && <Arrow size={14} color={tone} />}
        <Text className="font-medium text-[11px]" style={{ color: tone }}>
          {delta == null
            ? `нет измерений за ${days} ${pluralDays(days)}`
            : delta === 0
              ? `без изменений за ${days} ${pluralDays(days)}`
              : `${delta > 0 ? '+' : '−'}${fmtDecimal(Math.abs(delta))} кг за ${days} ${pluralDays(days)}`}
        </Text>
      </View>
    </LinearGradient>
  )
}

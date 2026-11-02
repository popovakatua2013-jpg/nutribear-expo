// Карточки «Отчётов»: шаги, калории, вода, сожжено (+ опыт) —
// итог за период и изменение в % к прошлому такому же периоду —
// плюс отдельная карточка «Вес»: последнее взвешивание и изменение
// за период в кг (зелёным — движение к здоровому диапазону).
// Тап по карточке «Вес» открывает вкладку Тело и докручивает
// до графика «Динамика веса».
// Тап по карточке показателя (шаги/калории/вода/сожжено) открывает
// историю по дням: «сколько прошёл в каждый день», «сколько выпито
// за день» — вся история сохраняется по дням (MetricDaysModal).
// Показатели и форматы берутся из общего реестра lib/data/metrics.js.

import { useMemo, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { ArrowDownRight, ArrowUpRight, ChevronRight, Scale, Stethoscope } from 'lucide-react-native'
import { changePct, deltaTone, periodTotals } from '@/lib/data/reports'
import { REPORT_METRICS } from '@/lib/data/metrics'
import { useProfileStore } from '@/store/useProfileStore'
import { useHistoryStore, dayKeyOf } from '@/store/useHistoryStore'
import { useOrganismGameStore } from '@/store/useOrganismGameStore'
import { fmtDecimal, healthyRange } from '@/lib/data/bmi'
import { pluralDays } from '@/lib/format'
import { requestScrollToWeight } from '@/lib/navEvents'
import { MetricDaysModal } from './MetricDaysModal'

// Подпись сравнения: с каким прошлым периодом сравниваем
function prevLabel(days) {
  if (days <= 7) return 'к прошлой неделе'
  if (days === 30) return 'к прошлому месяцу'
  return `к предыдущим ${days} дням`
}

function ReportCard({ m, cur, prev, days, onPress }) {
  const pct = changePct(cur[m.key], prev[m.key])
  const tone = deltaTone(pct, m.invert)
  const Arrow = pct < 0 ? ArrowDownRight : ArrowUpRight

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={
        onPress
          ? `${m.label}: ${m.fmt(cur[m.key])} за период — открыть по дням`
          : undefined
      }
      className="flex-1 active:opacity-80"
      style={{ borderRadius: 16 }}
    >
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
            <View className="flex-row items-center gap-1">
              <Text className="shrink-0 font-sans text-[12.5px] text-bear-soft">{m.label}</Text>
              {/* Подсказка: тап открывает историю по дням */}
              {onPress && <ChevronRight size={13} color="#8B96B8" />}
            </View>
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
    </Pressable>
  )
}

export function ReportCards({ today, days }) {
  // periodTotals обходит до 180 дней истории — считаем только при
  // смене периода/данных, а не на каждом рендере экрана
  const cur = useMemo(() => periodTotals(days, 0, today), [days, today])
  const prev = useMemo(() => periodTotals(days, days), [days])
  // История по дням: тап по карточке показателя открывает окно
  const [detail, setDetail] = useState(null)

  // Карточки идут рядами по две: пять метрик дневника + особые карточки
  // веса ({key:'weight'}) и аудита ({key:'audit'}), последние непарные
  // тянутся на всю ширину
  const rows = useMemo(() => {
    const items = [...REPORT_METRICS, { key: 'weight' }, { key: 'audit' }]
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
            ) : m.key === 'audit' ? (
              <AuditReportCard key={m.key} days={days} />
            ) : (
              <ReportCard
                key={m.key}
                m={m}
                cur={cur}
                prev={prev}
                days={days}
                onPress={() => setDetail(m)}
              />
            )
          )}
        </View>
      ))}

      {/* История показателя по дням: тап по карточке шаги/калории/
          вода/сожжено — вся сохранённая история выбранного периода */}
      <MetricDaysModal
        open={!!detail}
        metric={detail}
        days={days}
        today={today}
        onClose={() => setDetail(null)}
      />
    </View>
  )
}

// Карточка «Аудит организма»: средний балл медосмотров за период и
// изменение в баллах к прошлому периоду (не % — счёт и так 0…100).
// Тап открывает вкладку «Организм» — там Доктор Топтыгин и история.
// Источник: дневная история (audit пишется при осмотре) + фолбэк на
// стор организма для недавних дней.
function AuditReportCard({ days }) {
  const historyDays = useHistoryStore((s) => s.days)
  const gameAuditDays = useOrganismGameStore((s) => s.auditDays || {})

  const scoreOf = (daysAgo) => {
    const d = new Date()
    d.setDate(d.getDate() - daysAgo)
    const k = dayKeyOf(d)
    const v = historyDays[k]?.audit
    return v != null ? v : gameAuditDays[k] ?? null
  }

  const { avg, n } = useMemo(() => {
    let sum = 0
    let cnt = 0
    for (let i = 0; i < days; i++) {
      const v = scoreOf(i)
      if (v != null) {
        sum += v
        cnt += 1
      }
    }
    return { avg: cnt ? Math.round(sum / cnt) : null, n: cnt }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyDays, gameAuditDays, days])

  const prevAvg = useMemo(() => {
    let sum = 0
    let cnt = 0
    for (let i = days; i < days * 2; i++) {
      const v = scoreOf(i)
      if (v != null) {
        sum += v
        cnt += 1
      }
    }
    return cnt ? Math.round(sum / cnt) : null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyDays, gameAuditDays, days])

  const delta = avg != null && prevAvg != null ? avg - prevAvg : null
  const tone = delta == null || delta === 0 ? '#8B96B8' : delta > 0 ? '#4ADE80' : '#FB7185'
  const Arrow = delta != null && delta < 0 ? ArrowDownRight : ArrowUpRight

  function openOrganism() {
    router.navigate('/organism')
  }

  return (
    <Pressable
      onPress={openOrganism}
      accessibilityRole="button"
      accessibilityLabel="Аудит организма — открыть вкладку Организм"
      className="flex-1 active:opacity-80"
      style={{ borderRadius: 16 }}
    >
      <LinearGradient
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        colors={['#67e8f914', '#121B33']}
        style={{ flex: 1, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', padding: 16 }}
      >
        <View className="flex-row items-start gap-3">
          <View
            style={{
              width: 44, height: 44, borderRadius: 12,
              backgroundColor: '#67e8f91f',
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Stethoscope size={20} color="#67E8F9" />
          </View>
          <View className="min-w-0 flex-1">
            <View className="flex-row items-center gap-1">
              <Text className="shrink-0 font-sans text-[12.5px] text-bear-soft">Аудит организма</Text>
              <ChevronRight size={13} color="#8B96B8" />
            </View>
            <Text numberOfLines={1} className="mt-0.5 font-extrabold text-[19px] tracking-tight text-bear-text">
              {avg != null ? `${avg}/100` : '—'}
            </Text>
          </View>
        </View>
        <View className="mt-2.5 flex-row items-center gap-1">
          {delta != null && delta !== 0 && <Arrow size={14} color={tone} />}
          <Text numberOfLines={1} className="flex-1 font-medium text-[11px]" style={{ color: tone }}>
            {avg == null
              ? `нет осмотров за ${days} ${pluralDays(days)}`
              : delta == null
                ? `средний за период · осмотров: ${n}`
                : delta === 0
                  ? 'без изменений к прошлому периоду'
                  : `${delta > 0 ? '+' : '−'}${Math.abs(delta)} к прошлому периоду`}
          </Text>
        </View>
      </LinearGradient>
    </Pressable>
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

  // Открыть вкладку Тело и докрутить до графика веса
  function openWeightChart() {
    router.navigate('/bmi')
    requestScrollToWeight()
  }

  return (
    <Pressable
      onPress={openWeightChart}
      accessibilityRole="button"
      accessibilityLabel="Вес — открыть график динамики веса на вкладке Тело"
      className="flex-1 active:opacity-80"
      style={{ borderRadius: 16 }}
    >
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
          <View className="flex-row items-center gap-1">
            <Text className="shrink-0 font-sans text-[12.5px] text-bear-soft">Вес</Text>
            {/* Подсказка: карточка тапабельна — ведёт к графику веса */}
            <ChevronRight size={13} color="#8B96B8" />
          </View>
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
    </Pressable>
  )
}

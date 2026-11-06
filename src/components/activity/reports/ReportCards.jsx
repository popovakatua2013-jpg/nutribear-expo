// Карточки «Отчётов»: компактная сетка 3×2, как на референсе дневника —
// верхний ряд «Шаги / Калории / Вода», нижний «Сон / Вес / Сожжено».
// У каждой карточки — значение за период, подпись «% к прошлой неделе»
// (у сна и веса без данных — честное «нет измерений») и мини-спарклайн
// за последние дни. Тап по карточке показателя ОТКРЫВАЕТ ОКНО ИСТОРИИ
// (MetricHistoryModal): среднее за день, столбики по дням, лучшие дни и
// теплокарта недели. Тап по «Весу» открывает вкладку ИМТ и докручивает
// до графика «Динамика веса». Показатели и форматы — из общего реестра
// lib/data/metrics.js. Поверхности — в стиле вкладки «Тело»: градиент
// от цветного тинта метрики к фиолетовой подложке и фиолетовая обводка.
//
// «Сон» — псевдокарточка без данных: трекера сна в приложении пока нет,
// она показывает «—» и приберегена под будущую фичу (в реестр METRICS её
// сознательно не добавляем — теплокарта, окно истории и шеринг должны
// видеть только реальные показатели). «Лучший день» с карточек убран —
// в компактной сетке для него нет места, полный список лучших дней
// остался в окне истории показателя.

import { useMemo } from 'react'
import { Pressable, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { ArrowDownRight, ArrowUpRight, MoonStar, Scale } from 'lucide-react-native'
import { changePct, deltaTone, discipline, periodTotals, prevLabel } from '@/lib/data/reports'
import { METRICS } from '@/lib/data/metrics'
import { useGoalsStore } from '@/store/useGoalsStore'
import { useProfileStore } from '@/store/useProfileStore'
import { fmtDecimal, healthyRange } from '@/lib/data/bmi'
import { pluralDays } from '@/lib/format'
import { requestScrollToWeight } from '@/lib/navEvents'
import { SvgAreaChart } from '../../ui/SvgAreaChart'

// Порядок карточек 3×2 — как на референсе
const CARD_ITEMS = [
  METRICS.find((m) => m.key === 'steps'),
  METRICS.find((m) => m.key === 'kcal'),
  METRICS.find((m) => m.key === 'waterMl'),
  { key: 'sleep', label: 'Сон' },
  { key: 'weight' },
  METRICS.find((m) => m.key === 'burned'),
]

// Спарклайн карточки: последние дни периода (до 14 точек — плотность
// как на референсе), значения по возрастанию дней (rows уже идут
// от старых к свежим)
function sparkOf(rows, key) {
  const tail = rows.slice(-14)
  return tail.map((r) => ({ label: r.label, value: Number(r[key]) || 0 }))
}

// Мини-спарклайн без осей: мягкая линия с заливкой в цвет метрики
// (spark-режим SvgAreaChart — без подписей, чистая линия как на референсе;
// min-w-0 — страховка, чтобы график не распирал узкую колонку)
function Spark({ data, color }) {
  if (!data || data.length < 2) return null
  return (
    <View className="mt-1 min-w-0">
      <SvgAreaChart spark dot={false} data={data} color={color} height={24} />
    </View>
  )
}

function ReportCard({ m, cur, prev, days, rows, goalMet = null, onPress = () => {} }) {
  const pct = changePct(cur[m.key], prev[m.key])
  const tone = deltaTone(pct, m.invert)
  const Arrow = pct < 0 ? ArrowDownRight : ArrowUpRight
  const spark = useMemo(() => sparkOf(rows, m.key), [rows, m.key])

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${m.label}: ${m.fmt(cur[m.key])}. Тап — история показателя`}
      className="min-w-0 flex-1 active:opacity-90"
      style={{ borderRadius: 16 }}
    >
      <LinearGradient
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        colors={[`${m.color}14`, '#1A123A']}
        style={{
          borderRadius: 16,
          borderWidth: 1,
          borderColor: 'rgba(168,85,247,0.30)',
          padding: 10,
          height: '100%', // фон во всю высоту ряда — карточки не «торчат» друг за друга
        }}
      >
        <View className="flex-row items-center gap-1.5">
          <View
            style={{
              width: 26,
              height: 26,
              borderRadius: 9,
              backgroundColor: `${m.color}1f`,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <m.Icon size={15} color={m.color} />
          </View>
          <Text
            numberOfLines={1}
            maxFontSizeMultiplier={1.15}
            className="min-w-0 flex-1 font-sans text-[12.5px] leading-tight text-bear-soft"
          >
            {m.label}
          </Text>
        </View>
        <Text
          numberOfLines={1}
          maxFontSizeMultiplier={1.15}
          adjustsFontSizeToFit
          className="mt-1.5 font-extrabold text-[19px] leading-tight tracking-tight text-bear-text"
        >
          {m.fmt(cur[m.key])}
        </Text>
        <View className="mt-1 min-h-[26px] flex-row items-start gap-0.5">
          <Arrow size={12} color={tone} />
          <Text
            numberOfLines={2}
            maxFontSizeMultiplier={1.2}
            className="min-w-0 flex-1 font-medium text-[10.5px] leading-[13px]"
            style={{ color: tone }}
          >
            {`${Math.abs(pct)}% ${prevLabel(days)}`}
          </Text>
        </View>
        {/* Сколько дней периода цель достигнута — перенесено из карточки
            «Дисциплина» (отзыв Кати): в карточке показателя это уместнее,
            чем дубли плиток. Для калорий цель — «в рамках», не перебрать.
            goalMet = null (цель не задана) — строки нет */}
        {goalMet != null && (
          <Text
            numberOfLines={2}
            maxFontSizeMultiplier={1.2}
            className="mt-0.5 font-medium text-[10.5px] leading-[13px]"
            style={{ color: goalMet > 0 ? '#4ade80' : '#8B96B8' }}
          >
            {`${m.key === 'kcal' ? 'В рамках цели' : 'Цель достигнута'} в ${goalMet} из ${days} ${pluralDays(days)}`}
          </Text>
        )}
        <Spark data={spark} color={m.color} />
      </LinearGradient>
    </Pressable>
  )
}

// Карточка «Сон»: данных нет — трекера сна пока нет. Показываем «—»
// и честную подпись за выбранный период, как на референсе
function SleepCard({ days }) {
  return (
    <View className="min-w-0 flex-1" style={{ borderRadius: 16 }}>
      <LinearGradient
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        colors={['#c084fc14', '#1A123A']}
        style={{
          borderRadius: 16,
          borderWidth: 1,
          borderColor: 'rgba(168,85,247,0.30)',
          padding: 10,
          height: '100%', // фон во всю высоту ряда — карточки не «торчат» друг за друга
        }}
      >
        <View className="flex-row items-center gap-1.5">
          <View
            style={{
              width: 26,
              height: 26,
              borderRadius: 9,
              backgroundColor: '#c084fc1f',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MoonStar size={15} color="#c084fc" />
          </View>
          <Text
            numberOfLines={1}
            maxFontSizeMultiplier={1.15}
            className="min-w-0 flex-1 font-sans text-[12.5px] leading-tight text-bear-soft"
          >
            Сон
          </Text>
        </View>
        <Text maxFontSizeMultiplier={1.15} className="mt-1.5 font-extrabold text-[19px] leading-tight text-bear-text">
          —
        </Text>
        <Text
          numberOfLines={2}
          maxFontSizeMultiplier={1.2}
          className="mt-1 min-h-[26px] font-medium text-[10.5px] leading-[13px] text-bear-dim"
        >
          {`нет измерений за ${days} ${pluralDays(days)}`}
        </Text>
      </LinearGradient>
    </View>
  )
}

// Карточка «Вес»: последнее взвешивание крупно, изменение за период
// в кг (зелёное — движение к здоровому диапазону) и спарклайн последних
// взвешиваний. Тап — вкладка ИМТ к графику «Динамика веса»
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

  // Спарклайн: последние до 10 взвешиваний по возрастанию даты
  // (журнал хранит новые сверху). Меньше двух точек — линии нет
  const spark = useMemo(
    () => weights.slice(0, 10).slice().reverse().map((w) => ({ label: '', value: w.kg })),
    [weights]
  )

  function openWeightChart() {
    router.navigate('/bmi')
    requestScrollToWeight()
  }

  return (
    <Pressable
      onPress={openWeightChart}
      accessibilityRole="button"
      accessibilityLabel="Вес — открыть график динамики веса на вкладке ИМТ"
      className="min-w-0 flex-1 active:opacity-80"
      style={{ borderRadius: 16 }}
    >
      <LinearGradient
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        colors={['#a78bfa14', '#1A123A']}
        style={{
          borderRadius: 16,
          borderWidth: 1,
          borderColor: 'rgba(168,85,247,0.30)',
          padding: 10,
          height: '100%', // фон во всю высоту ряда — карточки не «торчат» друг за друга
        }}
      >
        <View className="flex-row items-center gap-1.5">
          <View
            style={{
              width: 26,
              height: 26,
              borderRadius: 9,
              backgroundColor: '#a78bfa1f',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Scale size={15} color="#a78bfa" />
          </View>
          <Text
            numberOfLines={1}
            maxFontSizeMultiplier={1.15}
            className="min-w-0 flex-1 font-sans text-[12.5px] leading-tight text-bear-soft"
          >
            Вес
          </Text>
        </View>
        <Text
          numberOfLines={1}
          maxFontSizeMultiplier={1.15}
          adjustsFontSizeToFit
          className="mt-1.5 font-extrabold text-[19px] leading-tight tracking-tight text-bear-text"
        >
          {lastW ? `${fmtDecimal(lastW.kg)} кг` : '—'}
        </Text>
        <View className="mt-1 min-h-[26px] flex-row items-start gap-0.5">
          {delta != null && delta !== 0 && <Arrow size={12} color={tone} />}
          <Text
            numberOfLines={2}
            maxFontSizeMultiplier={1.2}
            className="min-w-0 flex-1 font-medium text-[10.5px] leading-[13px]"
            style={{ color: tone }}
          >
            {delta == null
              ? `нет измерений за ${days} ${pluralDays(days)}`
              : delta === 0
                ? `без изменений за ${days} ${pluralDays(days)}`
                : `${delta > 0 ? '+' : '−'}${fmtDecimal(Math.abs(delta))} кг за ${days} ${pluralDays(days)}`}
          </Text>
        </View>
        <Spark data={spark} color="#a78bfa" />
      </LinearGradient>
    </Pressable>
  )
}

export function ReportCards({ today, days, rows = [], onSelectMetric = () => {} }) {
  const goals = useGoalsStore((s) => s.goals)
  // periodTotals обходит до 180 дней истории — считаем только при
  // смене периода/данных, а не на каждом рендере экрана
  const cur = useMemo(() => periodTotals(days, 0, today), [days, today])
  const prev = useMemo(() => periodTotals(days, days), [days])
  // Сколько дней периода цель достигнута по шагам/воде/калориям —
  // та же функция, что считала плитки «Дисциплины» (теперь данные
  // живут прямо в карточках показателей)
  const goalMet = useMemo(
    () => discipline(rows, goals).met,
    [rows, goals]
  )

  // Ряды по три: «Шаги/Калории/Вода» и «Сон/Вес/Сожжено» — как на референсе
  const cardRows = useMemo(() => {
    const out = []
    for (let i = 0; i < CARD_ITEMS.length; i += 3) {
      out.push(CARD_ITEMS.slice(i, i + 3))
    }
    return out
  }, [])

  return (
    <View className="gap-2.5" accessibilityLabel="Отчёты за период">
      {cardRows.map((row, ri) => (
        <View key={ri} className="flex-row gap-2.5">
          {row.map((m) =>
            m.key === 'weight' ? (
              <WeightReportCard key={m.key} days={days} />
            ) : m.key === 'sleep' ? (
              <SleepCard key={m.key} days={days} />
            ) : (
              <ReportCard
                key={m.key}
                m={m}
                cur={cur}
                prev={prev}
                days={days}
                rows={rows}
                goalMet={goalMet[m.key] ?? null}
                onPress={() => onSelectMetric(m.key)}
              />
            )
          )}
        </View>
      ))}
    </View>
  )
}

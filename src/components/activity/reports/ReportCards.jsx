// Карточки «Отчётов»: шаги, калории, вода, сожжено — итог за период,
// изменение в % к прошлому такому же периоду и рекорд («Лучший день») —
// плюс отдельная карточка «Вес»: последнее взвешивание и изменение
// за период в кг (зелёным — движение к здоровому диапазону).
// Тап по карточке показателя выбирает его для календаря-теплокарты
// ниже (выбранная подсвечена рамкой в цвет метрики). Тап по карточке
// «Вес» открывает вкладку ИМТ и докручивает до графика «Динамика веса».
// Показатели и форматы берутся из общего реестра lib/data/metrics.js.
// Поверхности — в стиле вкладки «Тело»: градиент от цветного тинта
// метрики к фиолетовой подложке (#1A123A — непрозрачный эквивалент
// bear-bodyCard) и фиолетовая обводка неактивной карточки

import { useMemo } from 'react'
import { Pressable, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { ArrowDownRight, ArrowUpRight, ChevronRight, Scale } from 'lucide-react-native'
import { bestDay, changePct, deltaTone, periodTotals } from '@/lib/data/reports'
import { METRICS } from '@/lib/data/metrics'
import { useProfileStore } from '@/store/useProfileStore'
import { fmtDecimal, healthyRange } from '@/lib/data/bmi'
import { pluralDays } from '@/lib/format'
import { requestScrollToWeight } from '@/lib/navEvents'

// Подпись сравнения: с каким прошлым периодом сравниваем
function prevLabel(days) {
  if (days <= 7) return 'к прошлой неделе'
  if (days === 30) return 'к прошлому месяцу'
  return `к предыдущим ${days} дням`
}

function ReportCard({ m, cur, prev, days, best = 0, selected = false, onPress = () => {} }) {
  const pct = changePct(cur[m.key], prev[m.key])
  const tone = deltaTone(pct, m.invert)
  const Arrow = pct < 0 ? ArrowDownRight : ArrowUpRight

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${m.label}: ${m.fmt(cur[m.key])}${selected ? ', показатель для календаря выбран' : ', выбрать для календаря'}`}
      className="flex-1 active:opacity-90"
      style={{ borderRadius: 16 }}
    >
    <LinearGradient
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      colors={[`${m.color}${selected ? '2e' : '14'}`, '#1A123A']}
      style={{
        flex: 1,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: selected ? m.color : 'rgba(168,85,247,0.30)',
        padding: 16,
      }}
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
      {/* Рекорд периода — только у показателей «чем больше, тем лучше»;
        у калорий есть больше всех — не достижение */}
      {!m.invert && best > 0 ? (
        <Text numberOfLines={1} className="mt-1.5 font-sans text-[10.5px] text-bear-dim">
          {`Лучший день: ${m.fmt(best)}`}
        </Text>
      ) : null}
    </LinearGradient>
    </Pressable>
  )
}

export function ReportCards({ today, days, rows = [], metricId = 'steps', onSelectMetric = () => {} }) {
  // periodTotals обходит до 180 дней истории — считаем только при
  // смене периода/данных, а не на каждом рендере экрана
  const cur = useMemo(() => periodTotals(days, 0, today), [days, today])
  const prev = useMemo(() => periodTotals(days, days), [days])

  // Карточки идут рядами по две: пять метрик дневника + особая карточка
  // веса ({key:'weight'}), последняя непарная тянется на всю ширину.
  // Имя cardRows, чтобы не путать с пропом rows — дневными строками
  // истории (по ним считается «Лучший день»)
  const cardRows = useMemo(() => {
    const items = [...METRICS, { key: 'weight' }]
    const out = []
    for (let i = 0; i < items.length; i += 2) {
      out.push(items.slice(i, i + 2))
    }
    return out
  }, [])

  return (
    <View className="gap-3" accessibilityLabel="Отчёты за период">
      {cardRows.map((row, ri) => (
        <View key={ri} className="flex-row gap-3">
          {row.map((m) =>
            m.key === 'weight' ? (
              <WeightReportCard key={m.key} days={days} />
            ) : (
              <ReportCard
                key={m.key}
                m={m}
                cur={cur}
                prev={prev}
                days={days}
                best={bestDay(rows, m.key)}
                selected={metricId === m.key}
                onPress={() => onSelectMetric(m.key)}
              />
            )
          )}
        </View>
      ))}
      {/* Подсказка: тап по карточке разворачивает панель истории */}
      <Text className="px-1 pt-0.5 font-sans text-[10.5px] text-bear-dim">
        Тап по карточке разворачивает историю: дни периода и календарь месяца · повторный тап сворачивает
      </Text>
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

  // Открыть вкладку ИМТ и докрутить до графика веса
  function openWeightChart() {
    router.navigate('/bmi')
    requestScrollToWeight()
  }

  return (
    <Pressable
      onPress={openWeightChart}
      accessibilityRole="button"
      accessibilityLabel="Вес — открыть график динамики веса на вкладке ИМТ"
      className="flex-1 active:opacity-80"
      style={{ borderRadius: 16 }}
    >
    <LinearGradient
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      colors={['#a78bfa14', '#1A123A']}
      style={{ flex: 1, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(168,85,247,0.30)', padding: 16 }}
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

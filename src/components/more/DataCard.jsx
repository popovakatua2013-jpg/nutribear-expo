// Карточка «Данные» на «Ещё» — стоит на месте «Мой прогресс» из референса
// (решение Кати: «Мой прогресс не делаем, туда вместо неё "данные"»).
// Тот же состав, что на шаблоне: шапка с чипом периода, три метрики
// в ряд (ккал · вес · дней подряд) и светящаяся кривая веса.
// Метрики честные, из сторов: среднее сожжённых за день (история),
// изменение веса за период (журнал веса), стрик дневника (lib/streak).
// Чип «За 7 дней ›» переключает период 7 ↔ 30 дней.
// Режим embedded (редизайн «Ещё» в групповое меню): без своей карточки
// и шапки — метрики, чип периода и кривая встраиваются в строку меню.

import { useMemo, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { BarChart3, ChevronRight } from 'lucide-react-native'
import { BodyChip } from '../ui/BodyChip'
import { SvgAreaChart } from '../ui/SvgAreaChart'
import { useProfileStore } from '@/store/useProfileStore'
import { useHistoryStore, dayKeyOf } from '@/store/useHistoryStore'
import { streakOf } from '@/lib/streak'
import { fmtDecimal } from '@/lib/data/bmi'
import { formatNum } from '@/lib/format'

// Короткая подпись дня для оси X: «8.11»
const dayLabel = (d) => `${d.getDate()}.${d.getMonth() + 1}`

export function DataCard({ embedded = false }) {
  const days = useHistoryStore((s) => s.days)
  const weights = useProfileStore((s) => s.weights)
  const [period, setPeriod] = useState(7)

  // Среднее сожжённых за день за период (тренировки + шаги — история)
  const avgBurned = useMemo(() => {
    let sum = 0
    for (let i = 0; i < period; i++) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      sum += days[dayKeyOf(d)]?.burned || 0
    }
    return Math.round(sum / period)
  }, [days, period])

  // Стрик дневника — «дней в ряду» (как «7 дней в ряду» на шаблоне)
  const streak = useMemo(() => streakOf(days), [days])

  // Точки веса внутри периода (журнал веса хранит ISO-даты, новые сверху)
  const weightSeries = useMemo(() => {
    const from = Date.now() - period * 86400000
    return weights
      .map((w) => ({ date: new Date(w.date), kg: Number(w.kg) }))
      .filter((p) => !Number.isNaN(p.date?.getTime()) && p.date.getTime() >= from && p.kg > 0)
      .sort((a, b) => a.date - b.date)
      .map((p) => ({ label: dayLabel(p.date), value: p.kg }))
  }, [weights, period])

  // Изменение веса за период: последняя точка минус первая
  const weightDelta = useMemo(() => {
    if (weightSeries.length < 2) return null
    const delta = weightSeries[weightSeries.length - 1].value - weightSeries[0].value
    if (Math.abs(delta) < 0.05) return '0 кг'
    return `${delta > 0 ? '+' : '−'}${fmtDecimal(Math.abs(delta))} кг`
  }, [weightSeries])

  const periodChip = (
    <Pressable
      onPress={() => setPeriod((p) => (p === 7 ? 30 : 7))}
      accessibilityRole="button"
      accessibilityLabel={`Период данных: за ${period} дней — поменять`}
      hitSlop={6}
      className="flex-row shrink-0 items-center gap-0.5 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 active:opacity-70"
    >
      <Text maxFontSizeMultiplier={1.1} className="font-semibold text-[13.5px] text-bear-soft">
        {`За ${period} дней`}
      </Text>
      <ChevronRight size={14} color="#A5AECB" />
    </Pressable>
  )

  // Три метрики в ряд с разделителями — как на шаблоне
  const metricCols = (
    <>
      <View className="min-w-0 flex-1 items-center py-1">
        <Text className="text-[15px] leading-none">🔥</Text>
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.75}
          maxFontSizeMultiplier={1.1}
          className="mt-1 w-full text-center font-extrabold text-[19px] leading-tight text-bear-text"
        >
          {formatNum(avgBurned)}
        </Text>
        <Text
          numberOfLines={1}
          maxFontSizeMultiplier={1.05}
          className="mt-0.5 w-full text-center font-sans text-[12px] text-bear-dim"
        >
          ккал за день
        </Text>
      </View>
      <View className="mx-1 w-px self-stretch bg-white/10" />
      <View className="min-w-0 flex-1 items-center py-1">
        <Text className="text-[15px] leading-none">⚖️</Text>
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.75}
          maxFontSizeMultiplier={1.1}
          className="mt-1 w-full text-center font-extrabold text-[19px] leading-tight text-bear-text"
        >
          {weightDelta || '—'}
        </Text>
        <Text
          numberOfLines={1}
          maxFontSizeMultiplier={1.05}
          className="mt-0.5 w-full text-center font-sans text-[12px] text-bear-dim"
        >
          вес
        </Text>
      </View>
      <View className="mx-1 w-px self-stretch bg-white/10" />
      <View className="min-w-0 flex-1 items-center py-1">
        <Text className="text-[15px] leading-none">⭐</Text>
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.75}
          maxFontSizeMultiplier={1.1}
          className="mt-1 w-full text-center font-extrabold text-[19px] leading-tight text-bear-text"
        >
          {streak}
        </Text>
        <Text
          numberOfLines={1}
          maxFontSizeMultiplier={1.05}
          className="mt-0.5 w-full text-center font-sans text-[12px] text-bear-dim"
        >
          в ряду
        </Text>
      </View>
    </>
  )

  const chartBlock = weightSeries.length >= 2 ? (
    <View className={`mt-1 pb-2 ${embedded ? 'px-0' : 'px-2'}`}>
      <SvgAreaChart
        data={weightSeries}
        color="#A78BFA"
        height={104}
        yFmt={(v) => fmtDecimal(Math.round(v * 10) / 10)}
        bare
        lastBadge
      />
    </View>
  ) : (
    <View className={`mb-4 mt-2 items-center rounded-2xl border border-dashed border-white/10 px-3 py-4 ${embedded ? 'mx-0' : 'mx-4'}`}>
      <Text
        maxFontSizeMultiplier={1.2}
        className="text-center font-sans text-[13px] leading-snug text-bear-dim"
      >
        {weightSeries.length === 1
          ? 'Отметьте вес ещё раз — и здесь появится кривая'
          : `Отметьте вес дважды за ${period} дней — и здесь появится кривая`}
      </Text>
    </View>
  )

  // Встроено в строку меню: чип периода справа, метрики и кривая без
  // своей оболочки (отступы даёт MenuRow)
  if (embedded) {
    return (
      <View accessibilityLabel="Данные">
        <View className="mb-1.5 flex-row justify-end">{periodChip}</View>
        <View className="flex-row items-stretch">{metricCols}</View>
        {chartBlock}
      </View>
    )
  }

  return (
    <View
      accessibilityLabel="Данные"
      className="overflow-hidden rounded-3xl border border-bear-bodyLine bg-bear-bodyCard"
    >
      {/* Шапка: чип-иконка + заголовок + чип периода (как на шаблоне) */}
      <View className="flex-row items-center gap-2.5 px-4 py-3.5">
        <BodyChip icon={<BarChart3 size={20} color="#C4B5FD" />} />
        <Text className="min-w-0 flex-1 font-extrabold text-[20px] tracking-tight text-bear-text">
          Данные
        </Text>
        {periodChip}
      </View>

      {/* Три метрики в ряд с разделителями */}
      <View className="flex-row items-stretch px-4">{metricCols}</View>

      {/* Кривая веса за период — светящаяся линия с точками, как на шаблоне */}
      {chartBlock}
    </View>
  )
}

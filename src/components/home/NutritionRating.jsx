// Карточка «Рейтинг питания»: оценка рациона по клетчатке, сахару и
// балансу нутриентов (БЖУ в % калорий) — за день и за месяц (переключатель).
// Расчёты — src/lib/data/nutrition.js; данные дня — дневник (entries),
// месяца — журнал приёмов (history) со средними за день с записями.

import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { Leaf } from 'lucide-react-native'
import { ProgressBar } from '../ui/ProgressBar'
import { formatNum } from '@/lib/format'
import { round1 } from '@/lib/data/bju'
import {
  FIBER_NORM,
  SUGAR_LIMIT,
  nutritionRating,
  ratingLabel,
  sumNutrition,
  monthRows,
  monthNutrition,
} from '@/lib/data/nutrition'
import { useFoodStore } from '@/store/useFoodStore'

const MAX = 1.25
const MONTHS = [
  'январь', 'февраль', 'март', 'апрель', 'май', 'июнь',
  'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь',
]

const toneOf = (score) => (score >= 70 ? 'emerald' : score >= 45 ? 'amber' : 'grad')

function MetricRow({ label, value, norm, score }) {
  return (
    <View>
      <View className="flex-row items-baseline justify-between gap-2">
        <Text maxFontSizeMultiplier={MAX} className="font-medium text-[12.5px] text-bear-soft">
          {label}
        </Text>
        <Text maxFontSizeMultiplier={MAX} className="font-sans text-[11px] text-bear-dim">
          {norm}
        </Text>
      </View>
      <View className="mt-1 flex-row items-center gap-2">
        <View className="flex-1">
          <ProgressBar pct={score} h={6} tone={toneOf(score)} />
        </View>
        <Text
          maxFontSizeMultiplier={MAX}
          className={`w-14 text-right font-bold text-[12px] ${
            score >= 70 ? 'text-emerald-300' : score >= 45 ? 'text-amber-300' : 'text-bear-soft'
          }`}
        >
          {value}
        </Text>
      </View>
    </View>
  )
}

export function NutritionRating() {
  const entries = useFoodStore((s) => s.entries)
  const history = useFoodStore((s) => s.history)
  const [mode, setMode] = useState('day') // 'day' | 'month'

  const now = new Date()
  const monthName = MONTHS[now.getMonth()]

  // День: сегодняшние записи; Месяц: журнал приёмов этого месяца
  const dayRows = Object.values(entries).flat()
  const mRows = monthRows(history)
  const n = mode === 'day' ? sumNutrition(dayRows) : monthNutrition(mRows)
  const hasData = mode === 'day' ? dayRows.length > 0 : n.days > 0
  const r = nutritionRating(hasData ? n : { kcal: 0, p: 0, f: 0, c: 0, fib: 0, sug: 0 })
  const { label, emoji } = ratingLabel(r.overall)

  const caption =
    mode === 'day'
      ? 'по записям дневника за сегодня'
      : `в среднем за день с записями · ${monthName} · ${n.days} дн.`

  const rows = [
    { key: 'fiber', label: 'Клетчатка', value: `${round1(r.fiber.value)} г`, norm: `норма ${FIBER_NORM} г/день`, score: r.fiber.score },
    { key: 'sugar', label: 'Сахар', value: `${round1(r.sugar.value)} г`, norm: `лучше до ${SUGAR_LIMIT} г/день`, score: r.sugar.score },
    { key: 'protein', label: 'Белки', value: `${r.protein.value}%`, norm: 'норма 15–30% ккал', score: r.protein.score },
    { key: 'fat', label: 'Жиры', value: `${r.fat.value}%`, norm: 'норма 20–35% ккал', score: r.fat.score },
    { key: 'carbs', label: 'Углеводы', value: `${r.carbs.value}%`, norm: 'норма 45–65% ккал', score: r.carbs.score },
  ]

  return (
    <View
      accessibilityLabel="Рейтинг питания"
      className="rounded-3xl border border-bear-line bg-bear-card p-5"
    >
      {/* шапка: заголовок + переключатель День/Месяц */}
      <View className="flex-row items-center justify-between gap-2">
        <View className="flex-row items-center gap-2">
          <Leaf size={18} color="#6EE7B7" />
          <Text className="font-bold text-[15px] tracking-tight text-bear-text">
            Рейтинг питания
          </Text>
        </View>

        <View className="flex-row rounded-full bg-white/5 p-1">
          {[
            { id: 'day', label: 'День' },
            { id: 'month', label: 'Месяц' },
          ].map(({ id, label: lb }) => (
            <Pressable
              key={id}
              onPress={() => setMode(id)}
              accessibilityRole="button"
              accessibilityLabel={`Рейтинг за ${id === 'day' ? 'день' : 'месяц'}`}
              className={`rounded-full px-3 py-1 ${
                mode === id ? 'bg-[#7B6CF6]' : 'active:opacity-70'
              }`}
            >
              <Text
                maxFontSizeMultiplier={MAX}
                className={`font-semibold text-[11px] ${mode === id ? 'text-white' : 'text-bear-sub'}`}
              >
                {lb}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {hasData ? (
        <>
          {/* общий балл */}
          <View className="mt-4 flex-row items-center gap-3">
            <View className="h-14 w-14 items-center justify-center rounded-2xl border border-bear-line bg-white/[0.04]">
              <Text maxFontSizeMultiplier={MAX} className="font-extrabold text-[22px] tracking-tight text-bear-text">
                {r.overall}
              </Text>
            </View>
            <View className="min-w-0 flex-1">
              <Text maxFontSizeMultiplier={MAX} className="font-bold text-[15px] text-bear-text">
                {emoji} {label}
                <Text maxFontSizeMultiplier={MAX} className="font-medium text-[12px] text-bear-sub">
                  {'  '}{formatNum(Math.round(n.kcal))} ккал{mode === 'month' ? '/день' : ''}
                </Text>
              </Text>
              <Text maxFontSizeMultiplier={MAX} className="mt-0.5 font-sans text-[11px] leading-snug text-bear-dim">
                {caption}
              </Text>
            </View>
          </View>

          {/* пять показателей: клетчатка, сахар, белки, жиры, углеводы */}
          <View className="mt-4 gap-3">
            {rows.map((row) => (
              <MetricRow key={row.key} {...row} />
            ))}
          </View>
        </>
      ) : (
        <Text className="mt-3 font-sans text-[12px] leading-relaxed text-bear-dim">
          {mode === 'day'
            ? 'Добавьте блюда в дневник — и мишка оценит рацион по клетчатке, сахару и балансу БЖУ 🐻'
            : `За ${monthName} записей ещё нет — переключитесь на «День» или добавьте блюда 🐻`}
        </Text>
      )}
    </View>
  )
}

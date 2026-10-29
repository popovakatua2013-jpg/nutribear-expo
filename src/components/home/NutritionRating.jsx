// Карточка «Рейтинг питания»: оценка рациона по клетчатке, сахару,
// балансу нутриентов и витаминам/минералам — за день и за месяц.
// По умолчанию видны три главные метрики (клетчатка, сахар, белки),
// остальное — жиры, углеводы, витамины/минералы — под «Подробнее».
// Расчёты — src/lib/data/nutrition.js; данные дня — дневник (entries),
// месяца — журнал приёмов (history) со средними за день с записями.

import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { ChevronDown, ChevronUp, Leaf } from 'lucide-react-native'
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
  const [expanded, setExpanded] = useState(false)

  const now = new Date()
  const monthName = MONTHS[now.getMonth()]

  // День: сегодняшние записи; Месяц: журнал приёмов этого месяца
  const dayRows = Object.values(entries).flat()
  const mRows = monthRows(history)
  const n = mode === 'day' ? sumNutrition(dayRows) : monthNutrition(mRows)
  const hasData = mode === 'day' ? dayRows.length > 0 : n.days > 0
  const r = nutritionRating(hasData ? n : { ...n, rows: 0, mk: 0, kcal: 0, fib: 0 })
  const { label, emoji } = ratingLabel(r.overall)

  const noFiber = hasData && n.kcal > 0 && n.fib <= 0
  const caption =
    mode === 'day'
      ? 'по записям дневника за сегодня'
      : `в среднем за день с записями · ${monthName} · ${n.days} дн.`

  // Полнота данных о витаминах (для развёрнутого вида)
  const share = r.microShare ?? 0
  const microNote =
    share >= 0.999
      ? null
      : share <= 0.001
        ? 'У блюд этого периода нет данных о витаминах — микро-часть в балле не учтена. Добавляйте блюда из базы или впишите клетчатку и сахар через ✏️'
        : `Витамины и минералы учтены по продуктам базы — покрытие записей ≈ ${Math.round(share * 100)}%`

  const rows = [
    { key: 'fiber', label: 'Клетчатка', value: `${round1(r.fiber.value)} г`, norm: `норма ${FIBER_NORM} г/день`, score: r.fiber.score },
    { key: 'sugar', label: 'Сахар', value: `${round1(r.sugar.value)} г`, norm: `лучше до ${SUGAR_LIMIT} г/день`, score: r.sugar.score },
    { key: 'protein', label: 'Белки', value: `${r.protein.value}%`, norm: 'норма 15–30% ккал', score: r.protein.score },
    { key: 'fat', label: 'Жиры', value: `${r.fat.value}%`, norm: 'норма 20–35% ккал', score: r.fat.score },
    { key: 'carbs', label: 'Углеводы', value: `${r.carbs.value}%`, norm: 'норма 45–65% ккал', score: r.carbs.score },
    { key: 'fe', label: 'Железо', value: `${round1(r.micro.fe.value)} мг`, norm: 'норма 14 мг/день', score: r.micro.fe.score },
    { key: 'ca', label: 'Кальций', value: `${Math.round(r.micro.ca.value)} мг`, norm: 'норма 1000 мг/день', score: r.micro.ca.score },
    { key: 'k', label: 'Калий', value: `${Math.round(r.micro.k.value)} мг`, norm: 'норма 3500 мг/день', score: r.micro.k.score },
    { key: 'mg', label: 'Магний', value: `${round1(r.micro.mg.value)} мг`, norm: 'норма 400 мг/день', score: r.micro.mg.score },
    { key: 'vitc', label: 'Витамин C', value: `${round1(r.micro.vitc.value)} мг`, norm: 'норма 90 мг/день', score: r.micro.vitc.score },
    { key: 'vita', label: 'Витамин A', value: `${Math.round(r.micro.vita.value)} мкг`, norm: 'норма 900 мкг/день', score: r.micro.vita.score },
  ]
  const visibleRows = expanded ? rows : rows.slice(0, 3)

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
                {noFiber ? ' · без клетчатки балл не выше «Средне»' : ''}
              </Text>
            </View>
          </View>

          {/* показатели: по умолчанию 3 главные, остальные под «Подробнее» */}
          <View className="mt-4 gap-3">
            {visibleRows.map((row) => (
              <MetricRow key={row.key} {...row} />
            ))}
          </View>

          <Pressable
            onPress={() => setExpanded((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel={expanded ? 'Свернуть подробности' : 'Показать подробности'}
            className="mt-3 flex-row items-center justify-center gap-1 rounded-xl bg-white/5 py-2 active:bg-white/10"
          >
            {expanded ? (
              <ChevronUp size={14} color="#AEB9D9" />
            ) : (
              <ChevronDown size={14} color="#AEB9D9" />
            )}
            <Text className="font-semibold text-[12px] text-bear-sub">
              {expanded ? 'Свернуть' : 'Подробнее · жиры, углеводы, витамины'}
            </Text>
          </Pressable>

          {expanded && microNote ? (
            <Text className="mt-2 font-sans text-[10.5px] leading-[14px] text-bear-dim">
              {microNote}
            </Text>
          ) : null}
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

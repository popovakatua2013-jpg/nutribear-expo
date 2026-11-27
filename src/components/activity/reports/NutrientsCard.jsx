// Нутриенты «Отчётов»: белки/жиры/углеводы/клетчатка за выбранный
// период — из журнала приёмов (useFoodStore.history, у записей есть
// день и БЖУ). Итог за период + в среднем за день с записями; Δ к
// прошлому периоду — нейтральным серым (у БЖУ нет однозначного
// «больше = лучше», в отличие от шагов). Журнал хранит ~900 записей
// (около 2 месяцев) — самые старые дни 90-дневного периода могут
// отсутствовать, они честно не входят в среднее. Поверхность и шапка —
// в стиле вкладки «Тело» (bear-bodyCard + BodyChip).
// Правка Кати 25.11 («цветные точки — по темам»): точки нутриентов —
// цвета активной темы (nutP/nutF/nutC/nutFib), а не жёсткая палитра.
// Правка Кати 25.11, пятый круг («нутриенты + нет рамки», «все вкладки
// должны быть оформлены одинаково»): блок был плоской подложкой
// bodyCard без рамки и без градиента — читался «дырой» между
// светящимися карточками «Отчётов». Теперь: снаружи NeonCard (кайма +
// градиент + свечение, как у «Съедено за сегодня»), внутри плитки
// нутриентов — GradientTile (градиент + кайма темы)

import { useMemo } from 'react'
import { Text, View } from 'react-native'
import { ArrowDownRight, ArrowUpRight, Wheat } from 'lucide-react-native'
import { changePct, nutrientTotals, nutrientsByDay } from '@/lib/data/reports'
import { FIBER_NORM } from '@/lib/data/nutrition'
import { useFoodStore } from '@/store/useFoodStore'
import { BodyChip } from '../../ui/BodyChip'
import { NeonCard } from '../../ui/NeonCard'
import { GradientTile } from '../../ui/GradientTile'
import { useThemeColors } from '@/lib/use-theme'


const round1 = (v) => Math.round(v * 10) / 10

// Нутриенты и их ТОКЕНЫ темы (цвет берётся в рендере — по активной теме):
// гексагон/огонь/капля/лист — как в сводке «Съедено за сегодня»
const STATS = [
  { key: 'p', label: 'Белки', token: 'nutP' },
  { key: 'f', label: 'Жиры', token: 'nutF' },
  { key: 'c', label: 'Углеводы', token: 'nutC' },
  { key: 'fib', label: 'Клетчатка', token: 'nutFib' },
]

function Stat({ label, color, value, sub, pct }) {
  const themeColors = useThemeColors()
  const Arrow = pct > 0 ? ArrowUpRight : pct < 0 ? ArrowDownRight : null
  return (
    <GradientTile
      radius={16}
      // БЕЗ flex-1 на внутреннем View (правка Кати 27.11: «блок нутриенты
      // схлопнулся» — basis 0% в колонке с авто-высотой схлопывал плитку
      // на устройстве в двухпиксельную линию с точками). Высоту плитке
      // даёт контент, ширину — flex:1 на внешнем контейнере (как у
      // секций MealPlanCard); растяжение по ряду — items-stretch по умолчанию
      className="px-3 py-2.5"
      style={{ flex: 1, minWidth: 0 }}
    >
      <View className="flex-row items-center gap-1.5">
        <View className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
        <Text numberOfLines={1} className="font-sans text-[15px] text-bear-sub">
          {label}
        </Text>
      </View>
      <Text numberOfLines={1} className="mt-1 font-extrabold text-[20px] leading-tight text-bear-text">
        {value}
      </Text>
      <Text numberOfLines={1} className="font-sans text-[14.5px] text-bear-dim">
        {sub}
      </Text>
      {pct != null && Arrow ? (
        <View className="mt-1 flex-row items-center gap-0.5">
          <Arrow size={15} color={themeColors.dim} />
          <Text className="font-sans text-[14.5px] text-bear-dim">
            {`${Math.abs(pct)}% к прошлому периоду`}
          </Text>
        </View>
      ) : null}
    </GradientTile>
  )
}

export function NutrientsCard({ days }) {
  const themeColors = useThemeColors()
  const foodHistory = useFoodStore((s) => s.history)
  const byDay = useMemo(() => nutrientsByDay(foodHistory), [foodHistory])
  const cur = useMemo(() => nutrientTotals(byDay, days, 0), [byDay, days])
  const prev = useMemo(() => nutrientTotals(byDay, days, days), [byDay, days])

  return (
    <NeonCard accessibilityLabel="Нутриенты за период" className="p-5">
      <View className="flex-row items-center justify-between gap-2">
        <View className="min-w-0 flex-row items-center gap-2">
          <BodyChip icon={<Wheat size={17} />} />
          <Text className="font-bold text-[20px] tracking-tight text-bear-text">
            Нутриенты
          </Text>
        </View>
        <View className="shrink-0 rounded-full bg-bear-accentFaint px-2.5 py-1.5">
          <Text className="font-semibold text-[15px] text-bear-soft">
            {`${cur.recorded} из ${days} дн. с едой`}
          </Text>
        </View>
      </View>
      <Text className="mt-0.5 font-sans text-[15px] leading-snug text-bear-sub">
        Из журнала питания · в среднем за день с записями
      </Text>

      {cur.recorded === 0 ? (
        <Text className="mt-3 font-sans text-[15px] leading-snug text-bear-dim">
          Записей еды за период нет — белки, жиры, углеводы и клетчатка появятся
          здесь, как только добавите еду за день
        </Text>
      ) : (
        <>
          <View className="mt-3 flex-row gap-2">
            {STATS.slice(0, 2).map((s) => (
              <Stat
                key={s.key}
                label={s.label}
                color={themeColors[s.token]}
                value={`${round1(cur[s.key] / cur.recorded)} г/день`}
                sub={`${Math.round(cur[s.key])} г за период`}
                pct={prev.recorded > 0 ? changePct(cur[s.key], prev[s.key]) : null}
              />
            ))}
          </View>
          <View className="mt-2 flex-row gap-2">
            {STATS.slice(2).map((s) => (
              <Stat
                key={s.key}
                label={s.label}
                color={themeColors[s.token]}
                value={`${round1(cur[s.key] / cur.recorded)} г/день`}
                sub={
                  s.key === 'fib'
                    ? `норма ${FIBER_NORM} г/день · ${Math.round(cur[s.key])} г за период`
                    : `${Math.round(cur[s.key])} г за период`
                }
                pct={prev.recorded > 0 ? changePct(cur[s.key], prev[s.key]) : null}
              />
            ))}
          </View>
          {days > 60 ? (
            <Text className="mt-2.5 font-sans text-[15px] leading-snug text-bear-dim">
              Журнал питания хранит около 2 месяцев — самые старые дни
              90-дневного периода могут отсутствовать
            </Text>
          ) : null}
        </>
      )}
    </NeonCard>
  )
}

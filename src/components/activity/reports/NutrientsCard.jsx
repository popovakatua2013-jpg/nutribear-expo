// Нутриенты «Отчётов»: белки/жиры/углеводы/клетчатка за выбранный
// период — из журнала приёмов (useFoodStore.history, у записей есть
// день и БЖУ). Итог за период + в среднем за день с записями; Δ к
// прошлому периоду — нейтральным серым (у БЖУ нет однозначного
// «больше = лучше», в отличие от шагов). Журнал хранит ~900 записей
// (около 2 месяцев) — самые старые дни 90-дневного периода могут
// отсутствовать, они честно не входят в среднее. Поверхность и шапка —
// в стиле вкладки «Тело» (bear-bodyCard + BodyChip).

import { useMemo } from 'react'
import { Text, View } from 'react-native'
import { ArrowDownRight, ArrowUpRight, Wheat } from 'lucide-react-native'
import { changePct, nutrientTotals, nutrientsByDay } from '@/lib/data/reports'
import { FIBER_NORM } from '@/lib/data/nutrition'
import { useFoodStore } from '@/store/useFoodStore'
import { BodyChip } from '../../ui/BodyChip'

const round1 = (v) => Math.round(v * 10) / 10

// Цвета — как в сводке «Съедено за сегодня»: гексагон/огонь/капля/лист
const STATS = [
  { key: 'p', label: 'Белки', color: '#A78BFA' },
  { key: 'f', label: 'Жиры', color: '#fb923c' },
  { key: 'c', label: 'Углеводы', color: '#38BDF8' },
  { key: 'fib', label: 'Клетчатка', color: '#34D399' },
]

function Stat({ label, color, value, sub, pct }) {
  const Arrow = pct > 0 ? ArrowUpRight : pct < 0 ? ArrowDownRight : null
  return (
    <View className="min-w-0 flex-1 rounded-2xl bg-white/[0.04] px-3 py-2.5">
      <View className="flex-row items-center gap-1.5">
        <View className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
        <Text numberOfLines={1} className="font-sans text-[10px] text-bear-sub">
          {label}
        </Text>
      </View>
      <Text numberOfLines={1} className="mt-1 font-extrabold text-[15px] leading-tight text-bear-text">
        {value}
      </Text>
      <Text numberOfLines={1} className="font-sans text-[9.5px] text-bear-dim">
        {sub}
      </Text>
      {pct != null && Arrow ? (
        <View className="mt-1 flex-row items-center gap-0.5">
          <Arrow size={11} color="#8B96B8" />
          <Text className="font-sans text-[9.5px] text-bear-dim">
            {`${Math.abs(pct)}% к прошлому периоду`}
          </Text>
        </View>
      ) : null}
    </View>
  )
}

export function NutrientsCard({ days }) {
  const foodHistory = useFoodStore((s) => s.history)
  const byDay = useMemo(() => nutrientsByDay(foodHistory), [foodHistory])
  const cur = useMemo(() => nutrientTotals(byDay, days, 0), [byDay, days])
  const prev = useMemo(() => nutrientTotals(byDay, days, days), [byDay, days])

  return (
    <View
      accessibilityLabel="Нутриенты за период"
      className="rounded-3xl border border-bear-bodyLine bg-bear-bodyCard p-5"
    >
      <View className="flex-row items-center justify-between gap-2">
        <View className="min-w-0 flex-row items-center gap-2">
          <BodyChip icon={<Wheat size={15} />} />
          <Text className="font-bold text-[15px] tracking-tight text-bear-text">
            Нутриенты
          </Text>
        </View>
        <View className="shrink-0 rounded-full bg-white/[0.06] px-2.5 py-1">
          <Text className="font-semibold text-[11px] text-bear-soft">
            {`${cur.recorded} из ${days} дн. с едой`}
          </Text>
        </View>
      </View>
      <Text className="mt-0.5 font-sans text-[10.5px] leading-snug text-bear-sub">
        Из журнала питания · в среднем за день с записями
      </Text>

      {cur.recorded === 0 ? (
        <Text className="mt-3 font-sans text-[10.5px] leading-snug text-bear-dim">
          Записей еды за период нет — белки, жиры, углеводы и клетчатка появятся
          здесь, как только заполните дневник питания
        </Text>
      ) : (
        <>
          <View className="mt-3 flex-row gap-2">
            {STATS.slice(0, 2).map((s) => (
              <Stat
                key={s.key}
                label={s.label}
                color={s.color}
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
                color={s.color}
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
            <Text className="mt-2.5 font-sans text-[10px] leading-snug text-bear-dim">
              Журнал питания хранит около 2 месяцев — самые старые дни
              90-дневного периода могут отсутствовать
            </Text>
          ) : null}
        </>
      )}
    </View>
  )
}

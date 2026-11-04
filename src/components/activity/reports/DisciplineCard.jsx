// Дисциплина периода: сколько дней дневник вели и сколько из них
// дневная цель достигнута — по шагам, воде и калориям. «День велся» —
// есть любая запись (шаги, еда, вода, тренировка): дни полного молчания
// не портят картину 30/90-дневных периодов. Данные — дневная история
// (те же rows, что у карточек итогов), цели — из хранилища целей.

import { Text, View } from 'react-native'
import { discipline } from '@/lib/data/reports'
import { useGoalsStore } from '@/store/useGoalsStore'

// Порядок и цвета — как в реестре метрик (steps/water/kcal)
const LINES = [
  { key: 'steps', label: 'Шаги', color: '#4ade80', note: 'цель достигнута' },
  { key: 'waterMl', label: 'Вода', color: '#38bdf8', note: 'цель достигнута' },
  { key: 'kcal', label: 'Калории', color: '#f87171', note: 'в рамках цели' },
]

export function DisciplineCard({ rows }) {
  const goals = useGoalsStore((s) => s.goals)
  const { days, recorded, met } = discipline(rows, goals)
  const pct = days > 0 ? Math.round((recorded / days) * 100) : 0

  // Тон полосы и чипа — по заполненности периода
  const tone =
    pct >= 67
      ? { chip: 'bg-emerald-400/10', text: 'text-emerald-300', bar: 'bg-emerald-400/70' }
      : pct >= 34
        ? { chip: 'bg-amber-400/10', text: 'text-amber-300', bar: 'bg-amber-400/70' }
        : { chip: 'bg-rose-400/10', text: 'text-rose-300', bar: 'bg-rose-400/70' }

  return (
    <View
      accessibilityLabel="Дисциплина периода"
      className="rounded-3xl border border-white/5 bg-bear-card p-5"
    >
      <View className="flex-row items-center justify-between gap-2">
        <Text className="font-bold text-[15px] tracking-tight text-bear-text">
          Дисциплина
        </Text>
        <View className={`shrink-0 rounded-full px-2.5 py-1 ${tone.chip}`}>
          <Text className={`font-semibold text-[11px] ${tone.text}`}>
            вели дневник {recorded} из {days} дней
          </Text>
        </View>
      </View>

      {/* Полоса заполненности дневника: доля дней с записями */}
      <View className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
        <View className={`h-full rounded-full ${tone.bar}`} style={{ width: `${pct}%` }} />
      </View>

      {/* Сколько дней цель достигнута — по трём показателям */}
      <View className="mt-3 flex-row gap-2">
        {LINES.map((l) => (
          <View key={l.key} className="min-w-0 flex-1 rounded-2xl bg-white/[0.04] px-3 py-2.5">
            <View className="flex-row items-center gap-1.5">
              <View className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: l.color }} />
              <Text numberOfLines={1} className="font-sans text-[10px] text-bear-sub">
                {l.label}
              </Text>
            </View>
            <Text className="mt-1 font-extrabold text-[15px] leading-tight text-bear-text">
              {met[l.key]}
              <Text className="font-sans text-[11px] text-bear-dim">{` из ${days}`}</Text>
            </Text>
            <Text numberOfLines={1} className="font-sans text-[9.5px] text-bear-dim">
              {l.note}
            </Text>
          </View>
        ))}
      </View>

      <Text className="mt-2.5 font-sans text-[10.5px] leading-snug text-bear-dim">
        {recorded === 0
          ? 'Записей за период пока нет — добавьте шаги, воду или еду, и здесь появится статистика'
          : 'День считается заполненным, когда есть любая запись; пустые дни средние показатели не топят'}
      </Text>
    </View>
  )
}

// Карточка «План питания на сегодня»: шапка с серыми значками
// (копировать вчера, история, гид по порциям) и 4 приёма пищи —
// каждый на всю ширину, крупным блоком. Блоки не растягивают
// друг друга: у каждого приёма своя высота. Внизу — единая сводка
// дня: съедено/норма, осталось/перебор, прогресс и БЖУ.

import { useState } from 'react'
import { Text, View } from 'react-native'
import { Flame } from 'lucide-react-native'
import { MealCard } from './MealCard'
import { PlanHeader } from './PlanHeader'
import { HistoryModal } from './HistoryModal'
import { ProgressBar } from '../ui/ProgressBar'
import { useFoodStore } from '@/store/useFoodStore'
import { mealConsumed, dayBju, totalConsumed } from '@/lib/data/diary'
import { bjuLine } from '@/lib/data/bju'
import { formatNum } from '@/lib/format'
import { MEALS } from '@/lib/data/meals'
import { targetsFromKcal } from '@/lib/data/goals'
import { useGoalsStore } from '@/store/useGoalsStore'

const MAX = 1.25

export function MealPlanCard({ onAdd, onRemove, onViewAll }) {
  const entries = useFoodStore((s) => s.entries)
  const goals = useGoalsStore((s) => s.goals)
  const [historyOpen, setHistoryOpen] = useState(false)

  const targets = targetsFromKcal(goals.kcal)
  const day = dayBju(entries)

  // Единая сводка дня: калории, остаток/перебор, прогресс, БЖУ
  const consumed = totalConsumed(entries)
  const target = goals.kcal
  const pct = target > 0 ? Math.min(100, (consumed / target) * 100) : 0
  const remaining = Math.max(0, target - consumed)
  const over = Math.max(0, consumed - target)
  const done = consumed > 0 && remaining === 0 && over === 0

  return (
    <View accessibilityLabel="План питания на сегодня" className="rounded-3xl border border-bear-line bg-bear-card p-5">
      <PlanHeader onViewAll={onViewAll} onHistory={() => setHistoryOpen(true)} />

      <View className="gap-3">
        {MEALS.map((meal) => (
          <MealCard
            key={meal.id}
            meal={meal}
            target={targets[meal.id]}
            consumed={mealConsumed(entries, meal.id)}
            entries={entries[meal.id] || []}
            onAdd={() => onAdd(meal.id)}
            onRemove={(entryId) => onRemove(meal.id, entryId)}
            onShowAll={onViewAll}
          />
        ))}
      </View>

      {/* Единая сводка за день — сразу после приёмов пищи */}
      <View className="mt-4 border-t border-bear-line pt-4">
        <View className="flex-row items-end justify-between gap-3">
          <View className="min-w-0 flex-1">
            <Text maxFontSizeMultiplier={MAX} className="font-medium text-xs text-bear-sub">
              Съедено за сегодня
            </Text>
            <Text
              maxFontSizeMultiplier={MAX}
              className="mt-1 font-extrabold text-[22px] tracking-tight text-bear-text"
            >
              {formatNum(consumed)}
              <Text maxFontSizeMultiplier={MAX} className="font-semibold text-[14px] text-bear-sub">
                {'  '}/ {formatNum(target)} ккал
              </Text>
            </Text>
          </View>

          <View
            className={`shrink-0 flex-row items-center gap-1.5 rounded-full px-3 py-1.5 ${
              over > 0 ? 'bg-amber-400/10' : done ? 'bg-emerald-400/10' : 'bg-[#1A2647]'
            }`}
          >
            <Flame
              size={14}
              color={over > 0 ? '#FCD34D' : done ? '#6EE7B7' : '#AEB9D9'}
            />
            <Text
              maxFontSizeMultiplier={MAX}
              className={`font-semibold text-xs ${
                over > 0 ? 'text-amber-300' : done ? 'text-emerald-300' : 'text-bear-soft'
              }`}
            >
              {over > 0
                ? `+${formatNum(over)} ккал`
                : done
                  ? 'Цель достигнута'
                  : `Осталось ${formatNum(remaining)}`}
            </Text>
          </View>
        </View>

        {/* прогресс дня */}
        <View className="mt-3">
          <ProgressBar pct={pct} h={8} tone={done ? 'emerald' : over > 0 ? 'amber' : 'grad'} />
        </View>

        {/* БЖУ за день */}
        <Text
          maxFontSizeMultiplier={MAX}
          className="mt-3 px-1 font-sans text-[11px] text-bear-dim"
        >
          За день: <Text maxFontSizeMultiplier={MAX} className="font-semibold text-bear-sub">{bjuLine(day)}</Text>
        </Text>
      </View>

      <HistoryModal visible={historyOpen} onClose={() => setHistoryOpen(false)} />
    </View>
  )
}

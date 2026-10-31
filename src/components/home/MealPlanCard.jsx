// Карточка «План питания на сегодня»: шапка с серыми значками
// (копировать вчера, история, гид по порциям) и 4 приёма пищи —
// каждый на всю ширину, компактным блоком (межблочный интервал
// небольшой, чтобы план целиком занимал меньше экрана).
// Блоки не растягивают друг друга: у каждого приёма своя высота.
// Сводка дня («Съедено за сегодня») — отдельным блоком над карточкой.

import { useState } from 'react'
import { Text, View } from 'react-native'
import { MealCard } from './MealCard'
import { PlanHeader } from './PlanHeader'
import { HistoryModal } from './HistoryModal'
import { useFoodStore } from '@/store/useFoodStore'
import { mealConsumed } from '@/lib/data/diary'
import { MEALS } from '@/lib/data/meals'
import { targetsFromKcal } from '@/lib/data/goals'
import { useGoalsStore } from '@/store/useGoalsStore'

export function MealPlanCard({ onAdd, onRemove, onViewAll }) {
  const entries = useFoodStore((s) => s.entries)
  const goals = useGoalsStore((s) => s.goals)
  const [historyOpen, setHistoryOpen] = useState(false)

  const targets = targetsFromKcal(goals.kcal)

  return (
    <View accessibilityLabel="План питания на сегодня" className="rounded-3xl border border-bear-line bg-bear-card p-4">
      <PlanHeader onViewAll={onViewAll} onHistory={() => setHistoryOpen(true)} />

      <View className="gap-2">
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

      <HistoryModal visible={historyOpen} onClose={() => setHistoryOpen(false)} />
    </View>
  )
}

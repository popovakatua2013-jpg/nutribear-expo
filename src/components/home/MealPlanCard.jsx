// Карточка «План питания на сегодня»: шапка с серыми значками
// (копировать вчера, история, гид по порциям) и 4 приёма пищи —
// каждый на всю ширину, крупным блоком. Блоки не растягивают
// друг друга: у каждого приёма своя высота.

import { useState } from 'react'
import { Image, Text, View } from 'react-native'
import { MealCard } from './MealCard'
import { PlanHeader } from './PlanHeader'
import { HistoryModal } from './HistoryModal'
import { useFoodStore } from '@/store/useFoodStore'
import { mealConsumed, dayBju } from '@/lib/data/diary'
import { bjuLine } from '@/lib/data/bju'
import { MEALS } from '@/lib/data/meals'
import { targetsFromKcal } from '@/lib/data/goals'
import { useGoalsStore } from '@/store/useGoalsStore'

export function MealPlanCard({ onAdd, onRemove, onViewAll }) {
  const entries = useFoodStore((s) => s.entries)
  const goals = useGoalsStore((s) => s.goals)
  const [historyOpen, setHistoryOpen] = useState(false)

  const targets = targetsFromKcal(goals.kcal)
  const day = dayBju(entries)

  return (
    <View accessibilityLabel="План питания на сегодня" className="rounded-3xl border border-bear-line bg-bear-card p-5">
      {/* Круглая чаша в правом верхнем углу — как в макете */}
      <Image
        source={require('../../../assets/images/plan-bowl.png')}
        style={{
          position: 'absolute',
          top: 8,
          right: 16,
          width: 64,
          height: 64,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.12)',
        }}
      />
      <PlanHeader onViewAll={onViewAll} onHistory={() => setHistoryOpen(true)} rightInset={68} />

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

      <Text className="mt-3 px-1 font-sans text-[11px] text-bear-dim">
        За день: <Text className="font-semibold text-bear-sub">{bjuLine(day)}</Text>
      </Text>

      <HistoryModal visible={historyOpen} onClose={() => setHistoryOpen(false)} />
    </View>
  )
}

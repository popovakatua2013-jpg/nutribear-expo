// Карточка «Приёмы пищи»: шапка с фиолетовой пилюлей «+ Добавить»
// и 4 плитки в один ряд — как в референсе. У каждой плитки фото
// блюда, галочки-бейджи (если в приём уже внесено) и калории;
// тап по плитке — добавить блюдо в этот приём. Управление блюдами
// (правка, удаление) — по ссылке «Все» (AllMealsModal). Сводка дня
// («Съедено за сегодня») — отдельным блоком над карточкой.

import { useState } from 'react'
import { View } from 'react-native'
import { MealCard } from './MealCard'
import { PlanHeader } from './PlanHeader'
import { HistoryModal } from './HistoryModal'
import { useFoodStore } from '@/store/useFoodStore'
import { mealConsumed } from '@/lib/data/diary'
import { MEALS } from '@/lib/data/meals'

export function MealPlanCard({ onAdd, onViewAll }) {
  const entries = useFoodStore((s) => s.entries)
  const [historyOpen, setHistoryOpen] = useState(false)

  // «+ Добавить» в шапке — в первый приём без записей (или в завтрак,
  // если всё заполнено)
  const firstEmpty = MEALS.find((m) => !(entries[m.id] || []).length)

  return (
    <View accessibilityLabel="Приёмы пищи на сегодня" className="rounded-3xl border border-bear-line bg-bear-card p-4">
      <PlanHeader
        onViewAll={onViewAll}
        onHistory={() => setHistoryOpen(true)}
        onAdd={() => onAdd(firstEmpty ? firstEmpty.id : 'breakfast')}
      />

      <View className="flex-row gap-2">
        {MEALS.map((meal) => (
          <MealCard
            key={meal.id}
            meal={meal}
            consumed={mealConsumed(entries, meal.id)}
            onAdd={() => onAdd(meal.id)}
          />
        ))}
      </View>

      <HistoryModal visible={historyOpen} onClose={() => setHistoryOpen(false)} />
    </View>
  )
}

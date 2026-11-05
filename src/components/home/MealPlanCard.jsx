// Карточка «Приёмы пищи»: шапка и 4 плитки В ОДИН СТОЛБИК — каждый
// приём занимает отдельную строку на всю ширину карточки (по просьбе
// Кати: вместо сетки 2×2 — строчка за строчкой, и крупнее). Плитка —
// крупное круглое фото (52) + название и калории в строку; тап по
// плитке — добавить блюдо в этот приём (отдельной кнопки «Добавить»
// нет — дубль). Управление блюдами (правка, удаление) — по ссылке
// «Все» (AllMealsModal). Сводка дня («Съедено за сегодня») — отдельным
// блоком над карточкой. Поверхность — в стиле вкладки «Тело»
// (фиолетовая bear-bodyCard + обводка bear-bodyLine).

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

  return (
    <View accessibilityLabel="Приёмы пищи на сегодня" className="rounded-3xl border border-bear-bodyLine bg-bear-bodyCard p-4">
      <PlanHeader
        onViewAll={onViewAll}
        onHistory={() => setHistoryOpen(true)}
      />

      {/* столбик: один приём — одна строка на всю ширину */}
      <View className="gap-2.5">
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

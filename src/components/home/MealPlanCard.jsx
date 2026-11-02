// Карточка «Приёмы пищи»: шапка и 4 плитки сеткой 2×2 (две сверху,
// две под ними) — по обратной связи ряд из четырёх был слишком мелкий
// на узком экране. В каждом ряду плитки одной высоты (flex-stretch),
// у каждой плитки фото блюда, галочки-бейджи (если в приём уже
// внесено) и калории; тап по плитке — добавить блюдо в этот приём
// (отдельной кнопки «Добавить» больше нет — дубль). Управление
// блюдами (правка, удаление) — по ссылке «Все» (AllMealsModal).
// Сводка дня («Съедено за сегодня») — отдельным блоком над карточкой.

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

  // Сетка 2×2: два ряда по две плитки — карточки крупнее, чем в ряд
  const rows = [MEALS.slice(0, 2), MEALS.slice(2, 4)]

  return (
    <View accessibilityLabel="Приёмы пищи на сегодня" className="rounded-3xl border border-bear-line bg-bear-card p-4">
      <PlanHeader
        onViewAll={onViewAll}
        onHistory={() => setHistoryOpen(true)}
      />

      <View className="gap-2">
        {rows.map((row) => (
          <View key={row[0].id} className="flex-row gap-2">
            {row.map((meal) => (
              <MealCard
                key={meal.id}
                meal={meal}
                consumed={mealConsumed(entries, meal.id)}
                onAdd={() => onAdd(meal.id)}
              />
            ))}
          </View>
        ))}
      </View>

      <HistoryModal visible={historyOpen} onClose={() => setHistoryOpen(false)} />
    </View>
  )
}

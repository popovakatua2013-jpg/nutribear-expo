// Карточка «Приёмы пищи»: шапка и 4 компактные плитки сеткой 2×2
// (две сверху, две под ними). Плитки теперь компактные — маленькое
// круглое фото + название и калории в строку: квадратные фото-плитки
// занимали почти пол-экрана (громоздко), а тарелки на крупных фото
// были разного масштаба и бросались в глаза. Тап по плитке — добавить
// блюдо в этот приём (отдельной кнопки «Добавить» нет — дубль).
// Управление блюдами (правка, удаление) — по ссылке «Все»
// (AllMealsModal). Сводка дня («Съедено за сегодня») — отдельным
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

  // Сетка 2×2: два ряда по две плитки — карточки крупнее, чем в ряд
  const rows = [MEALS.slice(0, 2), MEALS.slice(2, 4)]

  return (
    <View accessibilityLabel="Приёмы пищи на сегодня" className="rounded-3xl border border-bear-bodyLine bg-bear-bodyCard p-4">
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

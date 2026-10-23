// Режим «База»: локальная база продуктов с поиском.
// (Мировая база Open Food Facts — после подключения серверной части.)

import { useMemo, useState } from 'react'
import { Text, TextInput, View } from 'react-native'
import { Search } from 'lucide-react-native'
import { FoodList } from './FoodList'
import { FOODS } from '@/lib/data/foods'
import { toBuildItem } from '@/lib/data/to-item'

export function BaseMode({ mealId, onPick }) {
  const [query, setQuery] = useState('')

  const q = query.trim().toLowerCase()

  // Локальная база: фильтр по приёму (для доп. перекусов — всё подряд)
  const local = useMemo(
    () =>
      FOODS.filter(
        (f) =>
          (mealId.startsWith('custom-') || f.tags.includes(mealId)) &&
          (!q || f.name.toLowerCase().includes(q))
      ).map((f) => toBuildItem(f)),
    [mealId, q]
  )

  return (
    <View style={{ flex: 1 }}>
      <View className="flex-row items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5">
        <Search size={16} color="#5C668A" />
        <TextInput
          accessibilityLabel="Поиск блюда"
          placeholder="Найти блюдо…"
          placeholderTextColor="#5C668A"
          value={query}
          onChangeText={setQuery}
          className="min-w-0 flex-1 font-sans text-sm text-bear-text"
        />
      </View>

      <View className="mt-3" style={{ flex: 1 }}>
        <FoodList
          items={local}
          emptyText="Ничего не нашлось 🤷 Попробуйте другой запрос"
          onPick={onPick}
        />
      </View>
    </View>
  )
}

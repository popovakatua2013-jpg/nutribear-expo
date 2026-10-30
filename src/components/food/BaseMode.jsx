// Режим «База»: встроенная база продуктов + СВОИ продукты (запоминаются)
// с поиском. Свои продукты можно добавлять, изменять и удалять —
// они участвуют в поиске по всему приложению наравне с базой.

import { useMemo, useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'
import { Pencil, Plus, Search, Star, Trash2 } from 'lucide-react-native'
import { FoodList } from './FoodList'
import { UserFoodForm } from './UserFoodForm'
import { FOODS } from '@/lib/data/foods'
import { toBuildItem } from '@/lib/data/to-item'
import { useUserFoodsStore } from '@/store/useUserFoodsStore'
import { useToast } from '../ui/Toast'

export function BaseMode({ mealId, onPick }) {
  const [query, setQuery] = useState('')
  const [formOpen, setFormOpen] = useState(false) // создание нового
  const [editItem, setEditItem] = useState(null) // свой продукт на изменении
  const userFoods = useUserFoodsStore((s) => s.items)
  const removeUserFood = useUserFoodsStore((s) => s.remove)
  const { toast } = useToast()

  const q = query.trim().toLowerCase()

  // Свои продукты — в списке всегда (без фильтра по приёму пищи)
  const mine = useMemo(
    () =>
      userFoods
        .filter((f) => !q || f.name.toLowerCase().includes(q))
        .map((f) => ({
          id: f.id,
          name: f.name,
          kcal100: f.kcal,
          emoji: f.emoji,
          p: f.p,
          f: f.f,
          c: f.c,
          fib: f.fib,
          sug: f.sug,
          defaultGrams: f.defaultGrams,
          source: 'user',
          sub: 'мой продукт',
        })),
    [userFoods, q]
  )

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
      {/* Поиск + кнопка «свой продукт» */}
      <View className="flex-row items-center gap-2">
        <View className="min-w-0 flex-1 flex-row items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5">
          <Search size={16} color="#8B96B8" />
          <TextInput
            accessibilityLabel="Поиск блюда"
            placeholder="Найти блюдо…"
            placeholderTextColor="#8B96B8"
            value={query}
            onChangeText={setQuery}
            className="min-w-0 flex-1 font-sans text-sm text-bear-text"
          />
        </View>
        <Pressable
          onPress={() => setFormOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Добавить свой продукт"
          className="h-[42px] w-[42px] shrink-0 items-center justify-center rounded-2xl active:opacity-80"
          style={{ backgroundColor: '#7B6CF6' }}
        >
          <Plus size={18} color="#FFFFFF" />
        </Pressable>
      </View>

      <View className="mt-3 min-h-0 flex-1">
        <FoodList
          items={[...mine, ...local]}
          emptyText="Ничего не нашлось 🤷 Добавьте свой продукт кнопкой +"
          onPick={onPick}
        />
      </View>

      {/* Управление своими продуктами */}
      {userFoods.length > 0 && (
        <View className="mt-2 gap-1 border-t border-white/5 pt-2">
          <View className="flex-row items-center gap-1.5 px-1">
            <Star size={12} color="#FBBF24" />
            <Text className="font-semibold text-[11px] uppercase tracking-wide text-bear-sub">
              {`Мои продукты · ${userFoods.length}`}
            </Text>
          </View>
          {userFoods.map((f) => (
            <View key={f.id} className="flex-row items-center gap-2 px-1 py-0.5">
              <Text className="text-[13px]">{f.emoji}</Text>
              <Text numberOfLines={1} className="min-w-0 flex-1 font-sans text-[11px] text-bear-sub">
                {`${f.name} · ${f.kcal} ккал/100 г`}
              </Text>
              <Pressable
                onPress={() => setEditItem(f)}
                accessibilityLabel={`Изменить продукт «${f.name}»`}
                accessibilityRole="button"
                className="rounded p-1"
              >
                <Pencil size={12} color="#8B96B8" />
              </Pressable>
              <Pressable
                onPress={() => {
                  removeUserFood(f.id)
                  toast({ title: '🗑 Продукт удалён', description: f.name })
                }}
                accessibilityLabel={`Удалить продукт «${f.name}»`}
                accessibilityRole="button"
                className="rounded p-1"
              >
                <Trash2 size={13} color="#8B96B8" />
              </Pressable>
            </View>
          ))}
        </View>
      )}

      {/* Форма своего продукта (создание / изменение) */}
      {(formOpen || editItem) && (
        <UserFoodForm
          open
          initial={editItem || undefined}
          onClose={() => {
            setFormOpen(false)
            setEditItem(null)
          }}
        />
      )}
    </View>
  )
}

// Режим «Рецепты»: список своих рецептов + создание нового.
// Рецепт добавляется в приём пищи как обычное блюдо.

import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { ChefHat, Plus, Trash2 } from 'lucide-react-native'
import { RecipeForm } from './RecipeForm'
import { FoodList } from './FoodList'
import { useRecipesStore } from '@/store/useRecipesStore'

export function RecipeMode({ onPick }) {
  const items = useRecipesStore((s) => s.items)
  const remove = useRecipesStore((s) => s.remove)
  const [creating, setCreating] = useState(!items.length)

  if (creating) {
    return <RecipeForm onDone={() => setCreating(false)} />
  }

  return (
    <View>
      <View className="mb-3 flex-row items-center justify-between gap-2">
        <View className="flex-row items-center gap-1.5 px-1">
          <ChefHat size={14} color="#6C8CFF" />
          <Text className="font-semibold text-[11px] uppercase tracking-wide text-bear-link">
            Мои рецепты
          </Text>
        </View>
        <Pressable
          onPress={() => setCreating(true)}
          accessibilityRole="button"
          className="flex-row items-center gap-1 rounded-full bg-white/5 px-3 py-1.5 active:bg-white/10"
        >
          <Plus size={14} color="#AEB9D9" />
          <Text className="font-semibold text-[11px] text-bear-soft">Новый</Text>
        </Pressable>
      </View>

      <FoodList
        scroll={false}
        items={items.map((r) => ({
          id: r.id,
          name: r.name,
          kcal100: r.kcal100,
          emoji: '🍴',
          p: r.p100,
          f: r.f100,
          c: r.c100,
          source: 'recipe',
          defaultGrams: r.grams,
          sub: 'свой рецепт',
        }))}
        emptyText="Рецептов пока нет — создайте первый!"
        onPick={onPick}
      />

      {items.length > 0 && (
        <View className="mt-3 gap-1 border-t border-white/5 pt-3">
          {items.map((r) => (
            <View
              key={r.id}
              className="flex-row items-center justify-between gap-2 px-1 py-1"
            >
              <Text numberOfLines={1} className="min-w-0 flex-1 font-sans text-[11px] text-bear-dim">
                {`${r.name} · ${r.grams} г`}
              </Text>
              <Pressable
                onPress={() => remove(r.id)}
                accessibilityLabel={`Удалить рецепт «${r.name}»`}
                accessibilityRole="button"
                className="rounded p-1"
              >
                <Trash2 size={14} color="#7C87A8" />
              </Pressable>
            </View>
          ))}
        </View>
      )}
    </View>
  )
}

// Режим «Рецепты»: список своих рецептов + создание нового.
// Тап по рецепту — карточка просмотра (все цифры до записи), запись —
// кнопкой в ней (по отзыву: раньше тап сразу записывал в приём пищи).

import { useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { ChefHat, Pencil, Plus, Trash2 } from 'lucide-react-native'
import { RecipeForm } from './RecipeForm'
import { RecipeDetails } from './RecipeDetails'
import { FoodList } from './FoodList'
import { useRecipesStore, gramsPerServing } from '@/store/useRecipesStore'

export function RecipeMode({ onPick }) {
  const items = useRecipesStore((s) => s.items)
  const remove = useRecipesStore((s) => s.remove)
  const [creating, setCreating] = useState(!items.length)
  const [editing, setEditing] = useState(null) // рецепт на изменении
  const [viewing, setViewing] = useState(null) // рецепт в карточке просмотра

  // Единое превращение рецепта в «еду» для дневника — используется
  // и в списке, и в кнопке «Записать» карточки просмотра
  function toItem(r) {
    const sv = Math.max(1, Math.round(r.servings || 1))
    return {
      id: r.id,
      name: r.name,
      photo: r.photo,
      kcal100: r.kcal100,
      emoji: '🍴',
      p: r.p100,
      f: r.f100,
      c: r.c100,
      source: 'recipe',
      defaultGrams: gramsPerServing(r) || r.grams,
      sub:
        sv > 1
          ? `свой рецепт · ${sv} порции по ${gramsPerServing(r)} г`
          : 'свой рецепт',
    }
  }

  function closeForm() {
    setCreating(false)
    setEditing(null)
  }

  function openEdit(r) {
    setEditing(r)
    setCreating(true)
  }

  function logRecipe(r) {
    setViewing(null)
    onPick(toItem(r))
  }

  if (creating) {
    return (
      <ScrollView
        className="min-h-0 flex-1"
        contentContainerClassName="pb-2"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <RecipeForm
          onDone={closeForm}
          initial={editing || undefined}
          onCancel={editing ? closeForm : undefined}
        />
      </ScrollView>
    )
  }

  if (viewing) {
    return (
      <RecipeDetails
        recipe={viewing}
        onClose={() => setViewing(null)}
        onLog={() => logRecipe(viewing)}
        onEdit={() => {
          setViewing(null)
          openEdit(viewing)
        }}
      />
    )
  }

  return (
    <View>
      <View className="mb-3 flex-row items-center justify-between gap-2">
        <View className="flex-row items-center gap-1.5 px-1">
          <ChefHat size={16} color="#6C8CFF" />
          <Text className="font-semibold text-[15px] uppercase tracking-wide text-bear-link">
            Мои рецепты
          </Text>
        </View>
        <Pressable
          onPress={() => setCreating(true)}
          accessibilityRole="button"
          className="flex-row items-center gap-1 rounded-full bg-white/5 px-3 py-1.5 active:bg-white/10"
        >
          <Plus size={16} color="#AEB9D9" />
          <Text className="font-semibold text-[15px] text-bear-soft">Новый</Text>
        </Pressable>
      </View>

      <FoodList
        scroll={false}
        items={items.map(toItem)}
        emptyText="Рецептов пока нет — создайте первый!"
        onPick={(item) => {
          const r = items.find((x) => x.id === item.id)
          if (r) setViewing(r) // сначала смотрим, записываем — из карточки
        }}
      />

      {items.length > 0 && (
        <View className="mt-3 gap-1 border-t border-white/5 pt-3">
          {items.map((r) => (
            <View
              key={r.id}
              className="flex-row items-center justify-between gap-2 px-1 py-1.5"
            >
              <Pressable
                onPress={() => openEdit(r)}
                accessibilityRole="button"
                accessibilityLabel={`Изменить рецепт «${r.name}»`}
                className="min-w-0 flex-1 flex-row items-center gap-1.5 active:opacity-60"
              >
                <Text numberOfLines={1} className="min-w-0 flex-1 font-sans text-[15px] text-bear-dim">
                  {`${r.name} · выход ${r.grams} г${Math.round(r.servings || 1) > 1 ? ` · ${Math.round(r.servings || 1)} порции` : ''}`}
                </Text>
                <Pencil size={14} color="#8B96B8" />
              </Pressable>
              <Pressable
                onPress={() => remove(r.id)}
                accessibilityLabel={`Удалить рецепт «${r.name}»`}
                accessibilityRole="button"
                className="rounded p-1"
              >
                <Trash2 size={16} color="#98A2C2" />
              </Pressable>
            </View>
          ))}
          <Text className="px-1 font-sans text-[15px] text-bear-dim">
            Тап по рецепту — посмотреть и записать · ✏️ — изменить
          </Text>
        </View>
      )}
    </View>
  )
}

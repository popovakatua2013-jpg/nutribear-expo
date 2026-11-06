// Просмотр своего рецепта до записи в приём пищи. По отзыву: раньше тап
// по рецепту сразу отправлял его в дневник — посмотреть, что внутри
// (выход, порции, калорийность, БЖУ), было негде. Теперь тап открывает
// эту карточку, а запись — отдельная кнопка.

import { Image, Pressable, ScrollView, Text, View } from 'react-native'
import { Pencil, X } from 'lucide-react-native'
import { gramsPerServing } from '@/store/useRecipesStore'

export function RecipeDetails({ recipe, onClose, onLog, onEdit }) {
  const sv = Math.max(1, Math.round(recipe.servings || 1))
  const portionGrams = gramsPerServing(recipe)
  const kcalPortion = Math.round((recipe.kcal100 * portionGrams) / 100)
  const kcalAll = Math.round((recipe.kcal100 * recipe.grams) / 100)
  const hasBju = recipe.p100 || recipe.f100 || recipe.c100

  return (
    <ScrollView
      contentContainerClassName="pb-2"
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View className="rounded-2xl border border-[#5B7FFF]/25 bg-[#5B7FFF]/5 p-4">
        {/* Шапка: что смотрим + крестик закрытия */}
        <View className="mb-2 flex-row items-center justify-between gap-2">
          <Text className="min-w-0 flex-1 font-semibold text-[15px] uppercase tracking-wide text-bear-link">
            Рецепт
          </Text>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Закрыть просмотр рецепта"
            className="p-1 active:opacity-70"
          >
            <X hitSlop={10} size={20} color="#A5AECB" />
          </Pressable>
        </View>

        {recipe.photo ? (
          <Image
            source={{ uri: recipe.photo }}
            className="mb-2 h-[140px] w-full rounded-2xl"
            resizeMode="cover"
            accessibilityLabel={`Фото блюда: ${recipe.name}`}
          />
        ) : null}

        <Text className="font-bold text-[19px] text-bear-text">{recipe.name}</Text>

        {/* Все цифры рецепта — до записи, чтобы решение было осознанным */}
        <View className="mt-1.5 gap-1">
          <Text className="font-sans text-[15px] text-bear-sub">
            {`Выход: ${recipe.grams} г${sv > 1 ? ` · ${sv} порции по ${portionGrams} г` : ''}`}
          </Text>
          <Text className="font-sans text-[15px] text-bear-sub">
            {`${recipe.kcal100} ккал / 100 г · весь выход ≈ ${kcalAll} ккал`}
          </Text>
          <Text className="font-sans text-[15px] text-bear-sub">
            {`Одна порция: ${portionGrams} г ≈ ${kcalPortion} ккал`}
          </Text>
          {hasBju ? (
            <Text className="font-sans text-[15px] text-bear-sub">
              {`БЖУ на 100 г: Б ${recipe.p100 ?? 0} · Ж ${recipe.f100 ?? 0} · У ${recipe.c100 ?? 0}`}
            </Text>
          ) : null}
        </View>

        {/* Запись — главное действие, изменение — второстепенное */}
        <View className="mt-3 gap-2">
          <Pressable
            onPress={onLog}
            accessibilityRole="button"
            accessibilityLabel={`Записать «${recipe.name}» в приём пищи`}
            className="rounded-2xl py-3 active:opacity-80"
            style={{ backgroundColor: '#7B6CF6' }}
          >
            <Text className="text-center font-bold text-[16px] text-white">
              Записать в приём пищи
            </Text>
          </Pressable>
          <Pressable
            onPress={onEdit}
            accessibilityRole="button"
            accessibilityLabel={`Изменить рецепт «${recipe.name}»`}
            className="flex-row items-center justify-center gap-1.5 rounded-2xl border border-white/10 bg-white/5 py-2.5 active:bg-white/10"
          >
            <Pencil size={15} color="#AEB9D9" />
            <Text className="font-semibold text-[15px] text-bear-soft">Изменить рецепт</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  )
}

// Форма создания своего рецепта: название, вес, калорийность и БЖУ всего веса.
// БЖУ необязательно — если не указать, они будут оценены по калорийности.
// На выходе — значения на 100 г для дневника.

import { useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'
import { useRecipesStore } from '@/store/useRecipesStore'
import { useToast } from '../ui/Toast'

const num = (v) => Math.max(1, Math.round(Number(String(v).replace(',', '.')) || 0))

const field =
  'rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 font-sans text-sm text-bear-text'

export function RecipeForm({ onDone }) {
  const add = useRecipesStore((s) => s.add)
  const { toast } = useToast()
  const [name, setName] = useState('')
  const [grams, setGrams] = useState('')
  const [kcal, setKcal] = useState('')
  const [p, setP] = useState('')
  const [f, setF] = useState('')
  const [c, setC] = useState('')

  const g = num(grams)
  const total = num(kcal)
  const per100 = grams && kcal ? Math.round((total / g) * 100) : null
  const ready = name.trim() && grams && kcal

  function handleSave() {
    if (!ready) return
    add({
      name: name.trim(),
      grams: g,
      totalKcal: total,
      totalP: num(p),
      totalF: num(f),
      totalC: num(c),
    })
    toast({
      title: `🍴 Рецепт «${name.trim()}» сохранён`,
      description: `${g} г · ${total} ккал (${per100} ккал / 100 г)`,
    })
    onDone()
  }

  return (
    <View className="rounded-2xl border border-[#5B7FFF]/25 bg-[#5B7FFF]/5 p-4">
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Название рецепта"
        placeholderTextColor="#5C668A"
        accessibilityLabel="Название рецепта"
        className={field}
      />
      <View className="mt-2 flex-row gap-2">
        <TextInput
          value={grams}
          onChangeText={setGrams}
          placeholder="Вес, г"
          placeholderTextColor="#5C668A"
          keyboardType="decimal-pad"
          accessibilityLabel="Вес, граммы"
          className={`${field} flex-1`}
        />
        <TextInput
          value={kcal}
          onChangeText={setKcal}
          placeholder="Ккал всего"
          placeholderTextColor="#5C668A"
          keyboardType="decimal-pad"
          accessibilityLabel="Калорийность всего"
          className={`${field} flex-1`}
        />
      </View>
      <View className="mt-2 flex-row gap-2">
        <TextInput
          value={p}
          onChangeText={setP}
          placeholder="Белки, г"
          placeholderTextColor="#5C668A"
          keyboardType="decimal-pad"
          accessibilityLabel="Белки, граммы"
          className={`${field} flex-1`}
        />
        <TextInput
          value={f}
          onChangeText={setF}
          placeholder="Жиры, г"
          placeholderTextColor="#5C668A"
          keyboardType="decimal-pad"
          accessibilityLabel="Жиры, граммы"
          className={`${field} flex-1`}
        />
        <TextInput
          value={c}
          onChangeText={setC}
          placeholder="Углеводы, г"
          placeholderTextColor="#5C668A"
          keyboardType="decimal-pad"
          accessibilityLabel="Углеводы, граммы"
          className={`${field} flex-1`}
        />
      </View>
      <View className="mt-3 flex-row items-center justify-between gap-2">
        <View className="min-w-0 flex-1">
          <Text className="font-sans text-[11px] text-bear-sub">
            {per100 ? `≈ ${per100} ккал / 100 г` : 'Укажите вес и калории'}
          </Text>
          <Text className="font-sans text-[10px] text-bear-dim">
            БЖУ — по желанию, иначе оценим по калориям
          </Text>
        </View>
        <Pressable
          onPress={handleSave}
          disabled={!ready}
          accessibilityRole="button"
          className="rounded-full px-4 py-2 active:opacity-80"
          style={{ backgroundColor: ready ? '#7B6CF6' : '#4A4670' }}
        >
          <Text className="font-bold text-xs text-white">Сохранить рецепт</Text>
        </Pressable>
      </View>
    </View>
  )
}

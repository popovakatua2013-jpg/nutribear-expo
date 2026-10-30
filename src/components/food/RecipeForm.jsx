// Форма создания своего рецепта: название, вес, калорийность и БЖУ всего веса.
// БЖУ необязательно — если не указать, они будут оценены по калорийности.
// На выходе — значения на 100 г для дневника.

import { useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'
import { X } from 'lucide-react-native'
import { useRecipesStore } from '@/store/useRecipesStore'
import { useToast } from '../ui/Toast'

const num = (v) => Math.max(1, Math.round(Number(String(v).replace(',', '.')) || 0))

const field =
  'rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 font-sans text-sm text-bear-text'

export function RecipeForm({ onDone, initial, onCancel }) {
  const add = useRecipesStore((s) => s.add)
  const update = useRecipesStore((s) => s.update)
  const { toast } = useToast()

  // initial задан — редактируем существующий рецепт (поля предзаполнены)
  const editing = Boolean(initial && initial.id)
  const [name, setName] = useState(initial ? initial.name : '')
  const [grams, setGrams] = useState(initial ? String(initial.grams) : '')
  const [kcal, setKcal] = useState(
    initial ? String(Math.round((initial.kcal100 * initial.grams) / 100)) : ''
  )
  const [p, setP] = useState(
    initial && initial.p100 ? String(Math.round((initial.p100 * initial.grams) / 100)) : ''
  )
  const [f, setF] = useState(
    initial && initial.f100 ? String(Math.round((initial.f100 * initial.grams) / 100)) : ''
  )
  const [c, setC] = useState(
    initial && initial.c100 ? String(Math.round((initial.c100 * initial.grams) / 100)) : ''
  )

  const g = num(grams)
  const total = num(kcal)
  const per100 = grams && kcal ? Math.round((total / g) * 100) : null
  const ready = name.trim() && grams && kcal

  function handleSave() {
    if (!ready) return
    // Пустое БЖУ остаётся пустым (оценится по калорийности), а не «1 грамм»
    const data = {
      name: name.trim(),
      grams: g,
      totalKcal: total,
      totalP: p.trim() ? num(p) : 0,
      totalF: f.trim() ? num(f) : 0,
      totalC: c.trim() ? num(c) : 0,
    }
    if (editing) {
      update(initial.id, data)
      toast({
        title: `🍴 Рецепт «${data.name}» изменён`,
        description: `${g} г · ${total} ккал (${per100} ккал / 100 г)`,
      })
    } else {
      add(data)
      toast({
        title: `🍴 Рецепт «${data.name}» сохранён`,
        description: `${g} г · ${total} ккал (${per100} ккал / 100 г)`,
      })
    }
    onDone()
  }

  return (
    <View className="rounded-2xl border border-[#5B7FFF]/25 bg-[#5B7FFF]/5 p-4">
      {/* Шапка: что делаем + отмена (только в режиме изменения) */}
      <View className="mb-2 flex-row items-center justify-between">
        <Text className="font-semibold text-[11px] uppercase tracking-wide text-bear-link">
          {editing ? 'Изменение рецепта' : 'Новый рецепт'}
        </Text>
        {editing && (
          <Pressable
            onPress={onCancel}
            accessibilityRole="button"
            accessibilityLabel="Отменить изменение рецепта"
            className="flex-row items-center gap-1 rounded-full bg-white/5 px-2.5 py-1 active:opacity-70"
          >
            <X size={12} color="#AEB9D9" />
            <Text className="font-sans text-[11px] text-bear-soft">отмена</Text>
          </Pressable>
        )}
      </View>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Название рецепта"
        placeholderTextColor="#8B96B8"
        accessibilityLabel="Название рецепта"
        className={field}
      />
      <View className="mt-2 flex-row gap-2">
        <TextInput
          value={grams}
          onChangeText={setGrams}
          placeholder="Вес, г"
          placeholderTextColor="#8B96B8"
          keyboardType="decimal-pad"
          accessibilityLabel="Вес, граммы"
          className={`${field} flex-1`}
        />
        <TextInput
          value={kcal}
          onChangeText={setKcal}
          placeholder="Ккал всего"
          placeholderTextColor="#8B96B8"
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
          placeholderTextColor="#8B96B8"
          keyboardType="decimal-pad"
          accessibilityLabel="Белки, граммы"
          className={`${field} flex-1`}
        />
        <TextInput
          value={f}
          onChangeText={setF}
          placeholder="Жиры, г"
          placeholderTextColor="#8B96B8"
          keyboardType="decimal-pad"
          accessibilityLabel="Жиры, граммы"
          className={`${field} flex-1`}
        />
        <TextInput
          value={c}
          onChangeText={setC}
          placeholder="Углеводы, г"
          placeholderTextColor="#8B96B8"
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
          <Text className="font-bold text-xs text-white">
            {editing ? 'Сохранить изменения' : 'Сохранить рецепт'}
          </Text>
        </Pressable>
      </View>
    </View>
  )
}

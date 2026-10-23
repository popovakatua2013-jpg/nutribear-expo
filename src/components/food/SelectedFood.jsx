// Экран подтверждения: граммовка выбранной еды и добавление в приём

import { useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { ChevronLeft } from 'lucide-react-native'
import { kcalForPortion } from '@/lib/data/foods'
import { buildFood } from '@/lib/data/pick'
import { bjuForPortion, bjuLine } from '@/lib/data/bju'
import { formatNum } from '@/lib/format'
import { useFoodStore } from '@/store/useFoodStore'
import { useToast } from '../ui/Toast'
import { GramsPicker } from '../home/GramsPicker'
import { toBuildItem } from '@/lib/data/to-item'

export function SelectedFood({ mealId, meal, item, onBack, onClose }) {
  const addEntry = useFoodStore((s) => s.addEntry)
  const { toast } = useToast()
  const [grams, setGrams] = useState(String(item.defaultGrams || 100))

  // Рецепты и внешние источники уже в формате kcal100, база — в формате kcal
  const food = buildFood(item.kcal100 != null ? item : toBuildItem(item))
  const gramsNum = Math.max(1, Math.min(2000, Math.round(Number(grams) || 0)))
  const previewKcal = kcalForPortion(food, gramsNum)
  const previewBju = bjuForPortion(food, gramsNum)

  function handleAdd() {
    addEntry(mealId, { food, grams: gramsNum, kcal: previewKcal })
    toast({
      title: `${food.emoji} ${food.name} — в «${meal.name}»`,
      description: `${gramsNum} г · ≈${formatNum(previewKcal)} ккал · ${bjuLine(previewBju)}`,
    })
    onClose()
  }

  return (
    <View className="max-h-[85%]">
      <ScrollView contentContainerClassName="px-5 pt-4 pb-2" showsVerticalScrollIndicator={false}>
        <View className="flex-row items-center gap-3">
          <Pressable
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel="Назад"
            className="h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/5"
          >
            <ChevronLeft size={20} color="#AEB9D9" />
          </Pressable>
          <Text className="shrink-0 text-2xl">{food.emoji}</Text>
          <View className="min-w-0 flex-1">
            <Text numberOfLines={1} className="font-bold text-sm text-bear-text">
              {food.name}
            </Text>
            <Text className="font-sans text-[11px] text-bear-sub">
              {`${food.kcal} ккал / 100 г · Б ${food.p} · Ж ${food.f} · У ${food.c}`}
            </Text>
          </View>
        </View>

        <View className="mt-4">
          <GramsPicker grams={grams} onChange={setGrams} />
        </View>

        <View className="mt-4 rounded-2xl border border-[#5B7FFF]/25 bg-[#5B7FFF]/10 px-4 py-3">
          <View className="flex-row items-center justify-between">
            <Text className="font-sans text-xs text-bear-soft">Итого калорий</Text>
            <Text className="font-extrabold text-[17px] text-white">
              ≈ {formatNum(previewKcal)} <Text className="font-medium text-xs text-bear-sub">ккал</Text>
            </Text>
          </View>
          <Text className="mt-1 text-right font-sans text-[11px] text-bear-sub">
            {bjuLine(previewBju)}
          </Text>
        </View>
      </ScrollView>

      <View className="border-t border-bear-line p-5">
        <Pressable
          onPress={handleAdd}
          className="rounded-2xl py-3.5 active:opacity-80"
          style={{ backgroundColor: '#7B6CF6' }}
        >
          <Text className="text-center font-bold text-sm text-white">
            Добавить в «{meal.name}»
          </Text>
        </Pressable>
      </View>
    </View>
  )
}

// Карточка приёма пищи — КОМПАКТНАЯ, для сетки 2×2: фото и кнопка «+»
// в верхней строке, название и калории на всю ширину карточки,
// мини-прогресс и список добавленных блюд.
// Текстам задан maxFontSizeMultiplier — крупный системный шрифт
// телефона не ломает узкую вёрстку.

import { Image, Pressable, Text, View } from 'react-native'
import { Plus } from 'lucide-react-native'
import { formatNum } from '@/lib/format'
import { bjuSum, bjuLine } from '@/lib/data/bju'
import { ProgressBar } from '../ui/ProgressBar'
import { EntryList } from './EntryList'

const MAX = 1.25

export function MealCard({ meal, target, consumed, entries, onAdd, onRemove }) {
  const pct = target > 0 ? Math.min(100, (consumed / target) * 100) : 0
  const over = consumed > target

  return (
    <View
      accessibilityLabel={`Приём пищи «${meal.name}»`}
      className="flex-1 flex-col rounded-2xl border border-white/5 bg-bear-card p-3"
    >
      {/* фото + кнопка «+» */}
      <View className="flex-row items-center justify-between">
        <View className="h-11 w-11 overflow-hidden rounded-xl border border-white/5 bg-white/5">
          {meal.image ? (
            <Image source={meal.image} resizeMode="cover" style={{ width: '100%', height: '100%' }} />
          ) : (
            <Text className="flex-1 text-center text-xl leading-[38px]">{meal.emoji || '🍽️'}</Text>
          )}
        </View>

        <Pressable
          onPress={onAdd}
          accessibilityRole="button"
          accessibilityLabel={`Добавить блюдо в «${meal.name}»`}
          className="h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-[#1C2A4E] active:opacity-70"
        >
          <Plus size={14} color="#C7D2F0" strokeWidth={2.5} />
        </Pressable>
      </View>

      {/* название — на всю ширину, до двух строк */}
      <Text
        numberOfLines={2}
        maxFontSizeMultiplier={MAX}
        className="mt-2 min-h-[32px] font-semibold text-[13px] leading-tight text-bear-text"
      >
        {meal.name}
      </Text>

      {/* калории — на всю ширину, при нехватке места переносятся */}
      <Text
        maxFontSizeMultiplier={MAX}
        className="mt-0.5 font-sans text-[11px] leading-snug text-bear-sub"
      >
        {`${formatNum(consumed)}\u00A0/\u00A0${formatNum(target)} ккал`}
      </Text>

      {/* мини-прогресс */}
      <View className="mt-2">
        <ProgressBar pct={pct} h={6} tone={over ? 'amber' : pct >= 100 ? 'emerald' : 'grad'} />
      </View>

      {entries.length > 0 && (
        <Text
          numberOfLines={1}
          maxFontSizeMultiplier={MAX}
          className="mt-1.5 font-sans text-[10px] text-bear-dim"
        >
          {bjuLine(bjuSum(entries))}
        </Text>
      )}

      <EntryList entries={entries} onRemove={onRemove} mealId={meal.id} mealName={meal.name} />
    </View>
  )
}

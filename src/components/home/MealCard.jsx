// Карточка приёма пищи: фото, название, калории, кнопка «+»,
// мини-прогресс и список добавленных блюд (как в веб-версии).

import { Image, Pressable, Text, View } from 'react-native'
import { Plus } from 'lucide-react-native'
import { formatNum } from '@/lib/format'
import { bjuSum, bjuLine } from '@/lib/data/bju'
import { ProgressBar } from '../ui/ProgressBar'
import { EntryList } from './EntryList'

export function MealCard({ meal, target, consumed, entries, onAdd, onRemove }) {
  const pct = target > 0 ? Math.min(100, (consumed / target) * 100) : 0
  const over = consumed > target

  return (
    <View
      accessibilityLabel={`Приём пищи «${meal.name}»`}
      className="flex-col rounded-2xl border border-white/5 bg-bear-card p-3"
    >
      <View className="flex-row items-start gap-2.5">
        <View className="h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-white/5 bg-white/5">
          {meal.image ? (
            <Image source={meal.image} resizeMode="cover" style={{ width: '100%', height: '100%' }} />
          ) : (
            <Text className="flex-1 text-center text-xl leading-[38px]">{meal.emoji || '🍽️'}</Text>
          )}
        </View>

        <View className="min-w-0 flex-1">
          <Text numberOfLines={1} className="font-semibold text-[13px] leading-tight text-bear-text">
            {meal.name}
          </Text>
          <Text numberOfLines={1} className="mt-1 font-sans text-[11px] leading-snug text-bear-sub">
            {`${formatNum(consumed)}\u00A0/\u00A0${formatNum(target)} ккал`}
          </Text>
        </View>

        <Pressable
          onPress={onAdd}
          accessibilityRole="button"
          accessibilityLabel={`Добавить блюдо в «${meal.name}»`}
          className="h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 bg-[#1C2A4E] active:opacity-70"
        >
          <Plus size={14} color="#C7D2F0" strokeWidth={2.5} />
        </Pressable>
      </View>

      {/* Мини-прогресс */}
      <View className="mt-2.5">
        <ProgressBar pct={pct} h={6} tone={over ? 'amber' : pct >= 100 ? 'emerald' : 'grad'} />
      </View>

      {entries.length > 0 && (
        <Text numberOfLines={1} className="mt-1.5 font-sans text-[10px] text-bear-dim">
          {bjuLine(bjuSum(entries))}
        </Text>
      )}

      <EntryList entries={entries} onRemove={onRemove} mealId={meal.id} mealName={meal.name} />
    </View>
  )
}

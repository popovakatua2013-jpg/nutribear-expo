// Карточка приёма пищи — КРУПНЫЙ блок на всю ширину:
// фото и кнопка «+» в шапке, название и калории рядом,
// ниже прогресс, БЖУ и список блюд (первые 2 + «Ещё N»).
// Текстам задан maxFontSizeMultiplier — крупный системный шрифт
// телефона не ломает вёрстку.

import { Image, Pressable, Text, View } from 'react-native'
import { Plus } from 'lucide-react-native'
import { formatNum } from '@/lib/format'
import { bjuSum, bjuLine } from '@/lib/data/bju'
import { ProgressBar } from '../ui/ProgressBar'
import { EntryList } from './EntryList'

const MAX = 1.25

export function MealCard({ meal, target, consumed, entries, onAdd, onRemove, onShowAll }) {
  const pct = target > 0 ? Math.min(100, (consumed / target) * 100) : 0
  const over = consumed > target

  return (
    <View
      accessibilityLabel={`Приём пищи «${meal.name}»`}
      className="rounded-2xl border border-white/5 bg-white/[0.03] p-4"
    >
      {/* шапка: фото + название/калории + кнопка «+» */}
      <View className="flex-row items-center gap-3">
        <View className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-white/5 bg-white/5">
          {meal.image ? (
            <Image source={meal.image} resizeMode="cover" style={{ width: '100%', height: '100%' }} />
          ) : (
            <Text className="flex-1 text-center text-2xl leading-[44px]">{meal.emoji || '🍽️'}</Text>
          )}
        </View>

        <View className="min-w-0 flex-1">
          <Text
            numberOfLines={1}
            maxFontSizeMultiplier={MAX}
            className="font-semibold text-[15px] leading-tight text-bear-text"
          >
            {meal.name}
          </Text>
          <Text
            maxFontSizeMultiplier={MAX}
            className="mt-0.5 font-sans text-[12px] leading-snug text-bear-sub"
          >
            {`${formatNum(consumed)}\u00A0/\u00A0${formatNum(target)} ккал`}
          </Text>
        </View>

        <Pressable
          onPress={onAdd}
          accessibilityRole="button"
          accessibilityLabel={`Добавить блюдо в «${meal.name}»`}
          className="h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-[#1C2A4E] active:opacity-70"
        >
          <Plus size={18} color="#C7D2F0" strokeWidth={2.5} />
        </Pressable>
      </View>

      {/* прогресс на всю ширину */}
      <View className="mt-3">
        <ProgressBar pct={pct} h={6} tone={over ? 'amber' : pct >= 100 ? 'emerald' : 'grad'} />
      </View>

      {entries.length > 0 && (
        <Text
          numberOfLines={1}
          maxFontSizeMultiplier={MAX}
          className="mt-2 font-sans text-[11px] text-bear-dim"
        >
          {bjuLine(bjuSum(entries))}
        </Text>
      )}

      <EntryList
        entries={entries}
        onRemove={onRemove}
        onShowAll={onShowAll}
        mealId={meal.id}
        mealName={meal.name}
      />
    </View>
  )
}

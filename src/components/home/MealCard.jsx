// Ряд приёма пищи 1 в 1 с макетом: компактный тёмный ряд со стеклянной
// каймой, светящейся цветной полоской на левом крае, фото, названием,
// «X / Y ккал», яркой градиентной полоской прогресса и круглым шевроном.
// Тап по ряду — добавить блюдо; ниже — БЖУ и список записей с удалением.
// Текстам задан maxFontSizeMultiplier — крупный системный шрифт
// телефона не ломает вёрстку.

import { Image, Pressable, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { ChevronRight } from 'lucide-react-native'
import { formatNum } from '@/lib/format'
import { bjuSum, bjuLine } from '@/lib/data/bju'
import { EntryList } from './EntryList'

const MAX = 1.25

export function MealCard({ meal, target, consumed, entries, accent, onAdd, onRemove, onShowAll }) {
  const pct = target > 0 ? Math.max(0, Math.min(100, (consumed / target) * 100)) : 0
  const over = consumed > target
  const a = accent || { accent: '#6C8CFF', bar: ['#9BB8FF', '#5B7CFF'] }

  return (
    <View
      accessibilityLabel={`Приём пищи «${meal.name}»`}
      style={{
        borderRadius: 15,
        padding: 1.2,
        backgroundColor: 'rgba(255,255,255,0.10)',
      }}
    >
      <View
        className="rounded-[14px] bg-[rgba(9,14,42,0.72)] px-2.5 pb-[6px] pt-[6px]"
        style={{ overflow: 'hidden' }}
      >
        {/* Светящаяся полоска на левом крае — как в макете */}
        <View
          style={{
            position: 'absolute',
            left: 0,
            top: 9,
            bottom: 9,
            width: 3.5,
            borderRadius: 999,
            backgroundColor: a.accent,
            shadowColor: a.accent,
            shadowOpacity: 0.9,
            shadowRadius: 7,
            shadowOffset: { width: 0, height: 0 },
          }}
        />

        <Pressable
          onPress={onAdd}
          accessibilityRole="button"
          accessibilityLabel={`Добавить блюдо в «${meal.name}»`}
          className="flex-row items-center gap-2.5 active:opacity-80"
        >
          <View className="h-[42px] w-[42px] shrink-0 overflow-hidden rounded-[12px] border border-white/10 bg-white/5">
            {meal.image ? (
              <Image source={meal.image} resizeMode="cover" style={{ width: '100%', height: '100%' }} />
            ) : (
              <Text className="flex-1 text-center text-2xl leading-[38px]">{meal.emoji || '🍽️'}</Text>
            )}
          </View>

          <View className="min-w-0 flex-1">
            <Text
              numberOfLines={1}
              maxFontSizeMultiplier={MAX}
              className="font-bold text-[13.5px] leading-tight text-bear-text"
            >
              {meal.name}
            </Text>
            <Text
              maxFontSizeMultiplier={MAX}
              className="mt-0.5 font-medium text-[10.5px] leading-tight"
              style={{ color: '#A9B4E6' }}
            >
              {`${formatNum(consumed)}\u00A0/\u00A0${formatNum(target)} ккал`}
            </Text>
          </View>

          {/* Круглая кнопка-шеврон — как в макете */}
          <View
            className="h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full"
            style={{
              backgroundColor: 'rgba(255,255,255,0.10)',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.16)',
            }}
          >
            <ChevronRight size={12} color="#DCE4FA" />
          </View>
        </Pressable>

        {/* Яркая градиентная полоска прогресса — от начала текста до правого края.
            Перебор нормы подсвечивается янтарным */}
        <View className="ml-[54px] mt-1.5 h-[5px] overflow-hidden rounded-full bg-[rgba(15,21,52,0.85)]">
          <LinearGradient
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            colors={over ? ['#FFD27A', '#FF9F2E'] : a.bar}
            style={{ width: `${pct}%`, height: '100%', borderRadius: 999 }}
          />
        </View>

        {entries.length > 0 && (
          <Text
            numberOfLines={1}
            maxFontSizeMultiplier={MAX}
            className="ml-[54px] mt-1.5 font-sans text-[10.5px] text-bear-dim"
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
    </View>
  )
}

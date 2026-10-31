// Карточка приёма пищи — по умолчанию свёрнута до «шапки».
// Шапка компактная: небольшое фото, название, калории,
// «+» и тонкая полоска прогресса — четыре приёма занимают
// заметно меньше места на экране. Список блюд и строка БЖУ
// скрыты — тап по шапке разворачивает их обратно
// (первые 2 блюда + «Ещё N»), повторный тап сворачивает.
// У свёрнутой карточки с блюдами в калориях видно количество:
// «2 блюда · 420 / 520 ккал». Текстам задан
// maxFontSizeMultiplier — крупный системный шрифт
// телефона не ломает вёрстку.

import { useState } from 'react'
import { Image, Pressable, Text, View } from 'react-native'
import { ChevronDown, ChevronUp, Plus } from 'lucide-react-native'
import { dishesWord, formatNum } from '@/lib/format'
import { animateExpandCollapse } from '@/lib/anim'
import { bjuSum, bjuLine } from '@/lib/data/bju'
import { ProgressBar } from '../ui/ProgressBar'
import { EntryList } from './EntryList'

const MAX = 1.25

export function MealCard({ meal, target, consumed, entries, onAdd, onRemove, onShowAll }) {
  const pct = target > 0 ? Math.min(100, (consumed / target) * 100) : 0
  const over = consumed > target
  // Автосворачивание: по умолчанию видна только шапка
  const [open, setOpen] = useState(false)
  const hasDishes = entries.length > 0

  const toggle = () => {
    if (hasDishes) {
      animateExpandCollapse()
      setOpen((v) => !v)
    }
  }

  return (
    <View
      accessibilityLabel={`Приём пищи «${meal.name}»`}
      className="rounded-2xl border border-white/5 bg-white/[0.03] px-3 py-2.5"
    >
      {/* шапка: фото + название/калории + шеврон (тап — развернуть/свернуть)
          и кнопка «+» (добавить блюдо) */}
      <View className="flex-row items-center gap-3">
        <Pressable
          onPress={toggle}
          disabled={!hasDishes}
          accessibilityRole={hasDishes ? 'button' : undefined}
          accessibilityLabel={
            hasDishes
              ? open
                ? `Свернуть список блюд «${meal.name}»`
                : `Развернуть «${meal.name}», внесено ${entries.length} ${dishesWord(entries.length)}`
              : `Приём пищи «${meal.name}», пока пусто`
          }
          className="min-w-0 flex-1 flex-row items-center gap-3 active:opacity-70"
        >
          <View className="h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-white/5 bg-white/5">
            {meal.image ? (
              <Image source={meal.image} resizeMode="cover" style={{ width: '100%', height: '100%' }} />
            ) : (
              <Text className="flex-1 text-center text-lg leading-[34px]">{meal.emoji || '🍽️'}</Text>
            )}
          </View>

          <View className="min-w-0 flex-1">
            <Text
              numberOfLines={1}
              maxFontSizeMultiplier={MAX}
              className="font-semibold text-[14px] leading-tight text-bear-text"
            >
              {meal.name}
            </Text>
            <Text
              numberOfLines={1}
              maxFontSizeMultiplier={MAX}
              className="mt-0.5 font-sans text-[12px] leading-snug text-bear-sub"
            >
              {open || !hasDishes
                ? `${formatNum(consumed)}\u00A0/\u00A0${formatNum(target)} ккал`
                : `${entries.length} ${dishesWord(entries.length)} · ${formatNum(consumed)}\u00A0/\u00A0${formatNum(target)} ккал`}
            </Text>
          </View>

          {hasDishes &&
            (open ? (
              <ChevronUp size={14} color="#98A2C2" />
            ) : (
              <ChevronDown size={14} color="#98A2C2" />
            ))}
        </Pressable>

        <Pressable
          onPress={onAdd}
          accessibilityRole="button"
          accessibilityLabel={`Добавить блюдо в «${meal.name}»`}
          className="h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-[#1C2A4E] active:opacity-70"
        >
          <Plus size={16} color="#C7D2F0" strokeWidth={2.5} />
        </Pressable>
      </View>

      {/* прогресс на всю ширину — тонкий, чтобы карточка не распухала */}
      <View className="mt-2">
        <ProgressBar pct={pct} h={4} tone={over ? 'amber' : pct >= 100 ? 'emerald' : 'grad'} />
      </View>

      {/* БЖУ и список блюд — только у развёрнутой карточки */}
      {open && hasDishes && (
        <>
          <Text
            numberOfLines={1}
            maxFontSizeMultiplier={MAX}
            className="mt-2 font-sans text-[11px] text-bear-dim"
          >
            {bjuLine(bjuSum(entries))}
          </Text>

          <EntryList
            entries={entries}
            onRemove={onRemove}
            onShowAll={onShowAll}
            mealId={meal.id}
            mealName={meal.name}
          />
        </>
      )}
    </View>
  )
}

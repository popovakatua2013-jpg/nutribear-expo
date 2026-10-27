// Список записей дневника в КОМПАКТНОЙ карточке приёма пищи (сетка 2×2).
// Видно максимум 2 блюда, остальные — строка «Ещё N …» (открывает
// «Все приёмы пищи»): так карточки не растут и сетка не ломается.
// Тап по блюду — полное редактирование порции, корзина — удаление.

import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { Pencil, Trash2 } from 'lucide-react-native'
import { formatNum } from '@/lib/format'
import { bjuLine } from '@/lib/data/bju'
import { EditEntryModal } from '@/components/food/EditEntryModal'

// 1 блюдо / 2 блюда / 5 блюд
function dishesWord(n) {
  const m10 = n % 10
  const m100 = n % 100
  if (m10 === 1 && m100 !== 11) return 'блюдо'
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return 'блюда'
  return 'блюд'
}

const MAX_VISIBLE = 2

export function EntryList({ entries, onRemove, onShowAll, mealId, mealName }) {
  const [edit, setEdit] = useState(null) // запись, открытая на редактирование
  if (!entries.length) return null

  const visible = entries.slice(0, MAX_VISIBLE)
  const hidden = entries.length - visible.length

  return (
    <View className="mt-2 gap-1">
      {visible.map((entry) => (
        <View key={entry.id} className="rounded-lg bg-white/5 px-1.5 py-1">
          <Pressable
            onPress={() => setEdit(entry)}
            accessibilityRole="button"
            accessibilityLabel={`Изменить порцию «${entry.name}»`}
            className="flex-row items-center gap-1 active:opacity-70"
          >
            <Text className="shrink-0 text-[12px]">{entry.emoji}</Text>
            <View className="min-w-0 flex-1">
              <Text
                numberOfLines={1}
                maxFontSizeMultiplier={1.25}
                className="font-medium text-[11px] text-bear-bright"
              >
                {entry.name}
              </Text>
              <Text maxFontSizeMultiplier={1.25} className="font-sans text-[10px] text-bear-sub2">
                {`${entry.grams}\u00A0г · ${formatNum(entry.kcal)}`}
              </Text>
              {entry.desc ? (
                <Text
                  numberOfLines={2}
                  maxFontSizeMultiplier={1.25}
                  className="font-sans text-[10px] leading-[13px] text-bear-sub"
                >
                  {entry.desc}
                </Text>
              ) : null}
            </View>
            <View className="shrink-0 flex-row items-center">
              <View className="p-0.5">
                <Pencil size={11} color="#5C668A" />
              </View>
              <Pressable
                onPress={() => onRemove(entry.id)}
                accessibilityRole="button"
                accessibilityLabel={`Удалить «${entry.name}» из «${mealName}»`}
                className="p-0.5"
              >
                <Trash2 size={11} color="#5C668A" />
              </Pressable>
            </View>
          </Pressable>
          <Text numberOfLines={1} className="mt-0.5 font-sans text-[9.5px] text-bear-dim">
            {`${bjuLine(entry)}${entry.time ? `\u00A0· ${entry.time}` : ''}`}
          </Text>
        </View>
      ))}

      {hidden > 0 && onShowAll && (
        <Pressable
          onPress={onShowAll}
          accessibilityRole="button"
          accessibilityLabel={`Открыть все приёмы пищи — там ещё ${hidden} ${dishesWord(hidden)}`}
          className="flex-row items-center justify-center rounded-lg bg-white/5 py-1 active:opacity-70"
        >
          <Text
            maxFontSizeMultiplier={1.25}
            className="font-sans text-[10px] font-medium text-[#8DABFF]"
          >
            {`Ещё ${hidden} ${dishesWord(hidden)} · открыть все приёмы`}
          </Text>
        </Pressable>
      )}

      {/* key={edit.id} — окно пересоздаётся под выбранное блюдо,
          поэтому все поля всегда показывают актуальные значения */}
      {edit && (
        <EditEntryModal
          key={edit.id}
          open={Boolean(edit)}
          onClose={() => setEdit(null)}
          mealId={mealId}
          entry={edit}
          mealName={mealName}
        />
      )}
    </View>
  )
}

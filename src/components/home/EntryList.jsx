// Список записей дневника в карточке приёма пищи
// (время добавления, БЖУ, редактирование граммовки, удаление)

import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { Pencil, Trash2 } from 'lucide-react-native'
import { formatNum } from '@/lib/format'
import { bjuLine } from '@/lib/data/bju'
import { EditGrams } from './EditGrams'

export function EntryList({ entries, onRemove, mealId, mealName }) {
  const [edit, setEdit] = useState(null) // запись, открытая на редактирование
  if (!entries.length) return null

  return (
    <View className="mt-2 gap-1">
      {entries.map((entry) => (
        <View key={entry.id} className="rounded-lg bg-white/5 px-1.5 py-1">
          <View className="flex-row items-center gap-1">
            <Text className="shrink-0 text-[12px]">{entry.emoji}</Text>
            <View className="min-w-0 flex-1">
              <Text numberOfLines={1} maxFontSizeMultiplier={1.25} className="font-medium text-[11px] text-bear-bright">
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
            <Pressable
              onPress={() => setEdit(entry)}
              accessibilityRole="button"
              accessibilityLabel={`Изменить вес «${entry.name}»`}
              className="p-0.5"
            >
              <Pencil size={11} color="#5C668A" />
            </Pressable>
            <Pressable
              onPress={() => onRemove(entry.id)}
              accessibilityRole="button"
              accessibilityLabel={`Удалить «${entry.name}» из «${mealName}»`}
              className="p-0.5"
            >
              <Trash2 size={11} color="#5C668A" />
            </Pressable>
          </View>
          <Text numberOfLines={1} className="mt-0.5 font-sans text-[9.5px] text-bear-dim">
            {`${bjuLine(entry)}${entry.time ? `\u00A0· ${entry.time}` : ''}`}
          </Text>
        </View>
      ))}

      <EditGrams
        visible={Boolean(edit)}
        onClose={() => setEdit(null)}
        mealId={mealId}
        entry={edit}
        mealName={mealName}
      />
    </View>
  )
}
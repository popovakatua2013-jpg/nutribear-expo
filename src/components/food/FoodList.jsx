// Список продуктов из любого источника: строка с названием, калорийностью
// на 100 г и подписью (бренд / источник). Эмодзи-иконки и фото-миниатюры
// убраны из списков — отзыв Кати 21.11 («не нужны иконки нигде»):
// остались только текст и знак «+».

import { FlatList, Pressable, Text, View } from 'react-native'
import { Plus } from 'lucide-react-native'
import { useThemeColors } from '@/lib/use-theme'


export function FoodList({ items, emptyText, onPick, scroll = true }) {
  const themeColors = useThemeColors()
  if (!items.length) {
    return (
      <Text className="py-8 text-center font-sans text-[19px] text-bear-sub">
        {emptyText}
      </Text>
    )
  }

  const body = ({ item }) => (
    <Pressable
      onPress={() => onPick(item)}
      accessibilityRole="button"
      className="flex-row items-center overflow-hidden rounded-2xl bg-white/[0.04] px-3 py-2.5 active:bg-bear-pop"
    >
      <View className="min-w-0 flex-1 gap-0.5">
        <Text numberOfLines={1} className="font-semibold text-[18px] text-bear-text">
          {item.name}
        </Text>
        <Text numberOfLines={1} className="font-sans text-[15px] text-bear-sub">
          {item.kcal100
            ? `${item.kcal100} ккал / 100 г${item.sub ? ` · ${item.sub}` : ''}`
            : 'калорийность уточните'}
        </Text>
      </View>
      <View className="shrink-0">
        <Plus size={18} color={themeColors.dim} />
      </View>
    </Pressable>
  )

  if (!scroll) {
    return (
      <View className="gap-1.5 pb-2">
        {items.map((item, i) => (
          <View key={`${item.source}-${item.name}-${i}`}>{body({ item })}</View>
        ))}
      </View>
    )
  }

  return (
    <FlatList
      data={items}
      keyExtractor={(item, i) => `${item.source}-${item.name}-${i}`}
      keyboardShouldPersistTaps="handled"
      ItemSeparatorComponent={() => <View style={{ height: 4 }} />}
      contentContainerStyle={{ paddingVertical: 4 }}
      renderItem={body}
    />
  )
}

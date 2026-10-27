// Список продуктов из любого источника: строка с эмодзи, названием,
// калорийностью на 100 г и подписью (бренд / источник)

import { FlatList, Pressable, Text, View } from 'react-native'
import { Plus } from 'lucide-react-native'

export function FoodList({ items, emptyText, onPick, scroll = true }) {
  if (!items.length) {
    return (
      <Text className="py-8 text-center font-sans text-sm text-bear-sub">
        {emptyText}
      </Text>
    )
  }

  const body = ({ item }) => (
    <Pressable
      onPress={() => onPick(item)}
      accessibilityRole="button"
      className="flex-row items-center gap-3 rounded-2xl bg-white/[0.04] px-3 py-2.5 active:bg-[#1A2647]"
    >
      <View className="h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-bear-card">
        <Text className="text-[17px]">{item.emoji || '🍽️'}</Text>
      </View>
      <View className="min-w-0 flex-1">
        <Text numberOfLines={1} className="font-semibold text-[13px] text-bear-text">
          {item.name}
        </Text>
        <Text numberOfLines={1} className="font-sans text-[11px] text-bear-sub">
          {item.kcal100
            ? `${item.kcal100} ккал / 100 г${item.sub ? ` · ${item.sub}` : ''}`
            : 'калорийность уточните'}
        </Text>
      </View>
      <Plus size={16} color="#5C668A" />
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
      ItemSeparatorComponent={() => <View style={{ height: 6 }} />}
      contentContainerStyle={{ paddingVertical: 4 }}
      renderItem={body}
    />
  )
}

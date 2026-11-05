// Список продуктов из любого источника: строка с эмодзи (или фото блюда),
// названием, калорийностью на 100 г и подписью (бренд / источник)

import { FlatList, Image, Pressable, Text, View } from 'react-native'
import { Plus } from 'lucide-react-native'

export function FoodList({ items, emptyText, onPick, scroll = true }) {
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
      className="flex-row items-center overflow-hidden rounded-2xl bg-white/[0.04] pr-3 active:bg-[#1A2647]"
    >
      {/* Картинка на весь блок: фото/эмодзи во всю высоту строки,
          впритык к левому краю (по запросу пользователя) */}
      {item.photo ? (
        <Image
          source={{ uri: item.photo }}
          style={{ width: 52, height: 56 }}
          className="shrink-0"
          resizeMode="cover"
          accessibilityLabel={`Фото: ${item.name}`}
        />
      ) : (
        <View className="h-14 w-[52px] shrink-0 items-center justify-center bg-bear-card">
          <Text className="text-[26px]">{item.emoji || '🍽️'}</Text>
        </View>
      )}
      <View className="min-w-0 flex-1 justify-center gap-0.5 py-1 pl-2.5">
        <Text numberOfLines={1} className="font-semibold text-[18px] text-bear-text">
          {item.name}
        </Text>
        <Text numberOfLines={1} className="font-sans text-[15px] text-bear-sub">
          {item.kcal100
            ? `${item.kcal100} ккал / 100 г${item.sub ? ` · ${item.sub}` : ''}`
            : 'калорийность уточните'}
        </Text>
      </View>
      <View className="self-center">
        <Plus size={18} color="#8B96B8" />
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

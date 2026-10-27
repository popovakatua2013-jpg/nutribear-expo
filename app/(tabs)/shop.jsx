// Экран «Магазин»: баланс, правила заработка, товары и инвентарь

import { ScrollView, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ShopBalance } from '@/components/shop/ShopBalance'
import { ShopGrid } from '@/components/shop/ShopGrid'
import { ShopInventory } from '@/components/shop/ShopInventory'

export default function ShopScreen() {
  const insets = useSafeAreaInsets()

  return (
    <View className="flex-1 bg-bear-bg">
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingHorizontal: 16,
          gap: 16,
          paddingBottom: 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="font-extrabold text-[19px] tracking-tight text-bear-text">
          Магазин
        </Text>

        <ShopBalance />
        <ShopGrid />
        <ShopInventory />
      </ScrollView>
    </View>
  )
}

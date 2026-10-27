// Инвентарь: купленные награды (или подсказка, если их пока нет)

import { Text, View } from 'react-native'
import { useShopStore } from '@/store/useShopStore'
import { SHOP_ITEMS } from '@/lib/data/shop'

export function ShopInventory() {
  const owned = useShopStore((s) => s.owned)
  const items = SHOP_ITEMS.filter((i) => owned[i.id])

  return (
    <View accessibilityLabel="Мои награды" className="rounded-3xl border border-white/5 bg-bear-card p-5">
      <Text className="font-bold text-[15px] tracking-tight text-bear-text">
        Мои награды
      </Text>

      {items.length === 0 ? (
        <Text className="mt-2 font-sans text-[12px] leading-relaxed text-bear-sub2">
          Пока пусто. Купи первую награду за монетки — они ждут тебя выше ☝️
        </Text>
      ) : (
        <View className="mt-3 flex-row flex-wrap gap-2">
          {items.map((item) => (
            <View
              key={item.id}
              className="flex-row items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/[0.07] py-1.5 pl-2 pr-3.5"
            >
              <Text className="text-base">{item.emoji}</Text>
              <Text className="font-semibold text-[12px] text-bear-soft">
                {item.name}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  )
}

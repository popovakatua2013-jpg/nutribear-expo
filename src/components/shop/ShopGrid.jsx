// Сетка товаров магазина: цена, кнопка покупки, отметка «Куплено»

import { Pressable, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Check, Lock } from 'lucide-react-native'
import { useShopStore } from '@/store/useShopStore'
import { useToast } from '../ui/Toast'
import { SHOP_ITEMS } from '@/lib/data/shop'
import { formatNum } from '@/lib/format'

export function ShopGrid() {
  const coins = useShopStore((s) => s.coins)
  const owned = useShopStore((s) => s.owned)
  const spend = useShopStore((s) => s.spend)
  const { toast } = useToast()

  function handleBuy(item) {
    if (spend(item.id, item.price)) {
      toast({
        title: `${item.emoji} «${item.name}» — твоя!`,
        description: `−${item.price} монеток · осталось ${formatNum(coins - item.price)}`,
      })
    } else {
      toast({
        title: 'Не хватает монеток 🪙',
        description: 'Заработай ещё: вода, шаги, дневник и вес приносят монетки',
      })
    }
  }

  const rows = SHOP_ITEMS.reduce((acc, item, i) => {
    if (i % 2 === 0) acc.push([])
    acc[acc.length - 1].push(item)
    return acc
  }, [])

  return (
    <View className="gap-3">
      {rows.map((row, ri) => (
        <View key={ri} className="flex-row gap-3">
          {row.map((item) => {
            const isOwned = Boolean(owned[item.id])
            const affordable = coins >= item.price
            return (
              <View
                key={item.id}
                className={`flex-1 rounded-2xl border p-3.5 ${
                  isOwned
                    ? 'border-emerald-400/30 bg-emerald-400/[0.05]'
                    : 'border-white/5 bg-bear-card'
                }`}
              >
                <Text className="font-semibold text-[10px] uppercase tracking-wide text-bear-dim">
                  {item.tag}
                </Text>
                <Text className="mt-1.5 text-[34px]">{item.emoji}</Text>
                <Text className="mt-2 font-bold text-[13px] leading-tight text-bear-text">
                  {item.name}
                </Text>
                <Text className="mt-1 flex-1 font-sans text-[11px] leading-snug text-bear-sub2">
                  {item.desc}
                </Text>

                {isOwned ? (
                  <View className="mt-3 flex-row items-center justify-center gap-1.5 rounded-full bg-emerald-400/15 py-2">
                    <Check size={14} color="#34d399" />
                    <Text className="font-bold text-[12px] text-emerald-400">Куплено</Text>
                  </View>
                ) : (
                  <Pressable
                    onPress={() => handleBuy(item)}
                    disabled={!affordable}
                    accessibilityLabel={`Купить «${item.name}» за ${item.price} монеток`}
                    className={`mt-3 overflow-hidden rounded-full ${!affordable ? 'opacity-40' : ''}`}
                  >
                    <LinearGradient start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} colors={['#4D7CFE', '#8B5CF6', '#A45BFF']}>
                      <View className="flex-row items-center justify-center gap-1.5 py-2">
                        {affordable ? (
                          <Text className="text-[13px]">🪙</Text>
                        ) : (
                          <Lock size={14} color="#FFFFFF" />
                        )}
                        <Text className="font-bold text-[12px] text-white">
                          {formatNum(item.price)}
                        </Text>
                      </View>
                    </LinearGradient>
                  </Pressable>
                )}
              </View>
            )
          })}
        </View>
      ))}
    </View>
  )
}

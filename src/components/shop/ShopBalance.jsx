// Баланс монеток и правила заработка

import { Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useShopStore } from '@/store/useShopStore'
import { EARN_RULES } from '@/lib/data/shop'
import { formatNum } from '@/lib/format'

export function ShopBalance() {
  const coins = useShopStore((s) => s.coins)

  return (
    <View
      accessibilityLabel="Баланс монеток"
      className="overflow-hidden rounded-3xl border border-white/5 bg-bear-card p-5"
    >
      {/* Декоративное свечение в правом верхнем углу */}
      <LinearGradient
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        colors={['rgba(77,124,254,0.25)', 'rgba(164,91,255,0.1)']}
        style={{ position: 'absolute', right: -40, top: -48, width: 144, height: 144, borderRadius: 999 }}
      />

      <View className="flex-row items-center justify-between gap-3">
        <View>
          <Text className="font-medium text-[11px] text-bear-soft">Твой баланс</Text>
          <View className="mt-0.5 flex-row items-center gap-2">
            <Text className="text-[24px]">🪙</Text>
            <Text className="font-extrabold text-[28px] leading-none tracking-tight text-bear-text">
              {formatNum(coins)}
            </Text>
            <Text className="font-semibold text-[13px] text-bear-sub2">монеток</Text>
          </View>
        </View>
        <Text className="max-w-[150px] text-right font-sans text-[11px] leading-snug text-bear-sub2">
          Зарабатывай за полезные действия и трать на награды
        </Text>
      </View>

      <View className="mt-4 border-t border-white/5 pt-3.5">
        <Text className="font-semibold text-[11px] text-bear-soft">Как заработать</Text>
        <View className="mt-2 flex-row flex-wrap gap-1.5">
          {EARN_RULES.map((r) => (
            <View
              key={r.label}
              className="w-[49%] flex-1 flex-row items-center gap-2 rounded-xl bg-white/[0.04] px-2.5 py-2"
            >
              <Text className="text-sm">{r.emoji}</Text>
              <Text numberOfLines={1} className="min-w-0 flex-1 font-sans text-[11px] text-bear-soft">
                {r.label}
              </Text>
              <Text className="font-bold text-[11px] text-[#fbbf24]">+{r.coins} 🪙</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  )
}

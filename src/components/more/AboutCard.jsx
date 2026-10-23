// О приложении: версия, описание и медицинский дисклеймер

import { Text, View } from 'react-native'
import { DISCLAIMER } from '@/lib/data/disclaimer'

export function AboutCard() {
  return (
    <View accessibilityLabel="О приложении" className="items-center rounded-3xl border border-white/5 bg-bear-card p-5">
      <Text className="text-[34px]">🐻</Text>
      <Text className="mt-2 font-extrabold text-[15px] tracking-tight text-bear-text">
        NutriBear
      </Text>
      <Text className="mt-1 font-semibold text-[11px] text-bear-dim">Версия 1.0</Text>
      <Text className="mx-auto mt-2 max-w-[300px] text-center font-sans text-[12px] leading-relaxed text-bear-sub2">
        Дневник питания и активности с мишкой-наставником. Веди дневник,
        пей воду, ходи пешком и получай награды — все данные хранятся
        только на твоём устройстве.
      </Text>
      <View className="mx-auto mt-3 w-full max-w-[300px] border-t border-white/5 pt-3">
        <Text className="text-center font-sans text-[10px] leading-relaxed text-bear-dim">
          {DISCLAIMER}
        </Text>
      </View>
    </View>
  )
}

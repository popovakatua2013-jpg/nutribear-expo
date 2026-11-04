// Карточка «Совет дня» на вкладке «Тело» — по макету пользователя:
// лампочка в круге, заголовок и один совет на день (tipOfDay — по дню
// года, советы про вес, замеры и регулярность). Справа — мягкое
// неоновое свечение вместо фото с макета (единого стиля страниц).

import { Text, View } from 'react-native'
import { Lightbulb } from 'lucide-react-native'
import { tipOfDay } from '@/lib/data/bmi'
import { SoftGlow } from '../ui/SoftGlow'

export function TipOfDay() {
  return (
    <View
      accessibilityLabel="Совет дня"
      className="overflow-hidden rounded-2xl border border-white/[0.08] bg-bear-card p-4"
    >
      <SoftGlow id="glowTipR" w={120} h={70} peak={0.22} color="#7C5CFC" style={{ top: -20, right: -30 }} />
      <View className="flex-row items-center gap-3">
        <View
          className="h-9 w-9 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: 'rgba(77,124,254,0.16)' }}
        >
          <Lightbulb size={16} color="#8DABFF" />
        </View>
        <View className="min-w-0 flex-1">
          <Text className="font-bold text-[13px] text-bear-text">Совет дня</Text>
          <Text
            maxFontSizeMultiplier={1.25}
            className="mt-0.5 font-sans text-[11px] leading-snug text-bear-sub"
          >
            {tipOfDay()}
          </Text>
        </View>
      </View>
    </View>
  )
}

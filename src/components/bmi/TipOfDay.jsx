// Карточка «Совет дня» на вкладке «Тело» — по макету пользователя:
// лампочка в круге, заголовок и один совет на день (tipOfDay — по дню
// года, советы про вес, замеры и регулярность). Справа — мягкое
// неоновое свечение вместо фото с макета (единого стиля страниц).
// Крестик в правом верхнем углу прячет совет до конца дня (отзыв
// Кати: закрыть было невозможно) — назавтра приходит новый совет,
// и карточка появляется снова (useUiPrefsStore.tipHiddenDay).

import { Pressable, Text, View } from 'react-native'
import { Lightbulb, X } from 'lucide-react-native'
import { tipOfDay } from '@/lib/data/bmi'
import { useUiPrefsStore } from '@/store/useUiPrefsStore'
import { dayKeyOf } from '@/store/useHistoryStore'
import { SoftGlow } from '../ui/SoftGlow'
import { NeonCard } from '../ui/NeonCard'
import { useThemeColors } from '@/lib/use-theme'


export function TipOfDay() {
  const themeColors = useThemeColors()
  const tipHiddenDay = useUiPrefsStore((s) => s.tipHiddenDay)
  const dismissTipOfDay = useUiPrefsStore((s) => s.dismissTipOfDay)

  // Совет уже закрыли крестиком сегодня — показываем снова только
  // назавтра (вместе с новым советом дня)
  if (tipHiddenDay === dayKeyOf()) return null

  return (
    // Правка Кати 25.11 (четвёртый круг: «тело ИМТ — блоки по оформлению
    // не такие, сделать одинаково как на главной»): NeonCard вместо
    // плоской bodyCard
    <NeonCard accessibilityLabel="Совет дня" className="p-4 overflow-hidden">
      <SoftGlow id="glowTipR" w={120} h={70} peak={0.22} color={themeColors.accent} style={{ top: -20, right: -30 }} />
      {/* Крестик — правый верхний угол; прячет совет до конца дня */}
      <Pressable
        onPress={() => dismissTipOfDay(dayKeyOf())}
        accessibilityRole="button"
        accessibilityLabel="Закрыть совет дня"
        hitSlop={10}
        className="absolute right-2.5 top-2.5 z-10 p-1 active:opacity-60"
      >
        <X size={17} color={themeColors.dim} />
      </Pressable>
      <View className="flex-row items-center gap-3">
        <View
          className="h-9 w-9 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: themeColors.accentFaint }}
        >
          <Lightbulb size={18} color={themeColors.link} />
        </View>
        <View className="min-w-0 flex-1 pr-4">
          <Text className="font-bold text-[17.5px] text-bear-text">Совет дня</Text>
          <Text
            maxFontSizeMultiplier={1.25}
            className="mt-0.5 font-sans text-[15px] leading-snug text-bear-sub"
          >
            {tipOfDay()}
          </Text>
        </View>
      </View>
    </NeonCard>
  )
}

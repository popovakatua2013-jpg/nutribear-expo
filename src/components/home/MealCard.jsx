// Плитка приёма пищи — как в референсе: компактная карточка в ряд
// по четыре штуки. Сверху фото блюда, на нём — галочки-бейджи
// (фиолетовая — в приём уже что-то внесено), ниже — название и
// калории приёма («628 ккал», у пустого — «0 ккал»).
// Тап по плитке добавляет блюдо именно в этот приём.

import { Image, Pressable, Text, View } from 'react-native'
import { Check } from 'lucide-react-native'
import { formatNum } from '@/lib/format'

const MAX = 1.2

export function MealCard({ meal, consumed, onAdd }) {
  const hasDishes = consumed > 0

  return (
    <Pressable
      onPress={onAdd}
      accessibilityRole="button"
      accessibilityLabel={
        hasDishes
          ? `Добавить блюдо в «${meal.name}», внесено ${formatNum(consumed)} килокалорий`
          : `Добавить блюдо в «${meal.name}», пока пусто`
      }
      className="min-w-0 flex-1 overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.04] active:opacity-80"
    >
      <View className="h-16 w-full items-center justify-center bg-white/[0.04]">
        {meal.image ? (
          <>
            {/* подложка — то же фото, обрезанное и притемнённое, чтобы края не были пустыми */}
            <Image
              source={meal.image}
              resizeMode="cover"
              style={{ position: 'absolute', width: '100%', height: '100%', opacity: 0.3 }}
            />
            {/* тарелка целиком, без обрезки */}
            <Image source={meal.image} resizeMode="contain" style={{ width: '100%', height: '100%' }} />
          </>
        ) : (
          <View className="h-full w-full items-center justify-center bg-white/5">
            <Text className="text-2xl">{meal.emoji || '🍽️'}</Text>
          </View>
        )}

        {/* галочки-бейджи на фото: фиолетовая «внесено» + серая companion */}
        {hasDishes && (
          <View className="absolute bottom-1.5 right-1.5 flex-row items-center">
            <View
              className="h-5 w-5 items-center justify-center rounded-full bg-[#7B6CF6]"
              style={{ borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)' }}
            >
              <Check size={11} color="#FFFFFF" strokeWidth={3} />
            </View>
            <View
              className="-ml-1.5 h-4 w-4 items-center justify-center rounded-full bg-[#0C1327]"
              style={{ borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' }}
            >
              <Check size={9} color="#8B96B8" strokeWidth={3} />
            </View>
          </View>
        )}
      </View>

      <View className="items-center px-1 pb-2.5 pt-1.5">
        <Text
          numberOfLines={1}
          maxFontSizeMultiplier={MAX}
          className="font-semibold text-[11.5px] leading-tight text-bear-text"
        >
          {meal.short || meal.name}
        </Text>
        <Text maxFontSizeMultiplier={MAX} className="mt-0.5 font-sans text-[10.5px] text-bear-dim">
          {formatNum(consumed)} ккал
        </Text>
      </View>
    </Pressable>
  )
}

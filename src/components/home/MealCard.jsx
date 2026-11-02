// Плитка приёма пищи: сетка 2×2 — карточки заметно крупнее, чем было
// в ряд из четырёх. Сверху высокое фото блюда, на нём — галочки-бейджи
// (фиолетовая — в приём уже что-то внесено), ниже — название и
// калории приёма («628 ккал», у пустого — «0 ккал»). Плитки в одном
// ряду одной высоты (flex-stretch: одинаковая структура растягивает
// обе до общего роста). Тап по плитке добавляет блюдо в этот приём —
// отдельная кнопка «Добавить» удалена как дубль.

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
      <View className="h-24 w-full items-center justify-center overflow-hidden bg-white/[0.04]">
        {meal.image ? (
          // фото заливает плитку целиком (cover): у всех четырёх плиток
          // одинаковый масштаб и выравнивание — раньше contain давал
          // у каждой свой масштаб и поля, ряд выглядел съехавшим.
          // ВАЖНО: Android не обрезает абсолютную картинку по скруглению
          // родителя — углы фото вылезали за rounded-2xl карточки, поэтому
          // скругляем верхние углы самой картинки (16 = rounded-2xl)
          <Image
            source={meal.image}
            resizeMode="cover"
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
            }}
          />
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

      <View className="items-center px-2 pb-3 pt-2">
        <Text
          numberOfLines={1}
          maxFontSizeMultiplier={MAX}
          className="font-semibold text-[13px] leading-tight text-bear-text"
        >
          {meal.short || meal.name}
        </Text>
        <Text maxFontSizeMultiplier={MAX} className="mt-0.5 font-sans text-[11.5px] text-bear-dim">
          {formatNum(consumed)} ккал
        </Text>
      </View>
    </Pressable>
  )
}

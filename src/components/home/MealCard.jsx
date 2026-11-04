// Плитка приёма пищи — КОМПАКТНАЯ: маленькое круглое фото (40) +
// название и калории в одну строку. Прежние квадратные фото-плитки
// 2×2 (aspect-square) занимали почти пол-экрана — блок был громоздкий,
// а крупные фото с тарелками разного масштаба бросались в глаза;
// в маленьком круге тарелки выглядят единообразно, и блок стал
// примерно втрое ниже. Скругление на самой картинке (Android не режет
// absolute-картинку скруглением родителя — раньше углы фото вылезали
// за карточку), absolute-позиционирование больше не используется.
// Тап по плитке добавляет блюдо в этот приём.

import { Image, Pressable, Text, View } from 'react-native'
import { Check } from 'lucide-react-native'
import { formatNum } from '@/lib/format'

const MAX = 1.2
// диаметр круглого мини-фото; радиус = половина
const THUMB = 40

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
      className="min-w-0 flex-1 flex-row items-center gap-2.5 rounded-2xl border border-white/[0.06] bg-white/[0.04] px-2.5 py-2.5 active:opacity-80"
    >
      <View className="relative" style={{ width: THUMB, height: THUMB }}>
        {meal.image ? (
          // круглое мини-фото: borderRadius на самой картинке —
          // надёжнее всего на Android, ничего не вылезает за углы
          <Image
            source={meal.image}
            resizeMode="cover"
            style={{ width: THUMB, height: THUMB, borderRadius: THUMB / 2 }}
          />
        ) : (
          <View
            className="items-center justify-center bg-white/5"
            style={{ width: THUMB, height: THUMB, borderRadius: THUMB / 2 }}
          >
            <Text style={{ fontSize: 18 }}>{meal.emoji || '🍽️'}</Text>
          </View>
        )}

        {/* галочка «внесено» — маленький фиолетовый кружок на фото */}
        {hasDishes && (
          <View
            className="absolute items-center justify-center rounded-full bg-[#7B6CF6]"
            style={{
              width: 15,
              height: 15,
              right: -2,
              bottom: -2,
              borderWidth: 1.5,
              borderColor: '#0C1327',
            }}
          >
            <Check size={9} color="#FFFFFF" strokeWidth={3.5} />
          </View>
        )}
      </View>

      <View className="min-w-0 flex-1">
        <Text
          numberOfLines={1}
          maxFontSizeMultiplier={MAX}
          className="font-semibold text-[13px] leading-tight text-bear-text"
        >
          {meal.short || meal.name}
        </Text>
        <Text maxFontSizeMultiplier={MAX} className="mt-0.5 font-sans text-[11px] text-bear-dim">
          {formatNum(consumed)} ккал
        </Text>
      </View>
    </Pressable>
  )
}

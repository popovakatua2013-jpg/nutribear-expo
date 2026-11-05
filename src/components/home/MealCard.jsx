// Плитка приёма пищи — КРУПНАЯ СТРОКА НА ВСЮ ШИРИНУ карточки: большое круглое
// фото (52) + название и калории в одну строку. Стоит в столбике
// (MealPlanCard), поэтому flex-1 убран: в колонке он делил бы высоту,
// а ширина и так растягивается на всю карточку. Раньше была сетка 2×2
// с мелкими пилюлями — по просьбе Кати строки стали крупнее и идут
// одна под другой. Скругление на самой картинке (Android не режет
// absolute-картинку скруглением родителя — раньше углы фото вылезали
// за карточку), absolute-позиционирование больше не используется.
// Тап по плитке добавляет блюдо в этот приём.

import { Image, Pressable, Text, View } from 'react-native'
import { Check } from 'lucide-react-native'
import { formatNum } from '@/lib/format'

const MAX = 1.2
// диаметр круглого фото; радиус = половина
const THUMB = 52

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
      className="min-w-0 flex-row items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.04] px-3 py-3 active:opacity-80"
    >
      <View className="relative" style={{ width: THUMB, height: THUMB }}>
        {meal.image ? (
          // круглое фото: borderRadius на самой картинке —
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
            <Text style={{ fontSize: 27 }}>{meal.emoji || '🍽️'}</Text>
          </View>
        )}

        {/* галочка «внесено» — фиолетовый кружок на фото */}
        {hasDishes && (
          <View
            className="absolute items-center justify-center rounded-full bg-[#7B6CF6]"
            style={{
              width: 18,
              height: 18,
              right: -2,
              bottom: -2,
              borderWidth: 2,
              borderColor: '#0C1327',
            }}
          >
            <Check size={14} color="#FFFFFF" strokeWidth={3.5} />
          </View>
        )}
      </View>

      <View className="min-w-0 flex-1">
        <Text
          numberOfLines={1}
          maxFontSizeMultiplier={MAX}
          className="font-semibold text-[19.5px] leading-tight text-bear-text"
        >
          {meal.short || meal.name}
        </Text>
        <Text maxFontSizeMultiplier={MAX} className="mt-0.5 font-sans text-[16.5px] text-bear-dim">
          {formatNum(consumed)} ккал
        </Text>
      </View>
    </Pressable>
  )
}

// Блок «Рекомендации» как на фото-макете: звезда и заголовок, сердце
// и персональный совет по категории ИМТ, кнопка-лотос открывает подробные
// советы. Внизу — «Идеальный диапазон ИМТ»: градиентная полоса
// (голубой → зелёный → фиолетовый) с белым бегунком на позиции
// текущего ИМТ (шкала 15–35: норма приходится на зелёный участок).
// Крестик в шапке прячет блок (флаг bmiAdviceHidden в useUiPrefsStore —
// переживает перезапуск; блок возвращается кнопкой «К рекомендациям»
// из окна «Что означает твой ИМТ»).

import { Pressable, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Flower2, Heart, Star, X } from 'lucide-react-native'
import { bmiCategory, RECOMMENDATIONS } from '@/lib/data/bmi'
import { useUiPrefsStore } from '@/store/useUiPrefsStore'
import { useThemeColors } from '@/lib/use-theme'

// Цвета шкалы «Идеальный диапазон ИМТ» — семантика категорий ИМТ
// (lib/data/bmi): дефицит жёлтый → норма зелёная → лишний вес оранжевый →
// ожирение красный. Раньше шкала была сине-фиолетовой (#22D3EE/#4ADE80/
// #A855F7) — чужой палитрой, не совпадающей с бейджем и легендой
const SCALE_COLORS = ['#facc15', '#4ade80', '#fb923c', '#f87171']


// Та же поверхность, что у всех карточек вкладки (bodyCard + bodyLine)
// Поверхность карточек — bodyCard + bodyLine активной темы (Premium 23.11)
const cardSurface = (C) => ({
  backgroundColor: C.bodyCard,
  borderColor: C.bodyLine,
  borderWidth: 1,
})

const BMI_MIN = 15
const BMI_MAX = 35

export function BmiAdvice({ bmi, onDetails }) {
  const themeColors = useThemeColors()
  const cat = bmiCategory(bmi)
  const rec = RECOMMENDATIONS[cat.id]
  const setBmiAdviceHidden = useUiPrefsStore((s) => s.setBmiAdviceHidden)

  // Позиция бегунка на шкале 15–35
  const pos = Math.min(1, Math.max(0, ((bmi || BMI_MIN) - BMI_MIN) / (BMI_MAX - BMI_MIN)))

  return (
    <View accessibilityLabel="Рекомендации по индексу массы тела" className="rounded-[24px] p-4" style={cardSurface(themeColors)}>
      {/* Шапка: звезда-контур + заголовок + кнопка-лотос (подробные советы) */}
      <View className="flex-row items-center gap-2">
        <Star size={23} color={themeColors.accentSoft} fill={themeColors.accentFaint} strokeWidth={2} />
        <Text className="min-w-0 flex-1 font-bold text-[21px] tracking-tight text-bear-text">
          Рекомендации
        </Text>
        <Pressable
          onPress={onDetails}
          accessibilityRole="button"
          accessibilityLabel="Открыть подробные рекомендации"
          className="h-[44px] w-[44px] items-center justify-center rounded-[14px] border active:opacity-70"
          style={{ backgroundColor: themeColors.accentFaint, borderColor: themeColors.bodyLine }}
        >
          <Flower2 size={23} color={themeColors.accentSoft} />
        </Pressable>
        {/* Крестик: спрятать блок — решение запоминается */}
        <Pressable
          onPress={() => setBmiAdviceHidden(true)}
          accessibilityRole="button"
          accessibilityLabel="Скрыть блок рекомендаций"
          hitSlop={6}
          className="h-9 w-9 shrink-0 items-center justify-center rounded-full active:opacity-70"
          style={{ backgroundColor: themeColors.accentFaint }}
        >
          <X hitSlop={10} size={17} color={themeColors.sub} />
        </Pressable>
      </View>

      {/* Совет по категории */}
      <View className="mt-2 flex-row items-start gap-2">
        <View className="mt-[3px] shrink-0">
          <Heart size={17} color={themeColors.accentSoft} fill={themeColors.accentSoft} />
        </View>
        <Text
          accessibilityLabel={rec.main}
          maxFontSizeMultiplier={1.3}
          className="min-w-0 flex-1 font-sans text-[17.5px] leading-relaxed text-bear-soft"
        >
          {rec.main}
        </Text>
      </View>

      {/* Идеальный диапазон ИМТ: подпись · полоса с бегунком · диапазон —
          одной строкой, как на макете */}
      <View
        className="mt-3 flex-row items-center gap-2 rounded-[14px] border px-2.5 py-2"
        style={{
          backgroundColor: themeColors.accentFaint,
          borderColor: themeColors.bodyLine,
          borderWidth: 1,
        }}
      >
        <Text
          maxFontSizeMultiplier={1.1}
          numberOfLines={1}
          className="shrink-0 font-medium text-[15px] text-bear-sub"
        >
          Идеальный диапазон ИМТ
        </Text>
        <View className="min-w-0 flex-1">
          <View className="h-[7px] overflow-hidden rounded-full">
            <LinearGradient
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              colors={SCALE_COLORS}
              locations={[0, 0.18, 0.5, 1]}
              style={{ flex: 1 }}
            />
          </View>
          {/* Тонкий штрих-бегунок цвета текста темы на позиции текущего ИМТ —
              как на макете (белый на «Кремовой» был невидим) */}
          <View
            accessibilityLabel={`Ваш ИМТ ${Math.round(bmi * 10) / 10} — отметка на шкале идеального диапазона`}
            style={{
              position: 'absolute',
              left: `${pos * 100}%`,
              top: -5.5,
              width: 3.5,
              height: 18,
              borderRadius: 2,
              backgroundColor: themeColors.text,
              transform: [{ translateX: -1.75 }],
              shadowColor: themeColors.text,
              shadowOpacity: 0.9,
              shadowRadius: 6,
            }}
          />
        </View>
        <Text maxFontSizeMultiplier={1.1} className="shrink-0 font-bold text-[16.5px] text-bear-text">
          18.5 – 24.9
        </Text>
      </View>
    </View>
  )
}

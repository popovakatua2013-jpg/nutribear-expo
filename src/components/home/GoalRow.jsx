// Карточка цели «1 в 1 с макетом» (v7, компактная): тёмное стекло,
// ЯРКАЯ неоновая рамка цвета цели (розовая/синяя/зелёная/фиолетовая),
// градиентная иконка, норма-цель, живой прогресс-бар
// и круглая кнопка-шеврон (открывает редактор целей).
// v7: все размеры ужаты до пропорций эталона (ряд ~59px вместо ~73px):
// иконка 34, шеврон 26, шрифты 13.5/10.5, бар 5px — как в макете
// v7.1: трек полоски подкрашен цветом цели + стартовый сегмент 10%,
// чтобы полоска читалась яркой даже при нуле прогресса (как в макете)

import { Pressable, StyleSheet, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { ChevronRight } from 'lucide-react-native'

// Ограничение роста текста при крупном системном шрифте
const MAX = 1.25

export function GoalRow({
  icon,
  glow,
  iconColors,
  barColors,
  label,
  valueText,
  pctValue,
  onPress,
}) {
  const w = Math.max(0, Math.min(100, pctValue || 0))

  return (
    // Рамка-свечение: цветной кант вокруг стеклянной карточки
    <LinearGradient
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      colors={[`${glow}A2`, `${glow}30`, `${glow}70`]}
      style={{
        borderRadius: 15,
        padding: 1.2,
        shadowColor: glow,
        shadowOpacity: 0.4,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 4 },
      }}
    >
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`Цель «${label}»: ${valueText}. Нажмите, чтобы изменить`}
        className="rounded-[14px] px-3 pb-[7px] pt-[7px] active:opacity-90"
        style={{ overflow: 'hidden' }}
      >
        {/* Стеклянный фон: светлее сверху, темнее снизу (вертикально, как в макете) */}
        <LinearGradient
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          colors={['rgba(38, 48, 110, 0.60)', 'rgba(8, 12, 36, 0.96)']}
          style={{
            ...StyleSheet.absoluteFillObject,
          }}
        />

        <View className="flex-row items-center gap-2.5">
          {/* Градиентная плашка иконки */}
          <LinearGradient
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            colors={iconColors}
            style={{
              height: 34,
              width: 34,
              borderRadius: 11,
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: glow,
              shadowOpacity: 0.5,
              shadowRadius: 9,
              shadowOffset: { width: 0, height: 2 },
            }}
          >
            {icon}
          </LinearGradient>

          {/* Название и норма-цель (как в макете: «1 800 ккал», «6 ст.») */}
          <View className="min-w-0 flex-1">
            <Text
              numberOfLines={1}
              maxFontSizeMultiplier={MAX}
              className="font-bold text-[13.5px] leading-tight text-bear-text"
            >
              {label}
            </Text>
            <Text
              numberOfLines={1}
              maxFontSizeMultiplier={MAX}
              className="mt-0.5 font-medium text-[10.5px] leading-tight"
              style={{ color: '#A9B4E6' }}
            >
              {valueText}
            </Text>
          </View>

          {/* Круглая кнопка-шеврон */}
          <View
            className="h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full"
            style={{
              backgroundColor: 'rgba(255,255,255,0.10)',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.16)',
            }}
          >
            <ChevronRight size={12} color="#DCE4FA" />
          </View>
        </View>

        {/* Прогресс-бар — живой: заполнен на процент выполнения цели за сегодня.
            От начала текста до правого края карточки (как в макете).
            Подложка трека подсвечена цветом цели — бар цветной даже на нуле */}
        <View className="ml-[56px] mt-1.5 h-[5px] overflow-hidden rounded-full bg-[rgba(15,21,52,0.85)]">
          <View
            style={{
              ...StyleSheet.absoluteFillObject,
              backgroundColor: `${glow}30`,
            }}
          />
          <LinearGradient
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            colors={barColors}
            style={{
              width: `${Math.max(w, 10)}%`,
              height: '100%',
              borderRadius: 999,
            }}
          />
        </View>
      </Pressable>
    </LinearGradient>
  )
}

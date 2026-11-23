// Чип-иконка в шапках карточек — маленький квадрат с ГРАДИЕНТОМ
// АКТИВНОЙ ТЕМЫ (правка Кати 24.11 «сделай в точности как на скрине»:
// у ярких тем чипы светятся цветом темы — лайм, лазурь, орхидея,
// бирюза, янтарь; раньше градиент был жёстко фиолетовым #8B5CF6 →
// #6D28D9). Цвет иконки внутри — accentOn темы: у лайма/циана/янтаря
// иконка тёмная (белое на них не читается), у синего/фиолетового —
// белая. Применяется в шапках карточек «Главной», «Дневника» и «Ещё»
// (единый стиль страниц). Переданную иконку перекрашиваем и приводим
// к единому размеру (cloneElement): вызывающий просто передаёт
// <Dumbbell />, без настроек. Если вместо иконки передан текст
// (например, эмодзи 🐻) — текст не трогаем: у Text нет пропсов
// color/size, лишние пропсы RN игнорирует.

import { cloneElement } from 'react'
import { View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useThemeColors } from '@/lib/use-theme'

export function BodyChip({ icon, size = 28 }) {
  const c = useThemeColors()
  const glyph = cloneElement(icon, {
    color: c.accentOn,
    size: Math.round(size * 0.55),
  })
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.36),
        overflow: 'hidden',
      }}
    >
      <LinearGradient
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        colors={[c.accentBright, c.accent]}
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
      >
        {glyph}
      </LinearGradient>
    </View>
  )
}

// Чип-иконка в стиле вкладки «Тело» — шапка карточки: маленький квадрат
// с фиолетовым градиентом (#8B5CF6 → #6D28D9) и белой иконкой внутри,
// как чипы «Вес/Рост» на «Теле». Применяется в шапках карточек
// «Главной», «Дневника» и «Ещё» (единый стиль страниц).
// Переданную иконку перекрашиваем в белый и приводим к единому размеру
// (cloneElement): вызывающий просто передаёт <Dumbbell />, без настроек.
// Если вместо иконки передан текст (например, эмодзи 🐻) — текст не трогаем:
// у Text нет пропсов color/size, лишние пропсы RN игнорирует.

import { cloneElement } from 'react'
import { View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'

export function BodyChip({ icon, size = 28 }) {
  const glyph = cloneElement(icon, {
    color: '#FFFFFF',
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
        colors={['#8B5CF6', '#6D28D9']}
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
      >
        {glyph}
      </LinearGradient>
    </View>
  )
}

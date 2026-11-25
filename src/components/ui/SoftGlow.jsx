// Мягкое неоновое свечение (дымка как на макете вкладки «Тело»):
// радиальный градиент плавно уходит в прозрачность — без жёсткого
// края круглой заливки. Вынесено из bmi.jsx, чтобы подсветить шапки
// всех страниц в едином стиле; у каждого экземпляра — свой id
// градиента (в одном дереве id должны быть уникальны).
//
// РЕЖИМ БЕЗ ЭФФЕКТОВ (тема «Чёрно-белая», просьба Кати 26.11: «одну
// бесплатную черно-белую без каких либо эффектов»): в plain-теме
// свечение не рисуется вовсе — компонент возвращает null.

import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg'
import { useThemePlain } from '@/lib/use-theme'

export function SoftGlow({ w, h, style, color = '#7C3AED', peak = 0.32, id }) {
  const plain = useThemePlain()
  if (plain) return null
  return (
    <Svg width={w} height={h} pointerEvents="none" style={[{ position: 'absolute' }, style]}>
      <Defs>
        <RadialGradient id={id} cx="0.5" cy="0.5" r="0.5">
          <Stop offset="0" stopColor={color} stopOpacity={peak} />
          <Stop offset="1" stopColor={color} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Rect x={0} y={0} width={w} height={h} fill={`url(#${id})`} />
    </Svg>
  )
}

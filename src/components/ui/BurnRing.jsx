// Малое кольцо прогресса цели сжигания — общий компонент.
// Живёт в двух местах: строка «Сожжено за сегодня» в сводке на главной
// и карточка «Активность» на главной. Внутри текста нет — только кольцо,
// подписи остаются снаружи.

import { View } from 'react-native'
import Svg, { Circle } from 'react-native-svg'

export function BurnRing({
  pct = 0,
  size = 26,
  stroke = 3.5,
  color = '#f87171',
  track = 'rgba(255,255,255,0.1)',
}) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const clamped = Math.min(100, Math.max(0, pct || 0))
  const half = size / 2

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={`Выполнено ${Math.round(pct || 0)} процентов цели сжигания`}
      className="shrink-0"
      style={{ width: size, height: size }}
    >
      <Svg width={size} height={size}>
        <Circle cx={half} cy={half} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <Circle
          cx={half}
          cy={half}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${(c * clamped) / 100} ${c}`}
          transform={`rotate(-90 ${half} ${half})`}
        />
      </Svg>
    </View>
  )
}

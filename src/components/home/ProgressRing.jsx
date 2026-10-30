// Кольцо «Прогресс»: 4 цветные дуги — шаги, калории, минуты, вода.
// Длина каждой дуги пропорциональна её проценту выполнения цели.

import { View } from 'react-native'
import Svg, { Circle, Text as SvgText } from 'react-native-svg'
import { fontFamilies } from './ring-font'

const R = 38
const CIRC = 2 * Math.PI * R
const GAP = 7 // зазор между дугами, в единицах длины окружности

export function ProgressRing({ parts, percent }) {
  const total = parts.reduce((s, p) => s + p.value, 0)

  let angle = -90 // старт с верхней точки, по часовой
  const arcs = parts.map((p) => {
    const share = total > 0 ? p.value / total : 0
    const arc = {
      ...p,
      len: Math.max(0, share * CIRC - GAP),
      rotate: angle,
    }
    angle += share * 360
    return arc
  })

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={`Прогресс ${percent}%`}
      className="h-[96px] w-[96px] shrink-0"
    >
      <Svg width={96} height={96} viewBox="0 0 96 96">
        <Circle
          cx="48"
          cy="48"
          r={R}
          fill="none"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth="9"
        />
        {total > 0 &&
          arcs
            .filter((a) => a.len > 0)
            .map((a) => (
              <Circle
                key={a.key}
                cx="48"
                cy="48"
                r={R}
                fill="none"
                stroke={a.color}
                strokeWidth="9"
                strokeLinecap="round"
                strokeDasharray={`${a.len} ${CIRC}`}
                transform={`rotate(${a.rotate} 48 48)`}
              />
            ))}
        <SvgText
          x="48"
          y="54"
          fill="#EEF2FB"
          fontSize="19"
          fontWeight="800"
          fontFamily={fontFamilies.extrabold}
          textAnchor="middle"
        >
          {`${percent}%`}
        </SvgText>
      </Svg>
    </View>
  )
}

// Кольцо «Голодание»: одна фиолетовая дуга — процент пройденного окна.
// Стиль повторяет ProgressRing: трек, дуга от верхней точки по часовой,
// процент в центре (Inter ExtraBold).

import { View } from 'react-native'
import Svg, { Circle, Text as SvgText } from 'react-native-svg'
import { fontFamilies } from './ring-font'

const R = 38
const CIRC = 2 * Math.PI * R

export function FastingRing({ pct = 0 }) {
  const p = Math.min(100, Math.max(0, Math.round(pct)))
  const len = (p / 100) * CIRC

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={`Прогресс голодания ${p}%`}
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
        {len > 0 && (
          <Circle
            cx="48"
            cy="48"
            r={R}
            fill="none"
            stroke="#7B6CF6"
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={`${len} ${CIRC}`}
            transform="rotate(-90 48 48)"
          />
        )}
        <SvgText
          x="48"
          y="54"
          fill="#EEF2FB"
          fontSize="19"
          fontWeight="800"
          fontFamily={fontFamilies.extrabold}
          textAnchor="middle"
        >
          {`${p}%`}
        </SvgText>
      </Svg>
    </View>
  )
}

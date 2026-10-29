// Кольцо «Прогресс» по макету: единая дуга с градиентом
// (фиолетовый → розовый), светящаяся точка на конце дуги,
// в центре — процент и подпись «от цели».

import { View } from 'react-native'
import Svg, {
  Circle,
  Defs,
  LinearGradient as SvgGradient,
  Stop,
  Text as SvgText,
} from 'react-native-svg'
import { fontFamilies } from './ring-font'

const R = 38
const CIRC = 2 * Math.PI * R

export function ProgressRing({ percent }) {
  const pct = Math.max(0, Math.min(100, percent || 0))
  const len = (pct / 100) * CIRC
  // Точка на конце дуги: -90° — верхняя точка кольца, далее по часовой
  const ang = ((-90 + (pct / 100) * 360) * Math.PI) / 180
  const dotX = 48 + R * Math.cos(ang)
  const dotY = 48 + R * Math.sin(ang)

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={`Прогресс ${pct}% от цели`}
      className="h-[96px] w-[96px] shrink-0"
    >
      <Svg width={96} height={96} viewBox="0 0 96 96">
        <Defs>
          <SvgGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#C084FC" />
            <Stop offset="1" stopColor="#F472B6" />
          </SvgGradient>
        </Defs>

        {/* Трек */}
        <Circle cx="48" cy="48" r={R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="9" />

        {/* Дуга прогресса с градиентом — как в макете */}
        {pct > 0 && (
          <Circle
            cx="48"
            cy="48"
            r={R}
            fill="none"
            stroke="url(#ringGrad)"
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={`${len} ${CIRC}`}
            transform="rotate(-90 48 48)"
          />
        )}

        {/* Светящаяся точка на конце дуги */}
        <Circle cx={dotX} cy={dotY} r="3.4" fill="#F5D0FE" />

        <SvgText
          x="48"
          y="52"
          fill="#EEF2FB"
          fontSize="19"
          fontWeight="800"
          fontFamily={fontFamilies.extrabold}
          textAnchor="middle"
        >
          {`${pct}%`}
        </SvgText>
        <SvgText
          x="48"
          y="65"
          fill="#8F9BC7"
          fontSize="7.5"
          fontWeight="600"
          fontFamily={fontFamilies.semibold}
          textAnchor="middle"
        >
          от цели
        </SvgText>
      </Svg>
    </View>
  )
}

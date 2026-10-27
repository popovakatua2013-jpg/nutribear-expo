// Кольцо прогресса воды (SVG): проценты нормы и счётчик стаканов

import { Text, View } from 'react-native'
import Svg, { Circle } from 'react-native-svg'

const SIZE = 92
const STROKE = 8
const R = (SIZE - STROKE) / 2
const CIRC = 2 * Math.PI * R

export function WaterRing({ pct = 0, glasses = 0, glassesGoal = 8 }) {
  const dash = (Math.max(0, Math.min(100, pct)) / 100) * CIRC

  return (
    <View className="items-center justify-center" style={{ width: SIZE, height: SIZE }}>
      <Svg width={SIZE} height={SIZE} className="absolute inset-0">
        <Circle cx={SIZE / 2} cy={SIZE / 2} r={R} stroke="rgba(255,255,255,0.08)" strokeWidth={STROKE} fill="none" />
        <Circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          stroke="#38BDF8"
          strokeWidth={STROKE}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${CIRC - dash}`}
          rotation="-90"
          origin={`${SIZE / 2}, ${SIZE / 2}`}
        />
      </Svg>
      <Text className="font-extrabold text-[17px] text-bear-text">{pct}%</Text>
      <Text className="font-sans text-[9.5px] text-bear-sub">
        {glasses}/{glassesGoal} ст.
      </Text>
    </View>
  )
}

// Круговой датчик ИМТ: кольцо со значением и названием категории

import { Text, View } from 'react-native'
import Svg, { Defs, LinearGradient, Stop, Circle } from 'react-native-svg'
import { bmiCategory, fmtDecimal, gaugeFill } from '@/lib/data/bmi'

const R = 58
const CIRC = 2 * Math.PI * R

export function BmiGauge({ bmi }) {
  const cat = bmiCategory(bmi)
  const fill = gaugeFill(bmi)
  const isNorm = cat.id === 'norm'
  const dash = (fill / 100) * CIRC

  return (
    <View className="mx-auto h-[168px] w-[168px] items-center justify-center">
      <Svg width={168} height={168} style={{ position: 'absolute' }}>
        <Defs>
          <LinearGradient id="bmiRing" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={isNorm ? '#a3e635' : cat.color} />
            <Stop offset="1" stopColor={isNorm ? '#22c55e' : cat.color} stopOpacity={isNorm ? 1 : 0.75} />
          </LinearGradient>
        </Defs>
        <Circle cx={84} cy={84} r={R} stroke="rgba(255,255,255,0.07)" strokeWidth={10} fill="none" />
        <Circle
          cx={84}
          cy={84}
          r={R}
          stroke="url(#bmiRing)"
          strokeWidth={10}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${dash} ${CIRC - dash}`}
          rotation="-90"
          origin="84, 84"
        />
      </Svg>
      <Text className="font-extrabold text-[34px] leading-none tracking-tight text-bear-text">
        {fmtDecimal(bmi)}
      </Text>
      <Text className="mt-1.5 font-semibold text-[13px]" style={{ color: cat.color }}>
        {cat.label}
      </Text>
    </View>
  )
}

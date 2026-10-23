// Заливка области под линией (замена recharts AreaChart).
// Данные: [{ label, value }], ширина меряется через onLayout.

import { useState } from 'react'
import { View } from 'react-native'
import Svg, { Defs, LinearGradient, Stop, Path, Circle, Line, Text as SvgText } from 'react-native-svg'

const AXIS = '#5C668A'
const GRID = 'rgba(255,255,255,0.06)'

// Сглаженная кривая (Catmull-Rom → кубические Безье)
export function smoothPath(pts) {
  if (pts.length < 2) return ''
  let d = `M ${pts[0].x} ${pts[0].y}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[Math.min(pts.length - 1, i + 2)]
    const c1x = p1.x + (p2.x - p0.x) / 6
    const c1y = p1.y + (p2.y - p0.y) / 6
    const c2x = p2.x - (p3.x - p1.x) / 6
    const c2y = p2.y - (p3.y - p1.y) / 6
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`
  }
  return d
}

export function SvgAreaChart({
  data, // [{ label, value }]
  color = '#4ade80',
  height = 190,
  yFmt = (v) => String(Math.round(v)),
  dot = true,
}) {
  const [w, setW] = useState(0)
  const PAD_L = 34
  const PAD_R = 8
  const PAD_T = 10
  const PAD_B = 20

  if (!data.length || w === 0) {
    return <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ height }} />
  }

  const values = data.map((d) => d.value)
  const max = Math.max(...values)
  const min = Math.min(...values)
  const lo = min === max ? min - 1 : min - (max - min) * 0.1
  const hi = max === min ? max + 1 : max + (max - min) * 0.08

  const iw = w - PAD_L - PAD_R
  const ih = height - PAD_T - PAD_B
  const x = (i) => PAD_L + (iw * i) / Math.max(1, data.length - 1)
  const y = (v) => PAD_T + ih - ((v - lo) / (hi - lo)) * ih

  const pts = data.map((d, i) => ({ x: x(i), y: y(d.value) }))
  const line = smoothPath(pts)
  const area = `${line} L ${pts[pts.length - 1].x} ${PAD_T + ih} L ${pts[0].x} ${PAD_T + ih} Z`

  // Подписи сверху вниз: от максимума к минимуму (ось Y растёт вверх)
  const ticks = [0, 1, 2, 3].map((i) => hi - ((hi - lo) * i) / 3)
  // Подписи X: при >8 точках — через одну (плюс последняя)
  const skip = data.length > 8 ? Math.ceil(data.length / 6) : 1

  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ height }}>
      <Svg width={w} height={height}>
        <Defs>
          <LinearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity={0.4} />
            <Stop offset="1" stopColor={color} stopOpacity={0.02} />
          </LinearGradient>
        </Defs>
        {ticks.map((t, i) => {
          const ty = PAD_T + (ih * i) / 3
          return (
            <Line
              key={`g${i}`}
              x1={PAD_L}
              y1={ty}
              x2={w - PAD_R}
              y2={ty}
              stroke={GRID}
              strokeWidth={1}
            />
          )
        })}
        {ticks.map((t, i) => (
          <SvgText
            key={`t${i}`}
            x={PAD_L - 5}
            y={PAD_T + (ih * i) / 3 + 3}
            fill={AXIS}
            fontSize={9}
            textAnchor="end"
          >
            {yFmt(t)}
          </SvgText>
        ))}
        <Path d={area} fill="url(#fill)" />
        <Path d={line} stroke={color} strokeWidth={2.5} fill="none" />
        {dot &&
          pts.map((p, i) => (
            <Circle key={`d${i}`} cx={p.x} cy={p.y} r={3} fill={color} />
          ))}
        {data.map((d, i) =>
          i % skip === 0 || i === data.length - 1 ? (
            <SvgText
              key={`x${i}`}
              x={x(i)}
              y={height - 6}
              fill={AXIS}
              fontSize={9}
              textAnchor={i === 0 ? 'start' : i === data.length - 1 ? 'end' : 'middle'}
            >
              {d.label}
            </SvgText>
          ) : null
        )}
      </Svg>
    </View>
  )
}

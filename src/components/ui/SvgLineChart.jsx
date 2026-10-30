// Линейный график с несколькими сериями (замена recharts LineChart).
// Данные: [{ label, ...ключи серий }], series: [{ key, color }]

import { useState } from 'react'
import { View } from 'react-native'
import Svg, { Path, Circle, Line, Text as SvgText } from 'react-native-svg'
import { smoothPath } from './SvgAreaChart'

const AXIS = '#8B96B8'
const GRID = 'rgba(255,255,255,0.06)'

export function SvgLineChart({
  data,
  series, // [{ key, color }]
  height = 210,
  yFmt = (v) => (v >= 1000 ? `${Math.round(v / 1000)}к` : `${Math.round(v)}`),
}) {
  const [w, setW] = useState(0)
  const PAD_L = 34
  const PAD_R = 8
  const PAD_T = 10
  const PAD_B = 20

  if (!data.length || w === 0) {
    return <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ height }} />
  }

  const values = data.flatMap((d) => series.map((s) => d[s.key]))
  const max = Math.max(...values)
  const min = Math.min(...values)
  const rawLo = min === max ? min - 1 : min - (max - min) * 0.08
  const lo = min >= 0 ? Math.max(0, rawLo) : rawLo
  const hi = max === min ? max + 1 : max + (max - min) * 0.06

  const iw = w - PAD_L - PAD_R
  const ih = height - PAD_T - PAD_B
  const x = (i) => PAD_L + (iw * i) / Math.max(1, data.length - 1)
  const y = (v) => PAD_T + ih - ((v - lo) / (hi - lo)) * ih

  // Подписи сверху вниз: от максимума к минимуму (ось Y растёт вверх)
  const ticks = [0, 1, 2, 3].map((i) => hi - ((hi - lo) * i) / 3)
  const skip = data.length > 8 ? Math.ceil(data.length / 6) : 1

  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ height }}>
      <Svg width={w} height={height}>
        {ticks.map((t, i) => (
          <Line
            key={`g${i}`}
            x1={PAD_L}
            y1={PAD_T + (ih * i) / 3}
            x2={w - PAD_R}
            y2={PAD_T + (ih * i) / 3}
            stroke={GRID}
            strokeWidth={1}
          />
        ))}
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
        {series.map((s) => {
          const pts = data.map((d, i) => ({ x: x(i), y: y(d[s.key]) }))
          return (
            <Path
              key={s.key}
              d={smoothPath(pts)}
              stroke={s.color}
              strokeWidth={2.5}
              fill="none"
            />
          )
        })}
        {series.map((s) =>
          data.map((d, i) => (
            <Circle
              key={`${s.key}-${i}`}
              cx={x(i)}
              cy={y(d[s.key])}
              r={3}
              fill={s.color}
            />
          ))
        )}
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

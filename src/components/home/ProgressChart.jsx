// Фиолетовый график шагов за 7 дней: градиентная линия с заливкой,
// ромбовидные точки (синие — ниже среднего, розовые — выше,
// последняя точка — с подсветкой). Сегодня подмешивается в последнюю точку.

import { Fragment, useMemo, useState } from 'react'
import { Text, View } from 'react-native'
import Svg, { Defs, LinearGradient, Stop, Path, Rect, Circle } from 'react-native-svg'
import { history } from '@/lib/data/activity'
import { smoothPath } from '../ui/SvgAreaChart'

export function ProgressChart({ steps }) {
  const [w, setW] = useState(0)
  const H = 104
  const PAD_X = 14
  const PAD_T = 16
  const PAD_B = 6

  // Прошлые дни без записей = 0, сегодня — реальные шаги из стора
  const rows = useMemo(() => {
    const all = history(7)
    const last = all[all.length - 1]
    all[all.length - 1] = { ...last, steps: Math.max(0, steps || 0) }
    return all
  }, [steps])

  const values = rows.map((r) => r.steps)
  const max = Math.max(...values)

  // Совсем нет данных за неделю — вместо пустой линии показываем подсказку
  if (max === 0) {
    return (
      <View
        onLayout={(e) => setW(e.nativeEvent.layout.width)}
        className="min-w-0 flex-1 items-center justify-center"
        style={{ height: H }}
      >
        <Text className="text-center font-sans text-[11px] leading-relaxed text-bear-dim">
          Пока нет данных за неделю.{'\n'}Добавляйте шаги кнопкой «+» на экране «Активность»
        </Text>
      </View>
    )
  }

  const min = Math.min(...values)
  const lo = Math.max(0, min - 600)
  const hi = max + 300

  if (!w) {
    return (
      <View
        onLayout={(e) => setW(e.nativeEvent.layout.width)}
        className="min-w-0 flex-1"
        style={{ height: H }}
      />
    )
  }

  const iw = w - PAD_X * 2
  const ih = H - PAD_T - PAD_B
  const x = (i) => PAD_X + (iw * i) / Math.max(1, rows.length - 1)
  const y = (v) => PAD_T + ih - ((v - lo) / Math.max(1, hi - lo)) * ih

  const pts = rows.map((r, i) => ({ x: x(i), y: y(r.steps) }))
  const line = smoothPath(pts)
  const area = `${line} L ${pts[pts.length - 1].x} ${PAD_T + ih} L ${pts[0].x} ${PAD_T + ih} Z`
  const avg = values.reduce((s, v) => s + v, 0) / values.length

  return (
    <View
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      className="min-w-0 flex-1"
      style={{ height: H }}
    >
      <Svg width={w} height={H}>
        <Defs>
          <LinearGradient id="pFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#a855f7" stopOpacity={0.45} />
            <Stop offset="1" stopColor="#a855f7" stopOpacity={0.02} />
          </LinearGradient>
          <LinearGradient id="pStroke" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#8b5cf6" />
            <Stop offset="1" stopColor="#ec4899" />
          </LinearGradient>
        </Defs>
        <Path d={area} fill="url(#pFill)" />
        <Path d={line} stroke="url(#pStroke)" strokeWidth={2.5} fill="none" />
        {pts.map((p, i) => {
          const isLast = i === rows.length - 1
          const fill = isLast ? '#f0abfc' : values[i] >= avg ? '#d946ef' : '#38bdf8'
          return (
            <Fragment key={`pt-${i}`}>
              {isLast && <Circle cx={p.x} cy={p.y} r={9} fill={fill} opacity={0.3} />}
              {isLast && <Circle cx={p.x} cy={p.y} r={5.5} fill={fill} opacity={0.55} />}
              <Rect
                x={p.x - 3.5}
                y={p.y - 3.5}
                width={7}
                height={7}
                rx={1.2}
                transform={`rotate(45 ${p.x} ${p.y})`}
                fill={fill}
              />
            </Fragment>
          )
        })}
      </Svg>
    </View>
  )
}

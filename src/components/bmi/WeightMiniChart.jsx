// Мини-график веса за 30 дней — компактный спарклайн без осей,
// живёт прямо под карточкой «Вес» на вкладке ИМТ. Та же сглаженная
// кривая (Catmull-Rom → кубические Безье), что в большом графике
// «Динамики веса», мягкая заливка и белая точка последней оценки.
// Тап по графику выбирает ближайшую точку — карточка показывает
// дату и вес того дня (activeIndex + onPick). Ширина меряется
// через onLayout — карточка может быть любой.

import { useState } from 'react'
import { Pressable, View } from 'react-native'
import Svg, { Defs, LinearGradient, Stop, Path, Circle } from 'react-native-svg'
import { smoothPath } from '../ui/SvgAreaChart'

export function WeightMiniChart({ data, color = '#A78BFA', height = 30, activeIndex = null, onPick }) {
  const [w, setW] = useState(0)

  const kgs = (data || []).map((d) => d.kg).filter((v) => Number.isFinite(v))
  if (!kgs.length || w === 0) {
    return <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ height }} />
  }

  // Ровная линия по центру, если вес не менялся (иначе деление на ноль)
  const max = Math.max(...kgs)
  const min = Math.min(...kgs)
  const lo = min === max ? min - 1 : min
  const hi = min === max ? max + 1 : max
  const pad = 4 // поля сверху/снизу — линия и точка не режутся краем
  const y = (v) => pad + ((height - pad * 2) * (hi - v)) / (hi - lo)
  const x = (i) => (kgs.length === 1 ? w / 2 : (w * i) / (kgs.length - 1))

  const pts = kgs.map((v, i) => ({ x: x(i), y: y(v) }))
  const line = kgs.length >= 2 ? smoothPath(pts) : `M ${pts[0].x} ${pts[0].y} L ${w} ${pts[0].y}`
  const area = `${line} L ${pts[pts.length - 1].x} ${height} L ${pts[0].x} ${height} Z`
  const last = pts[pts.length - 1]
  const active = activeIndex != null && activeIndex >= 0 && activeIndex < pts.length ? pts[activeIndex] : null

  // Тап по графику: ближайшая точка по координате касания.
  // Повторный тап по той же точке снимает выбор.
  function handlePick(e) {
    if (!onPick) return
    const tx = e?.nativeEvent?.locationX ?? 0
    const idx = Math.min(pts.length - 1, Math.max(0, Math.round((tx / Math.max(1, w)) * (pts.length - 1))))
    onPick(idx === activeIndex ? null : idx)
  }

  return (
    <Pressable
      onPress={handlePick}
      accessibilityLabel="График веса за 30 дней — коснитесь точки, чтобы увидеть дату и вес"
      style={{ height }}
    >
      <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ height }}>
        <Svg width={w} height={height}>
          <Defs>
            {/* свой id — чтобы не пересекаться с «fill» большого графика */}
            <LinearGradient id="nbsMiniFill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={color} stopOpacity={0.32} />
              <Stop offset="1" stopColor={color} stopOpacity={0.02} />
            </LinearGradient>
          </Defs>
          <Path d={area} fill="url(#nbsMiniFill)" />
          <Path d={line} stroke={color} strokeWidth={2} strokeLinecap="round" fill="none" />
          <Circle cx={last.x} cy={last.y} r={2.8} fill="#FFFFFF" />
          {/* Выбранная точка — крупная, с тёмной обводкой */}
          {active && (
            <Circle cx={active.x} cy={active.y} r={4.5} fill={color} stroke="#121B33" strokeWidth={2} />
          )}
        </Svg>
      </View>
    </Pressable>
  )
}

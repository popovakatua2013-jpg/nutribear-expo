// Заливка области под линией (замена recharts AreaChart).
// Данные: [{ label, value }], ширина меряется через onLayout.
// goalLine — необязательная горизонтальная пунктирная линия цели
// (например, целевой вес). Цель НЕ растягивает шкалу (отзыв Кати:
// цель 93 сплющивала кривую 52–65 в прямую линию): шкала строится
// по измерениям, а линия при выходе за диапазон прижимается к краю
// с подписью значения («цель 93»). Деления оси Y — круглые числа
// на своих настоящих позициях (значение выше — деление выше;
// раньше подписи шли по возрастанию сверху вниз и ось выглядела
// перевёрнутой — отзыв Кати: блок «Динамики веса» выглядел недоделанным).

import { useState } from 'react'
import { View } from 'react-native'
import Svg, { Defs, LinearGradient, Stop, Path, Circle, Line, Rect, Text as SvgText } from 'react-native-svg'

const AXIS = '#8B96B8'
const GRID = 'rgba(255,255,255,0.06)'

// Круглый шаг делений оси: ближайшее «красивое» число (1/2/2.5/5 × 10^k)
// к range/target — подписи вроде «54,3» больше не появляются
function niceStep(range, target = 4) {
  if (!(range > 0) || !Number.isFinite(range)) return 1
  const raw = range / target
  const pow = Math.pow(10, Math.floor(Math.log10(raw)))
  for (const m of [1, 2, 2.5, 5, 10]) {
    if (raw <= m * pow + 1e-9) return m * pow
  }
  return 10 * pow
}

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
  dotColor = null, // цвет точек (по умолчанию — цвет линии)
  goalLine = null, // горизонтальный пунктир цели (то же значение, что в data)
  activeIndex = null, // подсветка выбранной точки: вертикальная линия + крупная точка
  bare = false, // без сетки и подписей оси Y (оси не нужны — есть плашка значения)
  lastBadge = false, // плашка значения над последней точкой, как на макете ИМТ
  spark = false, // мини-спарклайн в карточке: без каких-либо подписей,
  // плотные поля и тонкая линия — линии тренда в карточках 3×2 и таблице замеров
}) {
  const [w, setW] = useState(0)
  const PAD_L = spark ? 2 : bare ? 12 : 34
  const PAD_R = spark ? 2 : 8
  const PAD_T = spark ? 4 : 10
  const PAD_B = spark ? 4 : 20

  if (!data.length || w === 0) {
    return <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ height }} />
  }

  const values = data.map((d) => d.value)
  // Шкала — ТОЛЬКО по измерениям (см. шапку файла). Цель включается
  // в шкалу, когда она близко (не дальше 1,5 размаха) — пунктир встаёт
  // ровно на своё значение между делениями; далеко — прижимается
  // к краю, чтобы не сплющить кривую (цель 93 при данных 52–65)
  const max = Math.max(...values)
  const min = Math.min(...values)
  const flat = min === max
  let lo = flat ? min - 1 : min - (max - min) * 0.1
  let hi = flat ? max + 1 : max + (max - min) * 0.08
  const hasGoal = goalLine != null && Number.isFinite(goalLine)
  const span = hi - lo
  if (hasGoal && goalLine > hi && goalLine - hi <= 1.5 * span) {
    hi = goalLine + (flat ? 0.5 : (max - min) * 0.08)
  } else if (hasGoal && goalLine < lo && lo - goalLine <= 1.5 * span) {
    lo = goalLine - (flat ? 0.5 : (max - min) * 0.1)
  }
  if (min >= 0 && lo < 0) lo = 0

  // Круглые деления внутри шкалы; у ровной линии (все значения равны)
  // шаг ровно 1 — подписи 87 / 88 / 89 без дробей и дублей. Дубли
  // после yFmt (например 52,5 → «53» при целочисленном формате)
  // убираем — grid и подписи всегда согласованы
  const step = flat ? 1 : niceStep(hi - lo)
  const start = Math.ceil(lo / step) * step
  const rawTicks = []
  for (let i = 0; i < 10; i++) {
    const t = start + i * step
    if (t > hi + 1e-9) break
    rawTicks.push(t)
  }
  const ticks = []
  for (const t of rawTicks) {
    if (!ticks.length || yFmt(t) !== yFmt(ticks[ticks.length - 1])) ticks.push(t)
  }

  const iw = w - PAD_L - PAD_R
  const ih = height - PAD_T - PAD_B
  const x = (i) => PAD_L + (iw * i) / Math.max(1, data.length - 1)
  const y = (v) => PAD_T + ih - ((v - lo) / (hi - lo)) * ih

  const pts = data.map((d, i) => ({ x: x(i), y: y(d.value) }))
  const line = smoothPath(pts)
  const area = `${line} L ${pts[pts.length - 1].x} ${PAD_T + ih} L ${pts[0].x} ${PAD_T + ih} Z`

  // Пунктир цели: линия прижимается к краю, если цель вне шкалы;
  // у прижатой линии подпись со значением («цель 93»), чтобы позиция
  // не читалась как настоящее значение цели
  const goalClamped = hasGoal && (goalLine > hi || goalLine < lo)
  const goalY = hasGoal ? Math.min(Math.max(y(goalLine), PAD_T + 2), PAD_T + ih - 2) : 0
  // Подпись «цель»: над линией, а если линия у верхней кромки — под ней,
  // чтобы надпись не обрезалась
  const goalLabelY = hasGoal && goalY - 4 < PAD_T + 9 ? goalY + 12 : goalY - 4
  const goalText = hasGoal ? (goalClamped ? `цель ${yFmt(goalLine)}` : 'цель') : ''

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
        {!bare &&
          ticks.map((t) => {
            // Сетка — на НАСТОЯЩЕЙ позиции значения: раньше деления
            // стояли через равные промежутки высоты, а значения шли
            // по возрастанию сверху вниз, и ось Y выглядела
            // перевёрнутой (87 сверху, 89 снизу при шкале «больше = выше»)
            const ty = y(t)
            return (
              <Line
                key={`g${t}`}
                x1={PAD_L}
                y1={ty}
                x2={w - PAD_R}
                y2={ty}
                stroke={GRID}
                strokeWidth={1}
              />
            )
          })}
        {!bare &&
          ticks.map((t) => (
            <SvgText
              key={`t${t}`}
              x={PAD_L - 5}
              y={y(t) + 3}
              fill={AXIS}
              fontSize={9}
              textAnchor="end"
            >
              {yFmt(t)}
            </SvgText>
          ))}
        <Path d={area} fill="url(#fill)" />
        <Path d={line} stroke={color} strokeWidth={spark ? 2 : 2.5} fill="none" />
        {hasGoal && (
          <>
            <Line
              x1={PAD_L}
              y1={goalY}
              x2={w - PAD_R}
              y2={goalY}
              stroke="#fbbf24"
              strokeWidth={1.5}
              strokeDasharray="5 4"
            />
            <SvgText x={w - PAD_R} y={goalLabelY} fill="#fbbf24" fontSize={9} textAnchor="end">
              {goalText}
            </SvgText>
          </>
        )}
        {dot &&
          pts.map((p, i) => (
            <Circle key={`d${i}`} cx={p.x} cy={p.y} r={spark ? 2 : 3} fill={dotColor || color} />
          ))}
        {activeIndex != null && activeIndex >= 0 && activeIndex < data.length && (
          <>
            <Line
              x1={x(activeIndex)}
              y1={PAD_T}
              x2={x(activeIndex)}
              y2={PAD_T + ih}
              stroke="rgba(255,255,255,0.16)"
              strokeWidth={1}
              strokeDasharray="4 4"
            />
            <Circle
              cx={x(activeIndex)}
              cy={y(data[activeIndex].value)}
              r={5.5}
              fill={dotColor || color}
              stroke="#0C1327"
              strokeWidth={2}
            />
          </>
        )}
        {lastBadge &&
          data.length > 0 &&
          (() => {
            const t = yFmt(data[data.length - 1].value)
            const bw = Math.min(90, t.length * 6.6 + 12)
            const bx = Math.min(Math.max(x(data.length - 1) - bw / 2, 2), w - bw - 2)
            const by = Math.max(2, y(data[data.length - 1].value) - 27)
            return (
              <>
                <Rect x={bx} y={by} width={bw} height={17} rx={8.5} fill="#7B6CF6" />
                <SvgText
                  x={bx + bw / 2}
                  y={by + 12.5}
                  fill="#FFFFFF"
                  fontSize={10.5}
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {t}
                </SvgText>
              </>
            )
          })()}
        {!spark &&
          data.map((d, i) =>
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

// Полукруглый датчик «Общий прогресс» (0–100) — по макету пользователя:
// трек из трёх приглушённых сегментов (фиолетовый / оранжевый /
// зелёный) и дуга прогресса с градиентом по этим же цветам, в центре —
// балл и «из 100». Полукруг слева направо: углы 180°…360°.

import { View } from 'react-native'
import Svg, { Defs, LinearGradient as SvgGradient, Stop, Path, Text as SvgText } from 'react-native-svg'
import { fontFamilies } from '../home/ring-font'

const W = 148
const H = 84
const CX = 74 // центр окружности (низ полукруга)
const CY = 74
const R = 58
const STROKE = 13

// Точка на окружности по углу в градусах (0° — вправо, 180° — влево)
const pt = (deg) => {
  const rad = (deg * Math.PI) / 180
  return [CX + R * Math.cos(rad), CY + R * Math.sin(rad)]
}

// Дуга по часовой стрелке от угла from к углу to
const arcPath = (from, to) => {
  const [x1, y1] = pt(from)
  const [x2, y2] = pt(to)
  const large = to - from > 180 ? 1 : 0
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${R} ${R} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`
}

export function ScoreGauge({ score = 0 }) {
  const clamped = Math.min(100, Math.max(0, Math.round(score)))
  // Минимальный хвостик дуги — чтобы и 1 балл был виден
  const endDeg = 180 + Math.max(4, (clamped / 100) * 180)
  // Три сегмента трека по 60°: фиолетовый / оранжевый / зелёный
  const seg = (i) => arcPath(180 + i * 60, 180 + (i + 1) * 60)

  return (
    <View accessibilityLabel={`Общий прогресс: ${clamped} из 100`}>
      <Svg width={W} height={H}>
        <Defs>
          <SvgGradient id="nbsScoreGauge" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#7C5CFC" />
            <Stop offset="0.5" stopColor="#FB923C" />
            <Stop offset="1" stopColor="#4ADE80" />
          </SvgGradient>
        </Defs>

        {/* Трек: три приглушённых сегмента, как на макете */}
        <Path d={seg(0)} stroke="rgba(124,92,252,0.30)" strokeWidth={STROKE} strokeLinecap="round" fill="none" />
        <Path d={seg(1)} stroke="rgba(251,146,60,0.30)" strokeWidth={STROKE} fill="none" />
        <Path d={seg(2)} stroke="rgba(74,222,128,0.30)" strokeWidth={STROKE} strokeLinecap="round" fill="none" />

        {/* Дуга прогресса с градиентом */}
        {clamped > 0 && (
          <Path
            d={arcPath(180, Math.min(360, endDeg))}
            stroke="url(#nbsScoreGauge)"
            strokeWidth={STROKE}
            strokeLinecap="round"
            fill="none"
          />
        )}

        {/* Балл и «из 100» в центре полукруга */}
        <SvgText
          x={CX}
          y={CY - 20}
          fill="#EEF2FB"
          fontSize="26"
          fontWeight="800"
          fontFamily={fontFamilies.extrabold}
          textAnchor="middle"
        >
          {String(clamped)}
        </SvgText>
        <SvgText x={CX} y={CY - 2} fill="#8B96B8" fontSize="10" textAnchor="middle">
          из 100
        </SvgText>
      </Svg>
    </View>
  )
}

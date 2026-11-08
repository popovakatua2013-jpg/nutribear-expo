// src/features/workouts/components/icons.jsx — набор SVG-иконок вкладки
// Линейный стиль 2px по референсу вкладки.

import React from 'react'
import Svg, { Circle, G, Path, Rect } from 'react-native-svg'

const base = (size, color, children) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    {children}
  </Svg>
)

/** Гантели — тип «Силовые» */
export const IconDumbbell = ({ size = 22, color = '#C8FF3D' }) =>
  base(size, color, <Path d="M6.5 6.5v11M17.5 6.5v11M3 9v6M21 9v6M6.5 12h11" />)

/** Пульс — тип «Кардио» */
export const IconPulse = ({ size = 22, color = '#C8FF3D' }) =>
  base(size, color, <Path d="M3 12h4l2-6 4 12 2-6h6" />)

/** Молния — тип «HIIT» */
export const IconBolt = ({ size = 22, color = '#C8FF3D' }) =>
  base(size, color, <Path d="M13 2 4 14h6l-1 8 9-12h-6z" />)

/** Поза — тип «Йога» */
export const IconYoga = ({ size = 22, color = '#C8FF3D' }) =>
  base(size, color,
    <>
      <Circle cx={12} cy={5} r={2} />
      <Path d="M12 7v6M12 13l-5 4M12 13l5 4M12 9l-4 2M12 9l4 2" />
    </>
  )

/** Стрелки растяжения — тип «Растяжка» */
export const IconStretch = ({ size = 22, color = '#C8FF3D' }) =>
  base(size, color, <Path d="M4 12h16M7 8l-3 4 3 4M17 8l3 4-3 4" />)

/** Пламя — серия */
export const IconFlame = ({ size = 18, color = '#C8FF3D' }) =>
  base(size, color, <Path d="M12 2c1 4-4 5.5-4 10a4 4 0 0 0 8 0c0-1.5-.5-2.5-1-3.5 2.5 1 4 3.2 4 6.5a7 7 0 0 1-14 0C5 9.5 10 8 12 2z" />)

/** Калории */
export const IconKcal = ({ size = 15, color = '#FF7A45' }) =>
  base(size, color, <Path d="M12 13c1.5-2 0-4 0-4s5 2.5 5 7a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5.5 1 1.5 1.5 3 1.5z" />)

/** Часы */
export const IconClock = ({ size = 15, color = '#3DDCF2' }) =>
  base(size, color, <><Circle cx={12} cy={12} r={9} /><Path d="M12 7v5l3.5 2" /></>)

/** Календарь */
export const IconCalendar = ({ size = 15, color = '#3DDCF2' }) =>
  base(size, color, <><Rect x={3} y={5} width={18} height={16} rx={3} /><Path d="M8 3v4M16 3v4M3 11h18" /></>)

/** График */
export const IconChart = ({ size = 15, color = '#3DDCF2' }) =>
  base(size, color, <><Path d="M3 3v18h18" /><Path d="m7 14 4-4 3 3 5-6" /></>)

/** Поиск */
export const IconSearch = ({ size = 16, color = '#5A6472' }) =>
  base(size, color, <><Circle cx={11} cy={11} r={7} /><Path d="m20 20-3.8-3.8" /></>)

/** Играть */
export const IconPlay = ({ size = 16, color = '#101400' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path d="M8 5v14l11-7z" />
  </Svg>
)

/** Пауза — контрол плеера */
export const IconPause = ({ size = 20, color = '#101400' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Rect x={6} y={4} width={4.5} height={16} rx={1.5} />
    <Rect x={13.5} y={4} width={4.5} height={16} rx={1.5} />
  </Svg>
)

/** Крест — выход из плеера */
export const IconClose = ({ size = 18, color = '#8B95A5' }) =>
  base(size, color, <Path d="M6 6l12 12M18 6 6 18" />)

/** Стрелка вперёд — пропуск упражнения/отдыха */
export const IconSkip = ({ size = 20, color = '#F2F5F7' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path d="M5 5v14l9-7z" />
    <Rect x={16} y={5} width={2.6} height={14} rx={1.3} />
  </Svg>
)

/** Галочка — финиш и выполненные упражнения */
export const IconCheck = ({ size = 18, color = '#C8FF3D' }) =>
  base(size, color, <Path d="m4.5 12.5 5 5 10-11" />)

/** Медаль — достижение */
export const IconMedal = ({ size = 20, color = '#C8FF3D' }) =>
  base(size, color,
    <Path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22M18 2H6v7a6 6 0 0 0 12 0V2z" />
  )

/** Звезда — достижение */
export const IconStar = ({ size = 20, color = '#C8FF3D' }) =>
  base(size, color, <Path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z" />)

/** Замок — закрытое достижение */
export const IconLock = ({ size = 20, color = '#5A6472' }) =>
  base(size, color, <><Rect x={4} y={10} width={16} height={10} rx={2} /><Path d="M8 10V7a4 4 0 0 1 8 0v3" /></>)

export const workoutTypeIcon = {
  strength: IconDumbbell,
  cardio: IconPulse,
  hiit: IconBolt,
  yoga: IconYoga,
  stretch: IconStretch,
}

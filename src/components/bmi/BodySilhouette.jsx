// Неоновый силуэт человека 1-в-1 с макетом: составная яркая фигура
// (голова, торс, руки, ноги) с плотным свечением, ДВУМЯ орбитальными
// кольцами (талия + бёдра, как на макете), бликами мышц и светящейся
// ореолом-платформой у ног. Части нарисованы с зазорами — стиль
// неоновой фигурки, стыки не видны.

import Svg, {
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
  Ellipse,
  G,
  Path,
  Circle,
} from 'react-native-svg'

const HEAD = 'M 60 6.5 C 67 6.5 72.5 12.5 72.5 21 C 72.5 29.5 67 35.5 60 35.5 C 53 35.5 47.5 29.5 47.5 21 C 47.5 12.5 53 6.5 60 6.5 Z'

const TORSO =
  'M 53 37 C 52 45 44 49 37 52 C 31 56 29 64 29 73 C 29 85 34 95 38 103 C 32 111 28 123 30 137 C 31 149 35 159 37 166 L 83 166 C 85 159 89 149 90 137 C 92 123 88 111 82 103 C 86 95 91 85 91 73 C 91 64 89 56 83 52 C 76 49 68 45 67 37 C 63 39 57 39 53 37 Z'

const ARM_R =
  'M 85 56 C 93 60 97 68 97 79 C 97 93 93 107 90 118 C 89 123 84 124 83 119 C 86 107 90 95 90 83 C 90 73 88 63 82 58 Z'

const ARM_L =
  'M 35 56 C 27 60 23 68 23 79 C 23 93 27 107 30 118 C 31 123 36 124 37 119 C 34 107 30 95 30 83 C 30 73 32 63 38 58 Z'

const LEG_R =
  'M 67 168 C 74 170 79 174 80 181 C 81 196 79 212 76 226 C 75 238 75 248 75 256 L 62 256 C 62 244 63 230 63 216 C 63 200 63 184 62 172 C 62 170 64 168 67 168 Z'

const LEG_L =
  'M 53 168 C 46 170 41 174 40 181 C 39 196 41 212 44 226 C 45 238 45 248 45 256 L 58 256 C 58 244 57 230 57 216 C 57 200 57 184 58 172 C 58 170 56 168 53 168 Z'

const PARTS = [HEAD, TORSO, ARM_R, ARM_L, LEG_R, LEG_L]

// Тонкие «мышечные» блики внутри тела — как анатомические линии на макете
const DETAILS = [
  // ключицы
  'M 50 46 Q 60 51 70 46',
  // грудь
  'M 60 58 Q 51 66 45 63',
  'M 60 58 Q 69 66 75 63',
  // центральная линия и пресс
  'M 60 74 L 60 120',
  'M 51 90 Q 60 94 69 90',
  'M 52 105 Q 60 109 68 105',
  // бёдра
  'M 52 150 Q 60 154 68 150',
]

export function BodySilhouette({ width = 104, height }) {
  // height задан — тянем фигуру на неё (как на макете: от кольца
  // до низа карточек); нет — держим пропорцию 1:2,17
  const h = height || Math.round((width * 260) / 120)

  return (
    <Svg
      width={width}
      height={h}
      viewBox="0 0 120 260"
      preserveAspectRatio={height ? 'none' : 'xMidYMid meet'}
    >
      <Defs>
        {/* Тело: насыщенный фиолетовый неон — светлее и ярче, как на макете */}
        <LinearGradient id="nbsBody" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#E9D5FF" stopOpacity="0.95" />
          <Stop offset="0.45" stopColor="#A855F7" stopOpacity="0.82" />
          <Stop offset="1" stopColor="#6D28D9" stopOpacity="0.62" />
        </LinearGradient>
        {/* Ореол-платформа у ног — радиальное свечение */}
        <RadialGradient id="nbsAura" cx="0.5" cy="0.5" rx="0.5" ry="0.5">
          <Stop offset="0" stopColor="#C084FC" stopOpacity="0.62" />
          <Stop offset="0.6" stopColor="#8B5CF6" stopOpacity="0.28" />
          <Stop offset="1" stopColor="#7C3AED" stopOpacity="0" />
        </RadialGradient>
      </Defs>

      {/* Ореол под ногами: широкое свечение + светящееся кольцо платформы */}
      <Ellipse cx={60} cy={249} rx={58} ry={17} fill="url(#nbsAura)" />
      <Ellipse
        cx={60}
        cy={249}
        rx={48}
        ry={10}
        fill="none"
        stroke="#8B5CF6"
        strokeOpacity={0.4}
        strokeWidth={5}
      />
      <Ellipse
        cx={60}
        cy={249}
        rx={44}
        ry={8.5}
        fill="none"
        stroke="#D8B4FE"
        strokeOpacity={0.85}
        strokeWidth={2}
      />

      {/* Плотное свечение: те же контуры широким насыщенным штрихом */}
      <G opacity={0.55} fill="none" stroke="#A855F7" strokeWidth={9} strokeLinejoin="round">
        {PARTS.map((d, i) => (
          <Path key={`h${i}`} d={d} />
        ))}
      </G>

      {/* Тело: яркая градиентная заливка + светлый неоновый контур */}
      <G fill="url(#nbsBody)" stroke="#F3E8FF" strokeWidth={1.7} strokeOpacity={1} strokeLinejoin="round">
        {PARTS.map((d, i) => (
          <Path key={`p${i}`} d={d} />
        ))}
      </G>

      {/* Тонкие блики мышц поверх заливки */}
      <G fill="none" stroke="#F5F3FF" strokeWidth={1} strokeOpacity={0.42} strokeLinecap="round">
        {DETAILS.map((d, i) => (
          <Path key={`d${i}`} d={d} />
        ))}
      </G>

      {/* Орбитальное кольцо на талии: широкое свечение + яркая сердцевина */}
      <Ellipse
        cx={60}
        cy={113}
        rx={41}
        ry={10.5}
        fill="none"
        stroke="#8B5CF6"
        strokeOpacity={0.45}
        strokeWidth={6}
        rotation={-14}
        origin="60,113"
      />
      <Ellipse
        cx={60}
        cy={113}
        rx={41}
        ry={10.5}
        fill="none"
        stroke="#DDD6FE"
        strokeWidth={1.9}
        strokeOpacity={1}
        rotation={-14}
        origin="60,113"
      />

      {/* Второе кольцо на бёдрах — ниже и с наклоном в другую сторону */}
      <Ellipse
        cx={60}
        cy={152}
        rx={37}
        ry={9}
        fill="none"
        stroke="#8B5CF6"
        strokeOpacity={0.4}
        strokeWidth={5.5}
        rotation={12}
        origin="60,152"
      />
      <Ellipse
        cx={60}
        cy={152}
        rx={37}
        ry={9}
        fill="none"
        stroke="#C4B5FD"
        strokeWidth={1.7}
        strokeOpacity={0.95}
        rotation={12}
        origin="60,152"
      />

      {/* Искры вокруг фигуры */}
      <Circle cx={15} cy={40} r={1.8} fill="#E9D5FF" opacity={0.75} />
      <Circle cx={106} cy={148} r={2.4} fill="#DDD6FE" opacity={0.65} />
      <Circle cx={10} cy={182} r={1.4} fill="#DDD6FE" opacity={0.6} />
      <Circle cx={110} cy={30} r={1.5} fill="#E9D5FF" opacity={0.65} />
      <Circle cx={14} cy={116} r={1.2} fill="#C4B5FD" opacity={0.55} />
    </Svg>
  )
}

// Неоновый силуэт человека 1-в-1 с макетом: составная яркая фигура
// (голова, торс, руки, ноги) с плотным свечением, орбитальным кольцом
// на талии и светящимся ореолом-платформой у ног. Части нарисованы
// с зазорами — стиль неоновой фигурки, стыки не видны.

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
        <LinearGradient id="nbsBody" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#C4B5FD" stopOpacity="0.88" />
          <Stop offset="0.5" stopColor="#8B5CF6" stopOpacity="0.62" />
          <Stop offset="1" stopColor="#60A5FA" stopOpacity="0.42" />
        </LinearGradient>
        {/* Ореол-платформа у ног — радиальное свечение */}
        <RadialGradient id="nbsAura" cx="0.5" cy="0.5" rx="0.5" ry="0.5">
          <Stop offset="0" stopColor="#A855F7" stopOpacity="0.5" />
          <Stop offset="0.6" stopColor="#7C3AED" stopOpacity="0.22" />
          <Stop offset="1" stopColor="#7C3AED" stopOpacity="0" />
        </RadialGradient>
      </Defs>

      {/* Ореол под ногами: широкое свечение + светящееся кольцо платформы */}
      <Ellipse cx={60} cy={249} rx={56} ry={16} fill="url(#nbsAura)" />
      <Ellipse
        cx={60}
        cy={249}
        rx={48}
        ry={10}
        fill="none"
        stroke="#7C3AED"
        strokeOpacity={0.3}
        strokeWidth={5}
      />
      <Ellipse
        cx={60}
        cy={249}
        rx={44}
        ry={8.5}
        fill="none"
        stroke="#C084FC"
        strokeOpacity={0.75}
        strokeWidth={2}
      />

      {/* Плотное свечение: те же контуры широким насыщенным штрихом */}
      <G opacity={0.4} fill="none" stroke="#A855F7" strokeWidth={8} strokeLinejoin="round">
        {PARTS.map((d, i) => (
          <Path key={`h${i}`} d={d} />
        ))}
      </G>

      {/* Тело: яркая градиентная заливка + светлый неоновый контур */}
      <G fill="url(#nbsBody)" stroke="#E9D5FF" strokeWidth={1.6} strokeOpacity={0.95} strokeLinejoin="round">
        {PARTS.map((d, i) => (
          <Path key={`p${i}`} d={d} />
        ))}
      </G>

      {/* Орбитальное кольцо на талии */}
      <Ellipse
        cx={60}
        cy={113}
        rx={41}
        ry={10.5}
        fill="none"
        stroke="#A78BFA"
        strokeOpacity={0.32}
        strokeWidth={5}
        rotation={-14}
        origin="60,113"
      />
      <Ellipse
        cx={60}
        cy={113}
        rx={41}
        ry={10.5}
        fill="none"
        stroke="#C4B5FD"
        strokeWidth={1.8}
        strokeOpacity={0.95}
        rotation={-14}
        origin="60,113"
      />

      {/* Искры */}
      <Circle cx={17} cy={44} r={1.6} fill="#DDD6FE" opacity={0.6} />
      <Circle cx={104} cy={150} r={2.2} fill="#DDD6FE" opacity={0.55} />
      <Circle cx={12} cy={184} r={1.3} fill="#DDD6FE" opacity={0.5} />
      <Circle cx={108} cy={34} r={1.4} fill="#DDD6FE" opacity={0.55} />
    </Svg>
  )
}

// Неоновый силуэт 1-в-1 с фото-макетом: стройная изящная фигура
// (узкие плечи, выраженная талия, длинные ноги), насыщенный фиолетовый
// градиент с ярким неоновым контуром и плотным свечением. Вокруг торса —
// ОДНА спиральная лента: задняя дуга уходит ЗА тело, передняя ложится
// поверх живота по диагонали (слева снизу — направо вверх), как на макете.
// У ног — светящаяся ореол-платформа.

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

const HEAD = 'M 60 8 C 66.3 8 71 14 71 21.5 C 71 29.5 66.3 35.5 60 35.5 C 53.7 35.5 49 29.5 49 21.5 C 49 14 53.7 8 60 8 Z'

const TORSO =
  'M 55.5 34 C 55 42 52.5 47.5 46.5 51 C 40.5 54.5 38 60.5 38.5 68 C 39 78 42.5 88 46 95.5 C 43.8 105 42.8 117 44 129 C 45.2 141.5 48.5 152.5 51.5 161 L 68.5 161 C 71.5 152.5 74.8 141.5 76 129 C 77.2 117 76.2 105 74 95.5 C 77.5 88 81 78 81.5 68 C 82 60.5 79.5 54.5 73.5 51 C 67.5 47.5 65 42 64.5 34 C 63 35.8 57 35.8 55.5 34 Z'

const ARM_R =
  'M 74.5 53.5 C 81.5 57.5 85.5 65 86.5 75.5 C 87.6 88 85.5 102 83 113.5 C 82.4 118 77.8 118.3 77.6 113.8 C 79.8 103 81.4 91 80.8 80 C 80.3 70.5 78 61.5 72.5 57 Z'

const ARM_L =
  'M 45.5 53.5 C 38.5 57.5 34.5 65 33.5 75.5 C 32.4 88 34.5 102 37 113.5 C 37.6 118 42.2 118.3 42.4 113.8 C 40.2 103 38.6 91 39.2 80 C 39.7 70.5 42 61.5 47.5 57 Z'

const LEG_R =
  'M 66.5 162 C 72.5 165 76 171 76.5 179 C 77.3 193.5 75 209 72.8 222 C 71.8 234 71.6 246 71.8 256 L 62 256 C 62 244 62.6 230 63 215.5 C 63.4 199.5 63.4 183 62.8 168.5 C 64 164.5 65.2 161.6 66.5 162 Z'

const LEG_L =
  'M 53.5 162 C 47.5 165 44 171 43.5 179 C 42.7 193.5 45 209 47.2 222 C 48.2 234 48.4 246 48.2 256 L 58 256 C 58 244 57.4 230 57 215.5 C 56.6 199.5 56.6 183 57.2 168.5 C 56 164.5 54.8 161.6 53.5 162 Z'

const PARTS = [HEAD, TORSO, ARM_R, ARM_L, LEG_R, LEG_L]

// Тонкие «мышечные» блики: ключицы, грудь, центральная линия, пресс, бёдра
const DETAILS = [
  'M 51.5 47 Q 60 51 68.5 47',
  'M 60 60 Q 53.5 66.5 48 64',
  'M 60 60 Q 66.5 66.5 72 64',
  'M 60 75 L 60 118',
  'M 52.5 88 Q 60 92 67.5 88',
  'M 53 102 Q 60 106 67 102',
  'M 53.5 143 Q 60 147 66.5 143',
]

// Спиральная лента вокруг торса: эллипс 45×12.5 с наклоном −20°,
// центр (60, 103) — на талии, как на макете. Задняя (верхняя) дуга
// рисуется ДО тела, передняя (нижняя) — ПОСЛЕ — лента «обвивает» фигуру
const RING_TRANSFORM = 'translate(60 103) rotate(-20)'
const RING_BACK = 'M -45 0 A 45 12.5 0 0 1 45 0'
const RING_FRONT = 'M -45 0 A 45 12.5 0 0 0 45 0'

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
        {/* Тело: насыщенный фиолетовый неон — светлый верх, глубокий низ */}
        <LinearGradient id="nbsBody" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#D8B4FE" stopOpacity="0.95" />
          <Stop offset="0.5" stopColor="#A855F7" stopOpacity="0.9" />
          <Stop offset="1" stopColor="#6D28D9" stopOpacity="0.78" />
        </LinearGradient>
        {/* Ореол-платформа у ног — радиальное свечение */}
        <RadialGradient id="nbsAura" cx="0.5" cy="0.5" rx="0.5" ry="0.5">
          <Stop offset="0" stopColor="#C084FC" stopOpacity="0.62" />
          <Stop offset="0.6" stopColor="#8B5CF6" stopOpacity="0.28" />
          <Stop offset="1" stopColor="#7C3AED" stopOpacity="0" />
        </RadialGradient>
      </Defs>

      {/* Ореол под ногами: широкое свечение + светящееся кольцо платформы */}
      <Ellipse cx={60} cy={249} rx={55} ry={16} fill="url(#nbsAura)" />
      <Ellipse
        cx={60}
        cy={249}
        rx={46}
        ry={10}
        fill="none"
        stroke="#8B5CF6"
        strokeOpacity={0.4}
        strokeWidth={4.5}
      />
      <Ellipse
        cx={60}
        cy={249}
        rx={42}
        ry={8.5}
        fill="none"
        stroke="#D8B4FE"
        strokeOpacity={0.85}
        strokeWidth={1.8}
      />

      {/* Задняя (верхняя) дуга ленты — уходит ЗА тело */}
      <G transform={RING_TRANSFORM}>
        <Path d={RING_BACK} fill="none" stroke="#8B5CF6" strokeOpacity={0.45} strokeWidth={5.5} strokeLinecap="round" />
        <Path d={RING_BACK} fill="none" stroke="#C4B5FD" strokeOpacity={0.85} strokeWidth={1.6} strokeLinecap="round" />
      </G>

      {/* Плотное свечение: те же контуры широким насыщенным штрихом */}
      <G opacity={0.6} fill="none" stroke="#A855F7" strokeWidth={8} strokeLinejoin="round">
        {PARTS.map((d, i) => (
          <Path key={`h${i}`} d={d} />
        ))}
      </G>

      {/* Тело: яркая градиентная заливка + светлый неоновый контур */}
      <G fill="url(#nbsBody)" stroke="#F3E8FF" strokeWidth={1.6} strokeOpacity={0.95} strokeLinejoin="round">
        {PARTS.map((d, i) => (
          <Path key={`p${i}`} d={d} />
        ))}
      </G>

      {/* Тонкие блики мышц поверх заливки */}
      <G fill="none" stroke="#F5F3FF" strokeWidth={1} strokeOpacity={0.45} strokeLinecap="round">
        {DETAILS.map((d, i) => (
          <Path key={`d${i}`} d={d} />
        ))}
      </G>

      {/* Передняя (нижняя) дуга ленты — ложится поверх живота по диагонали */}
      <G transform={RING_TRANSFORM}>
        <Path d={RING_FRONT} fill="none" stroke="#8B5CF6" strokeOpacity={0.5} strokeWidth={5.5} strokeLinecap="round" />
        <Path d={RING_FRONT} fill="none" stroke="#EDE9FE" strokeOpacity={1} strokeWidth={2} strokeLinecap="round" />
      </G>

      {/* Искры вокруг фигуры */}
      <Circle cx={16} cy={42} r={1.8} fill="#E9D5FF" opacity={0.75} />
      <Circle cx={104} cy={150} r={2.4} fill="#DDD6FE" opacity={0.65} />
      <Circle cx={11} cy={184} r={1.4} fill="#DDD6FE" opacity={0.6} />
      <Circle cx={108} cy={32} r={1.5} fill="#E9D5FF" opacity={0.65} />
      <Circle cx={14} cy={118} r={1.2} fill="#C4B5FD" opacity={0.55} />
    </Svg>
  )
}

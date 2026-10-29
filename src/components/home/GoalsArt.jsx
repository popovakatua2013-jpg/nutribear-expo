// Иллюстрация шапки «Ваши цели» (v2, точно по макету):
// компактная фиолетовая мишень с чередующимися фиолетовыми/белыми
// кольцами и розовым центром, толстая стрела с ярким оперением,
// малая корона и светло-фиолетовые листья.
// Рисуется ПОД карточками: свечение мягко уходит за верх карточки «Калории».
// GoalsArtCorner — декоративные листья и волны в левом нижнем углу панели.

import Svg, { Circle, Ellipse, G, Line, Path, Polygon } from 'react-native-svg'

export function GoalsArt({ width = 150, height = 104, style }) {
  return (
    <Svg
      width={width}
      height={height}
      viewBox="0 0 150 104"
      fill="none"
      style={style}
      pointerEvents="none"
    >
      {/* Свечение вокруг мишени */}
      <Circle cx="102" cy="54" r="44" fill="#7C5CFC" opacity="0.14" />
      <Circle cx="102" cy="54" r="36" fill="#8B6CFF" opacity="0.18" />

      {/* Листья */}
      <G opacity="0.95">
        <Path
          d="M38 86 C 30 62, 40 40, 62 32 C 60 56, 52 74, 38 86 Z"
          fill="#6D5AE6"
        />
        <Path
          d="M42 80 C 46 64, 52 50, 60 38"
          stroke="#9F8CFF"
          strokeWidth="1.4"
          strokeLinecap="round"
          opacity="0.7"
        />
        <Path
          d="M52 92 C 54 78, 64 68, 78 66 C 74 80, 64 89, 52 92 Z"
          fill="#8B6CFF"
          opacity="0.85"
        />
        <Path
          d="M56 88 C 60 79, 66 73, 73 69"
          stroke="#B9A8FF"
          strokeWidth="1.2"
          strokeLinecap="round"
          opacity="0.6"
        />
        <Path
          d="M136 78 C 142 66, 142 52, 132 44 C 128 56, 128 68, 136 78 Z"
          fill="#5B4BC4"
          opacity="0.9"
        />
      </G>

      {/* Мишень: фиолетовые и белые кольца, розовый центр */}
      <Ellipse cx="102" cy="54" rx="34" ry="27" fill="#7B62F2" />
      <Ellipse cx="102" cy="54" rx="24.5" ry="19.5" fill="#F4F1FF" />
      <Ellipse cx="102" cy="54" rx="16" ry="12.7" fill="#8B6CFF" />
      <Ellipse cx="102" cy="54" rx="9" ry="7.2" fill="#F4F1FF" />
      <Ellipse cx="102" cy="54" rx="4.6" ry="3.7" fill="#FF4FD8" />
      {/* Блик на верхнем фиолетовом кольце */}
      <Ellipse cx="92" cy="34.5" rx="9" ry="2.6" fill="#FFFFFF" opacity="0.4" />

      {/* Стрела: толстое древко из правого верхнего угла в центр */}
      <Line
        x1="144"
        y1="4"
        x2="103"
        y2="52.5"
        stroke="#F1EDFF"
        strokeWidth="3.4"
        strokeLinecap="round"
      />
      {/* Наконечник в розовом центре мишени */}
      <Polygon points="100,55 105,47 107.5,53.5" fill="#F6F3FF" />
      {/* Оперение */}
      <Path d="M128 6 L 137 2 L 140 9 L 131 13 Z" fill="#E14ECF" />
      <Path d="M135 13 L 144 9 L 147 16 L 138 20 Z" fill="#C74FE0" />

      {/* Корона над мишенью */}
      <Path
        d="M79 28 L 81 18 L 87 24 L 92 15 L 97 24 L 103 18 L 105 28 Z"
        fill="#E055D8"
        stroke="#F5A8FF"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />

      {/* Блёстки */}
      <Path
        d="M72 8 L 73.2 11 L 76 12 L 73.2 13 L 72 16 L 70.8 13 L 68 12 L 70.8 11 Z"
        fill="#FFFFFF"
        opacity="0.8"
      />
      <Circle cx="140" cy="30" r="2" fill="#FFFFFF" opacity="0.55" />
      <Circle cx="60" cy="14" r="1.6" fill="#FFFFFF" opacity="0.5" />
      <Circle cx="120" cy="88" r="1.5" fill="#FFFFFF" opacity="0.45" />
      <Circle cx="86" cy="6" r="1.3" fill="#FFFFFF" opacity="0.4" />
    </Svg>
  )
}

// Декор левого нижнего угла панели: листья и светящиеся волны (как в макете).
// Рисуется под карточками — кончики листьев выглядывают из-за «Активности».
export function GoalsArtCorner({ width = 96, height = 72, style }) {
  return (
    <Svg
      width={width}
      height={height}
      viewBox="0 0 96 72"
      fill="none"
      style={style}
      pointerEvents="none"
    >
      {/* Волны вдоль нижнего края */}
      <Path
        d="M4 57 C 22 50, 36 54, 48 64 C 56 70, 66 72, 80 71"
        stroke="#7C5CFC"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.55"
        fill="none"
      />
      <Path
        d="M4 65 C 20 59, 32 61, 44 69"
        stroke="#5B4BC4"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.45"
        fill="none"
      />
      {/* Листья */}
      <G opacity="0.95">
        <Path
          d="M8 68 C 10 46, 20 30, 40 24 C 40 46, 28 60, 8 68 Z"
          fill="#6D5AE6"
        />
        <Path
          d="M12 62 C 16 48, 24 36, 36 28"
          stroke="#9F8CFF"
          strokeWidth="1.3"
          strokeLinecap="round"
          opacity="0.6"
        />
        <Path
          d="M46 68 C 50 54, 60 44, 74 42 C 70 56, 60 65, 46 68 Z"
          fill="#8B6CFF"
          opacity="0.8"
        />
      </G>
      {/* Блёстки */}
      <Circle cx="80" cy="24" r="1.5" fill="#FFFFFF" opacity="0.5" />
      <Circle cx="64" cy="12" r="1.2" fill="#FFFFFF" opacity="0.4" />
    </Svg>
  )
}

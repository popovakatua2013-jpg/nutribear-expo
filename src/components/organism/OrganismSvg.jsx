// SVG-организм — Reanimated-порт веб-прототипа (mode="mobile").
// Никаких SMIL и feGaussianBlur: морф тела — интерполяция пути,
// свечение — радиальные градиенты, всё остальное — transform/opacity.
// Палитры и пороги flex/wet совпадают с веб-версией.

import { useId, useMemo } from 'react'
import Svg, { Circle, Ellipse, G, Line, Path } from 'react-native-svg'
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated'

const AnimPath = Animated.createAnimatedComponent(Path)
const AnimG = Animated.createAnimatedComponent(G)
const AnimCircle = Animated.createAnimatedComponent(Circle)

// Палитра состояний (bloom = лайм/бирюза, normal = изумруд, decline = серый)
const PALETTE = {
  bloom: {
    top: '#eaffbe', mid: '#4ade80', bottom: '#047857', deep: '#064e3b',
    glow: '#a3e635', accentA: '#bef264', accentB: '#2dd4bf', aura: 0.55, aurora: 0.42,
  },
  normal: {
    top: '#c9f7dc', mid: '#34d399', bottom: '#0b8f6d', deep: '#0a3d2c',
    glow: '#34d399', accentA: '#a7f3d0', accentB: '#67e8f9', aura: 0.28, aurora: 0.2,
  },
  decline: {
    top: '#eef1f3', mid: '#b2bfc5', bottom: '#78878f', deep: '#2f3b42',
    glow: '#94a3b8', accentA: '#cbd5e1', accentB: '#a5b4fc', aura: 0.1, aurora: 0.1,
  },
}

// Два совместимых контура капли — силуэт «перетекает» между ними.
// Числа разложены в массивы одинаковой длины для интерполяции в worklet.
const BLOB_A_N = [
  130, 57, 176, 56, 208, 88, 210, 130,
  212, 172, 178, 205, 130, 206,
  82, 205, 48, 172, 50, 130,
  52, 88, 84, 58, 130, 57,
]
const BLOB_B_N = [
  130, 54, 173, 54, 207, 90, 208, 131,
  209, 174, 177, 209, 130, 210,
  83, 209, 51, 174, 52, 131,
  53, 90, 87, 54, 130, 54,
]
// Чуть шире — для клипа (аврора не срезается при морфе)
const CLIP_BLOB =
  'M130 53 C180 53 213 88 215 130 C217 176 181 211 130 212 C79 211 43 176 45 130 C47 88 80 53 130 53 Z'

// Сборка пути капли из 26 чисел (worklet-совместимо)
function blobPath(v) {
  'worklet'
  return (
    `M${v[0]} ${v[1]}` +
    ` C${v[2]} ${v[3]} ${v[4]} ${v[5]} ${v[6]} ${v[7]}` +
    ` C${v[8]} ${v[9]} ${v[10]} ${v[11]} ${v[12]} ${v[13]}` +
    ` C${v[14]} ${v[15]} ${v[16]} ${v[17]} ${v[18]} ${v[19]}` +
    ` C${v[20]} ${v[21]} ${v[22]} ${v[23]} ${v[24]} ${v[25]} Z`
  )
}

// ДНК-спираль в ядре (7 пар точек)
const HELIX = Array.from({ length: 7 }, (_, i) => {
  const y = 150 + i * 5.6
  const s = Math.sin(i * 0.9)
  return { y, x1: 130 + 8.5 * s, x2: 130 - 8.5 * s }
})

function sparkPath(x, y, s) {
  const k = 0.32 * s
  return `M${x} ${y - s} L${x + k} ${y - k} L${x + s} ${y} L${x + k} ${y + k} L${x} ${y + s} L${x - k} ${y + k} L${x - s} ${y} L${x - k} ${y - k} Z`
}

const IN_OUT = Easing.inOut(Easing.ease)
// Поворот/масштаб вокруг точки: сэндвич из переносов (для transform-массивов RN).
// Вызывается внутри worklet'ов — обязательно с директивой 'worklet'.
const around = (x, y, rest) => {
  'worklet'
  return [
    { translateX: x }, { translateY: y }, ...rest, { translateX: -x }, { translateY: -y },
  ]
}

export function OrganismSvg({ state = 'normal', hydration = 0, protein = 0, size = 260 }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const p = PALETTE[state] || PALETTE.normal
  const happy = state === 'bloom'
  const decline = state === 'decline'
  const flex = protein >= 70 && !decline
  const wet = hydration >= 60 && !decline

  const eyeFill = decline ? '#31424b' : '#0e241b'
  const handY = decline ? 162 : 150

  /* ── Анимации (запускаются один раз при монтировании) ── */

  // 1) Морф капли: интерполяция 26 чисел пути (аналог SMIL values A;B;A)
  const morph = useSharedValue(0)
  morph.value = withRepeat(withTiming(1, { duration: 3500, easing: IN_OUT }), -1, true)
  const animBody = useAnimatedProps(() => {
    const t = morph.value
    const v = BLOB_A_N.map((a, i) => a + (BLOB_B_N[i] - a) * t)
    return { d: blobPath(v) }
  })

  // 2) Дыхание объёмом: scale(1.017, 0.99) вокруг (130, 204)
  const breathe = useSharedValue(0)
  breathe.value = withRepeat(withTiming(1, { duration: 2400, easing: IN_OUT }), -1, true)
  const animBreathe = useAnimatedProps(() => ({
    transform: around(130, 204, [
      { scaleX: 1 + 0.017 * breathe.value },
      { scaleY: 1 - 0.01 * breathe.value },
    ]),
  }))

  // 3) Качание усиков: rotate ±2.6° вокруг (130, 66)
  const sway = useSharedValue(0)
  sway.value = withRepeat(withTiming(1, { duration: 1700, easing: IN_OUT }), -1, true)
  const animSway = useAnimatedProps(() => ({
    transform: around(130, 66, [{ rotate: `${-2.6 + 5.2 * sway.value}deg` }]),
  }))

  // 4) Лапки покачиваются в противофазе: translateY ±2.5
  const bobL = useSharedValue(0)
  bobL.value = withRepeat(withTiming(1, { duration: 1350, easing: IN_OUT }), -1, true)
  const bobR = useSharedValue(1) // старт со сдвигом фазы
  bobR.value = withRepeat(withTiming(0, { duration: 1350, easing: IN_OUT }), -1, true)
  const animBobL = useAnimatedProps(() => ({ transform: [{ translateY: -2.5 + 5 * bobL.value }] }))
  const animBobR = useAnimatedProps(() => ({ transform: [{ translateY: -2.5 + 5 * bobR.value }] }))

  // 5) Моргание (только в «Норме»): раз в ~4.6 с
  const blink = useSharedValue(0)
  blink.value = withRepeat(
    withSequence(
      withTiming(0, { duration: 4300 }),
      withTiming(1, { duration: 150, easing: IN_OUT }),
      withTiming(0, { duration: 150, easing: IN_OUT })
    ),
    -1
  )
  const animEyeL = useAnimatedProps(() => ({
    transform: around(106, 102, [{ scaleY: 1 - 0.94 * blink.value }]),
  }))
  const animEyeR = useAnimatedProps(() => ({
    transform: around(154, 102, [{ scaleY: 1 - 0.94 * blink.value }]),
  }))

  // 6) Орбитальные частицы: параметрические cx/cy (наклонённый сплюснутый эллипс)
  const orb1 = useSharedValue(0)
  orb1.value = withRepeat(withTiming(1, { duration: 9000, easing: Easing.linear }), -1, false)
  const animOrb1 = useAnimatedProps(() => {
    const th = orb1.value * 2 * Math.PI
    const x0 = 100 * Math.cos(th)
    const y0 = 100 * Math.sin(th) * 0.24
    const phi = (-12 * Math.PI) / 180
    return {
      cx: 130 + x0 * Math.cos(phi) - y0 * Math.sin(phi),
      cy: 126 + x0 * Math.sin(phi) + y0 * Math.cos(phi),
    }
  })
  const orb2 = useSharedValue(1) // вторая частица летит в обратную сторону
  orb2.value = withRepeat(withTiming(0, { duration: 13000, easing: Easing.linear }), -1, false)
  const animOrb2 = useAnimatedProps(() => {
    const th = orb2.value * 2 * Math.PI
    const x0 = 104 * Math.cos(th)
    const y0 = 104 * Math.sin(th) * 0.26
    const phi = (14 * Math.PI) / 180
    return {
      cx: 130 + x0 * Math.cos(phi) - y0 * Math.sin(phi),
      cy: 134 + x0 * Math.sin(phi) + y0 * Math.cos(phi),
    }
  })

  // 7) Электрон вокруг ДНК-ядра
  const eline = useSharedValue(0)
  eline.value = withRepeat(withTiming(1, { duration: 3800, easing: Easing.linear }), -1, false)
  const animEline = useAnimatedProps(() => {
    const th = eline.value * 2 * Math.PI
    return { cx: 130 + 14 * Math.cos(th), cy: 166 + 7 * Math.sin(th) }
  })

  // 8) Мягкая пульсация свечения: opacity 0.72…1 (аура + аврора)
  const soft = useSharedValue(0)
  soft.value = withRepeat(withTiming(1, { duration: 2100, easing: IN_OUT }), -1, true)
  const animSoft = useAnimatedProps(() => ({ opacity: 0.72 + 0.28 * soft.value }))

  // 9) Пульс ДНК-ядра: r и opacity
  const core = useSharedValue(0)
  core.value = withRepeat(withTiming(1, { duration: 1400, easing: IN_OUT }), -1, true)
  const animCore = useAnimatedProps(() => ({
    r: 27 + 3.5 * core.value,
    opacity: 0.75 + 0.25 * core.value,
  }))

  // 10) Искры «Расцвета»: мерцание с разными фазами
  const tw1 = useTwinkle(0)
  const tw2 = useTwinkle(600)
  const tw3 = useTwinkle(1300)
  const tw4 = useTwinkle(2000)

  const gid = useMemo(
    () => ({
      body: `${uid}body`, aura: `${uid}aura`, core: `${uid}core`, disc: `${uid}disc`,
      hand: `${uid}hand`, glass: `${uid}glass`, ground: `${uid}ground`, drop: `${uid}drop`,
      blush: `${uid}blush`, aurM: `${uid}aurM`, aurM2: `${uid}aurM2`,
      rim: `${uid}rim`, clip: `${uid}clip`, mouth: `${uid}mouth`,
    }),
    [uid]
  )

  return (
    <Svg viewBox="0 0 260 260" width={size} height={size}>
      <defs>
        <radialGradient id={gid.body} cx="0.36" cy="0.26" r="1">
          <stop offset="0%" stopColor={p.top} />
          <stop offset="52%" stopColor={p.mid} />
          <stop offset="100%" stopColor={p.bottom} />
        </radialGradient>
        <radialGradient id={gid.aura} cx="0.5" cy="0.5" r="0.5">
          <stop offset="58%" stopColor={p.glow} stopOpacity="0" />
          <stop offset="84%" stopColor={p.glow} stopOpacity="0.32" />
          <stop offset="100%" stopColor={p.glow} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={gid.core} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#f7fee7" stopOpacity="0.9" />
          <stop offset="55%" stopColor={p.glow} stopOpacity="0.5" />
          <stop offset="100%" stopColor={p.glow} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={gid.disc} cx="0.4" cy="0.32" r="0.9">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.03" />
        </radialGradient>
        <radialGradient id={gid.hand} cx="0.36" cy="0.28" r="1">
          <stop offset="0%" stopColor={p.top} />
          <stop offset="100%" stopColor={p.bottom} />
        </radialGradient>
        <radialGradient id={gid.glass} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={gid.ground} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#000000" stopOpacity="0.36" />
          <stop offset="65%" stopColor="#000000" stopOpacity="0.14" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={gid.drop} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0%" stopColor="#e0f2fe" />
          <stop offset="100%" stopColor="#7dd3fc" />
        </linearGradient>
        <radialGradient id={gid.blush} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#fb7185" stopOpacity="0.55" />
          <stop offset="55%" stopColor="#fb7185" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#fb7185" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={gid.aurM} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor={p.accentA} stopOpacity="0.5" />
          <stop offset="60%" stopColor={p.accentA} stopOpacity="0.22" />
          <stop offset="100%" stopColor={p.accentA} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={gid.aurM2} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor={p.accentB} stopOpacity="0.45" />
          <stop offset="100%" stopColor={p.accentB} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={gid.rim} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor={p.glow} stopOpacity="0.45" />
          <stop offset="100%" stopColor={p.glow} stopOpacity="0" />
        </radialGradient>
        <clipPath id={gid.clip}>
          <Path d={CLIP_BLOB} />
        </clipPath>
        <clipPath id={gid.mouth}>
          <Path d="M113 133 Q130 162 147 133 Q130 145 113 133 Z" />
        </clipPath>
      </defs>

      {/* мягкая тень на «полу» */}
      <Ellipse cx="130" cy="238" rx="74" ry="12" fill={`url(#${gid.ground})`} opacity={decline ? 0.75 : 1} />

      {/* аура (сильнее всего в «Расцвете») */}
      {p.aura > 0.12 && (
        <G opacity={p.aura}>
          <AnimCircle cx="130" cy="130" r="114" fill={`url(#${gid.aura})`} animatedProps={animSoft} />
        </G>
      )}

      {/* орбитальные кольца + частицы (частицы летят по параметрике) */}
      <G>
        <G transform="rotate(-12 130 126) translate(0 126) scale(1 0.24) translate(0 -126)">
          <Circle cx="130" cy="126" r="100" fill="none" stroke="#ffffff" strokeWidth="1.1" opacity={happy ? 0.3 : 0.13} />
        </G>
        <G transform="rotate(14 130 134) translate(0 134) scale(1 0.26) translate(0 -134)">
          <Circle cx="130" cy="134" r="104" fill="none" stroke="#ffffff" strokeWidth="1.1" opacity={happy ? 0.22 : 0.09} />
        </G>
        <AnimCircle cx="230" cy="126" r="2.6" fill={p.glow} animatedProps={animOrb1} />
        <AnimCircle cx="234" cy="134" r="2.2" fill={p.accentB} animatedProps={animOrb2} />
      </G>

      {/* усики-сенсоры: стебли + светящиеся кончики */}
      <AnimG animatedProps={animSway} fill="none" strokeLinecap="round">
        <Path d="M112 64 C106 44 97 37 90 28" stroke={p.mid} strokeWidth="3.2" />
        <Path d="M148 64 C154 44 163 37 170 28" stroke={p.mid} strokeWidth="3.2" />
      </AnimG>
      <AnimG animatedProps={animSway}>
        <Circle cx="90" cy="27" r="10" fill={p.glow} opacity={wet ? 0.42 : 0.16} />
        <Circle cx="90" cy="27" r="4.6" fill={p.glow} />
        <Circle cx="88.6" cy="25.4" r="1.4" fill="#ffffff" opacity="0.85" />
        <Circle cx="170" cy="27" r="10" fill={p.glow} opacity={wet ? 0.42 : 0.16} />
        <Circle cx="170" cy="27" r="4.6" fill={p.glow} />
        <Circle cx="168.6" cy="25.4" r="1.4" fill="#ffffff" opacity="0.85" />
      </AnimG>

      {/* тело: сдвиг в «Упадке» + дыхание + морф */}
      <G transform={decline ? 'translate(0 7) rotate(-1.6 130 130)' : undefined}>
        <AnimG animatedProps={animBreathe}>
          <AnimPath d={blobPath(BLOB_A_N)} fill={`url(#${gid.body})`} animatedProps={animBody} />

          {/* внутренние слои, обрезанные по контуру тела */}
          <G clipPath={`url(#${gid.clip})`}>
            {/* аврора: градиенты + мягкая пульсация */}
            <G opacity={p.aurora}>
              <AnimG animatedProps={animSoft}>
                <Ellipse cx="130" cy="148" rx="96" ry="72" fill={`url(#${gid.aurM})`} />
                <Ellipse cx="152" cy="92" rx="74" ry="52" fill={`url(#${gid.aurM2})`} />
              </AnimG>
            </G>

            {/* нижний рефлекс */}
            <Ellipse cx="130" cy="198" rx="62" ry="18" fill={`url(#${gid.rim})`} opacity={happy ? 1 : 0.7} />

            {/* стеклянный блик */}
            <Ellipse
              cx="104" cy="84" rx="44" ry="22"
              fill={`url(#${gid.glass})`} opacity="0.75"
              transform="rotate(-16 104 84)"
            />

            {/* капли влаги при гидратации ≥ 60 */}
            {wet && (
              <G fill="#ffffff" opacity="0.4">
                <Circle cx="97" cy="70" r="2.4" />
                <Circle cx="162" cy="65" r="1.9" />
              </G>
            )}
          </G>

          {/* ДНК-ядро: свечение, стеклянный диск, двойная спираль, электрон */}
          <AnimCircle cx="130" cy="166" fill={`url(#${gid.core})`} animatedProps={animCore} />
          <Circle cx="130" cy="166" r="19" fill={`url(#${gid.disc})`} stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
          <G>
            {HELIX.map((q, i) => (
              <G key={i}>
                {i % 2 === 0 && (
                  <Line x1={q.x1} y1={q.y} x2={q.x2} y2={q.y} stroke="#ffffff" strokeOpacity="0.45" strokeWidth="1" />
                )}
                <Circle cx={q.x1} cy={q.y} r="1.9" fill="#ffffff" opacity="0.95" />
                <Circle cx={q.x2} cy={q.y} r="1.9" fill={p.glow} opacity="0.95" />
              </G>
            ))}
            <AnimCircle cx="144" cy="166" r="2.5" fill="#ffffff" opacity="0.9" animatedProps={animEline} />
          </G>

          {/* глаза: прищур в «Расцвете», полу-веки в «Упадке», моргание в «Норме» */}
          {happy ? (
            <G stroke={eyeFill} strokeWidth="5" fill="none" strokeLinecap="round">
              <Path d="M96 107 Q106 96 117 107" />
              <Path d="M143 107 Q153 96 164 107" />
            </G>
          ) : decline ? (
            <G>
              <Ellipse cx="106" cy="108" rx="8" ry="7" fill={eyeFill} />
              <Path d="M97 103.5 H115" stroke={eyeFill} strokeWidth="2.6" strokeLinecap="round" />
              <Circle cx="103.4" cy="108" r="1.9" fill="#ffffff" opacity="0.55" />
              <Ellipse cx="154" cy="108" rx="8" ry="7" fill={eyeFill} />
              <Path d="M145 103.5 H163" stroke={eyeFill} strokeWidth="2.6" strokeLinecap="round" />
              <Circle cx="151.4" cy="108" r="1.9" fill="#ffffff" opacity="0.55" />
            </G>
          ) : (
            <G>
              <AnimG animatedProps={animEyeL}>
                <Ellipse cx="106" cy="102" rx="8.4" ry="11.4" fill={eyeFill} />
                <Circle cx="103.2" cy="97.8" r="2.7" fill="#ffffff" opacity="0.95" />
                <Circle cx="108.8" cy="106.6" r="1.3" fill="#ffffff" opacity="0.5" />
              </AnimG>
              <AnimG animatedProps={animEyeR}>
                <Ellipse cx="154" cy="102" rx="8.4" ry="11.4" fill={eyeFill} />
                <Circle cx="151.2" cy="97.8" r="2.7" fill="#ffffff" opacity="0.95" />
                <Circle cx="156.8" cy="106.6" r="1.3" fill="#ffffff" opacity="0.5" />
              </AnimG>
            </G>
          )}

          {/* румянец */}
          {!decline && (
            <G opacity={happy ? 0.85 : 0.5}>
              <Ellipse cx="88" cy="121" rx="11" ry="6.5" fill={`url(#${gid.blush})`} />
              <Ellipse cx="172" cy="121" rx="11" ry="6.5" fill={`url(#${gid.blush})`} />
            </G>
          )}

          {/* рот */}
          {decline ? (
            <Path d="M118 149 Q130 140 142 149" stroke={p.deep} strokeWidth="4.5" fill="none" strokeLinecap="round" />
          ) : happy ? (
            <G>
              <Path d="M113 133 Q130 162 147 133 Q130 145 113 133 Z" fill={p.deep} />
              <Ellipse cx="130" cy="147" rx="8" ry="3.6" fill="#fb7185" opacity="0.85" clipPath={`url(#${gid.mouth})`} />
            </G>
          ) : (
            <Path d="M118 139 Q130 149 142 139" stroke={p.deep} strokeWidth="4.5" fill="none" strokeLinecap="round" />
          )}

          {/* капля усталости */}
          {decline && (
            <G>
              <Path
                d="M188 84 C188 84 195 93 195 98.5 A7 7 0 1 1 181 98.5 C181 93 188 84 188 84 Z"
                fill={`url(#${gid.drop})`}
              />
              <Circle cx="185.5" cy="96" r="1.8" fill="#ffffff" opacity="0.8" />
            </G>
          )}
        </AnimG>
      </G>

      {/* лапки: при белке ≥ 70 — поза силы, иначе висят */}
      {flex ? (
        <G>
          <AnimG animatedProps={animBobL}>
            <Ellipse cx="46" cy="118" rx="12.5" ry="10.5" fill={`url(#${gid.hand})`} transform="rotate(-24 46 118)" />
            <Circle cx="42" cy="100" r="7" fill={`url(#${gid.hand})`} />
          </AnimG>
          <AnimG animatedProps={animBobR}>
            <Ellipse cx="214" cy="118" rx="12.5" ry="10.5" fill={`url(#${gid.hand})`} transform="rotate(24 214 118)" />
            <Circle cx="218" cy="100" r="7" fill={`url(#${gid.hand})`} />
          </AnimG>
        </G>
      ) : (
        <G>
          <AnimG animatedProps={animBobL}>
            <Ellipse
              cx="47" cy={handY} rx="10.5" ry="13.5"
              fill={`url(#${gid.hand})`}
              transform={`rotate(${decline ? 18 : -16} 47 ${handY})`}
            />
          </AnimG>
          <AnimG animatedProps={animBobR}>
            <Ellipse
              cx="213" cy={handY} rx="10.5" ry="13.5"
              fill={`url(#${gid.hand})`}
              transform={`rotate(${decline ? -18 : 16} 213 ${handY})`}
            />
          </AnimG>
        </G>
      )}

      {/* искры «Расцвета» */}
      {happy && (
        <G fill="#fef9c3">
          <AnimPath d={sparkPath(46, 78, 8)} animatedProps={tw1} />
          <AnimPath d={sparkPath(214, 60, 6.5)} animatedProps={tw2} />
          <AnimPath d={sparkPath(130, 34, 5)} animatedProps={tw3} />
          <AnimPath d={sparkPath(206, 190, 6)} animatedProps={tw4} />
        </G>
      )}
    </Svg>
  )
}

// Мерцающая искра: opacity 0.15…1 с фазовой задержкой
function useTwinkle(delayMs) {
  const sv = useSharedValue(0)
  sv.value = withDelay(
    delayMs,
    withRepeat(withTiming(1, { duration: 1050, easing: IN_OUT }), -1, true)
  )
  return useAnimatedProps(() => ({ opacity: 0.15 + 0.85 * sv.value }))
}

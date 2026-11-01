// Живой организм — порт веб-прототипа (src/components/organism/organism-svg.tsx,
// web-режим) на react-native-svg + нативный Animated.
// Почему без Reanimated: createAnimatedComponent + useAnimatedProps на SVG
// (Path/G/Circle) на новой архитектуре (RN 0.88 + Reanimated 4) роняет
// приложение целиком — нативный краш без красного экрана. Поэтому «жизнь»
// дают нативные Animated-обёртки (только transform/opacity — native driver),
// морф контура — кроссфейд двух почти одинаковых капель, моргание — редкий
// JS-таймер. Тайминги, палитры, геометрия и порядок слоёв — 1:1 из макета
// (globals.css: org-breathe 4.8s, org-sway 3.4s, org-bob 2.7s, org-core 2.8s,
// org-soft 4.2s, org-twinkle 2.1s, org-blink 4.6s, морф 7s, орбиты 9s/13s/3.8s).

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Animated, Easing, StyleSheet, View } from 'react-native'
import Svg, {
  Circle,
  ClipPath,
  Defs,
  Ellipse,
  G,
  Line,
  LinearGradient,
  Path,
  RadialGradient,
  Stop,
} from 'react-native-svg'

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

// Два совместимых контура капли — силуэт медленно «перетекает» между ними
// (в макете это морф d на 7s; без Reanimated — кроссфейд той же длительности)
const BLOB_A =
  'M130 57 C176 56 208 88 210 130 C212 172 178 205 130 206 C82 205 48 172 50 130 C52 88 84 58 130 57 Z'
const BLOB_B =
  'M130 54 C173 54 207 90 208 131 C209 174 177 209 130 210 C83 209 51 174 52 131 C53 90 87 54 130 54 Z'
// Чуть шире — для клипа (аврора не срезается контуром тела)
const CLIP_BLOB =
  'M130 53 C180 53 213 88 215 130 C217 176 181 211 130 212 C79 211 43 176 45 130 C47 88 80 53 130 53 Z'

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

// Константа easing вне компонента — стабильная ссылка для deps эффектов
const EASE_IO = Easing.inOut(Easing.ease)

// Симметричный слой (absolute fill) под конкретный SVG-слой
function Layer({ size, children }) {
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, width: size, height: size }}>
      <Svg viewBox="0 0 260 260" width={size} height={size}>
        {children}
      </Svg>
    </View>
  )
}

// Плавный бесконечный yoyo-цикл 0 ↔ 1
function useYoyo(duration, { delay = 0, easing = EASE_IO } = {}) {
  const v = useRef(new Animated.Value(0)).current
  useEffect(() => {
    const anim = Animated.sequence([
      Animated.delay(delay),
      Animated.loop(
        Animated.sequence([
          Animated.timing(v, { toValue: 1, duration, easing, useNativeDriver: true }),
          Animated.timing(v, { toValue: 0, duration, easing, useNativeDriver: true }),
        ])
      ),
    ])
    anim.start()
    return () => anim.stop()
  }, [v, duration, delay, easing])
  return v
}

// Орбитальная частица: точка летит по эллипсу (октагональная интерполяция —
// для крошечной точки выглядит как плавный круг) вокруг центра (cx, cy)
function OrbitDot({ size, rx, ry, cx, cy, duration, delay = 0, reverse = false, color, dot = 6, opacity = 1, tilt = 0 }) {
  const v = useRef(new Animated.Value(0)).current
  useEffect(() => {
    const anim = Animated.sequence([
      Animated.delay(delay),
      Animated.loop(
        Animated.timing(v, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: true })
      ),
    ])
    anim.start()
    return () => anim.stop()
  }, [v, duration, delay])

  const K = [0, 1 / 8, 2 / 8, 3 / 8, 4 / 8, 5 / 8, 6 / 8, 7 / 8, 1]
  const q = 0.7071
  const fx = [0, q, 1, q, 0, -q, -1, -q, 0]
  const fy = [-1, -q, 0, q, 1, q, 0, -q, -1]
  const gx = (reverse ? [...fx].reverse() : fx).map((s) => s * rx)
  const gy = (reverse ? [...fy].reverse() : fy).map((s) => s * ry)

  const tx = v.interpolate({ inputRange: K, outputRange: gx })
  const ty = v.interpolate({ inputRange: K, outputRange: gy })

  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', top: 0, left: 0, width: size, height: size, opacity, transform: tilt ? [{ rotate: `${tilt}deg` }] : undefined }}
    >
      <Animated.View
        style={{
          position: 'absolute',
          left: cx - dot / 2,
          top: cy - dot / 2,
          width: dot,
          height: dot,
          borderRadius: dot / 2,
          backgroundColor: color,
          transform: [{ translateX: tx }, { translateY: ty }],
        }}
      />
    </View>
  )
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
  // Масштаб SVG-координат в px слоя (для transform-origin «песочниц»)
  const s = size / 260

  /* ── Нативные анимации — тайминги 1:1 из CSS макета ── */

  // Дыхание объёмом: scale(1.017, 0.99) вокруг (130, 204), цикл 4.8 c
  const breathe = useYoyo(2400)
  const breatheScaleX = breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.017] })
  const breatheScaleY = breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 0.99] })

  // Морф контура: кроссфейд BLOB_A ↔ BLOB_B, цикл 7 c (в макете — animate d)
  const morph = useYoyo(3500)
  const morphB = morph.interpolate({ inputRange: [0, 1], outputRange: [0, 1] })

  // Качание усиков: rotate ±2.6° вокруг (130, 66), 3.4 c
  const sway = useYoyo(3400)
  const swayDeg = sway.interpolate({ inputRange: [0, 1], outputRange: ['-2.6deg', '2.6deg'] })

  // Лапки в противофазе: ±2.5px, 2.7 c (org-bob-r с задержкой -1.35 c)
  const bobL = useYoyo(2700)
  const bobR = useYoyo(2700, { delay: 1350 })
  const bobTyL = bobL.interpolate({ inputRange: [0, 1], outputRange: [-2.5, 2.5] })
  const bobTyR = bobR.interpolate({ inputRange: [0, 1], outputRange: [-2.5, 2.5] })

  // Мягкая пульсация свечения (аура + аврора): 0.72 → 1, цикл 4.2 c
  const soft = useYoyo(2100)
  const softOpacity = soft.interpolate({ inputRange: [0, 1], outputRange: [0.72, 1] })

  // Пульс ДНК-ядра: scale 1 → 1.14, opacity 0.75 → 1, цикл 2.8 c (org-core)
  const corePulse = useYoyo(1400)
  const coreScale = corePulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.14] })
  const coreOpacity = corePulse.interpolate({ inputRange: [0, 1], outputRange: [0.75, 1] })

  // Искры «Расцвета»: мерцание 2.1 c с фазами как в макете (0 / 0.6 / 1.1 / 1.6 / 2 c)
  const tw1 = useYoyo(1050)
  const tw2 = useYoyo(1050, { delay: 600 })
  const tw3 = useYoyo(1050, { delay: 1100 })
  const tw4 = useYoyo(1050, { delay: 1600 })

  // Моргание (только в «Норме»): раз в ~4,6 c, веки на 150 мс (org-blink 4.6s)
  const [blink, setBlink] = useState(false)
  useEffect(() => {
    if (decline || happy) return undefined
    let alive = true
    let t1 = null
    let t2 = null
    const schedule = () => {
      t1 = setTimeout(() => {
        if (!alive) return
        setBlink(true)
        t2 = setTimeout(() => {
          if (!alive) return
          setBlink(false)
          schedule()
        }, 150)
      }, 4000 + Math.random() * 1200)
    }
    schedule()
    return () => {
      alive = false
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [decline, happy])

  const gid = useMemo(
    () => ({
      body: `${uid}body`, aura: `${uid}aura`, core: `${uid}core`, disc: `${uid}disc`,
      hand: `${uid}hand`, glass: `${uid}glass`, ground: `${uid}ground`, drop: `${uid}drop`,
      blush: `${uid}blush`, aurM: `${uid}aurM`, aurM2: `${uid}aurM2`,
      rim: `${uid}rim`, clip: `${uid}clip`, mouth: `${uid}mouth`,
    }),
    [uid]
  )

  const gradDefs = (
    <Defs>
      <RadialGradient id={gid.body} cx="0.36" cy="0.26" r="1">
        <Stop offset="0%" stopColor={p.top} />
        <Stop offset="52%" stopColor={p.mid} />
        <Stop offset="100%" stopColor={p.bottom} />
      </RadialGradient>
      <RadialGradient id={gid.aura} cx="0.5" cy="0.5" r="0.5">
        <Stop offset="58%" stopColor={p.glow} stopOpacity="0" />
        <Stop offset="84%" stopColor={p.glow} stopOpacity="0.32" />
        <Stop offset="100%" stopColor={p.glow} stopOpacity="0" />
      </RadialGradient>
      <RadialGradient id={gid.core} cx="0.5" cy="0.5" r="0.5">
        <Stop offset="0%" stopColor="#f7fee7" stopOpacity="0.9" />
        <Stop offset="55%" stopColor={p.glow} stopOpacity="0.5" />
        <Stop offset="100%" stopColor={p.glow} stopOpacity="0" />
      </RadialGradient>
      <RadialGradient id={gid.disc} cx="0.4" cy="0.32" r="0.9">
        <Stop offset="0%" stopColor="#ffffff" stopOpacity="0.22" />
        <Stop offset="100%" stopColor="#ffffff" stopOpacity="0.03" />
      </RadialGradient>
      <RadialGradient id={gid.hand} cx="0.36" cy="0.28" r="1">
        <Stop offset="0%" stopColor={p.top} />
        <Stop offset="100%" stopColor={p.bottom} />
      </RadialGradient>
      <RadialGradient id={gid.glass} cx="0.5" cy="0.5" r="0.5">
        <Stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
        <Stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
      </RadialGradient>
      <RadialGradient id={gid.ground} cx="0.5" cy="0.5" r="0.5">
        <Stop offset="0%" stopColor="#000000" stopOpacity="0.36" />
        <Stop offset="65%" stopColor="#000000" stopOpacity="0.14" />
        <Stop offset="100%" stopColor="#000000" stopOpacity="0" />
      </RadialGradient>
      <LinearGradient id={gid.drop} x1="0" y1="0" x2="0.4" y2="1">
        <Stop offset="0%" stopColor="#e0f2fe" />
        <Stop offset="100%" stopColor="#7dd3fc" />
      </LinearGradient>
      <RadialGradient id={gid.blush} cx="0.5" cy="0.5" r="0.5">
        <Stop offset="0%" stopColor="#fb7185" stopOpacity="0.55" />
        <Stop offset="55%" stopColor="#fb7185" stopOpacity="0.28" />
        <Stop offset="100%" stopColor="#fb7185" stopOpacity="0" />
      </RadialGradient>
      <RadialGradient id={gid.rim} cx="0.5" cy="0.5" r="0.5">
        <Stop offset="0%" stopColor={p.glow} stopOpacity="0.45" />
        <Stop offset="100%" stopColor={p.glow} stopOpacity="0" />
      </RadialGradient>
      <ClipPath id={gid.clip}>
        <Path d={CLIP_BLOB} />
      </ClipPath>
      <ClipPath id={gid.mouth}>
        <Path d="M113 133 Q130 162 147 133 Q130 145 113 133 Z" />
      </ClipPath>
    </Defs>
  )

  return (
    <View style={{ width: size, height: size }}>
      {/* ── Слой 1: тень на «полу» + орбитальные кольца (статика) ── */}
      <Layer size={size}>
        {gradDefs}
        <Ellipse cx="130" cy="238" rx="74" ry="12" fill={`url(#${gid.ground})`} opacity={decline ? 0.75 : 1} />
        <G transform="rotate(-12 130 126) translate(0 126) scale(1 0.24) translate(0 -126)">
          <Circle cx="130" cy="126" r="100" fill="none" stroke="#ffffff" strokeWidth="1.1" opacity={happy ? 0.3 : 0.13} />
        </G>
        <G transform="rotate(14 130 134) translate(0 134) scale(1 0.26) translate(0 -134)">
          <Circle cx="130" cy="134" r="104" fill="none" stroke="#ffffff" strokeWidth="1.1" opacity={happy ? 0.22 : 0.09} />
        </G>
      </Layer>

      {/* ── Слой 2: пульсирующая аура (bloom/normal) ── */}
      {p.aura > 0.12 && (
        <Animated.View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, width: size, height: size, opacity: softOpacity }}>
          <Svg viewBox="0 0 260 260" width={size} height={size}>
            <RadialGradient id={gid.aura} cx="0.5" cy="0.5" r="0.5">
              <Stop offset="58%" stopColor={p.glow} stopOpacity="0" />
              <Stop offset="84%" stopColor={p.glow} stopOpacity="0.32" />
              <Stop offset="100%" stopColor={p.glow} stopOpacity="0" />
            </RadialGradient>
            <Circle cx="130" cy="130" r="114" fill={`url(#${gid.aura})`} opacity={p.aura} />
          </Svg>
        </Animated.View>
      )}

      {/* ── Слой 3: орбитальные частицы — ЗА телом, как в макете ── */}
      <OrbitDot size={size} rx={100} ry={24} cx={130} cy={126} duration={9000} tilt={-12} color={p.glow} dot={5.2} />
      <OrbitDot size={size} rx={100} ry={24} cx={130} cy={126} duration={9000} delay={4500} tilt={-12} color="#ffffff" dot={4} opacity={0.9} />
      <OrbitDot size={size} rx={104} ry={27} cx={130} cy={134} duration={13000} delay={6000} reverse tilt={14} color={p.accentB} dot={4.4} />

      {/* ── Слой 4: усики-сенсоры с качанием вокруг (130, 66) — за телом ── */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: size,
          height: size,
          transform: [{ translateY: -66 * s }, { rotate: swayDeg }, { translateY: 66 * s }],
        }}
      >
        <Svg viewBox="0 0 260 260" width={size} height={size}>
          <G fill="none" strokeLinecap="round">
            <Path d="M112 64 C106 44 97 37 90 28" stroke={p.mid} strokeWidth="3.2" />
            <Path d="M148 64 C154 44 163 37 170 28" stroke={p.mid} strokeWidth="3.2" />
          </G>
          <Circle cx="90" cy="27" r="10" fill={p.glow} opacity={wet ? 0.42 : 0.16} />
          <Circle cx="90" cy="27" r="4.6" fill={p.glow} />
          <Circle cx="88.6" cy="25.4" r="1.4" fill="#ffffff" opacity="0.85" />
          <Circle cx="170" cy="27" r="10" fill={p.glow} opacity={wet ? 0.42 : 0.16} />
          <Circle cx="170" cy="27" r="4.6" fill={p.glow} />
          <Circle cx="168.6" cy="25.4" r="1.4" fill="#ffffff" opacity="0.85" />
        </Svg>
      </Animated.View>

      {/* ── Слой 5: тело с дыханием + морф-кроссфейд контура ── */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: size,
          height: size,
          transform: [
            { translateY: 204 * s },
            { scaleX: breatheScaleX },
            { scaleY: breatheScaleY },
            { translateY: -204 * s },
          ],
        }}
      >
        <Svg viewBox="0 0 260 260" width={size} height={size}>
          {gradDefs}
          <G transform={decline ? 'translate(0 7) rotate(-1.6 130 130)' : undefined}>
            <Path d={BLOB_A} fill={`url(#${gid.body})`} />
          </G>
        </Svg>
        {/* морф-кроссфейд: вторая капля проявляется поверх (вместо animate d) */}
        <Animated.View
          pointerEvents="none"
          style={{ ...StyleSheet.absoluteFillObject, opacity: morphB }}
        >
          <Svg viewBox="0 0 260 260" width={size} height={size}>
            {gradDefs}
            <G transform={decline ? 'translate(0 7) rotate(-1.6 130 130)' : undefined}>
              <Path d={BLOB_B} fill={`url(#${gid.body})`} />
            </G>
          </Svg>
        </Animated.View>
        {/* аврора: пульс вместо вращения (мобильный режим макета) */}
        <Animated.View
          pointerEvents="none"
          style={{ ...StyleSheet.absoluteFillObject, opacity: softOpacity }}
        >
          <Svg viewBox="0 0 260 260" width={size} height={size}>
            <RadialGradient id={gid.aurM} cx="0.5" cy="0.5" r="0.5">
              <Stop offset="0%" stopColor={p.accentA} stopOpacity="0.5" />
              <Stop offset="55%" stopColor={p.accentA} stopOpacity="0.24" />
              <Stop offset="100%" stopColor={p.accentA} stopOpacity="0" />
            </RadialGradient>
            <RadialGradient id={gid.aurM2} cx="0.5" cy="0.5" r="0.5">
              <Stop offset="0%" stopColor={p.accentB} stopOpacity="0.45" />
              <Stop offset="100%" stopColor={p.accentB} stopOpacity="0" />
            </RadialGradient>
            <G clipPath={`url(#${gid.clip})`} opacity={p.aurora}>
              <Ellipse cx="128" cy="150" rx="94" ry="64" fill={`url(#${gid.aurM})`} />
              <Ellipse cx="154" cy="94" rx="76" ry="52" fill={`url(#${gid.aurM2})`} />
            </G>
          </Svg>
        </Animated.View>
      </Animated.View>

      {/* ── Слой 6: внутренние рефлексы (клип по телу) ── */}
      <Layer size={size}>
        {gradDefs}
        <G clipPath={`url(#${gid.clip})`}>
          {/* нижний рефлекс */}
          <Ellipse cx="130" cy="198" rx="62" ry="18" fill={`url(#${gid.rim})`} opacity={happy ? 1 : 0.7} />
          {/* стеклянный блик */}
          <Ellipse
            cx="104" cy="84" rx="46" ry="24"
            fill={`url(#${gid.glass})`} opacity="0.85"
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
      </Layer>

      {/* ── Слой 7: свечение ДНК-ядра с пульсом (org-core) ── */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: size,
          height: size,
          opacity: coreOpacity,
          transform: [
            { translateY: 166 * s },
            { scale: coreScale },
            { translateY: -166 * s },
          ],
        }}
      >
        <Svg viewBox="0 0 260 260" width={size} height={size}>
          <RadialGradient id={gid.core} cx="0.5" cy="0.5" r="0.5">
            <Stop offset="0%" stopColor="#f7fee7" stopOpacity="0.9" />
            <Stop offset="55%" stopColor={p.glow} stopOpacity="0.5" />
            <Stop offset="100%" stopColor={p.glow} stopOpacity="0" />
          </RadialGradient>
          <Circle cx="130" cy="166" r="27" fill={`url(#${gid.core})`} />
        </Svg>
      </Animated.View>

      {/* ── Слой 8: стеклянный диск + двойная спираль ДНК ── */}
      <Layer size={size}>
        {gradDefs}
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
        </G>
      </Layer>

      {/* электрон вокруг ДНК-ядра (org-eline 3.8 c) */}
      <OrbitDot size={size} rx={14} ry={7} cx={130} cy={166} duration={3800} color="#ffffff" dot={5} />

      {/* ── Слой 9: лицо (глаза, румянец, рот, капля) ── */}
      <Layer size={size}>
        {gradDefs}
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
            <Ellipse cx="106" cy="102" rx="8.4" ry={blink ? 1.1 : 11.4} fill={eyeFill} />
            <Circle cx="103.2" cy="97.8" r="2.7" fill="#ffffff" opacity={blink ? 0 : 0.95} />
            <Circle cx="108.8" cy="106.6" r="1.3" fill="#ffffff" opacity={blink ? 0 : 0.5} />
            <Ellipse cx="154" cy="102" rx="8.4" ry={blink ? 1.1 : 11.4} fill={eyeFill} />
            <Circle cx="151.2" cy="97.8" r="2.7" fill="#ffffff" opacity={blink ? 0 : 0.95} />
            <Circle cx="156.8" cy="106.6" r="1.3" fill="#ffffff" opacity={blink ? 0 : 0.5} />
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
      </Layer>

      {/* ── Слой 10: лапки, покачиваются в противофазе ── */}
      <Animated.View
        pointerEvents="none"
        style={{ position: 'absolute', top: 0, left: 0, width: size, height: size, transform: [{ translateY: bobTyL }] }}
      >
        <Svg viewBox="0 0 260 260" width={size} height={size}>
          {gradDefs}
          {flex ? (
            <G>
              <Ellipse cx="46" cy="118" rx="12.5" ry="10.5" fill={`url(#${gid.hand})`} transform="rotate(-24 46 118)" />
              <Circle cx="42" cy="100" r="7" fill={`url(#${gid.hand})`} />
            </G>
          ) : (
            <Ellipse
              cx="47" cy={handY} rx="10.5" ry="13.5"
              fill={`url(#${gid.hand})`}
              transform={`rotate(${decline ? 18 : -16} 47 ${handY})`}
            />
          )}
        </Svg>
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        style={{ position: 'absolute', top: 0, left: 0, width: size, height: size, transform: [{ translateY: bobTyR }] }}
      >
        <Svg viewBox="0 0 260 260" width={size} height={size}>
          {gradDefs}
          {flex ? (
            <G>
              <Ellipse cx="214" cy="118" rx="12.5" ry="10.5" fill={`url(#${gid.hand})`} transform="rotate(24 214 118)" />
              <Circle cx="218" cy="100" r="7" fill={`url(#${gid.hand})`} />
            </G>
          ) : (
            <Ellipse
              cx="213" cy={handY} rx="10.5" ry="13.5"
              fill={`url(#${gid.hand})`}
              transform={`rotate(${decline ? -18 : 16} 213 ${handY})`}
            />
          )}
        </Svg>
      </Animated.View>

      {/* искры «Расцвета» (org-twinkle 2.1 c) */}
      {happy &&
        [
          { x: 46, y: 78, s: 8, tw: tw1 },
          { x: 214, y: 60, s: 6.5, tw: tw2 },
          { x: 130, y: 34, s: 5, tw: tw3 },
          { x: 206, y: 190, s: 6, tw: tw4 },
        ].map(({ x, y, s: sp, tw }, i) => (
          <Animated.View
            key={i}
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: x - 10,
              top: y - 10,
              width: 20,
              height: 20,
              opacity: tw.interpolate({ inputRange: [0, 1], outputRange: [0.15, 1] }),
              transform: [{ scale: tw.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.05] }) }],
            }}
          >
            <Svg viewBox="0 0 20 20" width={20} height={20}>
              <Path d={sparkPath(10, 10, sp * 0.77)} fill="#fef9c3" />
            </Svg>
          </Animated.View>
        ))}
    </View>
  )
}

// src/features/workouts/player/components/ExerciseDemo.jsx
// «Живая» демонстрация упражнения: анимированная фигурка-спортсменка
// повторяет движение подхода, пока идёт отсчёт (и в отдыхе — для
// следующего упражнения). Позы и геометрия тела — в player/demoPatterns.js
// (чистый модуль: те же функции используют html-макет и тесты); здесь
// только отрисовка на react-native-svg: тело собрано из сужающихся
// «капсул» (конечности, корпус, шорты, кеды) + голова с хвостом —
// человеческие пропорции вместо палочного силуэта. Цветовая роль:
// дальняя сторона приглушённая, ближняя рука — акцентная (рабочая),
// шорты и кеды — фирменный циан. Один общий цикл p ∈ [0, 1), поза
// считается в worklet samplePose. Пауза плеера замораживает
// демонстрацию, статичные позы «дышат».
// В плеере компонент вложен в TimerRing: сцена занимает весь интерьер
// кольца (scale ≈ 1.3), фигура стоит ногами у внутренней кромки дуги.

import React, { useEffect, useMemo } from 'react'
import { StyleSheet, View } from 'react-native'
import Svg, { Circle, G, Path } from 'react-native-svg'
import Animated, {
  cancelAnimation, Easing, useAnimatedProps, useAnimatedStyle, useDerivedValue,
  useSharedValue, withRepeat, withTiming,
} from 'react-native-reanimated'
import { colors } from '../../theme'
import {
  buildGuides, buildTrack, cuffD, demoPatternFor, DEMO_PATTERNS, limbD, neckD,
  RIG, samplePose, shoulderD, shortsD, sneakerD, TRACK_N, trunkD,
} from '../demoPatterns'

const AnimatedPath = Animated.createAnimatedComponent(Path)

const NEAR = colors.text
const FAR = '#4A5568'
const ACCENT = colors.accent
const CYAN = colors.cyan
const FAR_CYAN = '#2E9FB6'
const HAIR = '#B9C3D1'
const CANVAS_W = 160
const CANVAS_H = 120

// Голова: квадратная группа с запасом под хвост, центр головы —
// в центре группы (поворот головы идёт вокруг этой точки)
const HEAD_BOX = 37
const HEAD_C = HEAD_BOX / 2

/** Хвост: локон от затылка вниз (координаты внутри головы 37×37) */
const HAIR_D = 'M 14.5 10.5 C 8.5 9.5 5 13 4.8 17.5 C 4.6 22 6.5 25.5 10 26.5 '
  + 'C 8.5 22.5 8.8 17.5 11 14.5 C 12.5 12.5 14.5 11.5 14.5 10.5 Z'

/** Дуга-траектория: квадратичная кривая из дуги-гайда */
function arcD(g) {
  const f = (v) => Math.round(v * 10) / 10
  return `M ${f(g.x1)} ${f(g.y1)} Q ${f(g.cx)} ${f(g.cy)} ${f(g.x2)} ${f(g.y2)}`
}

/** Наконечник стрелки: треугольник по касательной к дуге в конце */
function arrowHeadD(g) {
  const dx = g.x2 - g.cx
  const dy = g.y2 - g.cy
  const len = Math.hypot(dx, dy) || 1
  const ux = dx / len
  const uy = dy / len
  const px = -uy
  const py = ux
  const f = (v) => Math.round(v * 10) / 10
  return `M ${f(g.x2 + ux * 5.5)} ${f(g.y2 + uy * 5.5)}`
    + ` L ${f(g.x2 - ux * 1.5 + px * 3.4)} ${f(g.y2 - uy * 1.5 + py * 3.4)}`
    + ` L ${f(g.x2 - ux * 1.5 - px * 3.4)} ${f(g.y2 - uy * 1.5 - py * 3.4)} Z`
}

export function ExerciseDemo({ exercise, paused = false, scale = 1 }) {
  const pattern = DEMO_PATTERNS[demoPatternFor(exercise)] ?? DEMO_PATTERNS.march
  const tracks = useMemo(() => buildTrack(pattern), [pattern])
  const guides = useMemo(() => buildGuides(pattern), [pattern])
  const isBreath = pattern.kind === 'breath'

  // Цикл движения 0→1 и медленное «дыхание» статичных поз
  const p = useSharedValue(0)
  const b = useSharedValue(0)
  const flow = useSharedValue(0)
  useEffect(() => {
    if (paused) {
      cancelAnimation(p)
      cancelAnimation(b)
      cancelAnimation(flow)
      return undefined
    }
    p.value = withRepeat(
      withTiming(1, { duration: pattern.period, easing: Easing.linear }),
      -1,
      false,
    )
    if (pattern.breath) {
      b.value = withRepeat(
        withTiming(1, { duration: 3200, easing: Easing.linear }),
        -1,
        false,
      )
    }
    // Бегущий пунктир стрелок-траекторий: один период штриха за такт
    if (guides.length > 0) {
      flow.value = withRepeat(
        withTiming(-10, { duration: 900, easing: Easing.linear }),
        -1,
        false,
      )
    }
    return undefined
  }, [paused, pattern, guides.length, p, b, flow])

  const pose = useDerivedValue(() => samplePose(p.value, tracks, TRACK_N))

  // Бегущий пунктир по всем дугам сразу (направление — к наконечнику)
  const flowProps = useAnimatedProps(() => ({ strokeDashoffset: flow.value }))

  // ── Тело: 16 капсул, d каждой считается из позы на UI-потоке ──────────
  const farArmProps = useAnimatedProps(() => ({ d: limbD(pose.value.arm2, RIG.upperArm, 6.4, 5.2) }))
  const farForeProps = useAnimatedProps(() => ({ d: limbD(pose.value.fore2, RIG.foreArm, 5, 3.9) }))
  const farThighProps = useAnimatedProps(() => ({ d: limbD(pose.value.thigh2, RIG.thigh, 8.2, 6.6) }))
  const farCuffProps = useAnimatedProps(() => ({ d: cuffD(pose.value.thigh2) }))
  const farShinProps = useAnimatedProps(() => ({ d: limbD(pose.value.shin2, RIG.shin, 6.2, 4.4) }))
  const farFootProps = useAnimatedProps(() => ({ d: sneakerD(pose.value.foot2) }))
  const neckProps = useAnimatedProps(() => ({ d: neckD(pose.value) }))
  const trunkProps = useAnimatedProps(() => ({ d: trunkD(pose.value) }))
  const shoulderProps = useAnimatedProps(() => ({ d: shoulderD(pose.value) }))
  const shortsProps = useAnimatedProps(() => ({ d: shortsD(pose.value) }))
  const thighProps = useAnimatedProps(() => ({ d: limbD(pose.value.thigh, RIG.thigh, 8.2, 6.6) }))
  const cuffProps = useAnimatedProps(() => ({ d: cuffD(pose.value.thigh) }))
  const shinProps = useAnimatedProps(() => ({ d: limbD(pose.value.shin, RIG.shin, 6.2, 4.4) }))
  const footProps = useAnimatedProps(() => ({ d: sneakerD(pose.value.foot) }))
  const armProps = useAnimatedProps(() => ({ d: limbD(pose.value.arm, RIG.upperArm, 6.4, 5.2) }))
  const foreProps = useAnimatedProps(() => ({ d: limbD(pose.value.fore, RIG.foreArm, 5, 3.9) }))

  // Общий контейнер: смещение фигуры, «скручивание» (sx), дыхание
  const outerStyle = useAnimatedStyle(() => {
    const breathK = pattern.breath ? 1 + 0.02 * Math.sin(b.value * Math.PI * 2) : 1
    return {
      transform: [
        { translateX: pose.value.x },
        { translateY: pose.value.y },
        { scaleX: pose.value.sx * breathK },
        { scaleY: breathK },
      ],
    }
  })

  const figStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${pose.value.fig}deg` }],
  }))

  const headStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    left: 0,
    top: 0,
    width: HEAD_BOX,
    height: HEAD_BOX,
    transform: [
      { translateX: pose.value.head.x - HEAD_C },
      { translateY: pose.value.head.y - HEAD_C },
      { rotate: `${pose.value.head.a}deg` },
    ],
  }))

  // Мягкая подсветка за фигурой и тень под ногами (едет вместе со
  // смещением позы по горизонтали)
  const shadowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: pose.value.x }],
    opacity: 0.55 - Math.max(0, -pose.value.y) * 0.012,
  }))

  // Дыхательное упражнение: без фигуры — расходящиеся кольца
  const breathStyle = useAnimatedStyle(() => {
    const k = 0.55 + 0.45 * Math.sin(p.value * Math.PI * 2 - Math.PI / 2)
    return {
      position: 'absolute',
      left: 0,
      top: 0,
      width: 64,
      height: 64,
      borderRadius: 32,
      borderWidth: 3,
      borderColor: colors.cyan,
      transform: [
        { translateX: (CANVAS_W - 64) / 2 },
        { translateY: (CANVAS_H - 64) / 2 },
        { scale: k },
      ],
      opacity: 0.85 - 0.5 * k,
    }
  })

  if (isBreath) {
    return (
      <View
        style={[styles.stage, { width: CANVAS_W * scale, height: CANVAS_H * scale }]}
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <View style={[styles.canvas, { transform: [{ scale }] }]}>
          <Animated.View style={breathStyle} />
          <View style={styles.breathCore} />
        </View>
      </View>
    )
  }

  return (
    <View
      style={[styles.stage, { width: CANVAS_W * scale, height: CANVAS_H * scale }]}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View style={[styles.canvas, { transform: [{ scale }] }]}>
        <View style={styles.spot} />
        <Animated.View style={[styles.shadow, shadowStyle]} />
        <Animated.View style={outerStyle}>
          <Animated.View style={[styles.fig, figStyle]}>
            {/* Тело: стрелки-траектории под фигурой + 16 капсул */}
            <Svg
              width={200}
              height={152}
              viewBox="-20 -14 200 152"
              style={styles.scene}
              pointerEvents="none"
            >
              {guides.map((g, i) => (
                <G key={i}>
                  <AnimatedPath
                    d={arcD(g)}
                    stroke={g.color === 'accent' ? ACCENT : colors.cyan}
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeDasharray="4.5 5.5"
                    fill="none"
                    opacity={0.95}
                    animatedProps={flowProps}
                  />
                  <Path
                    d={arrowHeadD(g)}
                    fill={g.color === 'accent' ? ACCENT : colors.cyan}
                    opacity={0.95}
                  />
                </G>
              ))}
              {/* Дальняя сторона: приглушённые конечности */}
              <AnimatedPath animatedProps={farArmProps} fill={FAR} />
              <AnimatedPath animatedProps={farForeProps} fill={FAR} />
              <AnimatedPath animatedProps={farThighProps} fill={FAR} />
              <AnimatedPath animatedProps={farCuffProps} fill={FAR_CYAN} />
              <AnimatedPath animatedProps={farShinProps} fill={FAR} />
              <AnimatedPath animatedProps={farFootProps} fill={FAR_CYAN} />
              {/* Корпус: шея → футболка → плечи → шорты */}
              <AnimatedPath animatedProps={neckProps} fill={NEAR} />
              <AnimatedPath animatedProps={trunkProps} fill={NEAR} />
              <AnimatedPath animatedProps={shoulderProps} fill={NEAR} />
              <AnimatedPath animatedProps={shortsProps} fill={CYAN} />
              {/* Ближняя сторона */}
              <AnimatedPath animatedProps={thighProps} fill={NEAR} />
              <AnimatedPath animatedProps={cuffProps} fill={CYAN} />
              <AnimatedPath animatedProps={shinProps} fill={NEAR} />
              <AnimatedPath animatedProps={footProps} fill={CYAN} />
              {/* Рабочая рука — акцентная */}
              <AnimatedPath animatedProps={armProps} fill={ACCENT} />
              <AnimatedPath animatedProps={foreProps} fill={ACCENT} />
            </Svg>
            {/* Голова с хвостом: поворачивается вокруг центра головы */}
            <Animated.View style={headStyle}>
              <Svg
                width={HEAD_BOX}
                height={HEAD_BOX}
                viewBox="-10 -10 37 37"
                style={styles.headSvg}
                pointerEvents="none"
              >
                <Path d={HAIR_D} fill={HAIR} />
                <Circle cx={18.5} cy={18.5} r={RIG.headR} fill={NEAR} />
                <Circle cx={12.5} cy={13} r={1.6} fill={ACCENT} />
                <Circle cx={22.8} cy={16.8} r={1.25} fill={colors.bg} />
              </Svg>
            </Animated.View>
          </Animated.View>
        </Animated.View>
      </View>
    </View>
  )
}

/**
 * Холст 160×120, отмасштабированный вокруг своего центра и отцентрованный
 * в сцене (stage уже размером CANVAS×scale) — обычный flex-центр,
 * без ручных смещений. scene — общий svg фигуры и стрелок (запас по
 * краям viewBox), headSvg — голова с хвостом.
 */

const styles = StyleSheet.create({
  stage: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  canvas: { position: 'relative', width: CANVAS_W, height: CANVAS_H },
  spot: {
    position: 'absolute',
    left: CANVAS_W / 2 - 58,
    top: 60 - 58,
    width: 116,
    height: 116,
    borderRadius: 58,
    backgroundColor: colors.accentSoft,
  },
  shadow: {
    position: 'absolute',
    left: CANVAS_W / 2 - 26,
    top: RIG.floor - 5,
    width: 52,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  fig: { position: 'absolute', left: 0, top: 0, width: CANVAS_W, height: CANVAS_H },
  scene: { position: 'absolute', left: -20, top: -14, overflow: 'visible' },
  headSvg: { position: 'absolute', left: 0, top: 0, overflow: 'visible' },
  breathCore: {
    position: 'absolute',
    left: CANVAS_W / 2 - 5,
    top: CANVAS_H / 2 - 5,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.cyan,
    opacity: 0.8,
  },
})

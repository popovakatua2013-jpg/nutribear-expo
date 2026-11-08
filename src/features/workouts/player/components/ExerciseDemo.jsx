// src/features/workouts/player/components/ExerciseDemo.jsx
// «Живая» демонстрация упражнения: анимированная фигурка повторяет
// движение подхода, пока идёт отсчёт (и в отдыхе — для следующего
// упражнения). Геометрия и позы — в player/demoPatterns.js (чистый
// модуль: те же данные используют html-макет и тесты); здесь только
// отрисовка на reanimated — один общий цикл p ∈ [0, 1), поза считается
// в worklet samplePose, каждый сегмент — интерполяция своего трека.
// Пауза плеера замораживает демонстрацию, статичные позы «дышат».
// В плеере компонент вложен в TimerRing: сцена занимает весь интерьер
// кольца (scale ≈ 1.3), фигура стоит ногами у внутренней кромки дуги.

import React, { useEffect, useMemo } from 'react'
import { StyleSheet, View } from 'react-native'
import Svg, { G, Path } from 'react-native-svg'
import Animated, {
  cancelAnimation, Easing, useAnimatedProps, useAnimatedStyle, useDerivedValue,
  useSharedValue, withRepeat, withTiming,
} from 'react-native-reanimated'
import { colors } from '../../theme'
import {
  buildGuides, buildTrack, demoPatternFor, DEMO_PATTERNS, RIG, samplePose, TRACK_N,
} from '../demoPatterns'

const AnimatedPath = Animated.createAnimatedComponent(Path)

const NEAR = colors.text
const FAR = '#4A5568'
const ACCENT = colors.accent
const CANVAS_W = 160
const CANVAS_H = 120

/** Сегмент конечности: поворот вокруг центра с компенсацией сочленения */
function segStyle(s, len, th, color) {
  'worklet'
  const r = (s.a * Math.PI) / 180
  return {
    position: 'absolute',
    left: 0,
    top: 0,
    width: len,
    height: th,
    borderRadius: th / 2,
    backgroundColor: color,
    transform: [
      { translateX: s.x - (len / 2) * (1 - Math.cos(r)) },
      { translateY: s.y - th / 2 + (len / 2) * Math.sin(r) },
      { rotate: `${s.a}deg` },
    ],
  }
}

/** Дуга-траектория: квадратичная кривая из дуги-гайда */
function arcD(g) {
  const f = (v) => Math.round(v * 10) / 10
  return `M ${f(g.x1)} ${f(g.y1)} Q ${f(g.cx)} ${f(g.cy)} ${f(g.x2)} ${f(g.y2)}`
}

/** Наконечник стрелки: треугольник по касательной к дуге в конце */
function headD(g) {
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

  const torsoStyle = useAnimatedStyle(() => segStyle(pose.value.torso, RIG.torso, 13, NEAR))
  // Поперечные «плечи» и «таз»: придают силуэту человеческую ширину
  // (перпендикуляр к оси корпуса в точке плеча/таза)
  const shoulderBarStyle = useAnimatedStyle(() =>
    segStyle(
      { x: pose.value.arm.x, y: pose.value.arm.y, a: pose.value.torso.a + 90 },
      17, 6, NEAR,
    ))
  const hipBarStyle = useAnimatedStyle(() =>
    segStyle(
      { x: pose.value.thigh.x, y: pose.value.thigh.y, a: pose.value.torso.a + 90 },
      15, 6.5, NEAR,
    ))
  const thighStyle = useAnimatedStyle(() => segStyle(pose.value.thigh, RIG.thigh, 7, NEAR))
  const shinStyle = useAnimatedStyle(() => segStyle(pose.value.shin, RIG.shin, 6.5, NEAR))
  const footStyle = useAnimatedStyle(() => segStyle(pose.value.foot, 11, 5, NEAR))
  const armStyle = useAnimatedStyle(() => segStyle(pose.value.arm, RIG.upperArm, 6, ACCENT))
  const foreStyle = useAnimatedStyle(() => segStyle(pose.value.fore, RIG.foreArm, 5.5, ACCENT))
  const thigh2Style = useAnimatedStyle(() => segStyle(pose.value.thigh2, RIG.thigh, 7, FAR))
  const shin2Style = useAnimatedStyle(() => segStyle(pose.value.shin2, RIG.shin, 6.5, FAR))
  const foot2Style = useAnimatedStyle(() => segStyle(pose.value.foot2, 11, 5, FAR))
  const arm2Style = useAnimatedStyle(() => segStyle(pose.value.arm2, RIG.upperArm, 6, FAR))
  const fore2Style = useAnimatedStyle(() => segStyle(pose.value.fore2, RIG.foreArm, 5.5, FAR))

  const headStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    left: 0,
    top: 0,
    width: RIG.headR * 2,
    height: RIG.headR * 2,
    transform: [
      { translateX: pose.value.head.x - RIG.headR },
      { translateY: pose.value.head.y - RIG.headR },
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
            {/* Стрелки-траектории под фигурой: пунктир течёт к наконечнику */}
            {guides.length > 0 && (
              <Svg
                width={200}
                height={152}
                viewBox="-20 -14 200 152"
                style={styles.guides}
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
                      d={headD(g)}
                      fill={g.color === 'accent' ? ACCENT : colors.cyan}
                      opacity={0.95}
                    />
                  </G>
                ))}
              </Svg>
            )}
            <Animated.View style={arm2Style} />
            <Animated.View style={fore2Style} />
            <Animated.View style={thigh2Style} />
            <Animated.View style={shin2Style} />
            <Animated.View style={foot2Style} />
            <Animated.View style={hipBarStyle} />
            <Animated.View style={torsoStyle} />
            <Animated.View style={shoulderBarStyle} />
            <Animated.View style={headStyle}>
              <View style={styles.headCircle} />
              <View style={styles.nose} />
            </Animated.View>
            <Animated.View style={thighStyle} />
            <Animated.View style={shinStyle} />
            <Animated.View style={footStyle} />
            <Animated.View style={armStyle} />
            <Animated.View style={foreStyle} />
          </Animated.View>
        </Animated.View>
      </View>
    </View>
  )
}

/**
 * Холст 160×120, отмасштабированный вокруг своего центра и отцентрованный
 * в сцене (stage уже размером CANVAS×scale) — обычный flex-центр,
 * без ручных смещений.
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
  guides: { position: 'absolute', left: -20, top: -14 },
  headCircle: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: RIG.headR * 2,
    height: RIG.headR * 2,
    borderRadius: RIG.headR,
    backgroundColor: NEAR,
  },
  nose: {
    position: 'absolute',
    left: RIG.headR + 4.5,
    top: RIG.headR - 1.5,
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.bg,
  },
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

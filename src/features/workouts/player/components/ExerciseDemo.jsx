// src/features/workouts/player/components/ExerciseDemo.jsx
// «Живая» демонстрация упражнения: анимированная фигурка повторяет
// движение подхода, пока идёт отсчёт (и в отдыхе — для следующего
// упражнения). Геометрия и позы — в player/demoPatterns.js (чистый
// модуль: те же данные используют html-макет и тесты); здесь только
// отрисовка на reanimated — один общий цикл p ∈ [0, 1), поза считается
// в worklet samplePose, каждый сегмент — интерполяция своего трека.
// Пауза плеера замораживает демонстрацию, статичные позы «дышат».

import React, { useEffect, useMemo } from 'react'
import { StyleSheet, View } from 'react-native'
import Animated, {
  cancelAnimation, Easing, useAnimatedStyle, useDerivedValue,
  useSharedValue, withRepeat, withTiming,
} from 'react-native-reanimated'
import { colors } from '../../theme'
import {
  buildTrack, demoPatternFor, DEMO_PATTERNS, RIG, samplePose, TRACK_N,
} from '../demoPatterns'

const NEAR = colors.text
const FAR = '#4A5568'
const FLOOR = '#2A3547'
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

export function ExerciseDemo({ exercise, paused = false, scale = 1 }) {
  const pattern = DEMO_PATTERNS[demoPatternFor(exercise)] ?? DEMO_PATTERNS.march
  const tracks = useMemo(() => buildTrack(pattern), [pattern])
  const isBreath = pattern.kind === 'breath'

  // Цикл движения 0→1 и медленное «дыхание» статичных поз
  const p = useSharedValue(0)
  const b = useSharedValue(0)
  useEffect(() => {
    if (paused) {
      cancelAnimation(p)
      cancelAnimation(b)
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
    return undefined
  }, [paused, pattern, p, b])

  const pose = useDerivedValue(() => samplePose(p.value, tracks, TRACK_N))

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
        <View style={[styles.canvas, canvasScale(scale)]}>
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
      <View style={[styles.canvas, canvasScale(scale)]}>
        <View style={styles.floor} />
        <Animated.View style={outerStyle}>
          <Animated.View style={[styles.fig, figStyle]}>
            <Animated.View style={arm2Style} />
            <Animated.View style={fore2Style} />
            <Animated.View style={thigh2Style} />
            <Animated.View style={shin2Style} />
            <Animated.View style={foot2Style} />
            <Animated.View style={torsoStyle} />
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

/** Холст 160×120, вписанный в сцену scale через transform (центр совпадает) */
function canvasScale(scale) {
  if (scale === 1) return null
  return {
    transform: [
      { translateX: ((scale - 1) * CANVAS_W) / 2 },
      { translateY: ((scale - 1) * CANVAS_H) / 2 },
      { scale },
    ],
  }
}

const styles = StyleSheet.create({
  stage: {},
  canvas: { position: 'absolute', left: 0, top: 0, width: CANVAS_W, height: CANVAS_H },
  floor: {
    position: 'absolute',
    left: 20,
    top: RIG.floor,
    width: 120,
    height: 2,
    borderRadius: 1,
    backgroundColor: FLOOR,
  },
  fig: { position: 'absolute', left: 0, top: 0, width: CANVAS_W, height: CANVAS_H },
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

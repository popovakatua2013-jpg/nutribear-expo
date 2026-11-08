// src/features/workouts/components/ProgressRing.jsx
// Кольцо процента выполнения (карточка «Продолжить» и плеер):
// доворот дуги 600 мс ease-out при монтировании.

import React, { useEffect } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import Svg, { Circle, G } from 'react-native-svg'
import Animated, {
  useAnimatedProps, useSharedValue, withTiming, Easing,
} from 'react-native-reanimated'
import { colors, motion, F } from '../theme'

const AnimatedCircle = Animated.createAnimatedComponent(Circle)

export function ProgressRing({
  progress,
  size = 62,
  strokeWidth = 6,
  trackColor = colors.line,
  color = colors.accent,
  label,
  labelStyle,
}) {
  const r = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * r

  const value = useSharedValue(0)
  useEffect(() => {
    value.value = withTiming(Math.min(Math.max(progress, 0), 1), {
      duration: motion.ring,
      easing: Easing.out(Easing.quad),
    })
  }, [progress, value])

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - value.value),
  }))

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <G rotation={-90} originX={size / 2} originY={size / 2}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={trackColor}
            strokeWidth={strokeWidth}
            fill="none"
          />
          <AnimatedCircle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            animatedProps={animatedProps}
          />
        </G>
      </Svg>
      <View style={styles.center}>
        <Text style={[styles.label, { color }, labelStyle]}>{label}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontSize: 13, fontWeight: '800', fontFamily: F[800] },
})

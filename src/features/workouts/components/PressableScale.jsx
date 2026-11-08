// src/features/workouts/components/PressableScale.jsx
// Единый отклик нажатия во всех карточках: масштаб 0,97 + лёгкий haptic
// (150 мс, ease-in-out — по референсу вкладки).

import React, { useCallback } from 'react'
import { Pressable } from 'react-native'
import Animated, {
  useAnimatedStyle, useSharedValue, withTiming,
} from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { motion } from '../theme'

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

export function PressableScale({ children, onPressIn, style, ...rest }) {
  const scale = useSharedValue(1)

  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))

  const handleIn = useCallback(
    (e) => {
      scale.value = withTiming(0.97, { duration: motion.press })
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})
      onPressIn?.(e)
    },
    [onPressIn, scale],
  )

  const handleOut = useCallback(() => {
    scale.value = withTiming(1, { duration: motion.press })
  }, [scale])

  return (
    <AnimatedPressable
      onPressIn={handleIn}
      onPressOut={handleOut}
      style={[animStyle, style]}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  )
}

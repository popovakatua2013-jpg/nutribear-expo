// src/features/workouts/components/StatCard.jsx
// Стат-карточка сетки прогресса; число анимируется от нуля.

import React, { useEffect } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Animated, {
  Easing, useAnimatedProps, useSharedValue, withTiming,
} from 'react-native-reanimated'
import { colors, radius, F } from '../theme'

const AnimatedText = Animated.createAnimatedComponent(Text)

export function StatCard({ icon, value, unit, label, format }) {
  const v = useSharedValue(0)
  const fmt = format ?? ((n) => String(Math.round(n)))

  useEffect(() => {
    v.value = withTiming(value, {
      duration: 500,
      easing: Easing.out(Easing.quad),
    })
  }, [value, v])

  const animatedProps = useAnimatedProps(() => ({
    text: fmt(v.value),
    defaultText: fmt(v.value),
  }))

  return (
    <View style={styles.card}>
      <View style={styles.top}>{icon}</View>
      <View style={styles.valueRow}>
        <AnimatedText animatedProps={animatedProps} style={styles.value}>
          {fmt(value)}
        </AnimatedText>
        {unit ? <Text style={styles.unit}>{unit}</Text> : null}
      </View>
      <Text style={styles.label}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: radius.card,
    padding: 14,
  },
  top: { alignItems: 'flex-start' },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 9 },
  value: {
    fontSize: 23,
    fontWeight: '800',
    fontFamily: F[800],
    color: colors.text,
    letterSpacing: -0.4,
    fontVariant: ['tabular-nums'],
  },
  unit: { fontSize: 12, fontWeight: '600', fontFamily: F[600], color: colors.text2, marginLeft: 3 },
  label: { fontSize: 12, fontWeight: '600', fontFamily: F[600], color: colors.text2, marginTop: 3 },
})

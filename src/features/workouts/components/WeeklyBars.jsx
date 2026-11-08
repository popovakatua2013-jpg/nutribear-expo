// src/features/workouts/components/WeeklyBars.jsx
// Гистограмма активности за неделю пн–вс; максимальный день — акцентный
// градиент, столбцы растут каскадом.

import React, { useEffect } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import LinearGradient from 'expo-linear-gradient'
import Animated, {
  Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming,
} from 'react-native-reanimated'
import { colors, motion, radius, spacing, F } from '../theme'

const MAX_BAR = 92
const EMPTY_BAR = 4

export function WeeklyBars({ minutes, labels, totalLabel, title }) {
  const max = Math.max(...minutes, 1)
  const maxIdx = minutes.indexOf(Math.max(...minutes))

  return (
    <View style={styles.panel}>
      <View style={styles.head}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.total}>{totalLabel}</Text>
      </View>
      <View style={styles.bars}>
        {minutes.map((v, i) => (
          <Bar
            key={i}
            index={i}
            target={v > 0 ? Math.max(EMPTY_BAR, Math.round((v / max) * MAX_BAR)) : EMPTY_BAR}
            hot={i === maxIdx && v > 0}
            label={labels[i]}
          />
        ))}
      </View>
    </View>
  )
}

function Bar({ index, target, hot, label }) {
  const h = useSharedValue(EMPTY_BAR)

  useEffect(() => {
    h.value = withDelay(
      index * motion.stagger,
      withTiming(target, { duration: motion.bars, easing: Easing.out(Easing.quad) }),
    )
  }, [target, index, h])

  const animStyle = useAnimatedStyle(() => ({ height: h.value }))

  return (
    <View style={styles.barCol}>
      <View style={styles.colSlot}>
        {hot ? (
          <Animated.View style={[styles.col, styles.overflow, animStyle]}>
            <LinearGradient
              colors={[colors.accent, '#8FCC1E']}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        ) : (
          <Animated.View
            style={[styles.col, styles.overflow, animStyle, { backgroundColor: colors.surface2 }]}
          />
        )}
      </View>
      <Text style={styles.day}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: radius.card,
    padding: spacing.l,
    marginTop: spacing.m,
  },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 15, fontWeight: '800', fontFamily: F[800], color: colors.text },
  total: { fontSize: 12, fontWeight: '600', fontFamily: F[600], color: colors.text2 },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    height: 120,
    marginTop: spacing.l,
  },
  barCol: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'flex-end', gap: 7 },
  colSlot: { width: '100%', maxWidth: 26, justifyContent: 'flex-end', flex: 1 },
  col: { width: '100%', borderRadius: 8 },
  overflow: { overflow: 'hidden' },
  day: { fontSize: 10.5, fontWeight: '700', fontFamily: F[700], color: colors.text3 },
})

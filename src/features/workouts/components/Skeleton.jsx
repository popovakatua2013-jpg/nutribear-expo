// src/features/workouts/components/Skeleton.jsx
// Скелетоны состояния загрузки: строки каталога и стат-карточки.

import React, { useEffect } from 'react'
import { StyleSheet, View } from 'react-native'
import Animated, {
  Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming,
} from 'react-native-reanimated'
import { colors, radius, spacing } from '../theme'

function useShimmer() {
  const opacity = useSharedValue(0.45)
  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.9, { duration: 700, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    )
  }, [opacity])
  return useAnimatedStyle(() => ({ opacity: opacity.value }))
}

/** Строка каталога */
export function SkeletonRow() {
  const shimmer = useShimmer()
  return (
    <View style={styles.row}>
      <Animated.View style={[styles.thumb, shimmer]} />
      <View style={{ flex: 1, gap: 8 }}>
        <Animated.View style={[styles.line, { width: '70%' }, shimmer]} />
        <Animated.View style={[styles.line, { width: '45%' }, shimmer]} />
      </View>
    </View>
  )
}

/** Стат-карточка */
export function SkeletonStat() {
  const shimmer = useShimmer()
  return (
    <View style={styles.stat}>
      <Animated.View style={[styles.line, { width: 30, height: 30, borderRadius: 10 }, shimmer]} />
      <Animated.View style={[styles.line, { width: '60%', height: 22, marginTop: 12 }, shimmer]} />
      <Animated.View style={[styles.line, { width: '80%' }, shimmer]} />
    </View>
  )
}

export function SkeletonList({ rows = 3 }) {
  return (
    <View style={{ marginTop: spacing.m, gap: 10 }}>
      {Array.from({ length: rows }, (_, i) => <SkeletonRow key={i} />)}
    </View>
  )
}

export function SkeletonStats() {
  return (
    <View style={styles.grid}>
      {Array.from({ length: 4 }, (_, i) => (
        <View key={i} style={styles.gridItem}>
          <SkeletonStat />
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: radius.row,
    padding: 12,
  },
  thumb: { width: 52, height: 52, borderRadius: 13, backgroundColor: colors.surface2 },
  line: { height: 12, borderRadius: 6, backgroundColor: colors.surface2 },
  stat: {
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: radius.card,
    padding: 14,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: spacing.l,
  },
  gridItem: { width: '47%' },
})

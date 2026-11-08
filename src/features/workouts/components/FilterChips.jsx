// src/features/workouts/components/FilterChips.jsx
// Чипы типов тренировок: одиночный выбор.

import React from 'react'
import { ScrollView, StyleSheet, Text } from 'react-native'
import Animated, { FadeIn } from 'react-native-reanimated'
import { colors, motion, spacing, F } from '../theme'
import { PressableScale } from './PressableScale'

export function FilterChips({ values, labels, value, onChange }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.row}
      contentContainerStyle={styles.content}
    >
      {values.map((v) => {
        const active = v === value
        return (
          <Animated.View key={v} entering={FadeIn.duration(motion.chip)}>
            <PressableScale
              onPress={() => onChange(v)}
              style={[styles.chip, active && styles.chipActive]}
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {labels[v]}
              </Text>
            </PressableScale>
          </Animated.View>
        )
      })}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  row: { marginTop: spacing.m, flexGrow: 0 },
  content: { gap: spacing.s, paddingRight: spacing.xl },
  chip: {
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    minHeight: 38,
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  chipText: { color: colors.text2, fontWeight: '600', fontFamily: F[600], fontSize: 13 },
  chipTextActive: { color: colors.accentInk },
})

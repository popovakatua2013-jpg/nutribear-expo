// src/features/workouts/components/WorkoutCard.jsx
// Карточка строки списка «Все тренировки».

import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { colors, levelStyles, radius, spacing, F } from '../theme'
import { workoutTypeIcon } from './icons'
import { PressableScale } from './PressableScale'

export function WorkoutCard({
  workout, lang, typeLabel, levelLabel, minLabel, kcalLabel, onPress,
}) {
  const Icon = workoutTypeIcon[workout.type]
  const lvl = levelStyles[workout.level]

  return (
    <PressableScale
      style={styles.row}
      onPress={() => onPress?.(workout)}
      accessibilityLabel={workout.title[lang]}
    >
      <LinearGradient
        colors={workout.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.thumb}
      >
        <Icon />
      </LinearGradient>

      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {workout.title[lang]}
        </Text>
        <Text style={styles.meta}>
          {typeLabel} · {workout.durationMin} {minLabel} · {workout.kcal} {kcalLabel}
        </Text>
      </View>

      <View style={[styles.badge, { backgroundColor: lvl.bg }]}>
        <Text style={[styles.badgeText, { color: lvl.color }]}>{levelLabel}</Text>
      </View>
    </PressableScale>
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
    paddingVertical: 11,
    paddingHorizontal: 12,
    minHeight: 44,
  },
  thumb: {
    width: 52,
    height: 52,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, minWidth: 0 },
  title: { color: colors.text, fontWeight: '700', fontFamily: F[700], fontSize: 14.5 },
  meta: { fontSize: 12, fontWeight: '600', fontFamily: F[600], color: colors.text2, marginTop: 3 },
  badge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: { fontSize: 10.5, fontWeight: '700', fontFamily: F[700] },
})

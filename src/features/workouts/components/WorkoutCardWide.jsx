// src/features/workouts/components/WorkoutCardWide.jsx
// Широкая карточка блока «Рекомендуем для вас».

import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { colors, radius, spacing, F } from '../theme'
import { workoutTypeIcon } from './icons'
import { PressableScale } from './PressableScale'

export function WorkoutCardWide({
  workout, lang, typeLabel, kcalLabel, minLabel, onPress,
}) {
  const Icon = workoutTypeIcon[workout.type]

  return (
    <PressableScale
      style={styles.card}
      onPress={() => onPress?.(workout)}
      accessibilityLabel={workout.title[lang]}
    >
      <LinearGradient
        colors={workout.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.thumb}
      >
        <Icon size={26} />
        <View style={styles.dur}>
          <Text style={styles.durText}>
            {workout.durationMin} {minLabel}
          </Text>
        </View>
      </LinearGradient>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>
          {workout.title[lang]}
        </Text>
        <Text style={styles.meta}>
          {typeLabel} · {workout.kcal} {kcalLabel}
        </Text>
      </View>
    </PressableScale>
  )
}

const styles = StyleSheet.create({
  card: {
    width: 196,
    borderRadius: radius.card,
    overflow: 'hidden',
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderWidth: 1,
  },
  thumb: {
    height: 104,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dur: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    backgroundColor: 'rgba(5,6,10,0.72)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  durText: { color: colors.text, fontSize: 11, fontWeight: '700', fontFamily: F[700] },
  body: { paddingVertical: 11, paddingHorizontal: 12 },
  title: { color: colors.text, fontWeight: '700', fontFamily: F[700], fontSize: 13.5, lineHeight: 18 },
  meta: { fontSize: 12, fontWeight: '600', fontFamily: F[600], color: colors.text2, marginTop: 5 },
})

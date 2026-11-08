// src/features/workouts/components/BadgeCard.jsx
// Бейдж достижения: открытый — цветной, закрытый — 55% непрозрачности с замком.

import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { colors, radius, F } from '../theme'
import { IconFlame, IconLock, IconMedal, IconStar } from './icons'

export function BadgeCard({ badge, lang, doneLabel, progressLabel }) {
  const Icon = badge.unlocked
    ? badge.icon === 'flame' ? IconFlame : badge.icon === 'star' ? IconStar : IconMedal
    : IconLock

  const caption = badge.unlocked ? doneLabel : progressLabel ?? badge.progress

  return (
    <View style={[styles.card, !badge.unlocked && styles.locked]}>
      <View style={[styles.iconWrap, !badge.unlocked && styles.iconLocked]}>
        <Icon color={badge.unlocked ? colors.accent : colors.text3} />
      </View>
      <Text style={styles.title}>{badge.title[lang]}</Text>
      {caption ? <Text style={styles.caption}>{caption}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    width: 104,
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: radius.row,
    paddingVertical: 13,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  locked: { opacity: 0.55 },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentSoft,
  },
  iconLocked: { backgroundColor: colors.surface2 },
  title: {
    fontSize: 11.5,
    fontWeight: '700',
    fontFamily: F[700],
    color: colors.text,
    textAlign: 'center',
    marginTop: 9,
    lineHeight: 15,
  },
  caption: { fontSize: 10, fontFamily: F[400], color: colors.text2, marginTop: 3 },
})

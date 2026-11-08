// src/features/workouts/components/EmptyState.jsx
// Пустое состояние: иллюстрация, текст, кнопка действия.

import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Animated, { FadeInUp } from 'react-native-reanimated'
import { colors, radius, spacing } from '../theme'
import { IconSearch } from './icons'
import { PressableScale } from './PressableScale'

export function EmptyState({ title, text, buttonLabel, onPress }) {
  return (
    <Animated.View entering={FadeInUp.duration(240)} style={styles.box}>
      <View style={styles.ill}>
        <IconSearch size={38} color={colors.text3} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.text}>{text}</Text>
      {buttonLabel && onPress ? (
        <PressableScale style={styles.button} onPress={onPress}>
          <Text style={styles.buttonText}>{buttonLabel}</Text>
        </PressableScale>
      ) : null}
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  box: {
    alignItems: 'center',
    paddingTop: 44,
    paddingHorizontal: 24,
    paddingBottom: 10,
  },
  ill: {
    width: 88,
    height: 88,
    borderRadius: 28,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.l,
  },
  title: {
    fontSize: 16.5, fontWeight: '800', color: colors.text,
    fontFamily: 'Inter_800ExtraBold',
  },
  text: {
    fontSize: 12, fontWeight: '600', fontFamily: 'Inter_600SemiBold',
    color: colors.text2,
    lineHeight: 20,
    marginTop: spacing.s,
    textAlign: 'center',
  },
  button: {
    marginTop: spacing.l,
    backgroundColor: colors.accent,
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: radius.field,
    minHeight: 44,
    justifyContent: 'center',
  },
  buttonText: { color: colors.accentInk, fontWeight: '800', fontFamily: 'Inter_800ExtraBold', fontSize: 13.5 },
})

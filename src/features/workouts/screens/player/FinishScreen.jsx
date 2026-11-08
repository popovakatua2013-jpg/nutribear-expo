// src/features/workouts/screens/player/FinishScreen.jsx
// Экран итогов тренировки (по референсу плеера, раздел 5.3): статус,
// три стат-карточки, кнопка «Готово». Показывается вместо плеера в том
// же окне: журнал уже записан на момент смены фазы на «done».
import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaView } from 'react-native-safe-area-context'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { PressableScale } from '../../components/PressableScale'
import { IconChart, IconCheck, IconClock, IconKcal } from '../../components/icons'
import { StatCard } from '../../components/StatCard'
import { colors, motion, radius, spacing, type, F } from '../../theme'
import { formatNumber, makeT } from '../../i18n'

export function FinishScreen({ workout, result, totalExercises, lang, onExit }) {
  const t = makeT(lang)

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <StatusBar style="light" />

      <View style={styles.hero}>
        <Animated.View
          entering={FadeInDown.duration(motion.list)}
          style={[styles.medal, !result.completed && styles.medalMuted]}
        >
          <IconCheck size={34} />
        </Animated.View>
        <Text style={styles.title}>
          {result.completed ? t('player.doneTitle') : t('player.quitDoneTitle')}
        </Text>
        <Text style={styles.text}>
          {result.completed ? t('player.doneText') : t('player.quitDoneText')}
        </Text>
        <Text style={styles.workoutName}>{workout.title[lang]}</Text>
      </View>

      <Animated.View
        entering={FadeInDown.duration(motion.list).delay(80)}
        style={styles.stats}
      >
        <View style={styles.statCell}>
          <StatCard
            icon={<IconClock />}
            value={result.durationMin}
            unit={lang === 'ru' ? 'мин' : 'min'}
            label={t('player.statMinutes')}
          />
        </View>
        <View style={styles.statCell}>
          <StatCard
            icon={<IconKcal />}
            value={result.kcal}
            unit={lang === 'ru' ? 'ккал' : 'kcal'}
            label={t('player.statKcal')}
            format={(n) => formatNumber(Math.round(n), lang)}
          />
        </View>
        <View style={styles.statCell}>
          <StatCard
            icon={<IconChart />}
            value={result.exercisesDone}
            unit={`/ ${totalExercises}`}
            label={t('player.statExercises')}
          />
        </View>
      </Animated.View>

      <PressableScale style={styles.doneBtn} onPress={onExit}>
        <Text style={styles.doneText}>{t('player.finish')}</Text>
      </PressableScale>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: spacing.xl,
  },
  hero: { alignItems: 'center', marginTop: 48 },
  medal: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.accentSoft,
    borderColor: colors.accentBorder,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  medalMuted: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
  },
  title: {
    ...type.display,
    fontSize: 26,
    color: colors.text,
    textAlign: 'center',
    marginTop: spacing.xl,
    letterSpacing: -0.4,
  },
  text: {
    ...type.body,
    color: colors.text2,
    textAlign: 'center',
    marginTop: spacing.m,
    paddingHorizontal: spacing.s,
  },
  workoutName: { ...type.caption, color: colors.text3, marginTop: spacing.l },
  stats: {
    flexDirection: 'row',
    gap: spacing.m,
    marginTop: 40,
  },
  statCell: { flex: 1 },
  doneBtn: {
    marginTop: 'auto',
    marginBottom: spacing.xl,
    height: 54,
    borderRadius: radius.field,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneText: { color: colors.accentInk, fontSize: 15, fontWeight: '800', fontFamily: F[800] },
})

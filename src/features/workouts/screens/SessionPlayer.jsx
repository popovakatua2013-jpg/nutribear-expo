// src/features/workouts/screens/SessionPlayer.jsx
// Экран идущей тренировки (минимальный плеер): таймер идёт от времени
// старта сессии, кольцо показывает долю запланированной длительности,
// калории оцениваются пропорционально. «Завершить» — сессия уходит в
// журнал как выполненная; «Прервать» — как незавершённая; крестик —
// окно закрывается, тренировка продолжается (карточка «Продолжить»).
// Запись в дневник тренировок приложения делает вкладка-маршрут.

import React, { useEffect, useMemo, useState } from 'react'
import { Modal, StyleSheet, Text, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated'
import { X } from 'lucide-react-native'
import { colors, radius, spacing, type, F } from '../theme'
import { makeT } from '../i18n'
import { usePrefsStore } from '../store/useWorkoutsStore'
import { PressableScale } from '../components/PressableScale'
import { ProgressRing } from '../components/ProgressRing'
import { workoutTypeIcon } from '../components/icons'

const two = (n) => String(n).padStart(2, '0')

export function SessionPlayer({ session, workout, onClose, onFinish }) {
  const lang = usePrefsStore((s) => s.lang)
  const t = useMemo(() => makeT(lang), [lang])
  const insets = useSafeAreaInsets()

  // Тикаем раз в секунду; опора — startedAt сессии, поэтому таймер
  // корректен даже если окно открыли позже старта
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const startedMs = useMemo(
    () => new Date(session.startedAt).getTime(),
    [session.startedAt],
  )
  const elapsedSec = Math.max(0, Math.floor((now - startedMs) / 1000))
  const plannedSec = Math.max(60, workout.durationMin * 60)
  const frac = Math.min(1, elapsedSec / plannedSec)
  const kcalEst = Math.round(workout.kcal * frac)

  const Icon = workoutTypeIcon[workout.type]

  const finish = () =>
    onFinish({
      durationMin: Math.max(1, Math.round(elapsedSec / 60)),
      kcal: Math.max(1, kcalEst),
      completed: true,
    })

  const abort = () =>
    onFinish({
      durationMin: Math.round(elapsedSec / 60),
      kcal: kcalEst,
      completed: false,
    })

  return (
    <Modal visible animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={[styles.screen, { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 16 }]}>
        <StatusBar style="light" />

        {/* Шапка: тип и крестик (закрыть окно — тренировка продолжается) */}
        <View style={styles.head}>
          <View style={styles.typeRow}>
            <Icon size={18} />
            <Text style={styles.typeText}>{t(`type.${workout.type}`)}</Text>
          </View>
          <PressableScale style={styles.close} onPress={onClose} accessibilityLabel="Закрыть">
            <X size={20} color={colors.text2} />
          </PressableScale>
        </View>

        <Animated.View entering={FadeIn.duration(300)} style={styles.center}>
          <ProgressRing
            progress={frac}
            size={216}
            strokeWidth={10}
            label={`${two(Math.floor(elapsedSec / 60))}:${two(elapsedSec % 60)}`}
            labelStyle={styles.timer}
          />
          <Text style={styles.of}>{t('player.of', { min: workout.durationMin })}</Text>

          <Text style={styles.name} numberOfLines={2}>
            {workout.title[lang]}
          </Text>
          <Text style={styles.kcal}>{t('player.kcal', { kcal: kcalEst })}</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(240)} style={styles.actions}>
          <PressableScale style={styles.doneBtn} onPress={finish} accessibilityLabel={t('player.done')}>
            <Text style={styles.doneText}>{t('player.done')}</Text>
          </PressableScale>
          <PressableScale style={styles.abortBtn} onPress={abort} accessibilityLabel={t('player.abort')}>
            <Text style={styles.abortText}>{t('player.abort')}</Text>
          </PressableScale>
        </Animated.View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: spacing.xl,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  typeText: { color: colors.accent, fontSize: 12, fontWeight: '700', fontFamily: F[700] },
  close: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  timer: { fontSize: 40, fontWeight: '800', fontFamily: F[800], fontVariant: ['tabular-nums'] },
  of: { ...type.caption, color: colors.text2 },
  name: {
    ...type.title,
    color: colors.text,
    textAlign: 'center',
    marginTop: 10,
    paddingHorizontal: spacing.l,
  },
  kcal: { ...type.caption, color: colors.accent, fontSize: 13 },
  actions: { gap: 10 },
  doneBtn: {
    backgroundColor: colors.accent,
    borderRadius: radius.field,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneText: { color: colors.accentInk, fontWeight: '800', fontFamily: F[800], fontSize: 16 },
  abortBtn: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    borderRadius: radius.field,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  abortText: { color: colors.text2, fontWeight: '700', fontFamily: F[700], fontSize: 14 },
})

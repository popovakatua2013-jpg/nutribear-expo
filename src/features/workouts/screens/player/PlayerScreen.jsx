// src/features/workouts/screens/player/PlayerScreen.jsx
// Экран плеера — фазы «Приготовьтесь / Упражнение / Отдых» (по референсу
// плеера, раздел 5). Логика переходов — в чистом движке player/engine.js,
// здесь только экран. Когда план пройден или пользователь подтвердил выход,
// сессия уходит наверх один раз через onFinish(result) — вкладка пишет
// журнал (незавершённая остаётся открытой с позицией для «Продолжить»),
// поверх остаётся экран итогов FinishScreen, закрытие окна — onClose().
// startIndex > 0 — продолжение сохранённой сессии: сразу с упражнения,
// без отсчёта. Разминка/заминка в плане помечены kind — в шапке фазы
// показывается «Разминка»/«Заминка» вместо номера упражнения.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Alert, Modal, ScrollView, StyleSheet, Text, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaView } from 'react-native-safe-area-context'
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated'
import { colors, motion, radius, spacing, type, F } from '../../theme'
import { makeT } from '../../i18n'
import { usePrefsStore } from '../../store/useWorkoutsStore'
import { PressableScale } from '../../components/PressableScale'
import { IconCheck, IconClose, IconPause, IconPlay, IconSkip } from '../../components/icons'
import { buildResult, PLAYER_TIMINGS } from '../../player/engine'
import { buildPlan } from '../../player/planBuilder'
import { usePlayerEngine } from '../../player/usePlayerEngine'
import { TimerRing } from '../../player/components/TimerRing'
import { ExerciseDemo } from '../../player/components/ExerciseDemo'
import { FinishScreen } from './FinishScreen'

const PHASE_COLOR = {
  prepare: colors.cyan,
  exercise: colors.accent,
  rest: colors.cyan,
  done: colors.accent,
}

export function PlayerScreen({ workout, startIndex = 0, onClose, onFinish }) {
  const lang = usePrefsStore((s) => s.lang)
  const t = useMemo(() => makeT(lang), [lang])

  const plan = useMemo(() => buildPlan(workout), [workout])
  const { state, dispatch } = usePlayerEngine(plan, true, startIndex)

  // ── Финиш: одна запись в журнал ──────────────────────────────────────
  const [result, setResult] = useState(null)
  const savedRef = useRef(false)
  useEffect(() => {
    if (state.phase !== 'done' || savedRef.current) return
    savedRef.current = true

    const res = buildResult(state, workout)
    onFinish?.(res)
    // Выход ещё до первого упражнения — показывать экран итогов нечего
    if (!res.completed && res.activeSec === 0) {
      onClose?.()
      return
    }
    setResult(res)
  }, [state, workout, onFinish, onClose])

  const quit = useCallback(() => {
    Alert.alert(t('player.quitTitle'), t('player.quitText'), [
      { text: t('player.stay'), style: 'cancel' },
      {
        text: t('player.leave'),
        style: 'destructive',
        onPress: () => dispatch({ type: 'quit' }),
      },
    ])
  }, [t, dispatch])

  // Системная «назад» ведёт себя как крестик: с подтверждением выхода
  const onRequestClose = useCallback(() => {
    if (result) onClose?.()
    else quit()
  }, [result, quit, onClose])

  // ── Итоговый экран ───────────────────────────────────────────────────
  if (result) {
    return (
      <Modal visible animationType="fade" statusBarTranslucent onRequestClose={onRequestClose}>
        <FinishScreen
          workout={workout}
          result={result}
          totalExercises={plan.length}
          lang={lang}
          onExit={onClose}
        />
      </Modal>
    )
  }

  // ── Общий прогресс плана: 0…1 ────────────────────────────────────────
  const n = plan.length
  const doneUnits =
    state.phase === 'prepare' ? 0
    : state.phase === 'exercise' ? state.index + (1 - state.secondsLeft / state.phaseTotal)
    : state.phase === 'rest' ? state.index + 1
    : n
  const overall = Math.min(Math.max(doneUnits / n, 0), 1)

  const current = plan[Math.min(state.index, n - 1)]
  const next = plan[state.index + 1]
  const phaseColor = PHASE_COLOR[state.phase]

  // Что показываем в центре: во время упражнения — текущее, в отдыхе —
  // следующее (это единственный момент, когда подсказку успевают
  // прочитать), в отсчёте — первое упражнение с его подсказкой
  const focus = state.phase === 'rest' && next ? next : current

  // Подпись фазы: у разминки/заминки — своё название, у основного блока — номер
  const kindLabel =
    focus.kind === 'warmup' ? t('player.warmup')
    : focus.kind === 'cooldown' ? t('player.cooldown')
    : null

  const phaseLabel =
    state.phase === 'prepare' ? t('player.prepare')
    : state.phase === 'rest' ? t('player.rest')
    : state.paused ? t('player.paused')
    : kindLabel || t('player.exerciseOf', { i: state.index + 1, n })

  const centerTitle =
    state.phase === 'rest' && next ? t('player.next', { name: next.name[lang] })
    : current.name[lang]

  const centerTip = focus.tip?.[lang]

  return (
    <Modal visible animationType="fade" statusBarTranslucent onRequestClose={onRequestClose}>
      <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
        <StatusBar style="light" />

        {/* Шапка: выход, фаза, общий прогресс */}
        <View style={styles.header}>
          <PressableScale
            style={styles.closeBtn}
            onPress={quit}
            accessibilityLabel={t('player.quit')}
            hitSlop={8}
          >
            <IconClose />
          </PressableScale>
          <View style={styles.headerCenter}>
            <Text style={styles.workoutTitle} numberOfLines={1}>
              {workout.title[lang]}
            </Text>
            <Text style={styles.phaseLabel}>{phaseLabel}</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.track}>
          <Animated.View
            entering={FadeIn.duration(motion.list)}
            style={[styles.trackFill, { width: `${Math.round(overall * 100)}%` }]}
          />
        </View>

        {/* Центральная зона: кольцо + название упражнения */}
        <View style={styles.center}>
          <Animated.View
            key={`${state.phase}-${state.index}`}
            entering={FadeInDown.duration(motion.list)}
            style={styles.ringWrap}
          >
            <TimerRing
              secondsLeft={state.secondsLeft}
              phaseTotal={state.phaseTotal}
              color={phaseColor}
              unitLabel={t('player.sec')}
            />
            {/* Живая демонстрация + название + подсказка: что именно делать */}
            <ExerciseDemo exercise={focus} paused={state.paused} scale={0.83} />
            <Text style={styles.exerciseName} numberOfLines={2}>
              {centerTitle}
            </Text>
            {centerTip ? (
              <Text style={styles.exerciseTip} numberOfLines={2}>
                {centerTip}
              </Text>
            ) : null}
          </Animated.View>

          {/* Кнопки отдыха */}
          {state.phase === 'rest' && (
            <Animated.View entering={FadeIn.duration(motion.chip)}>
              <PressableScale
                style={styles.pill}
                onPress={() => dispatch({ type: 'extendRest' })}
              >
                <Text style={styles.pillText}>
                  {t('player.addSec', { sec: PLAYER_TIMINGS.extendRestSec })}
                </Text>
              </PressableScale>
            </Animated.View>
          )}
        </View>

        {/* Контролы */}
        <View style={styles.controls}>
          <PressableScale
            style={styles.skipBtn}
            onPress={() => dispatch({ type: 'skip' })}
            accessibilityLabel={state.phase === 'rest' ? t('player.skipRest') : t('player.skip')}
          >
            <IconSkip />
          </PressableScale>
          <PressableScale
            style={styles.mainBtn}
            onPress={() => dispatch({ type: 'togglePause' })}
            accessibilityLabel={state.paused ? t('player.resume') : t('player.pause')}
          >
            {state.paused ? <IconPlay size={26} /> : <IconPause size={26} />}
          </PressableScale>
          <View style={styles.skipBtn}>{/* симметричный распоркой пропуск слева */}</View>
        </View>

        {/* Очередь упражнений */}
        <QueueList
          plan={plan}
          index={state.index}
          phase={state.phase}
          lang={lang}
          doneLabel={t('progress.done')}
        />
      </SafeAreaView>
    </Modal>
  )
}

/** Список очереди: текущее упражнение подсвечено, выполненные — с галочкой */
function QueueList({ plan, index, phase, lang, doneLabel }) {
  const listRef = useRef(null)

  useEffect(() => {
    const target = Math.max(0, phase === 'rest' ? index : index - 1) * 52
    listRef.current?.scrollTo({ y: target, animated: true })
  }, [index, phase])

  return (
    <ScrollView
      ref={listRef}
      style={styles.queue}
      contentContainerStyle={styles.queueContent}
      showsVerticalScrollIndicator={false}
    >
      {plan.map((e, i) => {
        const isDone = i < index || (i === index && phase === 'rest')
        const isCurrent = i === index && phase !== 'rest'
        return (
          <View
            key={e.id}
            style={[
              styles.queueRow,
              isCurrent && styles.queueRowCurrent,
              isDone && styles.queueRowDone,
            ]}
          >
            <Text
              style={[
                styles.queueIndex,
                isCurrent && { color: colors.accent },
                isDone && { color: colors.text3 },
              ]}
            >
              {i + 1}
            </Text>
            <Text
              style={[
                styles.queueName,
                isCurrent && { color: colors.text },
                isDone && { color: colors.text3 },
              ]}
              numberOfLines={1}
            >
              {e.emoji ? `${e.emoji} ` : ''}{e.name[lang]}
            </Text>
            <Text style={[styles.queueMeta, isDone && { color: colors.text3 }]}>
              {isDone ? doneLabel : `${e.durationSec} ${lang === 'ru' ? 'сек' : 'sec'}`}
            </Text>
            {isDone && <IconCheck size={14} />}
          </View>
        )
      })}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: 10,
    gap: spacing.m,
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center', minWidth: 0 },
  headerSpacer: { width: 38 },
  workoutTitle: { ...type.title, color: colors.text },
  phaseLabel: { ...type.caption, color: colors.text2, marginTop: 2 },
  track: {
    height: 3,
    backgroundColor: colors.line,
    marginTop: spacing.m,
  },
  trackFill: {
    height: 3,
    backgroundColor: colors.accent,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.l },
  ringWrap: { alignItems: 'center', gap: spacing.s },
  exerciseName: {
    ...type.title,
    fontSize: 19,
    color: colors.text,
    textAlign: 'center',
    paddingHorizontal: spacing.xxl,
  },
  exerciseTip: {
    ...type.caption,
    color: colors.text2,
    textAlign: 'center',
    paddingHorizontal: spacing.xxl,
    lineHeight: 17,
  },
  pill: {
    backgroundColor: colors.cyanSoft,
    borderColor: 'rgba(61,220,242,0.3)',
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 9,
    paddingHorizontal: 18,
  },
  pillText: { color: colors.cyan, fontSize: 13, fontWeight: '700', fontFamily: F[700] },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
    paddingBottom: spacing.l,
  },
  mainBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  queue: { maxHeight: 156, paddingHorizontal: spacing.xl },
  queueContent: { gap: 6, paddingBottom: spacing.xl },
  queueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
    height: 46,
    borderRadius: radius.row,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    paddingHorizontal: 14,
  },
  queueRowCurrent: {
    borderColor: colors.accentBorder,
    backgroundColor: colors.accentSoft,
  },
  queueRowDone: { opacity: 0.55 },
  queueIndex: {
    width: 18,
    color: colors.text3,
    fontSize: 13,
    fontWeight: '800',
    fontFamily: F[800],
    fontVariant: ['tabular-nums'],
  },
  queueName: { flex: 1, color: colors.text2, fontSize: 14, fontWeight: '600', fontFamily: F[600] },
  queueMeta: { ...type.caption, color: colors.text2 },
})

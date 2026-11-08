// src/features/workouts/components/ProgramsSection.jsx
// Секция «Программа недели» в каталоге (отзыв Кати: «делаем все»).
// Два состояния:
//  • активная программа — карточка: название, день N, точки недели
//    (закрыт/отдых/пропущен/сегодня/впереди), строка «Сегодня» с кнопкой
//    старта тренировки дня и «Сменить»;
//  • выбор программы — горизонтальные карточки с кнопкой «Начать».
// Прогресс считает селектор selectProgramState (журнал завершённых сессий).

import React, { useMemo } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { Check } from 'lucide-react-native'
import {
  selectProgramState,
  usePrefsStore,
  useSessionsStore,
} from '../store/useWorkoutsStore'
import { PROGRAMS } from '../data/programs'
import { colors, motion, radius, spacing, type, F } from '../theme'
import { makeT, plural } from '../i18n'
import { PressableScale } from './PressableScale'
import { IconPlay } from './icons'

export function ProgramsSection({ onStartWorkout }) {
  const lang = usePrefsStore((s) => s.lang)
  const t = useMemo(() => makeT(lang), [lang])
  const sessions = useSessionsStore((s) => s.sessions)
  const activeProgram = usePrefsStore((s) => s.activeProgram)
  const setActiveProgram = usePrefsStore((s) => s.setActiveProgram)

  const state = useMemo(
    () => selectProgramState(activeProgram, sessions),
    [activeProgram, sessions],
  )

  const start = (programId) =>
    setActiveProgram({ id: programId, startedAt: new Date().toISOString() })

  // Без активной программы — выбор; с активной — карточка прогресса
  if (!state) {
    return <ProgramPicker t={t} lang={lang} onPick={start} />
  }

  const { program, dayNumber, days, todayWorkout, todayDone, todayIsRest, weekDone, weekGoal } = state

  return (
    <Animated.View
      entering={FadeInDown.duration(motion.list)}
      style={styles.activeCard}
    >
      {/* Шапка: метка + название + сменить */}
      <View style={styles.activeTop}>
        <Text style={styles.activeLabel}>{t('programs.section')}</Text>
        <PressableScale hitSlop={6} onPress={() => setActiveProgram(null)}>
          <Text style={styles.changeText}>{t('programs.change')}</Text>
        </PressableScale>
      </View>
      <Text style={styles.activeTitle}>{program.title[lang]}</Text>
      <Text style={styles.activeMeta}>
        {t('programs.day', { n: dayNumber })} · {t('programs.weekOf', { done: weekDone, goal: weekGoal })}
      </Text>

      {/* Точки недели */}
      <View style={styles.dots}>
        {days.map((d, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              d.done && styles.dotDone,
              d.kind === 'rest' && styles.dotRest,
              !d.done && d.isPast && d.kind !== 'rest' && styles.dotMissed,
              d.isToday && styles.dotToday,
            ]}
          >
            {d.done && <Check size={11} color={colors.accentInk} strokeWidth={3} />}
          </View>
        ))}
      </View>

      {/* Строка «Сегодня» */}
      <View style={styles.todayRow}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.todayLabel}>{t('programs.today')}</Text>
          <Text style={styles.todayName} numberOfLines={1}>
            {todayIsRest
              ? t('programs.rest')
              : todayDone
                ? `${todayWorkout?.title[lang] ?? ''} · ${t('programs.doneToday')}`
                : todayWorkout?.title[lang] ?? ''}
          </Text>
        </View>
        {!todayIsRest && !todayDone && todayWorkout && (
          <PressableScale
            style={styles.todayBtn}
            onPress={() => onStartWorkout?.(todayWorkout)}
            accessibilityLabel={t('programs.startToday')}
          >
            <IconPlay size={15} />
          </PressableScale>
        )}
      </View>
    </Animated.View>
  )
}

/** Выбор программы: горизонтальные карточки */
function ProgramPicker({ t, lang, onPick }) {
  return (
    <View>
      <View style={styles.sectionRow}>
        <Text style={styles.section}>{t('programs.pick')}</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.pickerContent}
        style={{ flexGrow: 0 }}
      >
        {PROGRAMS.map((p) => (
          <View key={p.id} style={styles.pickCard}>
            <Text style={styles.pickTitle}>{p.title[lang]}</Text>
            <Text style={styles.pickDesc} numberOfLines={2}>
              {p.desc[lang]}
            </Text>
            <Text style={styles.pickMeta}>
              {perWeekText(lang, p.days.filter((d) => !d.rest).length)}
            </Text>
            <PressableScale style={styles.pickBtn} onPress={() => onPick(p.id)}>
              <Text style={styles.pickBtnText}>{t('programs.start')}</Text>
            </PressableScale>
          </View>
        ))}
      </ScrollView>
    </View>
  )
}

/** «N тренировок в неделю» с русской плюрализацией */
function perWeekText(lang, n) {
  if (lang === 'en') {
    return n === 1 ? '1 workout a week' : `${n} workouts a week`
  }
  const word = plural(lang, n, { one: 'тренировка', few: 'тренировки', many: 'тренировок' })
  return `${n} ${word} в неделю`
}

const styles = StyleSheet.create({
  sectionRow: { marginTop: spacing.xxl },
  section: { ...type.title, color: colors.text },
  pickerContent: { gap: spacing.m, paddingTop: spacing.m, paddingRight: spacing.xl },
  pickCard: {
    width: 230,
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: radius.card,
    padding: spacing.l,
  },
  pickTitle: { ...type.title, color: colors.text },
  pickDesc: { ...type.caption, color: colors.text2, marginTop: 6, minHeight: 32 },
  pickMeta: { ...type.caption, color: colors.cyan, marginTop: 8 },
  pickBtn: {
    marginTop: spacing.m,
    backgroundColor: colors.accentSoft,
    borderColor: colors.accentBorder,
    borderWidth: 1,
    borderRadius: radius.field,
    paddingVertical: 9,
    alignItems: 'center',
  },
  pickBtnText: { color: colors.accent, fontSize: 13, fontWeight: '800', fontFamily: F[800] },

  activeCard: {
    backgroundColor: colors.card,
    borderColor: colors.accentBorder,
    borderWidth: 1,
    borderRadius: radius.screen,
    padding: spacing.l,
    marginTop: 14,
  },
  activeTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  activeLabel: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: F[700],
    color: colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  changeText: { ...type.caption, color: colors.text2 },
  activeTitle: { ...type.title, color: colors.text, marginTop: 8 },
  activeMeta: { ...type.caption, color: colors.text2, marginTop: 3 },
  dots: { flexDirection: 'row', gap: 8, marginTop: spacing.l },
  dot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotDone: { backgroundColor: colors.accent, borderColor: colors.accent },
  dotRest: { borderStyle: 'dashed', backgroundColor: 'transparent' },
  dotMissed: { backgroundColor: 'transparent', opacity: 0.55 },
  dotToday: { borderColor: colors.accent, borderWidth: 2 },
  todayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
    marginTop: spacing.l,
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: radius.row,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  todayLabel: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: F[700],
    color: colors.text2,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  todayName: { color: colors.text, fontWeight: '700', fontFamily: F[700], fontSize: 14.5, marginTop: 3 },
  todayBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
})

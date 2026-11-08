// src/features/workouts/screens/WorkoutsScreen.jsx
// Экран «Каталог» — по референсу вкладки. Дополнение NutriBear: проп
// footer (запись своей тренировки вручную) рендерится в конце списка.

import React, { useCallback, useMemo, useState, useEffect } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import Animated, { FadeInDown } from 'react-native-reanimated'
import {
  selectResumeSession, selectSummary, usePrefsStore, useSessionsStore,
} from '../store/useWorkoutsStore'
import { MOCK_WORKOUTS } from '../data/mockWorkouts'
import { buildPlan } from '../player/planBuilder'
import { colors, motion, radius, spacing, type, F } from '../theme'
import { formatDateLong, makeT, plural } from '../i18n'
import { FilterChips } from '../components/FilterChips'
import { SearchBar } from '../components/SearchBar'
import { WorkoutCard } from '../components/WorkoutCard'
import { WorkoutCardWide } from '../components/WorkoutCardWide'
import { ProgramsSection } from '../components/ProgramsSection'
import { ProgressRing } from '../components/ProgressRing'
import { EmptyState } from '../components/EmptyState'
import { SkeletonList } from '../components/Skeleton'
import { PressableScale } from '../components/PressableScale'
import { IconFlame, IconPlay } from '../components/icons'
import { Volume2, VolumeX } from 'lucide-react-native'

const FILTER_VALUES = ['all', 'strength', 'cardio', 'hiit', 'yoga', 'stretch']

export function WorkoutsScreen({ onStartWorkout, onResumeWorkout, footer }) {
  const lang = usePrefsStore((s) => s.lang)
  const filterType = usePrefsStore((s) => s.filterType)
  const query = usePrefsStore((s) => s.query)
  const setFilterType = usePrefsStore((s) => s.setFilterType)
  const setQuery = usePrefsStore((s) => s.setQuery)
  const resetFilters = usePrefsStore((s) => s.resetFilters)
  const sessions = useSessionsStore((s) => s.sessions)
  const hydrated = useSessionsStore((s) => s.hydrated)

  const [booting, setBooting] = useState(true)
  useEffect(() => {
    const id = setTimeout(() => setBooting(false), 320)
    return () => clearTimeout(id)
  }, [])

  const t = useMemo(() => makeT(lang), [lang])
  const today = useMemo(() => formatDateLong(new Date(), lang), [lang])

  const summary = useMemo(() => selectSummary(sessions), [sessions])
  const resume = useMemo(() => selectResumeSession(sessions), [sessions])

  // Точный остаток «Продолжить»: план детерминированный — считаем активные
  // секунды до сохранённой позиции (позиция = индекс упражнения в плане)
  const resumeInfo = useMemo(() => {
    if (!resume) return null
    const { session, workout } = resume
    const plan = buildPlan(workout)
    const pos = Math.min(session.position || 0, plan.length)
    const doneSec = plan.slice(0, pos).reduce((a, e) => a + e.durationSec, 0)
    const plannedSec = plan.reduce((a, e) => a + e.durationSec, 0)
    const frac = plannedSec > 0 ? Math.min(1, doneSec / plannedSec) : 0
    return {
      frac,
      leftMin: Math.max(1, Math.round((plannedSec - doneSec) / 60)),
      fromExercise: pos > 0,
    }
  }, [resume])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return MOCK_WORKOUTS.filter(
      (w) =>
        (filterType === 'all' || w.type === filterType) &&
        (q === '' || w.title[lang].toLowerCase().includes(q)),
    )
  }, [filterType, query, lang])

  const recommended = useMemo(
    () => MOCK_WORKOUTS.filter((w) => w.recommended),
    [],
  )

  const startWorkout = useCallback(
    (workout) => {
      useSessionsStore.getState().startSession(workout)
      onStartWorkout?.(workout)
    },
    [onStartWorkout],
  )

  const streakWord = plural(lang, summary.streakDays, {
    one: lang === 'ru' ? 'день' : 'day',
    few: lang === 'ru' ? 'дня' : 'days',
    many: lang === 'ru' ? 'дней' : 'days',
  })

  const isLoading = booting || !hydrated

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Шапка */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.date}>{today}</Text>
            <Text style={styles.title}>{t('catalog.title')}</Text>
          </View>
          <View style={styles.headerBtns}>
            <SoundButton />
            <LangButton />
          </View>
        </View>

        {/* Серия */}
        {summary.streakDays > 0 && (
          <Animated.View entering={FadeInDown.duration(motion.list)} style={styles.streak}>
            <View style={styles.streakIcon}>
              <IconFlame size={18} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.streakTitle}>
                {t('catalog.streak', { count: summary.streakDays, word: streakWord })}
              </Text>
              {summary.recordDays > summary.streakDays && (
                <Text style={styles.streakSub}>
                  {t('catalog.streakNext', {
                    count: summary.recordDays - summary.streakDays,
                    word: streakWord,
                    record: summary.recordDays,
                  })}
                </Text>
              )}
            </View>
          </Animated.View>
        )}

        {/* Программа недели */}
        <ProgramsSection onStartWorkout={startWorkout} />

        {/* Продолжить */}
        {resume && !isLoading && resumeInfo && (
          <View style={styles.continueCard}>
            <ProgressRing
              progress={resumeInfo.frac}
              label={`${Math.round(resumeInfo.frac * 100)}%`}
            />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.continueLabel}>{t('catalog.continue')}</Text>
              <Text style={styles.continueName} numberOfLines={1}>
                {resume.workout.title[lang]}
              </Text>
              <Text style={styles.continueMeta} numberOfLines={1}>
                {t('catalog.continueLeft', { min: resumeInfo.leftMin })}
                {resumeInfo.fromExercise ? ` · ${t('catalog.continueFrom')}` : ''}
              </Text>
            </View>
            <PressableScale
              style={styles.play}
              onPress={() => (onResumeWorkout ?? onStartWorkout)?.(resume.workout, resume.session)}
              accessibilityLabel={t('catalog.continue')}
            >
              <IconPlay />
            </PressableScale>
          </View>
        )}

        {/* Поиск и фильтры */}
        <SearchBar
          placeholder={t('catalog.searchPh')}
          value={query}
          onChangeDebounced={setQuery}
        />
        <FilterChips
          values={FILTER_VALUES}
          labels={Object.fromEntries(
            FILTER_VALUES.map((v) => [v, t(`type.${v}`)]),
          )}
          value={filterType}
          onChange={setFilterType}
        />

        {/* Рекомендации */}
        {filtered.length > 0 && (
          <>
            <View style={styles.sectionRow}>
              <Text style={styles.section}>{t('catalog.recommended')}</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.recContent}
              style={{ flexGrow: 0 }}
            >
              {recommended.map((w) => (
                <WorkoutCardWide
                  key={w.id}
                  workout={w}
                  lang={lang}
                  typeLabel={t(`type.${w.type}`)}
                  minLabel={lang === 'ru' ? 'мин' : 'min'}
                  kcalLabel={lang === 'ru' ? 'ккал' : 'kcal'}
                  onPress={startWorkout}
                />
              ))}
            </ScrollView>
          </>
        )}

        {/* Все тренировки */}
        <View style={styles.sectionRow}>
          <Text style={styles.section}>{t('catalog.all')}</Text>
          <Text style={styles.count}>{filtered.length}</Text>
        </View>

        {isLoading ? (
          <SkeletonList rows={3} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title={t('catalog.emptyTitle')}
            text={t('catalog.emptyText')}
            buttonLabel={t('catalog.emptyButton')}
            onPress={resetFilters}
          />
        ) : (
          <View style={styles.list}>
            {filtered.map((w, i) => (
              <Animated.View
                key={w.id}
                entering={FadeInDown.duration(motion.list).delay(i * motion.stagger)}
              >
                <WorkoutCard
                  workout={w}
                  lang={lang}
                  typeLabel={t(`type.${w.type}`)}
                  levelLabel={t(`level.${w.level}`)}
                  minLabel={lang === 'ru' ? 'мин' : 'min'}
                  kcalLabel={lang === 'ru' ? 'ккал' : 'kcal'}
                  onPress={startWorkout}
                />
              </Animated.View>
            ))}
          </View>
        )}

        {/* Своя тренировка — запись вручную (интеграция NutriBear) */}
        {footer}
      </ScrollView>
    </View>
  )
}

/** Тумблер звуковых сигналов плеера */
function SoundButton() {
  const soundOn = usePrefsStore((s) => s.soundOn)
  const setSoundOn = usePrefsStore((s) => s.setSoundOn)
  return (
    <PressableScale
      style={styles.langBtn}
      onPress={() => setSoundOn(!soundOn)}
      accessibilityRole="switch"
      accessibilityState={{ selected: soundOn }}
      accessibilityLabel="Sound"
    >
      {soundOn
        ? <Volume2 size={15} color={colors.accent} />
        : <VolumeX size={15} color={colors.text3} />}
    </PressableScale>
  )
}

/** Переключатель языка: показывает целевой язык (RU -> EN, EN -> RU) */
function LangButton() {
  const lang = usePrefsStore((s) => s.lang)
  const setLang = usePrefsStore((s) => s.setLang)
  return (
    <PressableScale
      style={styles.langBtn}
      onPress={() => setLang(lang === 'ru' ? 'en' : 'ru')}
      accessibilityLabel="Language"
    >
      <Text style={styles.langText}>{lang === 'ru' ? 'EN' : 'RU'}</Text>
    </PressableScale>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  content: { paddingHorizontal: spacing.xl, paddingBottom: 110 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  headerBtns: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  date: { ...type.caption, color: colors.text2 },
  title: { ...type.display, color: colors.text, marginTop: 4, letterSpacing: -0.4 },
  langBtn: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 999,
    minHeight: 32,
    justifyContent: 'center',
  },
  langText: { color: colors.text2, fontSize: 11, fontWeight: '700', fontFamily: F[700], letterSpacing: 1 },
  streak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.accentSoft,
    borderColor: colors.accentBorder,
    borderWidth: 1,
    borderRadius: radius.row,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginTop: spacing.l,
  },
  streakIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakTitle: { color: colors.text, fontWeight: '700', fontFamily: F[700], fontSize: 14.5 },
  streakSub: { ...type.caption, color: colors.text2, marginTop: 2 },
  continueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: radius.screen,
    padding: spacing.l,
    marginTop: 14,
  },
  continueLabel: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: F[700],
    color: colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  continueName: {
    fontSize: 16.5,
    fontWeight: '800',
    fontFamily: F[800],
    color: colors.text,
    marginTop: 4,
  },
  continueMeta: { ...type.caption, color: colors.text2, marginTop: 4 },
  play: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: spacing.xxl,
  },
  section: { ...type.title, color: colors.text },
  count: { ...type.caption, color: colors.text2 },
  recContent: { gap: spacing.m, paddingRight: spacing.xl, paddingTop: spacing.m },
  list: { gap: 10, marginTop: spacing.m },
})

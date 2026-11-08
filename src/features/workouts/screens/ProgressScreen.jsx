// src/features/workouts/screens/ProgressScreen.jsx
// Экран «Прогресс» — по референсу вкладки: стат-карточки, неделя,
// календарь активности и достижения.

import React, { useMemo, useState, useEffect } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import Animated, { FadeInDown } from 'react-native-reanimated'
import {
  selectSummary, usePrefsStore, useSessionsStore,
} from '../store/useWorkoutsStore'
import { colors, motion, spacing, type } from '../theme'
import { dict, formatMonth, formatNumber, makeT, plural } from '../i18n'
import { StatCard } from '../components/StatCard'
import { WeeklyBars } from '../components/WeeklyBars'
import { ActivityCalendar } from '../components/ActivityCalendar'
import { BadgeCard } from '../components/BadgeCard'
import { EmptyState } from '../components/EmptyState'
import { SkeletonStats } from '../components/Skeleton'
import { PressableScale } from '../components/PressableScale'
import { IconCalendar, IconClock, IconFlame, IconKcal } from '../components/icons'

export function ProgressScreen({ onGoCatalog }) {
  const lang = usePrefsStore((s) => s.lang)
  const sessions = useSessionsStore((s) => s.sessions)
  const hydrated = useSessionsStore((s) => s.hydrated)

  const [booting, setBooting] = useState(true)
  useEffect(() => {
    const id = setTimeout(() => setBooting(false), 320)
    return () => clearTimeout(id)
  }, [])

  const t = useMemo(() => makeT(lang), [lang])
  const month = useMemo(() => formatMonth(new Date(), lang), [lang])
  const summary = useMemo(() => selectSummary(sessions), [sessions])

  const isLoading = booting || !hydrated
  const isEmpty = !isLoading && sessions.filter((s) => s.completed).length === 0

  const dayWord = plural(lang, 30, {
    one: lang === 'ru' ? 'дня' : 'day',
    few: lang === 'ru' ? 'дней' : 'days',
    many: lang === 'ru' ? 'дней' : 'days',
  })
  const doneDays = summary.calendar.filter((d) => d.level > 0).length

  const openBadges = summary.badges.filter((b) => b.unlocked).length

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
            <Text style={styles.date}>{month}</Text>
            <Text style={styles.title}>{t('progress.title')}</Text>
          </View>
          <LangButton />
        </View>

        {isLoading ? (
          <SkeletonStats />
        ) : isEmpty ? (
          <>
            <EmptyState
              title={t('progress.emptyTitle')}
              text={t('progress.emptyText')}
              buttonLabel={t('progress.emptyButton')}
              onPress={onGoCatalog}
            />
          </>
        ) : (
          <>
            {/* Стат-карточки */}
            <View style={styles.grid}>
              <View style={styles.cell}>
                <StatCard
                  icon={<IconFlame size={15} />}
                  value={summary.streakDays}
                  label={t('progress.streak')}
                  format={(n) => formatNumber(Math.round(n), lang)}
                />
              </View>
              <View style={styles.cell}>
                <StatCard
                  icon={<IconCalendar />}
                  value={summary.monthWorkouts}
                  label={t('progress.monthWorkouts')}
                  format={(n) => formatNumber(Math.round(n), lang)}
                />
              </View>
              <View style={styles.cell}>
                <StatCard
                  icon={<IconClock />}
                  value={summary.monthMinutes}
                  unit={lang === 'ru' ? 'мин' : 'min'}
                  label={t('progress.minutes')}
                  format={(n) => formatNumber(Math.round(n), lang)}
                />
              </View>
              <View style={styles.cell}>
                <StatCard
                  icon={<IconKcal />}
                  value={summary.monthKcal}
                  unit={lang === 'ru' ? 'ккал' : 'kcal'}
                  label={t('progress.kcal')}
                  format={(n) => formatNumber(Math.round(n), lang)}
                />
              </View>
            </View>

            {/* Неделя */}
            <WeeklyBars
              minutes={summary.weekMinutes}
              labels={[...dict[lang].week]}
              title={t('progress.week')}
              totalLabel={t('progress.weekTotal', {
                count: formatNumber(
                  summary.weekMinutes.reduce((a, b) => a + b, 0),
                  lang,
                ),
              })}
            />

            {/* Календарь */}
            <ActivityCalendar
              calendar={summary.calendar}
              lang={lang}
              title={t('progress.calendar')}
              summary={t('progress.calendarOf', {
                done: doneDays,
                total: summary.calendar.length,
                days: dayWord,
              })}
              legendLess={t('progress.less')}
              legendMore={t('progress.more')}
            />

            {/* Достижения */}
            <View style={styles.sectionRow}>
              <Text style={styles.section}>{t('progress.badges')}</Text>
              <Text style={styles.count}>
                {t('progress.badgesOf', {
                  open: openBadges,
                  total: summary.badges.length,
                })}
              </Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.badgeRow}
              style={{ flexGrow: 0 }}
            >
              {summary.badges.map((b, i) => (
                <Animated.View
                  key={b.id}
                  entering={FadeInDown.duration(motion.list).delay(i * motion.stagger)}
                >
                  <BadgeCard
                    badge={b}
                    lang={lang}
                    doneLabel={t('progress.done')}
                    progressLabel={b.progress}
                  />
                </Animated.View>
              ))}
            </ScrollView>
          </>
        )}
      </ScrollView>
    </View>
  )
}

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
  langText: { color: colors.text2, fontSize: 11, fontWeight: '700', fontFamily: 'Inter_600SemiBold', letterSpacing: 1 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: spacing.l,
  },
  cell: { width: '47%', flexGrow: 1 },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: spacing.xxl,
  },
  section: { ...type.title, color: colors.text },
  count: { ...type.caption, color: colors.text2 },
  badgeRow: { gap: 10, paddingTop: spacing.m, paddingRight: spacing.xl },
})

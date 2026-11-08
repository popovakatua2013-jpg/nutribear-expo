// src/features/workouts/components/ActivityCalendar.jsx
// Тепловая карта месяца: 4 уровня интенсивности, легенда.

import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { colors, radius, spacing, F } from '../theme'
import { formatNumber } from '../i18n'

/** Заголовки столбцов: неделя начинается с воскресенья (как в макете) */
const weekHeaders = {
  ru: ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'],
  en: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
}

const levelColors = {
  0: colors.surface2,
  1: 'rgba(200,255,61,0.22)',
  2: 'rgba(200,255,61,0.45)',
  3: colors.accent,
}

export function ActivityCalendar({
  calendar, title, summary, legendLess, legendMore, lang,
}) {
  const firstDow = calendar.length > 0 ? dowOfMonth(calendar[0].day) : 0

  return (
    <View style={styles.panel}>
      <View style={styles.head}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.total}>{summary}</Text>
      </View>
      <View style={styles.grid}>
        {weekHeaders[lang].map((d, i) => (
          <Text key={`wd${i}`} style={styles.wd}>{d}</Text>
        ))}
        {/* Пустые клетки до первого дня месяца */}
        {Array.from({ length: firstDow }, (_, i) => (
          <View key={`pad${i}`} style={styles.cell} />
        ))}
        {calendar.map(({ day, level }) => (
          <View
            key={day}
            style={[styles.cell, { backgroundColor: levelColors[level] }]}
          >
            <Text style={[styles.dayNum, level === 3 && styles.dayNumHot]}>
              {formatNumber(day, lang)}
            </Text>
          </View>
        ))}
      </View>
      <View style={styles.legend}>
        <Text style={styles.legendText}>{legendLess}</Text>
        {[0, 1, 2, 3].map((l) => (
          <View key={l} style={[styles.legendCell, { backgroundColor: levelColors[l] }]} />
        ))}
        <Text style={styles.legendText}>{legendMore}</Text>
      </View>
    </View>
  )
}

/** День недели 1-го числа месяца текущего года (0 = воскресенье) */
function dowOfMonth() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1).getDay()
}

const CELL = 38

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: radius.card,
    padding: spacing.l,
    marginTop: spacing.m,
  },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 15, fontWeight: '800', fontFamily: F[800], color: colors.text },
  total: { fontSize: 12, fontWeight: '600', fontFamily: F[600], color: colors.text2 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: spacing.l,
  },
  wd: {
    width: CELL,
    textAlign: 'center',
    fontSize: 9.5,
    fontWeight: '700',
    fontFamily: F[700],
    color: colors.text3,
    paddingBottom: 2,
  },
  cell: {
    width: CELL,
    height: CELL,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNum: { fontSize: 10, fontWeight: '600', fontFamily: F[600], color: colors.text3 },
  dayNumHot: { color: colors.accentInk, fontWeight: '800', fontFamily: F[800] },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  legendCell: { width: 14, height: 14, borderRadius: 4 },
  legendText: { fontSize: 10.5, fontFamily: F[400], color: colors.text3 },
})

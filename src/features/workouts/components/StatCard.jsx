// src/features/workouts/components/StatCard.jsx
// Стат-карточка сетки прогресса; число анимируется от нуля.
// Форматирование числа обязано работать на UI-потоке (useAnimatedProps —
// worklet): вызывать оттуда обычные JS-функции (Intl в том числе) нельзя —
// падает «Tried to synchronously call a Remote Function». Поэтому внутри
// worklet число приводится к строке своими силами, а разделитель тысяч
// вставляется вручную (неразрывный пробел, как у Intl для русского).
// Проп format используется только для статичного текста на JS-потоке.

import React, { useEffect } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Animated, {
  Easing, useAnimatedProps, useSharedValue, withTiming,
} from 'react-native-reanimated'
import { colors, radius, F } from '../theme'

const AnimatedText = Animated.createAnimatedComponent(Text)

const NBSP = '\u00A0'

/** Разделитель тысяч без Intl — безопасно вызывать из worklet */
function formatThousands(n) {
  'worklet'
  const s = String(Math.round(n))
  let out = ''
  for (let i = 0; i < s.length; i++) {
    const fromEnd = s.length - i
    out += s[i]
    if (fromEnd > 1 && fromEnd % 3 === 1) out += NBSP
  }
  return out
}

export function StatCard({ icon, value, unit, label, format }) {
  const v = useSharedValue(0)
  // В worklet попадает только булев флаг — саму функцию-форматтер туда
  // передавать нельзя (вызов из worklet = «remote function»)
  const thousands = Boolean(format)

  useEffect(() => {
    v.value = withTiming(value, {
      duration: 500,
      easing: Easing.out(Easing.quad),
    })
  }, [value, v])

  const animatedProps = useAnimatedProps(() => {
    const s = thousands ? formatThousands(v.value) : String(Math.round(v.value))
    return { text: s, defaultText: s }
  })

  // Статичный текст до старта анимации — на JS-потоке, здесь Intl доступен
  const staticText = format ? format(value) : String(Math.round(value))

  return (
    <View style={styles.card}>
      <View style={styles.top}>{icon}</View>
      <View style={styles.valueRow}>
        <AnimatedText animatedProps={animatedProps} style={styles.value}>
          {staticText}
        </AnimatedText>
        {unit ? <Text style={styles.unit}>{unit}</Text> : null}
      </View>
      <Text style={styles.label}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: radius.card,
    padding: 14,
  },
  top: { alignItems: 'flex-start' },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 9 },
  value: {
    fontSize: 23,
    fontWeight: '800',
    fontFamily: F[800],
    color: colors.text,
    letterSpacing: -0.4,
    fontVariant: ['tabular-nums'],
  },
  unit: { fontSize: 12, fontWeight: '600', fontFamily: F[600], color: colors.text2, marginLeft: 3 },
  label: { fontSize: 12, fontWeight: '600', fontFamily: F[600], color: colors.text2, marginTop: 3 },
})

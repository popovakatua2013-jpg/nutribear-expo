// src/features/workouts/player/components/TimerRing.jsx
// Кольцо обратного отсчёта плеера (по референсу плеера, раздел 5.1).
// Дуга движется линейно в течение секунды — визуально таймер «течёт»,
// а не прыгает раз в секунду.
// Два режима:
//  • children переданы — весь интерьер кольца занимает сцена
//    (живая демонстрация упражнения), остаток секунд — компактный
//    бейдж-пилюля сверху, чтобы не перекрывать фигуру;
//  • без children — как раньше: крупные секунды в центре.
import React, { useEffect } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Svg, { Circle, G } from 'react-native-svg'
import Animated, {
  Easing, useAnimatedProps, useSharedValue, withTiming,
} from 'react-native-reanimated'
import { colors, F } from '../../theme'

const AnimatedCircle = Animated.createAnimatedComponent(Circle)

export function TimerRing({
  secondsLeft,
  phaseTotal,
  color,
  unitLabel = 'сек',
  size = 240,
  strokeWidth = 10,
  children,
}) {
  const r = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * r
  const progress = phaseTotal > 0 ? 1 - secondsLeft / phaseTotal : 0

  const value = useSharedValue(0)
  useEffect(() => {
    value.value = withTiming(Math.min(Math.max(progress, 0), 1), {
      duration: 950,
      easing: Easing.linear,
    })
  }, [progress, value])

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - value.value),
  }))

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <G rotation={-90} originX={size / 2} originY={size / 2}>
          <Circle
            cx={size / 2} cy={size / 2} r={r}
            stroke={colors.line} strokeWidth={strokeWidth} fill="none"
          />
          <AnimatedCircle
            cx={size / 2} cy={size / 2} r={r}
            stroke={color} strokeWidth={strokeWidth} fill="none"
            strokeLinecap="round" strokeDasharray={circumference}
            animatedProps={animatedProps}
          />
        </G>
      </Svg>
      {children ? (
        <>
          {/* Сцена на весь интерьер кольца: якорь к низу, чтобы фигура
              стояла «на полу» у внутренней кромки дуги */}
          <View style={[styles.stage, { borderRadius: size / 2 }]}>{children}</View>
          {/* Компактный бейдж секунд поверх сцены (фон-пилюля, чтобы
              читался и над поднятими руками) */}
          <View style={styles.badgeWrap} pointerEvents="none">
            <View style={styles.badge}>
              <Text style={[styles.badgeNum, { color }]}>
                {Math.max(secondsLeft, 0)}
              </Text>
              <Text style={styles.badgeUnit}>{unitLabel}</Text>
            </View>
          </View>
        </>
      ) : (
        <View style={styles.center}>
          <Text style={[styles.seconds, { color }]}>
            {Math.max(secondsLeft, 0)}
          </Text>
          <Text style={styles.unit}>{unitLabel}</Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stage: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 40, // пол фигуры — у внутренней кромки дуги
    overflow: 'hidden',
  },
  badgeWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    paddingTop: 10,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
    backgroundColor: 'rgba(10,12,16,0.68)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 3,
  },
  badgeNum: {
    fontSize: 28,
    fontWeight: '800',
    fontFamily: F[800],
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
  },
  badgeUnit: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: F[600],
    color: colors.text2,
  },
  seconds: {
    fontSize: 72,
    fontWeight: '800',
    fontFamily: F[800],
    letterSpacing: -2,
    fontVariant: ['tabular-nums'],
  },
  unit: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: F[600],
    color: colors.text2,
    marginTop: -6,
  },
})

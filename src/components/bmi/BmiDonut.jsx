// Кольцевой датчик ИМТ — главный акцент вкладки: крупное градиентное
// кольцо (голубой → синий → фиолетовый → маджента), при открытии белая
// дуга плавно «заливается» до текущего ИМТ, число в центре отсчитывается
// вверх, после заливки дуга мягко «дышит» (пульсация яркости).
// Анимация — обычный Animated из react-native (JS-драйвер) поверх
// strokeDashoffset и strokeOpacity БЕЗ Reanimated: Reanimated поверх
// SVG-экранов ронял приложение, не возвращать. Шкала: ИМТ 15 → 40,
// старт с 9 часов — норма ложится на верх кольца.

import { useEffect, useRef, useState } from 'react'
import { Animated, Easing, Text, View } from 'react-native'
import Svg, { Defs, LinearGradient as SvgGradient, Stop, Circle, Path } from 'react-native-svg'
import { Check } from 'lucide-react-native'
import { bmiCategory, fmtDecimal } from '@/lib/data/bmi'

const SIZE = 136
const C = SIZE / 2
const R = 53
const STROKE = 17.5

// Короткое название категории для бейджа внутри кольца — полное
// («Ожирение II–III ст.») не помещается в отверстии
const SHORT_LABEL = {
  low: 'Дефицит',
  norm: 'Норма',
  over: 'Лишний вес',
  obese1: 'Ожирение',
  obese2: 'Ожирение',
}

// Шкала: ИМТ 15 → 40; угол по часовой от 12 часов.
// 262° — старт (9 часов), 270° дуги: норма 18,5–25 ложится на верх,
// лишний вес — на верх-право, ожирение — на правую сторону.
const BMI_MIN = 15
const BMI_MAX = 40
const START_DEG = 262
const SWEEP_DEG = 270

// Длина полной дуги — через неё работает эффект «заливания»
const ARC_LEN = 2 * Math.PI * R * (SWEEP_DEG / 360)

const rad = (d) => (d * Math.PI) / 180
const ptOnRing = (deg) => [C + R * Math.sin(rad(deg)), C - R * Math.cos(rad(deg))]

// Полная дуга шкалы: от START_DEG по часовой на SWEEP_DEG;
// видимая часть управляется strokeDashoffset
const [SX, SY] = ptOnRing(START_DEG)
const [EX, EY] = ptOnRing(START_DEG + SWEEP_DEG)
const FULL_ARC = `M ${SX.toFixed(2)} ${SY.toFixed(2)} A ${R} ${R} 0 1 1 ${EX.toFixed(2)} ${EY.toFixed(2)}`

const AnimatedPath = Animated.createAnimatedComponent(Path)

export function BmiDonut({ bmi }) {
  const cat = bmiCategory(bmi)
  const target = Math.min(BMI_MAX, Math.max(BMI_MIN, bmi || BMI_MIN))
  const targetFrac = (target - BMI_MIN) / (BMI_MAX - BMI_MIN)

  // Дуга «заливается» (dashoffset), число отсчитывается вверх (numVal)
  const arcVal = useRef(new Animated.Value(0)).current
  const numVal = useRef(new Animated.Value(BMI_MIN)).current
  const [num, setNum] = useState(BMI_MIN)
  const firstRun = useRef(true)

  useEffect(() => {
    const sub = numVal.addListener(({ value }) => setNum(value))
    return () => numVal.removeListener(sub)
  }, [numVal])

  // Пульсация после заливки: яркость дуги мягко колеблется 1 ↔ 0.76,
  // свечение под дугой — 0.18 ↔ 0.34 (кольцо «дышит»)
  const pulseVal = useRef(new Animated.Value(0)).current
  const pulseLoop = useRef(null)

  useEffect(() => () => pulseLoop.current?.stop(), [])

  useEffect(() => {
    const dur = firstRun.current ? 1400 : 700
    firstRun.current = false
    Animated.parallel([
      Animated.timing(arcVal, {
        toValue: targetFrac,
        duration: dur,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(numVal, {
        toValue: target,
        duration: dur,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    ]).start(({ finished }) => {
      // Пульс запускаем один раз — когда заливка впервые дошла до конца
      if (!finished || pulseLoop.current) return
      pulseLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseVal, {
            toValue: 1,
            duration: 950,
            // именно sin: Easing.sine в react-native не существует
            // (undefined) — пульс кольца падал с «undefined is not a function»
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: false,
          }),
          Animated.timing(pulseVal, {
            toValue: 0,
            duration: 950,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: false,
          }),
        ])
      )
      pulseLoop.current.start()
    })
  }, [target, targetFrac, arcVal, numVal, pulseVal])

  const dashOffset = arcVal.interpolate({
    inputRange: [0, 1],
    outputRange: [ARC_LEN, ARC_LEN * (1 - targetFrac)],
  })
  const brightOpacity = pulseVal.interpolate({ inputRange: [0, 1], outputRange: [1, 0.76] })
  const glowOpacity = pulseVal.interpolate({ inputRange: [0, 1], outputRange: [0.18, 0.34] })

  return (
    <View className="h-[136px] w-[136px] shrink-0 items-center justify-center">
      <Svg width={SIZE} height={SIZE} style={{ position: 'absolute' }}>
        <Defs>
          <SvgGradient id="nbsRing" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#53E3F2" />
            <Stop offset="0.42" stopColor="#6366F1" />
            <Stop offset="0.72" stopColor="#A855F7" />
            <Stop offset="1" stopColor="#EA5CF5" />
          </SvgGradient>
        </Defs>

        {/* Мягкое свечение кольца: тот же градиент шире и бледнее */}
        <Circle
          cx={C}
          cy={C}
          r={R}
          stroke="url(#nbsRing)"
          strokeOpacity={0.22}
          strokeWidth={26}
          fill="none"
        />
        {/* Основное толстое градиентное кольцо */}
        <Circle
          cx={C}
          cy={C}
          r={R}
          stroke="url(#nbsRing)"
          strokeWidth={STROKE}
          fill="none"
        />
        {/* Заливающаяся белая дуга: лёгкое свечение + яркая линия.
            При открытии плавно дорастает до текущего ИМТ */}
        <AnimatedPath
          d={FULL_ARC}
          stroke="#FFFFFF"
          strokeOpacity={glowOpacity}
          strokeWidth={STROKE + 4}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={ARC_LEN}
          strokeDashoffset={dashOffset}
        />
        <AnimatedPath
          d={FULL_ARC}
          stroke="#FFFFFF"
          strokeOpacity={brightOpacity}
          strokeWidth={STROKE}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={ARC_LEN}
          strokeDashoffset={dashOffset}
        />
      </Svg>

      <Text className="font-extrabold text-[36px] leading-none tracking-tight text-white">
        {fmtDecimal(num)}
      </Text>
      <View
        className="mt-[4px] flex-row items-center gap-[4px] rounded-full px-1.5 py-[3px]"
        style={{
          backgroundColor: `${cat.color}26`,
          shadowColor: cat.color,
          shadowOpacity: 0.5,
          shadowRadius: 9,
        }}
      >
        <Text
          maxFontSizeMultiplier={1.1}
          numberOfLines={1}
          className="font-bold text-[10px] leading-none"
          style={{ color: cat.color }}
        >
          {SHORT_LABEL[cat.id] || cat.label}
        </Text>
        {/* Галочка в залитом кружке */}
        <View
          className="h-[15px] w-[15px] items-center justify-center rounded-full"
          style={{ backgroundColor: cat.color }}
        >
          <Check size={10} color="#0B1B12" strokeWidth={3.6} />
        </View>
      </View>
    </View>
  )
}

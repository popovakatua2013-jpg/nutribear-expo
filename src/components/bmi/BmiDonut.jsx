// Кольцевой датчик ИМТ — главный акцент вкладки «Тело».
// Правка Кати 25.11 (третий круг отзывов), три пункта:
//   1) «часть кольца тёмно-серая» — раньше поверх шкалы заливалась дуга
//      ЦВЕТА ТЕКСТА темы (на «Кремовой» — тёмно-коричневая, читалась
//      серой); теперь шкала целиком в тонах темы, а текущий ИМТ показывает
//      ЯРКАЯ дуга-курсор темы (accentBright → accent) с точкой-курсором;
//   2) «обозначения норма/лишний вес/ожирение подогнать по цвету с
//      кольцом» — шкала СЕГМЕНТИРОВАНА тонами категорий из СЕМЕЙСТВА
//      темы (bmiTones: недостаток — warn, норма — good, лишний вес —
//      смесь warn/bad, ожирение — bad); бейдж под кольцом и легенда
//      справа красятся ТОМИ же тоном, что их сегмент на кольце;
//   3) «сделать его по размеру одинаково как на главной странице» —
//      диаметр кольца 84 px, ровно как кольца «Съедено/Сожжено» на
//      «Главной» (DailySummary RING = 84).
// При открытии курсор «заливается» до текущего ИМТ, число в центре
// отсчитывается вверх, после заливки дуга мягко «дышит» (пульсация).
// Анимация — обычный Animated из react-native (JS-драйвер) поверх
// strokeDashoffset и strokeOpacity БЕЗ Reanimated: Reanimated поверх
// SVG-экранов ронял приложение, не возвращать. Шкала: ИМТ 15 → 40,
// старт с 9 часов — норма ложится на верх кольца.

import { useEffect, useRef, useState } from 'react'
import { Animated, Easing, Text, View } from 'react-native'
import Svg, { Defs, LinearGradient as SvgGradient, Stop, Circle, Path } from 'react-native-svg'
import { Check } from 'lucide-react-native'
import { bmiCategory, fmtDecimal } from '@/lib/data/bmi'
import { bmiTones, withAlpha } from '@/lib/themes'
import { useThemeColors } from '@/lib/use-theme'

// Диаметр кольца — как на «Главной»; холст 100×100: ореол свечения
// выходит за диаметр кольца, обрезать его нельзя
const BOX = 100
const RING_D = 84
const C = BOX / 2
const STROKE = 11
const R = (RING_D - STROKE) / 2

// Короткое название категории для бейджа под кольцом — полное
// («Ожирение II–III ст.») не помещается в пилюле
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

// Сегменты шкалы — границы категорий ИМТ (lib/data/bmi); tone — ключ
// в bmiTones(colors): цвета СЕМЕЙСТВА активной темы, их же повторяют
// бейдж и легенда («подогнать по цвету с кольцом»)
const ZONES = [
  { from: 15, to: 18.5, tone: 'low' },
  { from: 18.5, to: 25, tone: 'norm' },
  { from: 25, to: 30, tone: 'over' },
  { from: 30, to: 40, tone: 'obese1' },
]

// Длина полной дуги — через неё работает эффект «заливания»
const ARC_LEN = 2 * Math.PI * R * (SWEEP_DEG / 360)

const rad = (d) => (d * Math.PI) / 180
const ptOnRing = (deg) => [C + R * Math.sin(rad(deg)), C - R * Math.cos(rad(deg))]
const angleFor = (v) =>
  START_DEG + ((Math.min(BMI_MAX, Math.max(BMI_MIN, v)) - BMI_MIN) / (BMI_MAX - BMI_MIN)) * SWEEP_DEG

// Дуга сегмента шкалы: от угла к углу (все сегменты < 180° — флаг 0)
const arcPath = (from, to) => {
  const [x1, y1] = ptOnRing(from)
  const [x2, y2] = ptOnRing(to)
  const large = to - from > 180 ? 1 : 0
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${R} ${R} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`
}

// Полная дуга курсора (270°): видимый ход управляется strokeDashoffset
const [SX, SY] = ptOnRing(START_DEG)
const [EX, EY] = ptOnRing(START_DEG + SWEEP_DEG)
const FULL_ARC = `M ${SX.toFixed(2)} ${SY.toFixed(2)} A ${R} ${R} 0 1 1 ${EX.toFixed(2)} ${EY.toFixed(2)}`

const AnimatedPath = Animated.createAnimatedComponent(Path)

export function BmiDonut({ bmi }) {
  const themeColors = useThemeColors()
  const tones = bmiTones(themeColors)
  const cat = bmiCategory(bmi)
  const tone = tones[cat.id] || tones.norm
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

  // Пульсация после заливки: яркость дуги мягко колеблется 1 ↔ 0.78,
  // свечение под дугой — 0.22 ↔ 0.4 (кольцо «дышит»)
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
  const brightOpacity = pulseVal.interpolate({ inputRange: [0, 1], outputRange: [1, 0.78] })
  const glowOpacity = pulseVal.interpolate({ inputRange: [0, 1], outputRange: [0.22, 0.4] })

  // Точка-курсор на текущем ИМТ
  const [kx, ky] = ptOnRing(angleFor(target))

  return (
    <View className="items-center">
      <View style={{ width: BOX, height: BOX, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={BOX} height={BOX} style={{ position: 'absolute' }}>
          <Defs>
            <SvgGradient id="nbsRing" x1="0" y1="0" x2="1" y2="1">
              {/* Курсор — градиент активной темы (у неонов — неон,
                  у «Кремовой» — янтарь), как все дуги приложения */}
              <Stop offset="0" stopColor={themeColors.accentBright} />
              <Stop offset="1" stopColor={themeColors.accent} />
            </SvgGradient>
          </Defs>

          {/* Ореол свечения вокруг кольца: широкий и бледный градиент
              темы — кольцо «светится» во всех темах */}
          <Circle
            cx={C}
            cy={C}
            r={R}
            stroke="url(#nbsRing)"
            strokeOpacity={0.16}
            strokeWidth={26}
            fill="none"
          />
          {/* Нейтральный трек по всему кругу — line темы */}
          <Circle cx={C} cy={C} r={R} stroke={themeColors.line} strokeWidth={STROKE} fill="none" />

          {/* Сегменты шкалы по категориям — тона СЕМЕЙСТВА темы
              (приглушённые, чтобы яркий курсор читался поверх) */}
          {ZONES.map((z) => (
            <Path
              key={z.tone}
              d={arcPath(angleFor(z.from), angleFor(z.to))}
              stroke={tones[z.tone]}
              strokeOpacity={0.4}
              strokeWidth={STROKE}
              fill="none"
            />
          ))}

          {/* Свечение курсора: та же дуга шире и бледнее, «дышит» */}
          <AnimatedPath
            d={FULL_ARC}
            stroke="url(#nbsRing)"
            strokeOpacity={glowOpacity}
            strokeWidth={STROKE + 6}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={ARC_LEN}
            strokeDashoffset={dashOffset}
          />
          {/* Яркая заливающаяся дуга-курсор темы */}
          <AnimatedPath
            d={FULL_ARC}
            stroke="url(#nbsRing)"
            strokeOpacity={brightOpacity}
            strokeWidth={STROKE}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={ARC_LEN}
            strokeDashoffset={dashOffset}
          />
          {/* Точка-курсор на текущем ИМТ */}
          <Circle
            cx={kx}
            cy={ky}
            r={5.5}
            fill={themeColors.accentBright}
            stroke={themeColors.text}
            strokeWidth={2}
          />
        </Svg>

        {/* Число ИМТ в центре отверстия (62 px — влезает с дожимом) */}
        <Text
          maxFontSizeMultiplier={1.1}
          className="font-extrabold text-[22px] leading-none tracking-tight text-bear-text"
        >
          {fmtDecimal(num)}
        </Text>
      </View>

      {/* Бейдж категории — ПОД кольцом (в отверстии 84 px он не
          помещается): цвет — ТОТ ЖЕ тон темы, что сегмент категории
          на кольце, и тот же, что строка легенды справа */}
      <View
        className="mt-1 flex-row items-center gap-[4px] rounded-full px-2 py-[3px]"
        style={{ backgroundColor: withAlpha(tone, 0.15) }}
      >
        <Text
          maxFontSizeMultiplier={1.1}
          numberOfLines={1}
          className="font-bold text-[11.5px] leading-none"
          style={{ color: tone }}
        >
          {SHORT_LABEL[cat.id] || cat.label}
        </Text>
        {/* Галочка в залитом кружке */}
        <View
          className="h-[14px] w-[14px] items-center justify-center rounded-full"
          style={{ backgroundColor: tone }}
        >
          <Check size={11} color={themeColors.card} strokeWidth={3.6} />
        </View>
      </View>
    </View>
  )
}

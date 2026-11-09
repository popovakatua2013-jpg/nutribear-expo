// Вкладка «План» — 1:1 с макетом Кати от 08.11 (IMG_20261108_230729):
//   шапка        — аватар, «План», колокольчик с красной точкой, шестерёнка
//   цели         — крупные чипы «эмодзи + название + подпись», активный —
//                  лаймовый с галочкой (у нас 4 цели — сеткой 2×2)
//   меню         — MealPlanScreen (слева) + карточка «Интервальное
//                  питание» (справа) РЯДОМ — макет Кати от 09.11
//   прогресс     — кольцо % + легенда Калории/Белки/Жиры/Углеводы +
//                  линия тренда за неделю (клетчатка/сахар — переключателем)
//   покупки      — чек-лист слева, иллюстрация и лаймовая кнопка справа
//   голодание    — кольцо «16:8», «Ваш режим», строки «Советы» / «Результаты»
// Данные — только реальные, из сторов приложения. Палитра — planPalette.js
// (макет), типографика и сетка — общая дизайн-система (theme.js).

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Animated, Easing, Image, Pressable, ScrollView, Text, View } from 'react-native'
import Svg, {
  Circle, Defs, Line, LinearGradient, Path, Stop,
  // В react-native-svg v15 алиас SvgText удалён — элемент называется
  // Text; импорт несуществующего SvgText давал undefined и ронял вкладку
  // («Cannot read property 'displayName' of undefined» внутри css-interop)
  Text as SvgText,
} from 'react-native-svg'
import {
  BarChart3, Bell, Check, ChevronRight, Hourglass, Settings, ShoppingCart,
} from 'lucide-react-native'
import { useFocusEffect, useRouter } from 'expo-router'
import { formatNum } from '@/lib/format'
import { requestOpenReminders } from '@/lib/navEvents'
import { applyGoalChoice } from '@/lib/data/goals-apply'
import { GOALS } from '@/lib/data/goals'
import { FIBER_NORM, SUGAR_LIMIT, sumNutrition } from '@/lib/data/nutrition'
import { useFoodStore } from '@/store/useFoodStore'
import { useGoalsStore } from '@/store/useGoalsStore'
import { useShoppingStore } from '@/store/useShoppingStore'
import { useFastingStore } from '@/store/useFastingStore'
import { useActivityStore } from '@/store/useActivityStore'
import { dayDate, weekKeyOf, WEEKDAYS } from '@/store/useMealPlanStore'
import { useToast } from '../ui/Toast'
import { smoothPath } from '../ui/SvgAreaChart'
import { MealPlanScreen } from './MealPlanScreen'
import { P, goodsWord } from './planPalette'
import { spacing, F, type } from '@/features/workouts/theme'

const BEAR = require('../../../assets/images/bear.webp')
const SHOP_BAG = require('../../../assets/images/shop-bag.webp')

// Подписи чипов целей — как в макете («Дефицит калорий», «Рельеф и тонус»,
// «Профицит калорий»); у четвёртой цели — «Норма калорий»
const GOAL_HINTS = {
  lose: 'Дефицит калорий',
  cut: 'Рельеф и тонус',
  maintain: 'Норма калорий',
  gain: 'Профицит калорий',
}

const pad = (n) => String(n).padStart(2, '0')

const dayKeyOfDate = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

// Нормы нутриентов от дневной нормы калорий — «классическая тарелка»
function macroTargets(kcal) {
  return {
    p: Math.round((kcal * 0.2) / 4),
    f: Math.round((kcal * 0.3) / 9),
    c: Math.round((kcal * 0.5) / 4),
    fib: FIBER_NORM,
  }
}

const fmtClock = (h) => `${pad(((h % 24) + 24) % 24)}:00`

// Показатели недельного графика: калории / клетчатка / сахар
const METRICS = [
  ['kcal', 'Калории'],
  ['fib', 'Клетчатка'],
  ['sug', 'Сахар'],
]
const METRIC_COLORS = { kcal: P.accent, fib: P.green, sug: P.pink }
const METRIC_UNIT = { kcal: 'ккал', fib: 'г', sug: 'г' }

// Кольцо прогресса — анимация как у колец «Главной» (KcalRing):
// дуга «заливается» от нуля до процента, число в центре отсчитывается
// вверх; при возврате на вкладку (runId растёт) заливка повторяется.
// centerText — вместо процентов («16:8» в карточке голодания),
// sub — подпись под числом («от цели», как в макете).
const AnimatedCircle = Animated.createAnimatedComponent(Circle)

function Ring({ pct, runId, size = 64, stroke = 7, color = P.accent, sub, centerText }) {
  const over = pct > 1.05
  // Дуга рисуется до 100% максимум; число в центре — реальное
  const frac = Math.max(0, Math.min(1, pct))
  const target = Math.max(0, pct * 100)
  const rc = (size - stroke) / 2
  const cc = 2 * Math.PI * rc
  const arcVal = useRef(new Animated.Value(0)).current
  const numVal = useRef(new Animated.Value(0)).current
  const [num, setNum] = useState(0)
  const prevRun = useRef(runId)
  const firstRun = useRef(true)

  useEffect(() => {
    const subL = numVal.addListener(({ value: v }) => setNum(v))
    return () => numVal.removeListener(subL)
  }, [numVal])

  useEffect(() => {
    if (prevRun.current !== runId) {
      prevRun.current = runId
      arcVal.setValue(0)
      numVal.setValue(0)
    }
    const dur = firstRun.current ? 1100 : 600
    firstRun.current = false
    const anim = Animated.parallel([
      Animated.timing(arcVal, {
        toValue: Math.max(frac, 0.0001),
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
    ])
    anim.start()
    return () => anim.stop()
  }, [target, frac, runId, arcVal, numVal])

  const dashOffset = arcVal.interpolate({ inputRange: [0, 1], outputRange: [cc, 0] })
  const centerFs = Math.round(size * (centerText ? 0.21 : 0.25))

  return (
    <View style={styles.ringWrap}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={rc} stroke={P.tile} strokeWidth={stroke} fill="none" />
        {pct > 0 && (
          <AnimatedCircle
            cx={size / 2}
            cy={size / 2}
            r={rc}
            stroke={over ? P.orange : color}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${cc} ${cc}`}
            strokeDashoffset={dashOffset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        )}
      </Svg>
      <View style={styles.ringCenter}>
        <Text style={[styles.ringPct, { fontSize: centerFs }, over && !centerText && { color: P.orange }]}>
          {centerText || `${Math.round(num)}%`}
        </Text>
        {sub ? <Text style={styles.ringSub}>{sub}</Text> : null}
      </View>
    </View>
  )
}

// Линия тренда недели — как в макете: плавная кривая с точками и
// мягкой заливкой; пунктир нормы; сегодняшний день — крупная точка и
// лаймовая подпись; дни без данных — серые точки. Тап по дню — значение.
const CHART_H = 148

function TrendChart({ values, norm, max, color, todayIdx, onPickDay }) {
  const [w, setW] = useState(0)
  const PAD_T = 16
  const PAD_B = 26
  const PAD_X = 11
  const ih = CHART_H - PAD_T - PAD_B
  const iw = Math.max(0, w - PAD_X * 2)
  const x = (i) => PAD_X + (iw * i) / Math.max(1, values.length - 1)
  const y = (v) => PAD_T + ih - (Math.max(0, Math.min(v, max)) / max) * ih
  const pts = values.map((v, i) => ({ x: x(i), y: y(v) }))

  if (w === 0) {
    return <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ height: CHART_H }} />
  }

  const line = smoothPath(pts)
  const area = `${line} L ${pts[pts.length - 1].x} ${PAD_T + ih} L ${pts[0].x} ${PAD_T + ih} Z`
  const normY = norm > 0 ? y(norm) : null

  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ height: CHART_H }}>
      <Svg width={w} height={CHART_H}>
        <Defs>
          <LinearGradient id="weekTrendFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity={0.3} />
            <Stop offset="1" stopColor={color} stopOpacity={0.02} />
          </LinearGradient>
        </Defs>
        <Path d={area} fill="url(#weekTrendFill)" />
        {normY != null && (
          <Line
            x1={PAD_X}
            y1={normY}
            x2={w - PAD_X}
            y2={normY}
            stroke={P.text3}
            strokeWidth={1}
            strokeDasharray="4 4"
          />
        )}
        <Path d={line} stroke={color} strokeWidth={2.5} fill="none" strokeLinecap="round" />
        {pts.map((p, i) => {
          const future = i > todayIdx
          const zero = !(values[i] > 0)
          if (future || zero) {
            return <Circle key={`p${i}`} cx={p.x} cy={p.y} r={2.5} fill={P.tile} />
          }
          if (i === todayIdx) {
            return (
              <Circle
                key={`p${i}`}
                cx={p.x}
                cy={p.y}
                r={5}
                fill={color}
                stroke={P.card}
                strokeWidth={2}
              />
            )
          }
          return <Circle key={`p${i}`} cx={p.x} cy={p.y} r={3.5} fill={color} />
        })}
        {values.map((_, i) => (
          <SvgText
            key={`l${i}`}
            x={x(i)}
            y={CHART_H - 7}
            fill={i === todayIdx ? P.accent : P.text3}
            fontSize={10.5}
            fontWeight={i === todayIdx ? 'bold' : 'normal'}
            textAnchor="middle"
          >
            {WEEKDAYS[i]}
          </SvgText>
        ))}
      </Svg>
      <View pointerEvents="box-only" style={styles.chartTouch}>
        {values.map((v, i) => (
          <Pressable key={`t${i}`} style={{ flex: 1 }} onPress={() => onPickDay(i, v)} />
        ))}
      </View>
    </View>
  )
}

export function PlanScreen({ onOpenFasting }) {
  const { toast } = useToast()
  const router = useRouter()

  // Счётчик возвратов на вкладку — перезапускает заливку кольца
  const [runId, setRunId] = useState(0)
  useFocusEffect(useCallback(() => { setRunId((n) => n + 1) }, []))

  // — Данные: всё из сторов приложения, никаких заглушек —
  const goalId = useFoodStore((s) => s.goal)
  const entries = useFoodStore((s) => s.entries)
  const history = useFoodStore((s) => s.history)
  const kcalGoal = useGoalsStore((s) => s.goals.kcal)
  const macroNorms = useGoalsStore((s) => s.goals.macroNorms)
  const shopItems = useShoppingStore((s) => s.items)
  const fastStart = useFastingStore((s) => s.windowStart)
  const fastWindow = useFastingStore((s) => s.windowHours)
  const fastStartedAt = useFastingStore((s) => s.startedAt)
  const fastHours = useFastingStore((s) => s.fastHours)
  const reminder = useActivityStore((s) => s.reminder)

  // Сегодня: суммы по живому дневнику (все приёмы, включая доп. перекусы)
  const todaySum = useMemo(
    () => sumNutrition(Object.values(entries || {}).flat()),
    [entries],
  )

  // Нормы: свои из целей (0 = авто) или «тарелка» от нормы ккал
  const norms = useMemo(() => {
    const auto = macroTargets(kcalGoal)
    const n = macroNorms || {}
    return {
      p: n.p > 0 ? n.p : auto.p,
      f: n.f > 0 ? n.f : auto.f,
      c: n.c > 0 ? n.c : auto.c,
      fib: n.fib > 0 ? n.fib : auto.fib,
    }
  }, [kcalGoal, macroNorms])

  // Текущая неделя (Пн–Вс): съедено по дням из журнала дневника
  const weekNow = useMemo(() => weekKeyOf(new Date()), [])
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => dayKeyOfDate(dayDate(weekNow, i))),
    [weekNow],
  )
  const todayIdx = days.indexOf(dayKeyOfDate(new Date()))

  const weekStats = useMemo(() => {
    const acc = Array.from({ length: 7 }, () => ({ kcal: 0, fib: 0, sug: 0 }))
    const idx = new Map(days.map((k, i) => [k, i]))
    for (const h of history) {
      const i = idx.get(h.day)
      if (i == null) continue
      acc[i].kcal += Number(h.kcal) || 0
      acc[i].fib += Number(h.fib) || 0
      acc[i].sug += Number(h.sug) || 0
    }
    return acc.map((d) => ({
      kcal: Math.round(d.kcal),
      fib: Math.round(d.fib * 10) / 10,
      sug: Math.round(d.sug * 10) / 10,
    }))
  }, [history, days])

  // Показатель недельного графика: калории / клетчатка / сахар
  const [metric, setMetric] = useState('kcal')
  const weekValues = weekStats.map((d) => d[metric])
  const weekNorm = metric === 'kcal' ? kcalGoal : metric === 'fib' ? norms.fib : SUGAR_LIMIT
  const chartMax = Math.max(weekNorm, ...weekValues, 1)
  const metricColor = METRIC_COLORS[metric]
  const fmtVal = (v) => (metric === 'kcal' ? formatNum(v) : String(Math.round(v * 10) / 10))

  // Выбор цели — вариант 3 (выбор Кати): план «хранит» выбор цели, а
  // норму калорий НЕ меняем — её считает калькулятор (Тело/онбординг).
  // goalId и норма меняются вместе (applyGoalChoice), поэтому передаём
  // текущую норму kcalOverride — она остаётся прежней
  const pickGoal = (id) => {
    if (id === goalId) return
    applyGoalChoice(id, kcalGoal)
    const g = GOALS.find((x) => x.id === id)
    toast({
      title: `${g.emoji} Цель: ${g.label}`,
      description: `Норма без изменений — ${formatNum(kcalGoal)} ккал (её считает калькулятор)`,
    })
  }

  // Покупки: сводка реального списка — некупленные сверху, до 5 строк
  const shopRows = useMemo(() => {
    const undone = shopItems.filter((i) => !i.done)
    const done = shopItems.filter((i) => i.done)
    return [...undone, ...done].slice(0, 5)
  }, [shopItems])

  // Колокольчик: красная точка, пока не включено ни одного напоминания
  const remCount = [
    reminder?.enabled,
    reminder?.meals?.enabled,
    reminder?.weigh?.enabled,
    reminder?.exercise?.enabled,
    reminder?.sleep?.enabled,
  ].filter(Boolean).length

  // Голодание: режим для кольца «16:8» и легенды окна/голодания
  const fastGoalH = fastStartedAt && fastHours ? fastHours : 24 - fastWindow
  const fastPlan = `${fastGoalH}/${fastWindow}`
  const fastEatFrom = fmtClock(fastStart)
  const fastEatTo = fmtClock(((fastStart + fastWindow) % 24 + 24) % 24)

  // Тап по дню на линии тренда — точное значение
  const pickDay = (i, v) => {
    toast({
      title: `${WEEKDAYS[i]}${i === todayIdx ? ' · сегодня' : ''} — ${fmtVal(v)} ${METRIC_UNIT[metric]}`,
      description: `Норма в день — ${fmtVal(weekNorm)} ${METRIC_UNIT[metric]}`,
    })
  }

  // Легенда «Прогресса» — как в макете: 4 строки с цветными точками
  const legend = [
    { key: 'kcal', label: 'Калории', color: P.accent, value: formatNum(todaySum.kcal), norm: formatNum(kcalGoal), unit: 'ккал' },
    { key: 'p', label: 'Белки', color: P.blue, value: String(Math.round(todaySum.p)), norm: String(norms.p), unit: 'г' },
    { key: 'f', label: 'Жиры', color: P.orange, value: String(Math.round(todaySum.f)), norm: String(norms.f), unit: 'г' },
    { key: 'c', label: 'Углеводы', color: P.purple, value: String(Math.round(todaySum.c)), norm: String(norms.c), unit: 'г' },
  ]

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: P.bg }}
      contentContainerStyle={{ paddingHorizontal: spacing.xl, paddingBottom: 48 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Шапка — как в макете: аватар, заголовок, колокольчик с точкой,
          шестерёнка; иконки без подложек */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.navigate('/more')}
          style={styles.avatarWrap}
          accessibilityRole="button"
          accessibilityLabel="Профиль — перейти в «Ещё»"
        >
          <Image source={BEAR} style={styles.avatar} accessibilityLabel="Медвежонок — маскот" />
        </Pressable>
        <View style={styles.headerMain}>
          <Text style={styles.title}>План</Text>
          <Text
            style={styles.subtitle}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.85}
          >
            Твой путь к цели — чёткий план на неделю
          </Text>
        </View>
        <Pressable
          onPress={() => {
            requestOpenReminders()
            router.navigate('/more')
          }}
          style={styles.headBtn}
          accessibilityRole="button"
          accessibilityLabel={
            remCount > 0
              ? `Напоминания: включено ${remCount}`
              : 'Напоминания выключены — открыть настройки напоминаний'
          }
        >
          <Bell size={22} color={P.text2} />
          {remCount === 0 && <View style={styles.headDot} />}
        </Pressable>
        <Pressable
          onPress={() => router.navigate('/more')}
          style={styles.headBtn}
          accessibilityRole="button"
          accessibilityLabel="Настройки — перейти в «Ещё»"
        >
          <Settings size={22} color={P.text2} />
        </Pressable>
      </View>

      {/* 1. Цели — крупные чипы как в макете: эмодзи + название + подпись,
          активный — лаймовый с галочкой (у нас 4 цели — сеткой 2×2) */}
      <View style={styles.goalGrid}>
        {GOALS.map((g) => {
          const active = goalId === g.id
          return (
            <Pressable
              key={g.id}
              onPress={() => pickGoal(g.id)}
              style={[styles.goalChip, active && styles.goalChipOn]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`Цель ${g.label}${active ? ', активна' : ''}, выбор цели норму калорий не меняет`}
            >
              <Text style={styles.goalEmoji}>{g.emoji}</Text>
              <View style={styles.goalTexts}>
                <Text numberOfLines={1} style={[styles.goalName, active && styles.goalNameOn]}>
                  {g.label}
                </Text>
                <Text numberOfLines={1} style={[styles.goalHint, active && styles.goalHintOn]}>
                  {GOAL_HINTS[g.id] || g.hint}
                </Text>
              </View>
              {active && (
                <View style={styles.goalCheck} pointerEvents="none">
                  <View style={styles.goalCheckCircle}>
                    <Check size={13} color={P.accent} strokeWidth={3.5} />
                  </View>
                </View>
              )}
            </Pressable>
          )
        })}
      </View>

      {/* 2. Меню на неделю + Интервальное питание — РЯДОМ, два блока
          (макет Кати от 09.11): слева компактная карточка меню,
          справа — кольцо режима, легенда окна/голодания и кнопка
          «Подробнее»; тап по карточке открывает окно голодания */}
      <View style={styles.menuRow}>
        <View style={styles.menuLeft}>
          <MealPlanScreen compact />
        </View>

        <Pressable
          style={styles.fastCard}
          onPress={onOpenFasting}
          accessibilityRole="button"
          accessibilityLabel="Интервальное питание — открыть подробнее"
        >
          <Text
            style={styles.fastTitle}
            numberOfLines={2}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
          >
            Интервальное питание
          </Text>
          <View style={styles.fastRingWrap}>
            <Ring
              pct={fastGoalH / 24}
              runId={runId}
              size={64}
              stroke={7}
              centerText={fastPlan}
              sub="Режим"
            />
          </View>
          <View style={styles.fastLegend}>
            <View style={styles.fastLegendRow}>
              <View style={[styles.fastDot, { backgroundColor: P.accent }]} />
              <View style={styles.fastLegendTexts}>
                <Text style={styles.fastLegendLabel}>Окно питания</Text>
                <Text style={styles.fastLegendVal}>{fastEatFrom} – {fastEatTo}</Text>
              </View>
            </View>
            <View style={styles.fastLegendRow}>
              <View style={[styles.fastDot, { backgroundColor: P.text3 }]} />
              <View style={styles.fastLegendTexts}>
                <Text style={styles.fastLegendLabel}>Голодание</Text>
                <Text style={styles.fastLegendVal}>{fastEatTo} – {fastEatFrom}</Text>
              </View>
            </View>
          </View>
          <View style={styles.fastMore} pointerEvents="none">
            <Text style={styles.fastMoreText}>Подробнее</Text>
            <ChevronRight size={13} color={P.accentInk} />
          </View>
        </Pressable>
      </View>

      {/* 3. Прогресс — как в макете: кольцо % + легенда БЖУ + линия тренда */}
      <View style={styles.card}>
        <View style={styles.cardHead}>
          <View style={styles.iconTile}>
            <BarChart3 size={18} color={P.accent} />
          </View>
          <Text style={styles.cardTitle}>Прогресс</Text>
          <View style={styles.headRight}>
            <Text style={styles.headLink}>За 7 дней</Text>
            <ChevronRight size={15} color={P.text3} />
          </View>
        </View>

        <View style={styles.progressRow}>
          <Ring
            pct={kcalGoal > 0 ? todaySum.kcal / kcalGoal : 0}
            runId={runId}
            size={104}
            stroke={10}
            sub="от цели"
          />
          <View style={styles.legend}>
            {legend.map((r) => (
              <View key={r.key} style={styles.legendRow}>
                <View style={[styles.legendDot, { backgroundColor: r.color }]} />
                <View style={styles.legendTexts}>
                  <Text numberOfLines={1} style={styles.legendLabel}>{r.label}</Text>
                  <Text numberOfLines={1} style={styles.legendVal}>
                    {r.value} / {r.norm} {r.unit}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Переключатель показателя графика: калории / клетчатка / сахар */}
        <View style={styles.segRow}>
          {METRICS.map(([id, label]) => {
            const active = metric === id
            return (
              <Pressable
                key={id}
                onPress={() => setMetric(id)}
                style={[styles.segBtn, active && styles.segBtnActive]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`График недели: ${label}`}
              >
                <Text style={[styles.segText, active && styles.segTextActive]}>{label}</Text>
              </Pressable>
            )
          })}
        </View>
        <TrendChart
          values={weekValues}
          norm={weekNorm}
          max={chartMax}
          color={metricColor}
          todayIdx={todayIdx}
          onPickDay={pickDay}
        />
      </View>

      {/* 4. Список покупок — чек-лист слева, иллюстрация и лаймовая кнопка
          справа (как в макете); тап открывает экран «Покупки» */}
      <Pressable
        style={styles.card}
        onPress={() => router.push('/shopping')}
        accessibilityRole="button"
        accessibilityLabel="Открыть список покупок"
      >
        <View style={styles.cardHead}>
          <View style={styles.iconTile}>
            <ShoppingCart size={18} color={P.accent} />
          </View>
          <Text style={styles.cardTitle}>Список покупок</Text>
          <View style={styles.headRight}>
            {shopItems.length > 0 && (
              <Text style={styles.headLink}>
                {shopItems.length} {goodsWord(shopItems.length)}
              </Text>
            )}
            <ChevronRight size={15} color={P.text3} />
          </View>
        </View>

        <View style={styles.shopBody}>
          <View style={styles.shopList}>
            {shopItems.length === 0 ? (
              <Text style={styles.shopEmpty}>Пока пусто — добавьте из плана меню</Text>
            ) : (
              shopRows.map((it) => (
                <View key={it.id} style={styles.shopRow}>
                  <View style={[styles.shopCbx, it.done && styles.shopCbxOn]}>
                    {it.done && <Check size={12} color={P.accentInk} strokeWidth={3} />}
                  </View>
                  <Text numberOfLines={1} style={[styles.shopName, it.done && styles.shopNameDone]}>
                    {it.name}
                  </Text>
                  {it.qty > 1 && <Text style={styles.shopQty}>× {it.qty}</Text>}
                </View>
              ))
            )}
          </View>
          <View style={styles.shopSide}>
            <Image
              source={SHOP_BAG}
              style={styles.shopArt}
              resizeMode="contain"
              accessibilityLabel="Иллюстрация: пакет с продуктами"
            />
            <View style={styles.shopBtn}>
              <ShoppingCart size={14} color={P.accentInk} />
              <Text numberOfLines={1} style={styles.shopBtnText}>Открыть список</Text>
            </View>
          </View>
        </View>
      </Pressable>

    </ScrollView>
  )
}

const styles = {
  // Шапка: аватар + заголовок + иконки без подложек (как в макете)
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: spacing.l },
  avatarWrap: {
    width: 54,
    height: 54,
    borderRadius: 27,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: P.line,
    backgroundColor: P.tile,
  },
  avatar: { width: '100%', height: '100%' },
  headerMain: { flex: 1, minWidth: 0 },
  title: { ...type.display, fontSize: 26, color: P.text, letterSpacing: -0.3 },
  subtitle: {
    ...type.body,
    fontSize: 12,
    color: P.text2,
    marginTop: 1,
  },
  headBtn: { width: 34, height: 38, alignItems: 'center', justifyContent: 'center' },
  headDot: {
    position: 'absolute',
    top: 6,
    right: 5,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: P.red,
  },

  // Цели — чипы 2×2 (как в макете, но 4 цели)
  goalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: spacing.l,
  },
  goalChip: {
    flex: 1,
    minWidth: '47%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: P.card,
    borderColor: P.line,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 13,
    paddingVertical: 12,
  },
  goalChipOn: { backgroundColor: P.accent, borderColor: P.accent, paddingRight: 36 },
  goalEmoji: { fontSize: 21 },
  goalTexts: { flex: 1, minWidth: 0 },
  goalName: {
    fontSize: 14.5,
    fontWeight: '800',
    fontFamily: F[800],
    color: P.text,
  },
  goalNameOn: { color: P.accentInk },
  goalHint: { fontSize: 11, fontWeight: '600', fontFamily: F[600], color: P.text3, marginTop: 1 },
  goalHintOn: { color: 'rgba(21,26,3,0.62)' },
  goalCheck: {
    position: 'absolute',
    right: 11,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalCheckCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#181B26',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Карточка раздела: плитка-иконка + заголовок + правая ссылка
  card: {
    backgroundColor: P.card,
    borderColor: P.line,
    borderWidth: 1,
    borderRadius: 22,
    padding: spacing.l,
    marginTop: spacing.l,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconTile: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: P.tile,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { ...type.title, fontSize: 16.5, color: P.text, flex: 1 },
  headRight: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  headLink: { fontSize: 12.5, fontWeight: '600', fontFamily: F[600], color: P.text3 },

  // Прогресс: кольцо + легенда
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: spacing.m },
  legend: { flex: 1, minWidth: 0, gap: 9 },
  legendRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  legendDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  legendTexts: { flex: 1, minWidth: 0 },
  legendLabel: { fontSize: 13.5, fontWeight: '700', fontFamily: F[700], color: P.text },
  legendVal: { fontSize: 12.5, fontWeight: '600', fontFamily: F[600], color: P.text3, marginTop: 1 },
  ringWrap: { position: 'relative' },
  ringCenter: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringPct: { fontWeight: '800', fontFamily: F[800], color: P.text, letterSpacing: -0.5 },
  ringSub: { fontSize: 10.5, fontWeight: '600', fontFamily: F[600], color: P.text3, marginTop: -1 },

  // Переключатель показателя графика
  segRow: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    backgroundColor: P.tile,
    borderRadius: 999,
    padding: 3,
    marginTop: spacing.m,
    marginBottom: spacing.s,
  },
  segBtn: {
    paddingHorizontal: 12,
    height: 26,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segBtnActive: { backgroundColor: P.accent },
  segText: { fontSize: 12, fontWeight: '700', fontFamily: F[700], color: P.text2 },
  segTextActive: { color: P.accentInk },
  chartTouch: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
  },

  // Покупки: чек-лист слева + иллюстрация и кнопка справа
  shopBody: { flexDirection: 'row', gap: 12, marginTop: spacing.m },
  shopList: { flex: 1, minWidth: 0, gap: 9 },
  shopEmpty: { ...type.body, fontSize: 13, color: P.text2 },
  shopRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  shopCbx: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: P.text3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shopCbxOn: { backgroundColor: P.accent, borderColor: P.accent },
  shopName: { ...type.body, fontSize: 13.5, color: P.text, flex: 1, minWidth: 0 },
  shopNameDone: { color: P.text3, textDecorationLine: 'line-through' },
  shopQty: { fontSize: 12, fontWeight: '600', fontFamily: F[600], color: P.text3 },
  shopSide: { width: 140, alignItems: 'center' },
  shopArt: { width: 118, height: 80, marginBottom: 2 },
  shopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: P.accent,
    borderRadius: 999,
    height: 38,
    paddingHorizontal: 10,
    alignSelf: 'stretch',
  },
  shopBtnText: { fontSize: 11.5, fontWeight: '800', fontFamily: F[800], color: P.accentInk },

  // Меню + интервальное питание — РЯДОМ (макет Кати от 09.11)
  menuRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  menuLeft: { width: '60%' },
  fastCard: {
    flex: 1,
    backgroundColor: P.card,
    borderColor: P.line,
    borderWidth: 1,
    borderRadius: 22,
    padding: 12,
    marginTop: spacing.l,
  },
  fastTitle: { ...type.title, fontSize: 12, color: P.text, lineHeight: 14.5 },
  fastRingWrap: { alignItems: 'center', marginTop: 12 },
  fastLegend: { gap: 8, marginTop: 12, alignSelf: 'stretch' },
  fastLegendRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 7 },
  fastDot: { width: 7, height: 7, borderRadius: 4, marginTop: 4 },
  fastLegendTexts: { flex: 1, minWidth: 0 },
  fastLegendLabel: { fontSize: 11.5, fontWeight: '700', fontFamily: F[700], color: P.text },
  fastLegendVal: {
    fontSize: 10.5,
    fontWeight: '600',
    fontFamily: F[600],
    color: P.text3,
    marginTop: 1,
    fontVariant: ['tabular-nums'],
  },
  fastMore: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: P.accent,
    borderRadius: 999,
    height: 34,
    marginTop: 12,
    alignSelf: 'stretch',
  },
  fastMoreText: { fontSize: 12, fontWeight: '800', fontFamily: F[800], color: P.accentInk },
}

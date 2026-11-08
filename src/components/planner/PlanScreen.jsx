// Экран «План» — обзор питания по макетам Кати (все цифры реальные,
// без заглушек). Разделы сверху вниз:
//   Шапка — как в макете: аватар (мишка), заголовок «План» с
//      подзаголовком, колокольчик (красная точка, пока не включено ни
//      одного напоминания; тап ведёт на «Ещё» и сразу раскрывает
//      «Напоминания») и шестерёнка (настройки — «Ещё»).
//   1. «Цель» — карточки Похудение / Поддержка / Набор веса: активная
//      цель берётся из дневника (useFoodStore.goal), норма ккал — сумма
//      пресета (getDailyTarget). Тап применяет пресет через
//      applyGoalChoice (единая точка смены цели, как в «Мои цели»).
//   2. «Меню на неделю» — MealPlanScreen (полоса дней + карточка дня).
//   3. «Сегодня» — ШЕСТЬ колец прогресса, как в макете («Недельный
//      план питания»): Ккал, Белки, Жиры, Углеводы, Клетчатка, Сахар —
//      по кольцу на показатель: дуга в свой цвет, % в центре, под
//      кольцом «съедено / норма» и подпись. Съедено — живой дневник
//      (useFoodStore.entries, sumNutrition), нормы — свои из целей
//      (goals.macroNorms) или «тарелка» 20/30/50 % от нормы ккал;
//      сахар — порог ВОЗ 50 г. Перебор нормы — дуга и цифры оранжевым.
//   4. «Неделя» — ЛИНИЯ ТРЕНДА вместо столбиков (как в макете):
//      плавная кривая по дням Пн–Вс из журнала дневника
//      (useFood.history) с мягкой заливкой и точками, сегодняшний день
//      подсвечен; пунктир нормы и переключатель показателя: Калории /
//      Клетчатка (своя норма или 25 г ВОЗ) / Сахар (порог ВОЗ 50 г).
//      Тап по дню — точное значение (вместо подписей над столбиками).
//   5. «Список покупок» — как в макете: чек-лист предпросмотра,
//      лаймовая кнопка «Открыть список» и иллюстрация с продуктами;
//      тап — экран «Покупки» (отдельная страница app/shopping.jsx,
//      не вкладка — решение Кати).
//   6. «Интервальное питание» — план и идущий таймер из
//      useFastingStore; тап открывает полный экран (PlanTab).
// Кольца — react-native-svg, анимация как у колец «Главной» (KcalRing):
// дуга «заливается» от нуля, % отсчитывается вверх, при каждом
// возврате на вкладку повторяется (JS-драйвер — Reanimated ронял
// SVG-экраны).
// Стиль — дизайн-система вкладки (theme.js).

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Animated, AppState, Easing, Image, Pressable, ScrollView, Text, View } from 'react-native'
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Line,
  Path,
  Stop,
  Text as SvgText,
} from 'react-native-svg'
import { Bell, Check, ChevronRight, Settings, ShoppingCart, Timer } from 'lucide-react-native'
import { useFocusEffect, useRouter } from 'expo-router'
import { formatNum } from '@/lib/format'
import { requestOpenReminders } from '@/lib/navEvents'
import { applyGoalChoice } from '@/lib/data/goals-apply'
import { GOALS, getDailyTarget } from '@/lib/data/goals'
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
import { colors, spacing, radius, F, type } from '@/features/workouts/theme'

const BEAR = require('../../../assets/images/bear.webp')
const SHOP_BAG = require('../../../assets/images/shop-bag.webp')

const pad = (n) => String(n).padStart(2, '0')

const dayKeyOfDate = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

// Нормы нутриентов от дневной нормы калорий — «классическая тарелка»,
// ровно как в сводке «Съедено за сегодня» (DailySummary)
function macroTargets(kcal) {
  return {
    p: Math.round((kcal * 0.2) / 4),
    f: Math.round((kcal * 0.3) / 9),
    c: Math.round((kcal * 0.5) / 4),
    fib: FIBER_NORM,
  }
}

// 1 покупка / 2 покупки / 5 покупок
function purchasesWord(n) {
  const m10 = Math.abs(Math.round(n)) % 10
  const m100 = Math.abs(Math.round(n)) % 100
  if (m10 === 1 && m100 !== 11) return 'покупка'
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return 'покупки'
  return 'покупок'
}

// Часы:минуты для таймера в карточке — «15:42»
const fmtHM = (ms) => {
  const total = Math.max(0, Math.floor(ms / 60000))
  return `${Math.floor(total / 60)}:${pad(total % 60)}`
}

// Длительность: «15 ч 42 мин» / «42 мин»
const fmtDur = (ms) => {
  const total = Math.max(0, Math.floor(ms / 60000))
  const h = Math.floor(total / 60)
  const m = total % 60
  return h > 0 ? `${h} ч ${pad(m)} мин` : `${m} мин`
}

const fmtClock = (h) => `${pad(((h % 24) + 24) % 24)}:00`

// Показатели недельного графика: id → подпись; цвет линии — свой у
// каждого показателя (калории — лаймовый, как в макете; клетчатка —
// зелёный; сахар — розовый, как кольцо «Сахар» в «Сегодня»)
const METRICS = [
  ['kcal', 'Калории'],
  ['fib', 'Клетчатка'],
  ['sug', 'Сахар'],
]
const METRIC_COLORS = { kcal: colors.accent, fib: '#34D399', sug: '#F472B6' }
const METRIC_UNIT = { kcal: 'ккал', fib: 'г', sug: 'г' }

// Кольцо прогресса — анимация как у колец «Главной» (KcalRing):
// дуга «заливается» от нуля до текущего процента (Animated поверх
// strokeDashoffset, JS-драйвер — Reanimated ронял SVG-экраны), % в
// центре отсчитывается вверх; при каждом возврате на вкладку (runId
// растёт в useFocusEffect) заливка повторяется. Размер и цвет —
// параметры: большое кольцо и шесть мини-колец «Сегодня» сделаны
// одним компонентом. Перебор нормы — оранжевым.
const AnimatedCircle = Animated.createAnimatedComponent(Circle)

function Ring({ pct, runId, size = 64, stroke = 7, color = colors.accent }) {
  const over = pct > 1.05
  // Дуга рисуется до 100% максимум; % в центре — реальный (может быть 112%)
  const frac = Math.max(0, Math.min(1, pct))
  const target = Math.max(0, pct * 100)
  const rc = (size - stroke) / 2
  const cc = 2 * Math.PI * rc
  const arcVal = useRef(new Animated.Value(0)).current
  const numVal = useRef(new Animated.Value(0)).current
  const [num, setNum] = useState(0)
  const prevRun = useRef(runId)
  const firstRun = useRef(true)

  // % в центре — зеркало анимированного значения
  useEffect(() => {
    const sub = numVal.addListener(({ value: v }) => setNum(v))
    return () => numVal.removeListener(sub)
  }, [numVal])

  useEffect(() => {
    // Возврат на вкладку (runId сменился) — заливка заново с нуля;
    // обычное изменение значения — плавный перелив к новой доле
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

  // arcVal идёт 0…frac: смещение cc — дуга пустая, cc·(1−frac) — залита
  // ровно на frac окружности (шаблон KcalRing)
  const dashOffset = arcVal.interpolate({ inputRange: [0, 1], outputRange: [cc, 0] })

  return (
    <View style={styles.ringWrap}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={rc} stroke={colors.line} strokeWidth={stroke} fill="none" />
        {pct > 0 && (
          <AnimatedCircle
            cx={size / 2}
            cy={size / 2}
            r={rc}
            stroke={over ? colors.orange : color}
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
        <Text style={[styles.ringPct, size < 80 && styles.ringPctSm, over && { color: colors.orange }]}>
          {Math.round(num)}%
        </Text>
      </View>
    </View>
  )
}

// Линия тренда недели — как в макете («Прогресс»): плавная кривая
// с точками и мягкой заливкой под линией вместо столбиков. Шкала от
// нуля до max(норма, значения); пунктир нормы; сегодняшний день —
// крупная точка и лаймовая подпись; дни без данных (нулевые и
// будущие) — серые точки. Тап по дню — точное значение (вместо
// подписей над столбиками, чтобы линия оставалась чистой).
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
        {/* Заливка под линией — «дымка» от цвета показателя */}
        <Path d={area} fill="url(#weekTrendFill)" />
        {/* Пунктир нормы — на своём уровне шкалы */}
        {normY != null && (
          <Line
            x1={PAD_X}
            y1={normY}
            x2={w - PAD_X}
            y2={normY}
            stroke={colors.text3}
            strokeWidth={1}
            strokeDasharray="4 4"
          />
        )}
        {/* Сама линия тренда */}
        <Path d={line} stroke={color} strokeWidth={2.5} fill="none" strokeLinecap="round" />
        {/* Точки по дням; сегодня — крупная, будущее/нули — серые */}
        {pts.map((p, i) => {
          const future = i > todayIdx
          const zero = !(values[i] > 0)
          if (future || zero) {
            return <Circle key={`p${i}`} cx={p.x} cy={p.y} r={2.5} fill={colors.line} />
          }
          if (i === todayIdx) {
            return (
              <Circle
                key={`p${i}`}
                cx={p.x}
                cy={p.y}
                r={5}
                fill={color}
                stroke={colors.bg}
                strokeWidth={2}
              />
            )
          }
          return <Circle key={`p${i}`} cx={p.x} cy={p.y} r={3.5} fill={color} />
        })}
        {/* Подписи дней под точками; сегодняшний день — акцентом */}
        {values.map((_, i) => (
          <SvgText
            key={`l${i}`}
            x={x(i)}
            y={CHART_H - 7}
            fill={i === todayIdx ? colors.accent : colors.text3}
            fontSize={10.5}
            fontWeight={i === todayIdx ? 'bold' : 'normal'}
            textAnchor="middle"
          >
            {WEEKDAYS[i]}
          </SvgText>
        ))}
      </Svg>
      {/* Прозрачные колонки поверх графика: тап по дню — значение */}
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

  // Счётчик возвратов на вкладку — перезапускает заливку кольца (как на «Главной»)
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
  const fastLastLap = useFastingStore((s) => s.laps[0])
  // Напоминания — для точки на колокольчике в шапке
  const reminder = useActivityStore((s) => s.reminder)

  // Тик 30 с — живой таймер в карточке голодания (только пока идёт сеанс);
  // возврат приложения из фона — подтягиваем время сразу, иначе карточка
  // показывала устаревшие минуты до следующего тика
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!fastStartedAt) return undefined
    setNow(Date.now())
    const t = setInterval(() => setNow(Date.now()), 30000)
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'active') setNow(Date.now())
    })
    return () => {
      clearInterval(t)
      sub.remove()
    }
  }, [fastStartedAt])

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

  // Средние за прошедшие дни недели (Пн…сегодня включительно)
  const elapsed = Math.max(1, todayIdx + 1)
  const avg = useMemo(() => {
    const sum = weekStats.slice(0, elapsed).reduce(
      (a, d) => ({ kcal: a.kcal + d.kcal, fib: a.fib + d.fib, sug: a.sug + d.sug }),
      { kcal: 0, fib: 0, sug: 0 },
    )
    return {
      kcal: Math.round(sum.kcal / elapsed),
      fib: Math.round((sum.fib / elapsed) * 10) / 10,
      sug: Math.round((sum.sug / elapsed) * 10) / 10,
    }
  }, [weekStats, elapsed])

  // Показатель недельного графика: калории / клетчатка / сахар;
  // линия нормы — своя у каждого показателя
  const [metric, setMetric] = useState('kcal')
  const weekValues = weekStats.map((d) => d[metric])
  const weekNorm = metric === 'kcal' ? kcalGoal : metric === 'fib' ? norms.fib : SUGAR_LIMIT
  const chartMax = Math.max(weekNorm, ...weekValues, 1)
  const metricColor = METRIC_COLORS[metric]
  const fmtVal = (v) => (metric === 'kcal' ? formatNum(v) : String(Math.round(v * 10) / 10))

  // Смена цели — та же единая точка, что и в «Мои цели» на «Ещё»
  const pickGoal = (id) => {
    if (id === goalId) return
    applyGoalChoice(id)
    const g = GOALS.find((x) => x.id === id)
    toast({
      title: `${g.emoji} Цель: ${g.label}`,
      description: `Дневная норма — ${formatNum(getDailyTarget(id))} ккал`,
    })
  }

  // Покупки: сводка реального списка
  const shopLeft = shopItems.filter((i) => !i.done).length
  // Предпросмотр чек-листа: некупленные сверху (как на экране «Покупки»),
  // до 4 строк — купленные оседают вниз с зачёркиванием
  const shopRows = useMemo(() => {
    const undone = shopItems.filter((i) => !i.done)
    const done = shopItems.filter((i) => i.done)
    return [...undone, ...done].slice(0, 4)
  }, [shopItems])

  // Колокольчик: красная точка, пока не включено ни одного напоминания
  // (вода, еда, взвешивание, тренировка, сон) — сигнал «загляни в настройки»
  const remCount = [
    reminder?.enabled,
    reminder?.meals?.enabled,
    reminder?.weigh?.enabled,
    reminder?.exercise?.enabled,
    reminder?.sleep?.enabled,
  ].filter(Boolean).length

  // Голодание: строка состояния карточки
  const fastPlan = `${24 - fastWindow}/${fastWindow}`
  const fastSub = fastStartedAt
    ? `Идёт окно без еды · ${fmtHM(now - fastStartedAt)}`
    : fastLastLap
      ? `${fastPlan} · последний сеанс — ${fmtDur((fastLastLap.to || 0) - (fastLastLap.from || 0))}`
      : `${fastPlan} · окно еды с ${fmtClock(fastStart)}`

  // Тап по дню на линии тренда — точное значение (вместо подписей над столбиками)
  const pickDay = (i, v) => {
    toast({
      title: `${WEEKDAYS[i]}${i === todayIdx ? ' · сегодня' : ''} — ${fmtVal(v)} ${METRIC_UNIT[metric]}`,
      description: `Норма в день — ${fmtVal(weekNorm)} ${METRIC_UNIT[metric]}`,
    })
  }

  // Шесть колец «Сегодня» — как в макете: по кольцу на показатель;
  // цвета — та же палитра, что была в полосах Б/Ж/У (Белки — голубой,
  // Жиры — оранжевый, Углеводы — лайм, Клетчатка — зелёный, Сахар — розовый)
  const todayRings = [
    { key: 'kcal', label: 'Ккал', value: todaySum.kcal, norm: kcalGoal, color: colors.accent },
    { key: 'p', label: 'Белки', value: todaySum.p, norm: norms.p, color: colors.cyan },
    { key: 'f', label: 'Жиры', value: todaySum.f, norm: norms.f, color: colors.orange },
    { key: 'c', label: 'Углеводы', value: todaySum.c, norm: norms.c, color: colors.accent },
    { key: 'fib', label: 'Клетчатка', value: todaySum.fib, norm: norms.fib, color: '#34D399' },
    { key: 'sug', label: 'Сахар', value: todaySum.sug, norm: SUGAR_LIMIT, color: '#F472B6' },
  ]

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingHorizontal: spacing.xl, paddingBottom: 48 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Шапка — как в макете: аватар, заголовок, колокольчик и шестерёнка */}
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
          <Text style={styles.subtitle}>Твой путь к цели — чёткий план на неделю</Text>
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
          <Bell size={20} color={colors.text2} />
          {remCount === 0 && <View style={styles.headDot} />}
        </Pressable>
        <Pressable
          onPress={() => router.navigate('/more')}
          style={styles.headBtn}
          accessibilityRole="button"
          accessibilityLabel="Настройки — перейти в «Ещё»"
        >
          <Settings size={20} color={colors.text2} />
        </Pressable>
      </View>

      {/* 1. Цель — пресеты с реальными нормами калорий */}
      <Text style={styles.sectionTitle}>Цель</Text>
      <View style={styles.goalRow}>
        {GOALS.map((g) => {
          const active = goalId === g.id
          return (
            <Pressable
              key={g.id}
              onPress={() => pickGoal(g.id)}
              style={[styles.goalCard, active && styles.goalCardActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`Цель ${g.label}, норма ${formatNum(getDailyTarget(g.id))} ккал в день`}
            >
              <Text style={styles.goalEmoji}>{g.emoji}</Text>
              <Text style={[styles.goalName, active && styles.goalNameActive]} numberOfLines={1}>
                {g.label}
              </Text>
              <Text style={[styles.goalKcal, active && styles.goalKcalActive]}>
                {formatNum(getDailyTarget(g.id))}
              </Text>
              <Text style={[styles.goalUnit, active && styles.goalUnitActive]}>ккал в день</Text>
            </Pressable>
          )
        })}
      </View>

      {/* 2. Меню на неделю — план блюд по дням: сразу после целей,
          как в макете Кати (расположение блоков по макету) */}
      <MealPlanScreen />

      {/* 3. Сегодня: ШЕСТЬ колец прогресса — как в макете («Недельный
          план питания»): по кольцу на показатель, % в центре, под
          кольцом «съедено / норма» и подпись */}
      <Text style={styles.sectionTitle}>Сегодня</Text>
      <View style={styles.card}>
        <View style={styles.todayHead}>
          <Text style={styles.todayTitle}>Съедено сегодня</Text>
          <Text style={styles.todayKcal}>
            {formatNum(todaySum.kcal)}
            <Text style={styles.todayKcalNorm}> / {formatNum(kcalGoal)} ккал</Text>
          </Text>
        </View>
        <View style={styles.ringsGrid}>
          {todayRings.map((r) => {
            const pct = r.norm > 0 ? r.value / r.norm : 0
            const over = r.norm > 0 && r.value > r.norm
            return (
              <View key={r.key} style={styles.ringCell}>
                <Ring pct={pct} runId={runId} color={r.color} />
                <Text
                  style={[styles.ringVal, over && { color: colors.orange }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.72}
                >
                  {formatNum(Math.round(r.value * 10) / 10)}
                  <Text style={styles.ringNorm}> / {formatNum(r.norm)}</Text>
                </Text>
                <Text style={styles.ringLabel}>{r.label}</Text>
              </View>
            )
          })}
        </View>
      </View>

      {/* 4. Неделя: линия тренда (как в макете) по дням из журнала
          дневника + пунктир нормы + средние; показатель — на выбор */}
      <Text style={styles.sectionTitle}>Неделя</Text>
      <View style={styles.card}>
        {/* Переключатель показателя */}
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
        <View style={styles.weekSummary}>
          <View style={styles.wsRow}>
            <Text style={[styles.wsLabel, metric === 'kcal' && styles.wsLabelOn]}>В среднем за день</Text>
            <Text style={styles.wsValue}>
              {formatNum(avg.kcal)} / {formatNum(kcalGoal)} ккал
            </Text>
          </View>
          <View style={styles.wsRow}>
            <Text style={[styles.wsLabel, metric === 'fib' && styles.wsLabelOn]}>Клетчатка</Text>
            <Text style={styles.wsValue}>
              {avg.fib} / {formatNum(norms.fib)} г
            </Text>
          </View>
          <View style={styles.wsRow}>
            <Text style={[styles.wsLabel, metric === 'sug' && styles.wsLabelOn]}>Сахар</Text>
            <Text style={styles.wsValue}>
              {avg.sug} / {SUGAR_LIMIT} г
            </Text>
          </View>
        </View>
      </View>

      {/* 5. Список покупок — как в макете: чек-лист предпросмотра,
          лаймовая кнопка и иллюстрация; тап открывает экран «Покупки»
          (отдельная страница app/shopping.jsx над вкладками) */}
      <Pressable
        style={styles.card}
        onPress={() => router.push('/shopping')}
        accessibilityRole="button"
        accessibilityLabel="Открыть список покупок"
      >
        <View style={styles.shopHead}>
          <View style={styles.rowIcon}>
            <Text style={{ fontSize: 17 }}>🛒</Text>
          </View>
          <Text style={styles.rowTitle}>Список покупок</Text>
          {shopItems.length > 0 && (
            <Text style={styles.shopCount}>
              {shopItems.length} {purchasesWord(shopItems.length)}
            </Text>
          )}
          <ChevronRight size={18} color={colors.text3} />
        </View>
        {shopItems.length === 0 ? (
          <Text style={styles.shopEmpty}>Пока пусто — добавьте из плана меню</Text>
        ) : (
          <View style={styles.shopList}>
            {shopRows.map((it) => (
              <View key={it.id} style={styles.shopRow}>
                <View style={[styles.shopCbx, it.done && styles.shopCbxOn]}>
                  {it.done && <Check size={12} color={colors.accentInk} strokeWidth={3} />}
                </View>
                <Text numberOfLines={1} style={[styles.shopName, it.done && styles.shopNameDone]}>
                  {it.name}
                </Text>
                {it.qty > 1 && <Text style={styles.shopQty}>× {it.qty}</Text>}
              </View>
            ))}
          </View>
        )}
        <View style={styles.shopBottom}>
          <View style={styles.shopBtn}>
            <ShoppingCart size={15} color={colors.accentInk} />
            <Text style={styles.shopBtnText}>Открыть список</Text>
          </View>
          <Image
            source={SHOP_BAG}
            style={styles.shopArt}
            resizeMode="contain"
            accessibilityLabel="Иллюстрация: пакет с продуктами"
          />
        </View>
      </Pressable>

      {/* 6. Интервальное питание — состояние плана/сеанса; тап — полный экран */}
      <Pressable
        style={styles.card}
        onPress={onOpenFasting}
        accessibilityRole="button"
        accessibilityLabel="Открыть интервальное питание"
      >
        <View style={styles.rowCard}>
          <View style={[styles.rowIcon, { backgroundColor: colors.cyanSoft }]}>
            <Timer size={17} color={colors.cyan} />
          </View>
          <View style={styles.rowMain}>
            <Text style={styles.rowTitle}>Интервальное питание</Text>
            <Text style={styles.rowSub}>{fastSub}</Text>
          </View>
          <ChevronRight size={18} color={colors.text3} />
        </View>
      </Pressable>
    </ScrollView>
  )
}

const styles = {
  // Шапка: аватар + заголовок + колокольчик/шестерёнка (как в макете)
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: spacing.l },
  avatarWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface2,
  },
  avatar: { width: '100%', height: '100%' },
  headerMain: { flex: 1, minWidth: 0 },
  title: { ...type.display, fontSize: 24, color: colors.text, letterSpacing: -0.3 },
  subtitle: { ...type.body, fontSize: 12.5, color: colors.text2, marginTop: 1 },
  headBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface2,
  },
  headDot: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF5A5A',
    borderWidth: 1.5,
    borderColor: colors.surface2,
  },

  sectionTitle: {
    ...type.title,
    fontSize: 16,
    color: colors.text,
    letterSpacing: -0.2,
    marginTop: spacing.l,
    marginBottom: spacing.s,
  },

  // Цель
  goalRow: { flexDirection: 'row', gap: spacing.s },
  goalCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: radius.card,
    alignItems: 'center',
    paddingTop: spacing.m,
    paddingBottom: spacing.m,
    paddingHorizontal: 6,
  },
  goalCardActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  goalEmoji: { fontSize: 20 },
  goalName: {
    ...type.caption,
    fontSize: 12.5,
    color: colors.text2,
    marginTop: 5,
  },
  goalNameActive: { color: colors.accentInk },
  goalKcal: { ...type.metric, fontSize: 19, color: colors.text, marginTop: 4 },
  goalKcalActive: { color: colors.accentInk },
  goalUnit: { ...type.caption, fontSize: 10.5, color: colors.text3, marginTop: 1 },
  goalUnitActive: { color: 'rgba(16,20,0,0.65)' },

  // Карточки разделов
  card: {
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: radius.screen,
    padding: spacing.l,
  },

  // Сегодня — шесть колец (как в макете)
  todayHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  todayTitle: { ...type.title, fontSize: 15, color: colors.text },
  todayKcal: { ...type.metric, fontSize: 17, color: colors.text },
  todayKcalNorm: { ...type.caption, fontSize: 12.5, color: colors.text3 },
  ringsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.m,
  },
  ringCell: { width: `${100 / 3}%`, alignItems: 'center' },
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
  ringPct: { ...type.metric, fontSize: 21, color: colors.text },
  ringPctSm: { ...type.metric, fontSize: 12.5 },
  ringVal: {
    ...type.caption,
    fontSize: 13,
    fontWeight: '700',
    fontFamily: F[700],
    color: colors.text,
    marginTop: 6,
    maxWidth: '100%',
  },
  ringNorm: { fontSize: 10.5, color: colors.text3, fontWeight: '600', fontFamily: F[600] },
  ringLabel: { ...type.caption, fontSize: 10.5, color: colors.text3, marginTop: 1 },

  // Неделя — линия тренда
  segRow: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    backgroundColor: colors.surface2,
    borderRadius: 999,
    padding: 3,
    marginBottom: spacing.s,
  },
  segBtn: {
    paddingHorizontal: 12,
    height: 26,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segBtnActive: { backgroundColor: colors.accent },
  segText: { fontSize: 12, fontWeight: '700', fontFamily: F[700], color: colors.text2 },
  segTextActive: { color: colors.accentInk },
  chartTouch: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
  },
  weekSummary: { marginTop: spacing.m, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: spacing.s },
  wsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 26 },
  wsLabel: { ...type.body, fontSize: 13, color: colors.text2 },
  wsLabelOn: { color: colors.text },
  wsValue: { ...type.body, fontSize: 13, color: colors.text, fontWeight: '700', fontFamily: F[700] },

  // Строки-карточки (покупки, голодание)
  rowCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.m },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowMain: { flex: 1, minWidth: 0 },
  rowTitle: { ...type.title, fontSize: 15, color: colors.text, flex: 1 },
  rowSub: { ...type.caption, color: colors.text2, marginTop: 2 },

  // Список покупок — как в макете: чек-лист + кнопка + иллюстрация
  shopHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.m },
  shopCount: { ...type.caption, fontSize: 12.5, color: colors.text2 },
  shopEmpty: { ...type.caption, color: colors.text2, marginTop: spacing.m },
  shopList: { marginTop: spacing.s, gap: 7 },
  shopRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  shopCbx: {
    width: 19,
    height: 19,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.text3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shopCbxOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  shopName: { ...type.body, fontSize: 13.5, color: colors.text, flex: 1, minWidth: 0 },
  shopNameDone: { color: colors.text3, textDecorationLine: 'line-through' },
  shopQty: { ...type.caption, fontSize: 12, color: colors.text3 },
  shopBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.m,
  },
  shopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: colors.accent,
    borderRadius: 999,
    height: 40,
    paddingHorizontal: 18,
  },
  shopBtnText: { fontSize: 13.5, fontWeight: '800', fontFamily: F[800], color: colors.accentInk },
  shopArt: { width: 88, height: 74, marginRight: -6 },
}

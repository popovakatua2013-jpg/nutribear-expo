// Вкладка «План» — 1:1 с макетом Кати от 08.11 (IMG_20261108_230729):
//   шапка        — аватар, «План», колокольчик с красной точкой, шестерёнка
//   цели         — крупные чипы «эмодзи + название + подпись», активный —
//                  лаймовый с галочкой (у нас 4 цели — сеткой 2×2)
//   меню         — КАРУСЕЛЬ как в Сбербанке (просьба Кати 27.11):
//                  «Меню на неделю» (MealPlanScreen) → свайп влево →
//                  карточка «Интервальное питание»; под каруселью —
//                  «Добавить рецепт»
//   прогресс     — кольцо % + легенда Калории/Белки/Жиры/Углеводы +
//                  линия тренда за неделю (клетчатка/сахар — переключателем)
//                  + прогноз цели по весу (просьба Кати 10.11): дефицит
//                  по дневнику за 2 недели → темп кг/нед → дата цели
//   покупки      — чек-лист слева, иллюстрация и лаймовая кнопка справа
//   голодание    — кольцо «16:8», «Ваш режим», строки «Советы» / «Результаты»
// Данные — только реальные, из сторов приложения. Палитра — planPalette.js
// (макет), типографика и сетка — общая дизайн-система (theme.js).

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Animated, Easing, Image, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native'
import Svg, {
  Circle, Defs, Line, LinearGradient, Path, Stop,
  // В react-native-svg v15 алиас SvgText удалён — элемент называется
  // Text; импорт несуществующего SvgText давал undefined и ронял вкладку
  // («Cannot read property 'displayName' of undefined» внутри css-interop)
  Text as SvgText,
} from 'react-native-svg'
import {
  BarChart3, Bell, ChefHat, Check, ChevronRight, Hourglass, Settings, ShoppingCart, Sparkles, Target,
} from 'lucide-react-native'
import { useFocusEffect, useRouter } from 'expo-router'
import { formatNum, pluralDays } from '@/lib/format'
import { withAlpha } from '@/lib/themes'
import { requestOpenReminders } from '@/lib/navEvents'
import { applyGoalChoice } from '@/lib/data/goals-apply'
import { GOALS } from '@/lib/data/goals'
import { SUGAR_LIMIT, sumNutrition } from '@/lib/data/nutrition'
import { macroNormsFor } from '@/lib/data/bju'
import { goalForecast } from '@/lib/data/forecast'
import { useFoodStore } from '@/store/useFoodStore'
import { useGoalsStore } from '@/store/useGoalsStore'
import { useProfileStore } from '@/store/useProfileStore'
import { useShoppingStore } from '@/store/useShoppingStore'
import { useFastingStore } from '@/store/useFastingStore'
import { useActivityStore } from '@/store/useActivityStore'
import { dayDate, weekKeyOf, WEEKDAYS } from '@/store/useMealPlanStore'
import { useToast } from '../ui/Toast'
import { smoothPath } from '../ui/SvgAreaChart'
import { NeonCard } from '../ui/NeonCard'
import { GradientTile } from '../ui/GradientTile'
import { MealPlanScreen } from './MealPlanScreen'
import { WeekReviewModal } from './WeekReviewModal'
import { RecipesModal } from '../food/RecipesModal'
import { AddFoodModal } from '../food/AddFoodModal'
import { usePlanPalette, goodsWord } from './planPalette'
import { spacing, radius, F, type } from '@/features/workouts/theme'
import { useThemeColors, useThemePlain } from '@/lib/use-theme'

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

const fmtClock = (h) => `${pad(((h % 24) + 24) % 24)}:00`

// «3 ч 20 мин» / «42 мин» — прогресс идущего таймера голодания в подписи
// под кольцом (кольцо стало живым — отзыв Кати 19.11)
const fmtDurShort = (ms) => {
  const total = Math.max(0, Math.floor(ms / 60000))
  const h = Math.floor(total / 60)
  const m = total % 60
  return h > 0 ? `${h} ч ${pad(m)} мин` : `${m} мин`
}

// Показатели недельного графика: калории / клетчатка / сахар
const METRICS = [
  ['kcal', 'Калории'],
  ['fib', 'Клетчатка'],
  ['sug', 'Сахар'],
]
// Цвета метрик графика — из палитры ТЕМЫ (правка Кати 25.11): функция,
// чтобы график перекрашивался при смене темы (константа на модуле была
// всегда из «Классики»)
const METRIC_COLORS = (P) => ({ kcal: P.accent, fib: P.green, sug: P.pink })
const METRIC_UNIT = { kcal: 'ккал', fib: 'г', sug: 'г' }

// Месяцы в родительном падеже — дата прогноза цели («20 декабря»)
const MONTHS_GEN = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
]

// Тексты блока прогноза цели (данные — goalForecast из lib/data/forecast.js)
function forecastTexts(f) {
  if (f.reason === 'ok') {
    const d = f.date
    const year = f.daysLeft > 365 ? ` ${d.getFullYear()}` : ''
    const dateStr = `~${d.getDate()} ${MONTHS_GEN[d.getMonth()]}${year}`
    const rate = Math.abs(f.rateKgWeek).toFixed(1).replace('.', ',')
    const kcal = formatNum(Math.abs(f.deficitKcal))
    const isDeficit = f.deficitKcal >= 0
    const mark = isDeficit ? '−' : '+'
    const word = isDeficit ? 'дефиците' : 'профиците'
    return {
      title: `К цели по весу придёшь ${dateStr}`,
      sub: `При твоём текущем ${word} ${mark}${rate} кг/нед (${mark}${kcal} ккал/день)`,
    }
  }
  if (f.reason === 'need-data') {
    const n = f.needDays
    return {
      title: 'Прогноз цели — совсем скоро',
      sub: `Добавьте еду ещё ${n} ${pluralDays(n)} — дефицит считается по записям за 2 недели`,
    }
  }
  if (f.reason === 'no-goal') {
    return {
      title: 'Прогноз цели по весу',
      sub: 'Поставь цель по весу в разделе «Тело» — здесь появится дата',
    }
  }
  if (f.reason === 'reached') {
    return { title: 'Цель по весу достигнута 🎉', sub: 'Держи темп — прогноз больше не нужен' }
  }
  if (f.reason === 'wrong-dir') {
    return {
      title: 'Цель по весу пока не приближается',
      sub: 'Рацион сейчас уводит от цели — прогноз появится, когда направление совпадёт',
    }
  }
  return {
    title: 'Дефицит почти нулевой',
    sub: 'Темп меньше 0,05 кг/нед — даты цели пока не видно',
  }
}

// Кольцо прогресса — анимация как у колец «Главной» (KcalRing):
// дуга «заливается» от нуля до процента, число в центре отсчитывается
// вверх; при возврате на вкладку (runId растёт) заливка повторяется.
// centerText — вместо процентов («16:8» в карточке голодания),
// sub — подпись под числом («от цели», как в макете).
const AnimatedCircle = Animated.createAnimatedComponent(Circle)

// toneOver — красить ли дугу «сверх нормы» оранжевым. Оставлен для
// кольца «Прогресса» (перебор калорий — сигнал «Жиры/перебор нормы»);
// кольцу голодания передаём false (просьба Кати: «заполненное кольцо
// интервальное голодание оранжевое — сделай по теме»): и до, и сверх
// цели дуга — акцент активной темы. ОДНОТОННОСТЬ бесплатной «Классики»
// (plain): свечение под дугой не рисуется вовсе
function Ring({ pct, runId, size = 64, stroke = 7, sub, centerText, toneOver = true }) {
  const { P } = usePlanPalette()
  const plain = useThemePlain()
  const styles = makeStyles(P)
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
  // Идентификатор градиента — по размеру: на вкладке два кольца (56 и 88),
  // id в одном SVG-дереве должны быть уникальны
  const gradId = `planRingGrad${size}`

  return (
    <View style={styles.ringWrap}>
      <Svg width={size} height={size}>
        {/* Градиент дуги — цвет темы (bright → accent): кольцо светится
            цветом темы, как кольца «Главной» (просьба Кати 27.11:
            «интервальное питание круг — градиент и свечение добавить») */}
        <Defs>
          <LinearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={P.accentBright} />
            <Stop offset="1" stopColor={P.accent} />
          </LinearGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={rc} stroke={P.tile} strokeWidth={stroke} fill="none" />
        {/* Свечение — мягкий ореол под дугой: та же анимация, шире штрих,
            полупрозрачный bright (работает на обеих платформах — тени
            Android не красятся). plain-темы («Классика») — без ореола:
            «однотонная без эффектов и свечения» */}
        {pct > 0 && !plain && (
          <AnimatedCircle
            cx={size / 2}
            cy={size / 2}
            r={rc}
            stroke={over && toneOver ? withAlpha(P.orange, 0.28) : withAlpha(P.accentBright, 0.3)}
            strokeWidth={stroke + 6}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${cc} ${cc}`}
            strokeDashoffset={dashOffset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        )}
        {pct > 0 && (
          <AnimatedCircle
            cx={size / 2}
            cy={size / 2}
            r={rc}
            stroke={over && toneOver ? P.orange : `url(#${gradId})`}
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
        <Text style={[styles.ringPct, { fontSize: centerFs }, over && toneOver && !centerText && { color: P.orange }]}>
          {centerText || `${Math.round(num)}%`}
        </Text>
        {sub ? <Text style={styles.ringSub}>{sub}</Text> : null}
      </View>
    </View>
  )
}

// Линия тренда недели — как в макете: плавная кривая с точками и
// мягкой заливкой; пунктир нормы; сегодняшний день — крупная точка и
// акцентная подпись; дни без данных — серые точки. Тап по дню — значение.
// Высота снижена со 148 — блок «Прогресс» компактнее (отзыв Кати 10.11:
// «очень громоздкие блоки»)
const CHART_H = 116

function TrendChart({ values, norm, max, color, todayIdx, onPickDay }) {
  const { P } = usePlanPalette()
  const styles = makeStyles(P)
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
  const { P } = usePlanPalette()
  const styles = makeStyles(P)
  const { toast } = useToast()
  const router = useRouter()
  // Цвета активной темы (Premium 23.11) — поверхности карточек целей и разбора недели
  const themeColors = useThemeColors()

  // Карусель «меню ↔ интервальное питание» — как в Сбербанке (просьба
  // Кати 27.11: «меню на неделю и листать/смахнуть влево — там будет
  // интервальное питание»): большая карточка меню, справа выглядывает
  // край карточки голодания; свайп влево — и голодание встаёт во всю
  // ширину. Ширины — от окна и боковых отступов вкладки (spacing.xl)
  const { width: winW } = useWindowDimensions()
  const CAR_GAP = 12
  const CAR_PEEK = 56
  const menuCardW = winW - spacing.xl * 2 - CAR_PEEK
  const fastCardW = winW - spacing.xl * 2

  // Счётчик возвратов на вкладку — перезапускает заливку кольца
  const [runId, setRunId] = useState(0)
  // Текущее время для живого кольца голодания: без тика кольцо
  // застывало бы между возвратами на вкладку
  const [fastNow, setFastNow] = useState(() => Date.now())
  useFocusEffect(
    useCallback(() => {
      setRunId((n) => n + 1)
      setFastNow(Date.now())
    }, [])
  )
  // Тик раз в 15 с, только пока идёт сеанс голодания: кольцо и
  // подпись «Идёт таймер…» ползут вперёд сами, без тапов
  useEffect(() => {
    if (!fastStartedAt) return undefined
    setFastNow(Date.now())
    const t = setInterval(() => setFastNow(Date.now()), 15000)
    return () => clearInterval(t)
  }, [fastStartedAt])

  // «Добавить рецепт» — блок в правой колонке под «Интервальным
  // питанием» (просьба Кати 09.11: вынести из карточки меню в пустое
  // место справа): окно своих рецептов — создание, список, правка;
  // «Записать» рецепта открывает окно добавления еды (экран порции)
  const [recipesOpen, setRecipesOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [addMealId, setAddMealId] = useState('snack')
  const [recipePick, setRecipePick] = useState(null)
  // Окно «Разбор недели» — Premium-функция этапа 2 монетизации
  const [reviewOpen, setReviewOpen] = useState(false)

  // — Данные: всё из сторов приложения, никаких заглушек —
  const goalId = useFoodStore((s) => s.goal)
  const entries = useFoodStore((s) => s.entries)
  const history = useFoodStore((s) => s.history)
  const kcalGoal = useGoalsStore((s) => s.goals.kcal)
  const macroNorms = useGoalsStore((s) => s.goals.macroNorms)
  // Прогноз цели по весу (просьба Кати 10.11): вес и цель — из профиля,
  // дефицит — из дневника; показывается в карточке «Прогресс»
  const weightKg = useProfileStore((s) => s.weightKg)
  const goalWeightKg = useProfileStore((s) => s.goalWeightKg)
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

  // Прогноз цели по весу: дефицит по дневнику (за 2 недели) → темп
  // кг/нед → дата цели. Пересчёт — при смене дневника/нормы/веса/цели
  const forecast = useMemo(
    () => goalForecast({ history, kcalGoal, weightKg, goalWeightKg }),
    [history, kcalGoal, weightKg, goalWeightKg],
  )
  const forecastText = useMemo(() => forecastTexts(forecast), [forecast])

  // Нормы: свои из целей (0 = авто) или авто от нормы ккал — те же доли,
  // что в плане онбординга (macroNormsFor)
  const norms = useMemo(() => {
    const auto = macroNormsFor(kcalGoal, goalId)
    const n = macroNorms || {}
    return {
      p: n.p > 0 ? n.p : auto.p,
      f: n.f > 0 ? n.f : auto.f,
      c: n.c > 0 ? n.c : auto.c,
      fib: n.fib > 0 ? n.fib : auto.fib,
    }
  }, [kcalGoal, macroNorms, goalId])

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
  const metricColor = METRIC_COLORS(P)[metric]
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

  // Голодание: кольцо стало ЖИВЫМ (отзыв Кати 19.11: «на вкладке план
  // интервальное питание всегда отображается полузаполненный круг» —
  // раньше была застывшая доля плана fastGoal/24 ≈ 2/3, её читали как
  // прогресс). Теперь: идёт таймер — кольцо заполняется реальным
  // прогрессом до цели и СВЕРХ цели остаётся цветом темы (просьба
  // Кати: «заполненное кольцо интервальное голодание оранжевое —
  // сделай по теме»); таймер не идёт — кольцо пустое, в центре
  // режим плана
  const fastGoalH = 24 - fastWindow
  const fastPlan = `${fastGoalH}/${fastWindow}`
  const fastGoalMs = (fastHours || fastGoalH) * 3600000
  const fastElapsed = fastStartedAt ? Math.max(0, fastNow - fastStartedAt) : 0
  const fastPct = fastStartedAt && fastGoalMs > 0 ? fastElapsed / fastGoalMs : 0
  const fastEatFrom = fmtClock(fastStart)
  const fastEatTo = fmtClock(((fastStart + fastWindow) % 24 + 24) % 24)

  // Тап по дню на линии тренда — точное значение
  const pickDay = (i, v) => {
    toast({
      title: `${WEEKDAYS[i]}${i === todayIdx ? ' · сегодня' : ''} — ${fmtVal(v)} ${METRIC_UNIT[metric]}`,
      description: `Норма в день — ${fmtVal(weekNorm)} ${METRIC_UNIT[metric]}`,
    })
  }

  // Легенда «Прогресса» — 4 строки в одну линию: точка + название +
  // значения справа (компактнее — отзыв Кати 10.11: «очень громоздкие
  // блоки»)
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

      {/* 1. Цели — крупные чипы: эмодзи + название + подпись (сетка 2×2).
          ОФОРМЛЕНИЕ (правка Кати 25.11, пятый круг: «вкладка план —
          вообще не оформлена! Ни рамок ни свечения ни градиента»):
          неактивный чип — GradientTile (градиентная поверхность + кайма
          темы), активный — сплошной акцент с галочкой (выбор видно и
          в неонах, и на «Кремовой») */}
      <View style={styles.goalGrid}>
        {GOALS.map((g) => {
          const active = goalId === g.id
          const chipBody = (
            <>
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
                  <View style={[styles.goalCheckCircle, { backgroundColor: themeColors.deep }]}>
                    <Check size={13} color={P.accentInk} strokeWidth={3.5} />
                  </View>
                </View>
              )}
            </>
          )
          return (
            <Pressable
              key={g.id}
              onPress={() => pickGoal(g.id)}
              style={styles.goalChipWrap}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`Цель ${g.label}${active ? ', активна' : ''}, выбор цели норму калорий не меняет`}
            >
              {active ? (
                <View style={[styles.goalChipInner, styles.goalChipOn]}>{chipBody}</View>
              ) : (
                <GradientTile radius={20} innerStyle={styles.goalChipInner}>
                  {chipBody}
                </GradientTile>
              )}
            </Pressable>
          )
        })}
      </View>

      {/* 2. «Меню на неделю» и «Интервальное питание» — КАРУСЕЛЬ, как в
          Сбербанке (просьба Кати 27.11: «меню на неделю и листать/
          смахнуть влево — там будет интервальное питание»): слева большая
          карточка меню, справа из-за края выглядывает карточка голодания;
          свайп влево — и она встаёт во всю ширину (snapToOffsets, без
          точек-индикаторов — как в Сбере). paddingVertical — место для
          ореолов свечения NeonCard, иначе горизонт ScrollView их обрежет */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToOffsets={[0, menuCardW + CAR_GAP]}
        contentContainerStyle={{ alignItems: 'stretch', gap: CAR_GAP, paddingVertical: 14 }}
        style={{ marginTop: 2 }}
      >
        <View style={{ width: menuCardW }}>
          <MealPlanScreen compact />
        </View>

        {/* Высота тап-обёртки — от карусели (alignItems: 'stretch'):
            карточка голодания тянется на высоту карточки меню, контент
            распределён по высоте (fastInner space-between) */}
        <Pressable
          onPress={onOpenFasting}
          style={{ width: fastCardW }}
          accessibilityRole="button"
          accessibilityLabel="Интервальное питание — открыть подробнее"
        >
          <NeonCard radius={20} style={styles.fastCard} innerStyle={styles.fastInner}>
          <Text
            style={styles.fastTitle}
            numberOfLines={2}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
          >
            Интервальное питание
          </Text>
          <View style={styles.fastRingWrap}>
            {/* toneOver={false} — просьба Кати: заполненное кольцо
                голодания больше не красится оранжевым сверх цели,
                всегда цвет темы */}
            <Ring
              pct={fastPct}
              runId={runId}
              size={48}
              stroke={6}
              centerText={fastStartedAt ? undefined : fastPlan}
              sub={fastStartedAt ? fastPlan : 'Режим'}
              toneOver={false}
            />
          </View>
          <View style={styles.fastLegend}>
            <View style={styles.fastLegendRow}>
              <View style={[styles.fastDot, { backgroundColor: P.accentText }]} />
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
          {/* Живая подпись: что показывает кольцо прямо сейчас */}
          <Text style={styles.fastLive} numberOfLines={2}>
            {fastStartedAt
              ? `Идёт таймер: ${fmtDurShort(fastElapsed)} из ${Math.round(fastGoalMs / 3600000)} ч`
              : 'Кольцо заполнится по ходу таймера без еды'}
          </Text>
          <View style={styles.fastMore} pointerEvents="none">
            <Text style={styles.fastMoreText}>Подробнее</Text>
            <ChevronRight size={13} color={P.accentInk} />
          </View>
          </NeonCard>
        </Pressable>
      </ScrollView>

      {/* «Добавить рецепт» — компактный блок под каруселью: окно своих
          рецептов — создание, список, правка; «Записать» рецепта
          открывает окно добавления еды (экран порции) */}
      <Pressable
        onPress={() => setRecipesOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="Добавить рецепт — свои рецепты: создать, посмотреть или записать"
      >
        <NeonCard radius={20} style={styles.recipeCard} innerStyle={styles.recipeInner}>
          <View style={styles.recipeTile}>
            <ChefHat size={17} color={P.accentText} />
          </View>
          <View style={styles.recipeTexts}>
            <Text
              style={styles.recipeName}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.85}
            >
              Добавить рецепт
            </Text>
            <Text style={styles.recipeSub} numberOfLines={1}>Свой рецепт · мои рецепты</Text>
          </View>
          <ChevronRight size={15} color={P.text3} />
        </NeonCard>
      </Pressable>

      {/* 3. Прогресс — как в макете: кольцо % + легенда БЖУ + линия тренда.
          Оформление — NeonCard (пятый круг Кати: «вкладка план — ни
          рамок ни свечения ни градиента»): кайма + градиент + свечение,
          как у блоков «Главной» */}
      <NeonCard style={styles.card} innerStyle={styles.cardInner}>
        <View style={styles.cardHead}>
          <View style={styles.iconTile}>
            <BarChart3 size={18} color={P.accentText} />
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
            size={88}
            stroke={9}
            sub="от цели"
          />
          <View style={styles.legend}>
            {legend.map((r) => (
              <View key={r.key} style={styles.legendRow}>
                <View style={[styles.legendDot, { backgroundColor: r.color }]} />
                <Text numberOfLines={1} style={styles.legendLabel}>{r.label}</Text>
                <Text numberOfLines={1} style={styles.legendVal}>
                  {r.value} / {r.norm} {r.unit}
                </Text>
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

        {/* Прогноз цели по весу — дефицит считается по дневнику (просьба
            Кати 10.11): «при твоём текущем дефиците −0,5 кг/нед, к цели
            по весу придёшь ~20 декабря» */}
        <View style={styles.forecast}>
          <View style={styles.forecastIcon}>
            <Target size={15} color={P.accentText} />
          </View>
          <View style={styles.forecastTexts}>
            <Text numberOfLines={1} style={styles.forecastTitle}>{forecastText.title}</Text>
            <Text numberOfLines={2} style={styles.forecastSub}>{forecastText.sub}</Text>
          </View>
        </View>

        {/* Разбор недели от напарника — Premium (этап 2 монетизации):
            строка в стиле прогноза, тап открывает окно разбора */}
        <Pressable
          style={[styles.reviewRow, { backgroundColor: themeColors.accentFaint, borderColor: themeColors.accentBorder }]}
          onPress={() => setReviewOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Разбор недели от напарника — Premium"
        >
          <View style={styles.forecastIcon}>
            <Sparkles size={15} color={P.accentText} />
          </View>
          <View style={styles.forecastTexts}>
            <Text numberOfLines={1} style={styles.forecastTitle}>Разбор недели от напарника</Text>
            <Text numberOfLines={1} style={styles.forecastSub}>
              итоги и советы по дневнику · 👑 Premium
            </Text>
          </View>
          <ChevronRight size={15} color={P.text3} />
        </Pressable>
      </NeonCard>

      {/* 4. Список покупок — чек-лист слева, иллюстрация и лаймовая кнопка
          справа (как в макете); тап открывает экран «Покупки».
          Оформление — NeonCard, как у «Прогресса» (единый стиль вкладки) */}
      <NeonCard style={styles.card} innerStyle={styles.cardInner}>
      <Pressable
        onPress={() => router.push('/shopping')}
        accessibilityRole="button"
        accessibilityLabel="Открыть список покупок"
      >
        <View style={styles.cardHead}>
          <View style={styles.iconTile}>
            <ShoppingCart size={18} color={P.accentText} />
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
      </NeonCard>

      {/* Окно рецептов: монтируется только открытым — каждый раз
          стартует со списка (или формы, если рецептов ещё нет) */}
      {recipesOpen && (
        <RecipesModal
          onClose={() => setRecipesOpen(false)}
          onLogRecipe={(item) => {
            setRecipesOpen(false)
            setRecipePick(item)
            setAddMealId('snack')
            setAddOpen(true)
          }}
        />
      )}

      {/* Запись рецепта в дневник — то же окно добавления еды, что и на
          Главной: открывается сразу на экране порции рецепта (приём
          пищи по умолчанию — перекус, меняется пилюлями в окне) */}
      <AddFoodModal
        open={addOpen}
        onClose={() => {
          setAddOpen(false)
          setRecipePick(null)
        }}
        mealId={addMealId}
        onMealIdChange={setAddMealId}
        initialPick={recipePick}
        onPickConsumed={() => setRecipePick(null)}
      />

      {/* Разбор недели от напарника — Premium (этап 2 монетизации):
          для free внутри честный paywall с кодом активации */}
      <WeekReviewModal open={reviewOpen} onClose={() => setReviewOpen(false)} />

    </ScrollView>
  )
}

const makeStyles = (P) => ({
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
  // Чип цели: ПЛОСКАЯ ширина ~48% — два в ряд. Раньше обёртка была
  // flex:1 + minWidth, а на плитке висел flex:1 по высоте — чип
  // растягивался в высокий прямоугольник с контентом, прилипшим к
  // верхнему краю, и пустым полем снизу («Похудение/Сушка уехали»,
  // скрин Кати 25.11). Теперь высота — по контенту с minHeight,
  // содержимое отцентрировано вертикально (alignItems в строке)
  goalChipWrap: {
    width: '48%',
  },
  goalChipInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 20,
    paddingHorizontal: 13,
    paddingVertical: 10,
    minHeight: 58,
  },
  goalChipOn: { backgroundColor: P.accent, paddingRight: 36 },
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
  goalHintOn: { color: P.accentInk },
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
    backgroundColor: P.deep,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Карточка раздела: фон/кайма/градиент даёт NeonCard, здесь — только
  // отступ и внутренний паддинг (cardInner)
  card: {
    marginTop: spacing.l,
  },
  cardInner: {
    padding: spacing.l,
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

  // Прогресс: кольцо + легенда (строки в одну линию — компактнее,
  // отзыв Кати 10.11)
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: spacing.m },
  legend: { flex: 1, minWidth: 0, gap: 7 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: {
    flexShrink: 1,
    fontSize: 13.5,
    fontWeight: '700',
    fontFamily: F[700],
    color: P.text,
  },
  legendVal: {
    marginLeft: 'auto',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: F[600],
    color: P.text3,
    fontVariant: ['tabular-nums'],
  },
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

  // Прогноз цели по весу — строка под графиком недели
  forecast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: P.tileSoft,
    borderRadius: radius.row,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: spacing.m,
  },
  forecastIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: P.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  forecastTexts: { flex: 1, minWidth: 0 },
  forecastTitle: { fontSize: 13.5, fontWeight: '700', fontFamily: F[700], color: P.text },
  forecastSub: { fontSize: 11.5, fontWeight: '400', fontFamily: F[400], color: P.text3, marginTop: 1 },
  // Разбор недели — строка в стиле прогноза с рамкой сверху (граница
  // «ИИ-блока» внутри карточки «Прогресс»)
  reviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
    backgroundColor: P.accentFaint,
    borderColor: P.accentBorder,
    borderWidth: 1,
    borderRadius: radius.row,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 8,
  },

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
  // (иллюстрация и кнопка меньше — блок компактнее, отзыв Кати 10.11)
  shopBody: { flexDirection: 'row', gap: 12, marginTop: spacing.m },
  shopList: { flex: 1, minWidth: 0, gap: 8 },
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
  shopSide: { width: 112, alignItems: 'center' },
  shopArt: { width: 94, height: 58, marginBottom: 2 },
  shopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: P.accent,
    borderRadius: 999,
    height: 32,
    paddingHorizontal: 10,
    alignSelf: 'stretch',
  },
  shopBtnText: { fontSize: 11, fontWeight: '800', fontFamily: F[800], color: P.accentInk },

  // Карусель «меню ↔ интервальное питание» (как в Сбербанке, отзыв
  // Кати 27.11): ширины карточек считаются в компоненте от окна
  // (menuCardW/fastCardW), здесь — только высота и распределение.
  // flex:1 у fastCard — карточка голодания тянется на высоту карточки
  // меню (alignItems: 'stretch' у contentContainer карусели), контент
  // распределён по высоте (fastInner space-between). фон/кайма/градиент —
  // NeonCard, паддинг — fastInner
  fastCard: { flex: 1 },
  fastInner: { padding: 10, flex: 1, justifyContent: 'space-between' },
  fastTitle: { ...type.title, fontSize: 12, color: P.text, lineHeight: 14.5 },
  // «все поменьше» (правка Кати 27.11): кольцо ниже и зазоры уже —
  // контент карточки голодания распределён по высоте ряда карусели
  // (ряд теперь задаёт карточка меню), крупные зазоры не нужны
  fastRingWrap: { alignItems: 'center', marginTop: 6 },
  fastLegend: { gap: 6, marginTop: 6, alignSelf: 'stretch' },
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
    height: 28,
    marginTop: 6,
    alignSelf: 'stretch',
  },
  fastMoreText: { fontSize: 12, fontWeight: '800', fontFamily: F[800], color: P.accentInk },
  fastLive: {
    fontSize: 10.5,
    fontWeight: '600',
    fontFamily: F[600],
    color: P.text3,
    lineHeight: 14,
    marginTop: 2,
  },

  // «Добавить рецепт» — компактная строка-кнопка под каруселью:
  // иконка слева, тексты в столбик, шеврон справа; высота по контенту
  // (просьба Кати 26.11: «добавить рецепт сжато» — растягивать нельзя)
  recipeCard: {
    marginTop: 10,
  },
  recipeInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
  },
  recipeTexts: { flex: 1, minWidth: 0 },
  recipeTile: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: P.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recipeName: { fontSize: 13.5, fontWeight: '800', fontFamily: F[800], color: P.text },
  recipeSub: { fontSize: 11, fontWeight: '400', fontFamily: F[400], color: P.text3, marginTop: 1 },
})

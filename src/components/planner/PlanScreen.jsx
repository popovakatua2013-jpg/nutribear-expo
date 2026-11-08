// Экран «План» — обзор питания по макетам Кати (все цифры реальные,
// без заглушек). Разделы сверху вниз:
//   1. «Цель» — карточки Похудение / Поддержка / Набор веса: активная
//      цель берётся из дневника (useFoodStore.goal), норма ккал — сумма
//      пресета (getDailyTarget). Тап применяет пресет через
//      applyGoalChoice (единая точка смены цели, как в «Мои цели»).
//   2. «Сегодня» — кольцо % от нормы ккал и полосы Б/Ж/У/клетчатки.
//      Съедено — живой дневник (useFoodStore.entries, sumNutrition),
//      нормы — свои из целей (goals.macroNorms) или «тарелка»
//      20/30/50 % от нормы ккал, как в сводке «Съедено за сегодня».
//   3. «Неделя» — столбики съеденных калорий Пн–Вс по журналу дневника
//      (useFood.history), линия цели и средние за прошедшие дни:
//      ккал, клетчатка (своя норма или 25 г ВОЗ), сахар (порог ВОЗ 50 г).
//   4. «Меню на неделю» — MealPlanScreen (полоса дней + карточка дня).
//   5. «Список покупок» — сводка useShoppingStore; тап — вкладка «Покупки».
//   6. «Интервальное голодание» — план и идущий таймер из
//      useFastingStore; тап открывает полный экран (PlanTab).
// Кольцо — react-native-svg, как кольца сводки на «Главной».
// Стиль — дизайн-система вкладки (theme.js).

import { useEffect, useMemo, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import Svg, { Circle } from 'react-native-svg'
import { ChevronRight, Timer } from 'lucide-react-native'
import { useRouter } from 'expo-router'
import { formatNum } from '@/lib/format'
import { applyGoalChoice } from '@/lib/data/goals-apply'
import { GOALS, getDailyTarget } from '@/lib/data/goals'
import { FIBER_NORM, SUGAR_LIMIT, sumNutrition } from '@/lib/data/nutrition'
import { useFoodStore } from '@/store/useFoodStore'
import { useGoalsStore } from '@/store/useGoalsStore'
import { useShoppingStore } from '@/store/useShoppingStore'
import { useFastingStore } from '@/store/useFastingStore'
import { dayDate, weekKeyOf, WEEKDAYS } from '@/store/useMealPlanStore'
import { useToast } from '../ui/Toast'
import { MealPlanScreen } from './MealPlanScreen'
import { colors, spacing, radius, F, type } from '@/features/workouts/theme'

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

// Кольцо прогресса дня: дуга от нуля, при переборе нормы — оранжевая
const RING = 92
const SW = 9
const RC = (RING - SW) / 2
const CC = 2 * Math.PI * RC

function Ring({ pct }) {
  const over = pct > 1.05
  const p = Math.max(0, Math.min(1, pct))
  return (
    <View style={styles.ringWrap}>
      <Svg width={RING} height={RING}>
        <Circle cx={RING / 2} cy={RING / 2} r={RC} stroke={colors.line} strokeWidth={SW} fill="none" />
        {p > 0 && (
          <Circle
            cx={RING / 2}
            cy={RING / 2}
            r={RC}
            stroke={over ? colors.orange : colors.accent}
            strokeWidth={SW}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${CC * p} ${CC}`}
            transform={`rotate(-90 ${RING / 2} ${RING / 2})`}
          />
        )}
      </Svg>
      <View style={styles.ringCenter}>
        <Text style={[styles.ringPct, over && { color: colors.orange }]}>{Math.round(pct * 100)}%</Text>
        <Text style={styles.ringCap}>нормы</Text>
      </View>
    </View>
  )
}

// Полоса нутриента: подпись слева, «съедено / норма г» справа
function MacroBar({ label, value, norm, color }) {
  const over = norm > 0 && value > norm
  const w = norm > 0 ? Math.min(1, value / norm) : 0
  return (
    <View style={styles.mbar}>
      <View style={styles.mbarHead}>
        <Text style={styles.mbarLabel}>{label}</Text>
        <Text style={[styles.mbarVal, over && { color: colors.orange }]}>
          {formatNum(Math.round(value))} / {formatNum(norm)} г
        </Text>
      </View>
      <View style={styles.mbarTrack}>
        <View
          style={[styles.mbarFill, { width: `${w * 100}%`, backgroundColor: over ? colors.orange : color }]}
        />
      </View>
    </View>
  )
}

export function PlanScreen({ onOpenFasting }) {
  const { toast } = useToast()
  const router = useRouter()

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

  // Тик 30 с — живой таймер в карточке голодания (только пока идёт сеанс)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!fastStartedAt) return undefined
    setNow(Date.now())
    const t = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(t)
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

  const kcalPct = kcalGoal > 0 ? todaySum.kcal / kcalGoal : 0

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

  const chartMax = Math.max(kcalGoal, ...weekStats.map((d) => d.kcal), 1)

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
  const shopPreview = shopItems
    .filter((i) => !i.done)
    .slice(0, 3)
    .map((i) => i.name)
    .join(' · ')

  // Голодание: строка состояния карточки
  const fastPlan = `${24 - fastWindow}/${fastWindow}`
  const fastSub = fastStartedAt
    ? `Идёт голодание · ${fmtHM(now - fastStartedAt)} без еды`
    : fastLastLap
      ? `${fastPlan} · последний сеанс — ${fmtDur((fastLastLap.to || 0) - (fastLastLap.from || 0))}`
      : `${fastPlan} · окно еды с ${fmtClock(fastStart)}`

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingHorizontal: spacing.xl, paddingBottom: 48 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Шапка */}
      <Text style={styles.title}>План</Text>
      <Text style={styles.subtitle}>Цель, прогресс дня и меню на неделю</Text>

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

      {/* 2. Сегодня: кольцо % нормы + Б/Ж/У/клетчатка (живой дневник) */}
      <Text style={styles.sectionTitle}>Сегодня</Text>
      <View style={styles.card}>
        <View style={styles.todayRow}>
          <Ring pct={kcalPct} />
          <View style={styles.todayRight}>
            <Text style={styles.kcalLine}>
              {formatNum(todaySum.kcal)}
              <Text style={styles.kcalGoal}> / {formatNum(kcalGoal)} ккал</Text>
            </Text>
            <Text style={styles.kcalCap}>съедено сегодня</Text>
          </View>
        </View>
        <View style={styles.mbars}>
          <MacroBar label="Белки" value={todaySum.p} norm={norms.p} color={colors.cyan} />
          <MacroBar label="Жиры" value={todaySum.f} norm={norms.f} color={colors.orange} />
          <MacroBar label="Углеводы" value={todaySum.c} norm={norms.c} color={colors.accent} />
          <MacroBar label="Клетчатка" value={todaySum.fib} norm={norms.fib} color="#34D399" />
        </View>
      </View>

      {/* 3. Неделя: столбики по журналу дневника + линия цели + средние */}
      <Text style={styles.sectionTitle}>Неделя</Text>
      <View style={styles.card}>
        <View style={styles.chart}>
          {/* Линия цели: бары сидят на дне colArea (104px от верха графика),
              максимальная высота бара — 84px, поэтому top считается в пикселях */}
          {kcalGoal > 0 && (
            <View
              pointerEvents="none"
              style={[styles.goalLine, { top: 104 - Math.min(1, kcalGoal / chartMax) * 84 }]}
            />
          )}
          <View style={styles.chartCols}>
            {weekStats.map((d, i) => {
              const isToday = i === todayIdx
              const future = i > todayIdx
              const h = d.kcal > 0 ? Math.max(4, Math.round((d.kcal / chartMax) * 84)) : 3
              return (
                <View key={i} style={styles.col}>
                  <View style={styles.colArea}>
                    {d.kcal > 0 && <Text style={styles.colVal}>{formatNum(d.kcal)}</Text>}
                    <View
                      style={[
                        styles.colBar,
                        { height: h },
                        d.kcal > 0
                          ? { backgroundColor: isToday ? colors.accent : colors.cyan }
                          : { backgroundColor: colors.line },
                        future && d.kcal === 0 && { opacity: 0.6 },
                      ]}
                    />
                  </View>
                  <Text style={[styles.colLabel, isToday && styles.colLabelToday]}>{WEEKDAYS[i]}</Text>
                </View>
              )
            })}
          </View>
        </View>
        <View style={styles.weekSummary}>
          <View style={styles.wsRow}>
            <Text style={styles.wsLabel}>В среднем за день</Text>
            <Text style={styles.wsValue}>
              {formatNum(avg.kcal)} / {formatNum(kcalGoal)} ккал
            </Text>
          </View>
          <View style={styles.wsRow}>
            <Text style={styles.wsLabel}>Клетчатка</Text>
            <Text style={styles.wsValue}>
              {avg.fib} / {formatNum(norms.fib)} г
            </Text>
          </View>
          <View style={styles.wsRow}>
            <Text style={styles.wsLabel}>Сахар</Text>
            <Text style={styles.wsValue}>
              {avg.sug} / {SUGAR_LIMIT} г
            </Text>
          </View>
        </View>
      </View>

      {/* 4. Меню на неделю — существующий раздел (полоса дней + день) */}
      <MealPlanScreen />

      {/* 5. Список покупок — сводка; тап открывает вкладку «Покупки» */}
      <Pressable
        style={styles.card}
        onPress={() => router.navigate('/shopping')}
        accessibilityRole="button"
        accessibilityLabel="Открыть список покупок"
      >
        <View style={styles.rowCard}>
          <View style={styles.rowIcon}>
            <Text style={{ fontSize: 17 }}>🛒</Text>
          </View>
          <View style={styles.rowMain}>
            <Text style={styles.rowTitle}>Список покупок</Text>
            <Text style={styles.rowSub}>
              {shopItems.length === 0
                ? 'Пока пусто — добавьте из плана меню'
                : shopLeft === 0
                  ? `${shopItems.length} ${purchasesWord(shopItems.length)} · всё куплено 🎉`
                  : `${shopItems.length} ${purchasesWord(shopItems.length)} · осталось ${shopLeft}`}
            </Text>
            {shopPreview ? (
              <Text style={styles.rowPreview} numberOfLines={1}>
                {shopPreview}
              </Text>
            ) : null}
          </View>
          <ChevronRight size={18} color={colors.text3} />
        </View>
      </Pressable>

      {/* 6. Интервальное голодание — состояние плана/сеанса; тап — полный экран */}
      <Pressable
        style={styles.card}
        onPress={onOpenFasting}
        accessibilityRole="button"
        accessibilityLabel="Открыть интервальное голодание"
      >
        <View style={styles.rowCard}>
          <View style={[styles.rowIcon, { backgroundColor: colors.cyanSoft }]}>
            <Timer size={17} color={colors.cyan} />
          </View>
          <View style={styles.rowMain}>
            <Text style={styles.rowTitle}>Интервальное голодание</Text>
            <Text style={styles.rowSub}>{fastSub}</Text>
          </View>
          <ChevronRight size={18} color={colors.text3} />
        </View>
      </Pressable>
    </ScrollView>
  )
}

const styles = {
  title: { ...type.display, fontSize: 26, color: colors.text, letterSpacing: -0.3, marginTop: spacing.l },
  subtitle: { ...type.body, color: colors.text2, marginTop: 4, marginBottom: spacing.s },
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

  // Сегодня
  todayRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.l },
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
  ringCap: { ...type.caption, fontSize: 10.5, color: colors.text3, marginTop: -2 },
  todayRight: { flex: 1, minWidth: 0 },
  kcalLine: { ...type.metric, fontSize: 24, color: colors.text, letterSpacing: -0.3 },
  kcalGoal: { ...type.metric, fontSize: 15, color: colors.text3 },
  kcalCap: { ...type.caption, color: colors.text3, marginTop: 2 },
  mbars: { marginTop: spacing.m, gap: 9 },
  mbar: {},
  mbarHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  mbarLabel: { ...type.caption, fontSize: 12.5, color: colors.text2 },
  mbarVal: { ...type.caption, fontSize: 12.5, color: colors.text, fontWeight: '700', fontFamily: F[700] },
  mbarTrack: { height: 5, borderRadius: 3, backgroundColor: colors.line, marginTop: 4, overflow: 'hidden' },
  mbarFill: { height: 5, borderRadius: 3 },

  // Неделя
  chart: { position: 'relative' },
  goalLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 0,
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.text3,
  },
  chartCols: { flexDirection: 'row', alignItems: 'flex-end' },
  col: { flex: 1, alignItems: 'center' },
  colArea: { height: 104, justifyContent: 'flex-end', alignItems: 'center', width: '100%' },
  colVal: {
    ...type.caption,
    fontSize: 9.5,
    color: colors.text2,
    marginBottom: 3,
    maxWidth: '100%',
  },
  colBar: { width: '58%', maxWidth: 26, borderRadius: 4 },
  colLabel: { ...type.caption, fontSize: 10.5, color: colors.text3, marginTop: 6, height: 15 },
  colLabelToday: { color: colors.accent },
  weekSummary: { marginTop: spacing.m, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: spacing.s },
  wsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 26 },
  wsLabel: { ...type.body, fontSize: 13, color: colors.text2 },
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
  rowTitle: { ...type.title, fontSize: 15, color: colors.text },
  rowSub: { ...type.caption, color: colors.text2, marginTop: 2 },
  rowPreview: { ...type.caption, color: colors.text3, marginTop: 2 },
}

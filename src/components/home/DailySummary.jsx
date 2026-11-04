// Сводка «Съедено за сегодня» — компактная версия референса:
// слева кольцо 72 px, внутри — съеденные ккал («0 из 1800 ккал»),
// справа такое же кольцо с сожжёнными за день ккал, между ними —
// пилюля статуса («Осталось / Перебор / Цель достигнута»). Оба кольца
// анимируются как донат ИМТ (BmiDonut): при открытии вкладки дуга
// «заливается» от нуля, число в центре отсчитывается вверх — и всё
// это повторяется при каждом возврате на «Главную» (запрос пользователя).
// Долгий тап по левой половине — изменить цель по калориям, по правому
// кольцу — цель «сжечь за день» (карточка «Калории» с
// главной убрана как дубликат, её единственная уникальная функция
// переехала сюда); обычный тап по этим же зонам — история показателя
// по дням (вся история живёт внутри блоков). Мини-чипы шагов/воды/минут
// удалены — эти цифры
// живут в трёх карточках над сводкой. Ниже — строка «Итог: съедено −
// сожжено» с умным огоньком: зелёный — дефицит (итог в пределах цели),
// жёлтый — небольшой перебор (до 100 ккал), красный — большой; цели нет —
// зелёный (сравнивать не с чем). Без карандаша (правка цели сжигания
// осталась на долгом тапе по кольцу),
// далее нутриенты ОДНОЙ строкой из четырёх ячеек с иконками
// и разделителями, в порядке Белки → Жиры → Углеводы → Клетчатка
// (по референсу: шестиугольник/огонь/капля/лист + «0 / N г»);
// сетка 2×2 с точками и барами заменена — при чтении «столбиками»
// порядок сбивался. Нормы БЖУ — свои из целей (маленький карандашик
// в конце строки открывает окно правки), а если не заданы — «классическая
// тарелка» (20/30/50% калорий), клетчатка — своя норма, иначе 25 г/день
// (ВОЗ, FIBER_NORM). Карточка оформлена в стиле вкладки «Тело»
// (фиолетовая поверхность bear-bodyCard + чип-иконка в шапке BodyChip).

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useFocusEffect } from 'expo-router'
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg'
import { ChevronRight, Droplet, Flame, Hexagon, Leaf, Pencil, Utensils, X } from 'lucide-react-native'
import { formatNum, pluralDays } from '@/lib/format'
import { FIBER_NORM } from '@/lib/data/nutrition'
import { useGoalsStore } from '@/store/useGoalsStore'
import { useToast } from '../ui/Toast'
import { BodyChip } from '../ui/BodyChip'

const MAX = 1.25
const RING = 72
const SW = 8
const R = (RING - SW) / 2
const C = 2 * Math.PI * R

// Нормы нутриентов от дневной нормы калорий
function macroTargets(kcal) {
  return {
    p: Math.round((kcal * 0.2) / 4),
    f: Math.round((kcal * 0.3) / 9),
    c: Math.round((kcal * 0.5) / 4),
    fib: FIBER_NORM,
  }
}

// Ячейка нутриента: иконка слева, справа подпись и жирное значение
// «0 / N г». Четыре такие ячейки стоят в одну строку с разделителями
function NutrientCell({ label, value, target, color, Icon }) {
  return (
    <View className="min-w-0 flex-1 flex-row items-center gap-1.5">
      <Icon size={16} color={color} />
      <View className="min-w-0 flex-1">
        <Text
          numberOfLines={1}
          maxFontSizeMultiplier={MAX}
          className="font-sans text-[10px] leading-tight text-bear-sub"
        >
          {label}
        </Text>
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.75}
          maxFontSizeMultiplier={MAX}
          className="font-bold text-[12px] leading-tight text-bear-text"
        >
          {`${formatNum(Math.round(value))} / ${formatNum(target)} г`}
        </Text>
      </View>
    </View>
  )
}

// Тонкий разделитель между ячейками нутриентов
function VDivider() {
  return <View className="mx-1 h-7 w-px shrink-0 bg-white/[0.08]" />
}

// Кольцо прогресса с числом внутри: слева — съедено от цели калориями,
// справа — сожжено за день. Анимация как у доната ИМТ (BmiDonut):
// дуга плавно «заливается» до текущего процента (Animated поверх
// strokeDashoffset, JS-драйвер — без Reanimated: тот ронял SVG-экраны),
// число в центре отсчитывается вверх. runId приходит из DailySummary и
// растёт при каждом возврате на вкладку «Главная» — заливка повторяется.
function KcalRing({ value, goal, caption, pct, color, gradient, accessibilityLabel, runId }) {
  // Прогресс 0…1 — по нему длина дуги и смещение узора;
  // при 0% прогресс-круг не рисуем вовсе (иначе на Android
  // остаётся точка скруглённого конца на 12 часах)
  const frac = Math.max(0, Math.min(100, pct)) / 100
  const arcVal = useRef(new Animated.Value(0)).current
  const numVal = useRef(new Animated.Value(0)).current
  const [num, setNum] = useState(0)
  const prevRun = useRef(runId)
  const firstRun = useRef(true)

  // Число в центре — зеркало анимированного значения
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
        toValue: value,
        duration: dur,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    ])
    anim.start()
    return () => anim.stop()
  }, [value, frac, runId, arcVal, numVal])

  const dashOffset = arcVal.interpolate({
    // arcVal идёт 0…frac (текущая доля кольца): смещение C — дуга пустая,
    // C·(1−frac) — залита ровно на frac окружности
    inputRange: [0, 1],
    outputRange: [C, 0],
  })

  return (
    <View className="items-center" style={{ width: RING }}>
      <View
        accessibilityRole="progressbar"
        accessibilityLabel={accessibilityLabel}
        style={{ width: RING, height: RING }}
      >
        <Svg width={RING} height={RING}>
          {gradient && (
            <Defs>
              <LinearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor="#8B5CF6" />
                <Stop offset="1" stopColor="#6C8CFF" />
              </LinearGradient>
            </Defs>
          )}
          <Circle cx={RING / 2} cy={RING / 2} r={R} stroke="rgba(255,255,255,0.07)" strokeWidth={SW} fill="none" />
          {pct > 0 && (
            <AnimatedCircle
              cx={RING / 2}
              cy={RING / 2}
              r={R}
              stroke={color || 'url(#ringGrad)'}
              strokeWidth={SW}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${C} ${C}`}
              strokeDashoffset={dashOffset}
              transform={`rotate(-90 ${RING / 2} ${RING / 2})`}
            />
          )}
        </Svg>
        <View className="absolute inset-0 items-center justify-center">
          <Text
            adjustsFontSizeToFit
            numberOfLines={1}
            maxFontSizeMultiplier={MAX}
            className="text-center font-extrabold text-[16px] leading-tight text-bear-text"
            style={{ width: RING - 16 }}
          >
            {formatNum(Math.round(num))}
          </Text>
          <Text maxFontSizeMultiplier={MAX} className="font-sans text-[8px] leading-tight text-bear-dim">
            {goal != null ? `из ${formatNum(goal)} ккал` : 'ккал'}
          </Text>
        </View>
      </View>
      <Text maxFontSizeMultiplier={MAX} className="mt-1 font-sans text-[9.5px] text-bear-sub">
        {caption}
      </Text>
    </View>
  )
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle)

export function DailySummary({
  consumed = 0,
  target = 0,
  bju = { p: 0, f: 0, c: 0, fib: 0 },
  burned = 0, // вся активность за день: тренировки + шаги
  burnGoal = 0, // цель «сжечь за день», ккал
  streak = 0, // дней подряд с дневником (чип с огоньком)
  onEditBurnGoal, // долгий тап по кольцу сжигания — изменить цель
  onEditKcalGoal, // долгий тап по левой половине — изменить цель по калориям
  onOpenKcalHistory, // тап по левой половине — история калорий по дням
  onOpenBurnHistory, // тап по кольцу сжигания — история сожжённого по дням
}) {
  const goals = useGoalsStore((s) => s.goals)
  const setGoals = useGoalsStore((s) => s.setGoals)
  const { toast } = useToast()
  const pct = target > 0 ? Math.min(100, (consumed / target) * 100) : 0
  const remaining = Math.max(0, target - consumed)
  const over = Math.max(0, consumed - target)
  const done = consumed > 0 && remaining === 0 && over === 0

  // Нормы нутриентов: свои из целей (макросы > 0), иначе — авто от
  // цели по калориям («тарелка» 20/30/50 % + 25 г клетчатки)
  const macroNorms = goals.macroNorms || { p: 0, f: 0, c: 0, fib: 0 }
  const autoNorms = macroTargets(target)
  const norms = {
    p: macroNorms.p > 0 ? macroNorms.p : autoNorms.p,
    f: macroNorms.f > 0 ? macroNorms.f : autoNorms.f,
    c: macroNorms.c > 0 ? macroNorms.c : autoNorms.c,
    fib: macroNorms.fib > 0 ? macroNorms.fib : autoNorms.fib,
  }

  // Окно правки своих норм нутриентов (карандашик в строке нутриентов)
  const [normsOpen, setNormsOpen] = useState(false)
  const [normsDraft, setNormsDraft] = useState({ p: '', f: '', c: '', fib: '' })

  function openNormsEdit() {
    // В полях — только свои значения; авто-нормы видны в подсказках
    setNormsDraft({
      p: macroNorms.p > 0 ? String(macroNorms.p) : '',
      f: macroNorms.f > 0 ? String(macroNorms.f) : '',
      c: macroNorms.c > 0 ? String(macroNorms.c) : '',
      fib: macroNorms.fib > 0 ? String(macroNorms.fib) : '',
    })
    setNormsOpen(true)
  }

  function saveNorms() {
    // Пусто или 0 — вернуться к автоматическому расчёту от цели калорий
    const parse = (s) =>
      Math.min(500, Math.max(0, Math.round(Number(String(s).replace(',', '.')) || 0)))
    setGoals({
      macroNorms: {
        p: parse(normsDraft.p),
        f: parse(normsDraft.f),
        c: parse(normsDraft.c),
        fib: parse(normsDraft.fib),
      },
    })
    setNormsOpen(false)
    toast({ title: '🎯 Нормы нутриентов обновлены', description: 'Пустое поле — считаем от цели по калориям' })
  }

  const burnPct = burnGoal > 0 ? Math.round((burned / burnGoal) * 100) : 0
  const net = consumed - burned // итог дня с учётом активности

  // Умный огонёк «Итога»: перебор считаем по запросу — «съедено больше
  // сожжённого + цели». Зелёный — дефицит (итог не выше цели), жёлтый —
  // небольшой перебор (до 100 ккал — в пределах погрешности дня),
  // красный — больший перебор. Цели нет — зелёный (сравнивать не с чем)
  const overNet = target > 0 ? net - target : 0
  const netTone =
    overNet <= 0 ? '#34D399' : overNet <= 100 ? '#FBBF24' : '#FB7185'
  const netBg =
    overNet <= 0
      ? 'rgba(52,211,153,0.07)'
      : overNet <= 100
        ? 'rgba(251,191,36,0.08)'
        : 'rgba(251,113,133,0.08)'

  // Анимация колец перезапускается при каждом возврате на вкладку
  // «Главная» — как у доната ИМТ, который заливается при переходе
  // на свою вкладку (запрос пользователя)
  const [runId, setRunId] = useState(0)
  useFocusEffect(useCallback(() => { setRunId((n) => n + 1) }, []))

  // Левая половина (кольцо + пилюля) — Pressable, когда умеет открывать
  // историю калорий (тап) или менять цель (долгий тап), иначе обычный View
  const Row = onEditKcalGoal || onOpenKcalHistory ? Pressable : View
  // Строка «Итог» тоже тапабельна — открывает ту же историю калорий:
  // крупная цель для пальца на весь итог дня (по запросу пользователя)
  const NetRow = onOpenKcalHistory ? Pressable : View
  // Правое кольцо — Pressable для истории сжигания (тап) и правки цели
  // (долгий тап), иначе View
  const BurnZone = onEditBurnGoal || onOpenBurnHistory ? Pressable : View

  const ringColor = over > 0 ? '#FBBF24' : done ? '#34D399' : null // null → градиент
  const pillTone = over > 0
    ? { border: 'rgba(251,191,36,0.35)', bg: 'rgba(251,191,36,0.08)', text: '#FCD34D' }
    : done
      ? { border: 'rgba(52,211,153,0.35)', bg: 'rgba(52,211,153,0.08)', text: '#6EE7B7' }
      : { border: 'rgba(167,139,250,0.35)', bg: 'rgba(123,108,246,0.1)', text: '#A78BFA' }

  return (
    <View
      accessibilityLabel="Сводка за день"
      className="rounded-3xl border border-bear-bodyLine bg-bear-bodyCard p-4"
    >
      <View className="flex-row items-center justify-between gap-2">
        <View className="min-w-0 flex-row items-center gap-2">
          <BodyChip icon={<Utensils size={15} />} />
          <Text maxFontSizeMultiplier={MAX} className="font-bold text-[14.5px] tracking-tight text-bear-text">
            Съедено за сегодня
          </Text>
        </View>
        {streak > 0 ? (
          <View
            accessibilityLabel={`Стрик: ${streak} ${pluralDays(streak)} подряд`}
            className="shrink-0 flex-row items-center gap-1 rounded-full px-2.5 py-1"
            style={{ backgroundColor: 'rgba(251,146,60,0.13)' }}
          >
            <Flame size={12} color="#fb923c" />
            <Text maxFontSizeMultiplier={MAX} className="font-bold text-[11px] text-[#fdba74]">
              {`${streak} ${pluralDays(streak)}`}
            </Text>
          </View>
        ) : null}
      </View>

      {/* кольцо «съедено» + пилюля остатка + кольцо «сожжено». Тап по
          левой половине — история калорий по дням, по правому кольцу —
          история сожжённого; долгий тап — правка соответствующей цели:
          единственные уникальные действия бывшей карточки
          «Калории» и старой строки «Сожжено за сегодня» */}
      <View className="mt-3 flex-row items-center gap-2.5">
        <Row
          onPress={onOpenKcalHistory}
          onLongPress={onEditKcalGoal}
          delayLongPress={450}
          accessibilityRole={onEditKcalGoal || onOpenKcalHistory ? 'button' : undefined}
          accessibilityLabel={
            onEditKcalGoal || onOpenKcalHistory
              ? `Съедено ${formatNum(consumed)} из ${formatNum(target)} килокалорий. Тап — история по дням, долгий тап — изменить цель по калориям`
              : undefined
          }
          className="min-w-0 flex-1 flex-row items-center gap-2.5"
        >
          <KcalRing
            value={consumed}
            goal={target}
            caption="съедено"
            pct={pct}
            gradient
            runId={runId}
            accessibilityLabel={`Съедено ${formatNum(consumed)} из ${formatNum(target)} килокалорий, ${Math.round(pct)} процентов дневной нормы`}
          />
          <View className="min-w-0 flex-1 items-center">
            <View
              className="flex-row items-center self-center gap-1 rounded-full px-2.5 py-1"
              style={{ borderWidth: 1, borderColor: pillTone.border, backgroundColor: pillTone.bg }}
            >
              <Flame size={12} color={pillTone.text} />
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.85}
                maxFontSizeMultiplier={MAX}
                className="font-semibold text-[11px]"
                style={{ color: pillTone.text }}
              >
                {over > 0
                  ? `Перебор +${formatNum(over)}`
                  : done
                    ? 'Цель достигнута'
                    : `Осталось ${formatNum(remaining)}`}
              </Text>
            </View>
          </View>
        </Row>

        <BurnZone
          onPress={onOpenBurnHistory}
          onLongPress={onEditBurnGoal}
          delayLongPress={450}
          accessibilityRole={onEditBurnGoal || onOpenBurnHistory ? 'button' : undefined}
          accessibilityLabel={
            onEditBurnGoal || onOpenBurnHistory
              ? `Сожжено за сегодня ${formatNum(burned)} килокалорий. Тап — история по дням, долгий тап — изменить цель сжигания`
              : undefined
          }
          className="shrink-0"
        >
          <KcalRing
            value={burned}
            goal={burnGoal > 0 ? burnGoal : null}
            caption="сожжено"
            pct={burnPct}
            color="#f87171"
            runId={runId}
            accessibilityLabel={`Сожжено ${formatNum(burned)} килокалорий за сегодня${burnGoal > 0 ? ` из ${formatNum(burnGoal)}` : ''}`}
          />
        </BurnZone>
      </View>

      {/* итог дня с учётом активности: умный огонёк — зелёный при дефиците,
          жёлтый/красный при переборе; без карандаша — правка цели сжигания
          осталась долгим тапом по кольцу «сожжено». Строка тапабельна —
          открывает историю калорий по дням (та же, что у левого кольца) */}
      <NetRow
        onPress={onOpenKcalHistory}
        accessibilityRole={onOpenKcalHistory ? 'button' : undefined}
        accessibilityLabel={
          `Итог дня: съедено ${formatNum(consumed)} минус сожжено ${formatNum(burned)} равно ${formatNum(net)} килокалорий, ` +
          (overNet <= 0 ? 'в пределах цели' : `перебор ${formatNum(Math.round(overNet))} килокалорий`) +
          (onOpenKcalHistory ? '. Тап — история калорий по дням' : '')
        }
        className={`mt-2.5 flex-row items-center gap-2 rounded-2xl px-3 py-2.5 ${onOpenKcalHistory ? 'active:opacity-70' : ''}`}
        style={{ backgroundColor: netBg }}
      >
        <Flame size={13} color={netTone} />
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.85}
          maxFontSizeMultiplier={MAX}
          className="min-w-0 flex-1 font-semibold text-[11px] text-bear-sub"
        >
          {`Итог: съедено ${formatNum(consumed)} − сожжено ${formatNum(burned)} = ${formatNum(net)} ккал`}
        </Text>
        {onOpenKcalHistory ? <ChevronRight size={14} color="#8B96B8" /> : null}
      </NetRow>

      {/* нутриенты одной строкой в заданном порядке:
          1. Белки  2. Жиры  3. Углеводы  4. Клетчатка.
          В конце — маленький карандашик: свои нормы нутриентов */}
      <View
        accessibilityLabel={
          `Белки ${formatNum(Math.round(bju.p))} из ${formatNum(norms.p)} грамм, `
          + `жиры ${formatNum(Math.round(bju.f))} из ${formatNum(norms.f)} грамм, `
          + `углеводы ${formatNum(Math.round(bju.c))} из ${formatNum(norms.c)} грамм, `
          + `клетчатка ${formatNum(Math.round(bju.fib || 0))} из ${formatNum(norms.fib)} грамм`
        }
        className="mt-3 flex-row items-center"
      >
        <NutrientCell label="Белки" value={bju.p} target={norms.p} color="#A78BFA" Icon={Hexagon} />
        <VDivider />
        <NutrientCell label="Жиры" value={bju.f} target={norms.f} color="#FB923C" Icon={Flame} />
        <VDivider />
        <NutrientCell label="Углеводы" value={bju.c} target={norms.c} color="#38BDF8" Icon={Droplet} />
        <VDivider />
        <NutrientCell
          label="Клетчатка"
          value={bju.fib || 0}
          target={norms.fib}
          color="#34D399"
          Icon={Leaf}
        />
        <Pressable
          onPress={openNormsEdit}
          accessibilityRole="button"
          accessibilityLabel="Изменить нормы белков, жиров, углеводов и клетчатки"
          hitSlop={6}
          className="ml-1 h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-white/5 active:opacity-70"
        >
          <Pencil size={12} color="#8B96B8" />
        </Pressable>
      </View>

      {/* Окно правки своих норм нутриентов: 4 поля, пустое — авто от цели калорий */}
      <Modal
        visible={normsOpen}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setNormsOpen(false)}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
          <Pressable
            className="flex-1 items-center justify-center bg-black/60 px-8"
            onPress={() => setNormsOpen(false)}
          >
            <Pressable
              className="w-full rounded-3xl border border-white/10 bg-bear-pop p-5"
              onPress={() => {}}
              accessibilityLabel="Нормы нутриентов"
            >
              <View className="flex-row items-center justify-between">
                <Text className="font-bold text-[15px] text-bear-text">🥗 Нормы нутриентов</Text>
                <Pressable
                  onPress={() => setNormsOpen(false)}
                  accessibilityLabel="Закрыть"
                  className="p-1"
                >
                  <X size={20} color="#A5AECB" />
                </Pressable>
              </View>
              <Text className="mt-1 font-sans text-[11px] leading-relaxed text-bear-sub">
                Граммы в день. Пустое поле — считать от цели по калориям
                (тарелка 20/30/50 %, клетчатка 25 г)
              </Text>
              <View className="mt-3 flex-row gap-2.5">
                <NormInput
                  label="Белки, г"
                  value={normsDraft.p}
                  onChange={(t) => setNormsDraft((d) => ({ ...d, p: t }))}
                  placeholder={String(norms.p)}
                  color="#A78BFA"
                />
                <NormInput
                  label="Жиры, г"
                  value={normsDraft.f}
                  onChange={(t) => setNormsDraft((d) => ({ ...d, f: t }))}
                  placeholder={String(norms.f)}
                  color="#FB923C"
                />
              </View>
              <View className="mt-2.5 flex-row gap-2.5">
                <NormInput
                  label="Углеводы, г"
                  value={normsDraft.c}
                  onChange={(t) => setNormsDraft((d) => ({ ...d, c: t }))}
                  placeholder={String(norms.c)}
                  color="#38BDF8"
                />
                <NormInput
                  label="Клетчатка, г"
                  value={normsDraft.fib}
                  onChange={(t) => setNormsDraft((d) => ({ ...d, fib: t }))}
                  placeholder={String(norms.fib)}
                  color="#34D399"
                />
              </View>
              <Pressable
                onPress={saveNorms}
                accessibilityRole="button"
                accessibilityLabel="Сохранить нормы нутриентов"
                className="mt-4 rounded-2xl py-3 active:opacity-80"
                style={{ backgroundColor: '#7B6CF6' }}
              >
                <Text className="text-center font-bold text-sm text-white">Сохранить</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  )
}

// Поле ввода своей нормы: подпись с цветной точкой нутриента и ввод
// по центру, как в остальных окнах целей
function NormInput({ label, value, onChange, placeholder, color }) {
  return (
    <View className="min-w-0 flex-1">
      <View className="mb-1.5 flex-row items-center gap-1">
        <View className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
        <Text numberOfLines={1} className="font-sans text-[11px] text-bear-sub2">
          {label}
        </Text>
      </View>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType="number-pad"
        maxLength={3}
        placeholder={placeholder}
        placeholderTextColor="#8B96B8"
        accessibilityLabel={label}
        className="rounded-2xl border border-white/10 bg-white/5 py-2.5 text-center font-bold text-[14px] text-bear-text"
      />
    </View>
  )
}

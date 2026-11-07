// Сводка «Съедено за сегодня» — компактная версия референса:
// слева и справа кольца ОДИНАКОВОГО диаметра 84 px (отзыв Кати:
// кольца были разных размеров), внутри — съеденные ккал («0 из 1800
// ккал») и сожжённые (зелёная дуга #34D399 — отзыв Кати: красное
// кольцо смотрелось тревожно, теперь число и «из N ккал», если
// цель задана). Посередине — узкий блок «Остаток» БЕЗ РАМКИ (отзыв
// Кати: «убери рамку»): огонёк и подпись «Остаток» в строку, ниже
// жирная цифра остатка калорий на день (отзыв Кати: «там должно быть
// остаток калорий» вместо прежнего баланса «+902»; крупнее — отзыв:
// «остаток сделать крупнее») и мелкая строка-пояснение. Режим
// остатка — goals.countBurned, переключатель в «Ещё → Дневник
// питания»: по умолчанию СТРОГИЙ — остаток = цель − съедено,
// сожжённое не возвращается (отзыв Кати: «строгий остаток по
// умолчанию»); переключатель «с учётом сожжённых» включает прежнюю
// формулу цель − съедено + сожжено (remainderOf в lib/data/remainder).
// Кольцо анимируется как
// донат ИМТ (BmiDonut): при открытии вкладки дуга «заливается» от нуля,
// число в центре отсчитывается вверх — и всё это повторяется при каждом
// возврате на «Главную» (запрос пользователя).
// Короткий тап по левой половине — изменить цель по калориям, по блоку
// «сожжено» — цель «сжечь за день» (короткий тап вместо долгого —
// отзыв Кати; карточка «Калории» с
// главной убрана как дубликат, её единственная уникальная функция
// переехала сюда). Обычный тап нигде не открывает историю: по решению
// пользователя «Главная» — только сегодня, история по дням живёт во
// вкладке «Дневник» (тап по карточке-итогу в «Отчётах» разворачивает
// панель истории). Мини-чипы шагов/воды/минут
// удалены — эти цифры
// живут в трёх карточках над сводкой. Умный огонёк в «Итогах»:
// зелёный — остаток в плюсе (ещё можно съесть), жёлтый — небольшой
// перебор (до 100 ккал), красный — большой; цели нет — зелёный
// (сравнивать не с чем). Без карандаша в остатках (правка цели
// сжигания осталась на тапе по кольцу),
// далее нутриенты ОДНОЙ СТРОКОЙ: Белки → Жиры → Углеводы →
// Клетчатка, с иконками и разделителями (по референсу:
// шестиугольник/огонь/капля/лист + «0 / N г»). Пробовали ради крупного
// шрифта сетку 2×2, но Катя попросила прежний вид («верни бжу и
// клетчатку в одну строку как было») — возвращена одна строка,
// длинные значения страхует дожим шрифта (adjustsFontSizeToFit).
// Нормы БЖУ — свои из целей (маленький карандашик в конце строки
// открывает окно правки), а если не заданы — «классическая
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
import { Droplet, Flame, Hexagon, Leaf, Pencil, Utensils, X } from 'lucide-react-native'
import { formatNum, pluralDays } from '@/lib/format'
import { remainderOf } from '@/lib/data/remainder'
import { FIBER_NORM } from '@/lib/data/nutrition'
import { useGoalsStore } from '@/store/useGoalsStore'
import { useDayTypesStore } from '@/store/useDayTypesStore'
import { DAY_TYPES } from '@/lib/data/dayContext'
import { dayKeyOf as cycleDayKeyOf } from '@/store/useCycleStore'
import { useToast } from '../ui/Toast'
import { BodyChip } from '../ui/BodyChip'
import { Check, ChevronDown, RotateCcw } from 'lucide-react-native'

const MAX = 1.25
const RING = 84
const SW = 9
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
// «0 / N г». Четыре такие ячейки стоят в одну строку с разделителями.
// Иконка 16px и подпись 14px с дожимом шрифта: на узком экране (361dp)
// «Углеводы» и «Клетчатка» при 15px не влезали и резались до «Угле…» /
// «Клет…» — теперь полное слово помещается, а adjustsFontSizeToFit
// страхует на случай увеличенного системного шрифта
function NutrientCell({ label, value, target, color, Icon }) {
  return (
    <View className="min-w-0 flex-1 flex-row items-center gap-1">
      <Icon size={16} color={color} />
      <View className="min-w-0 flex-1">
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
          maxFontSizeMultiplier={MAX}
          className="font-sans text-[14px] leading-tight text-bear-sub"
        >
          {label}
        </Text>
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.75}
          maxFontSizeMultiplier={MAX}
          className="font-bold text-[15.5px] leading-tight text-bear-text"
        >
          {`${formatNum(Math.round(value))} / ${formatNum(target)} г`}
        </Text>
      </View>
    </View>
  )
}

// Тонкий разделитель между ячейками нутриентов (узкие поля —
// экономим строке место ради полных слов «Углеводы» и «Клетчатка»)
function VDivider() {
  return <View className="mx-0.5 h-9 w-px shrink-0 bg-white/[0.08]" />
}

// Кольцо прогресса с числом внутри — съедено от цели калориями и
// сожжено от цели сжигания: диаметр и шрифт числа у обоих ОДИНАКОВЫЕ
// (отзыв Кати: кольца были разных размеров).
// Анимация как у доната ИМТ (BmiDonut):
// дуга плавно «заливается» до текущего процента (Animated поверх
// strokeDashoffset, JS-драйвер — без Reanimated: тот ронял SVG-экраны),
// число в центре отсчитывается вверх. runId приходит из DailySummary и
// растёт при каждом возврате на вкладку «Главная» — заливка повторяется.
function KcalRing({ value, goal, caption, pct, color, gradient, accessibilityLabel, runId, size = RING, numSize = 23 }) {
  // size — диаметр (у обоих колец одинаковый 84); толщина дуги и радиус
  // считаются от диаметра, шрифт числа — свой
  const sw = size === RING ? SW : Math.max(7, Math.round((SW * size) / RING))
  const r = (size - sw) / 2
  const c = 2 * Math.PI * r
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
    outputRange: [c, 0],
  })

  return (
    <View className="items-center" style={{ width: size }}>
      <View
        accessibilityRole="progressbar"
        accessibilityLabel={accessibilityLabel}
        style={{ width: size, height: size }}
      >
        <Svg width={size} height={size}>
          {gradient && (
            <Defs>
              <LinearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor="#8B5CF6" />
                <Stop offset="1" stopColor="#6C8CFF" />
              </LinearGradient>
            </Defs>
          )}
          <Circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.07)" strokeWidth={sw} fill="none" />
          {pct > 0 && (
            <AnimatedCircle
              cx={size / 2}
              cy={size / 2}
              r={r}
              stroke={color || 'url(#ringGrad)'}
              strokeWidth={sw}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${c} ${c}`}
              strokeDashoffset={dashOffset}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          )}
        </Svg>
        <View className="absolute inset-0 items-center justify-center">
          <Text
            adjustsFontSizeToFit
            numberOfLines={1}
            maxFontSizeMultiplier={MAX}
            className="text-center font-extrabold leading-tight text-bear-text"
            style={{ width: size - 16, fontSize: numSize }}
          >
            {formatNum(Math.round(num))}
          </Text>
          {/* Подпись цели — жёстко ограничена шириной кольца и разрешает
              перенос: «из 1 200 ккал» без ограничения вылезало за круг
              на узких экранах; теперь максимум 2 строки внутри кольца,
              форматные пробелы внутри числа неразрывные, перенос идёт
              между «из» / числом / «ккал» — всегда аккуратно */}
          <Text
            numberOfLines={2}
            maxFontSizeMultiplier={MAX}
            className="text-center font-sans text-[12px] leading-[14px] text-bear-dim"
            style={{ width: size - 10 }}
          >
            {goal != null ? `из ${formatNum(goal)} ккал` : 'ккал'}
          </Text>
        </View>
      </View>
      <Text maxFontSizeMultiplier={MAX} className="mt-1 font-sans text-[14.5px] text-bear-sub">
        {caption}
      </Text>
    </View>
  )
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle)

export function DailySummary({
  consumed = 0,
  target = 0, // норма ДНЯ: база + прибавка особого дня (считает index.jsx)
  bju = { p: 0, f: 0, c: 0, fib: 0 },
  burned = 0, // вся активность за день: тренировки + шаги
  burnGoal = 0, // цель «сжечь за день», ккал
  streak = 0, // дней подряд с дневником (чип с огоньком)
  dayMark = null, // особый день: { type, delta, auto } | null (lib/data/dayContext)
  onEditBurnGoal, // тап по кольцу сжигания — изменить цель
  onEditKcalGoal, // тап по левой половине — изменить цель по калориям
}) {
  const goals = useGoalsStore((s) => s.goals)
  const setGoals = useGoalsStore((s) => s.setGoals)
  const { toast } = useToast()
  const pct = target > 0 ? Math.min(100, (consumed / target) * 100) : 0
  // Доля сожжённых ккал от цели «сжечь за день» — для кольца «сожжено»
  const burnPct = burnGoal > 0 ? Math.round((burned / burnGoal) * 100) : 0
  const over = Math.max(0, consumed - target)
  const done = target > 0 && consumed > 0 && over === 0

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

  // ── Особый день (менструация / командировка / праздник) ─────────────
  // Бейдж под кольцами + окно выбора: отзыв Кати — корректировка
  // калорий в особые дни «нигде не фиксировалась». Прибавка уже внутри
  // target (считает index.jsx через kcalWithDayMark) — здесь витрина
  // и ручная установка метки. Прибавки типов — из стора особых дней
  const dayDeltas = useDayTypesStore((s) => s.deltas)
  const setDayMark = useDayTypesStore((s) => s.setMark)
  const todayKeyStr = cycleDayKeyOf()
  const [markOpen, setMarkOpen] = useState(false)
  const markMeta = dayMark ? DAY_TYPES[dayMark.type] : null

  function pickDayMark(type) {
    const same = dayMark && dayMark.type === type && !dayMark.auto
    setDayMark(todayKeyStr, same ? null : type)
    setMarkOpen(false)
    if (same) {
      toast({ title: '↩ Обычный день', description: 'Метка снята — считаем по базовой норме' })
    } else {
      const meta = DAY_TYPES[type]
      const plus = dayDeltas[type] || 0
      toast({
        title: `${meta.emoji} ${meta.label} — особый день`,
        description: plus > 0 ? `Норма дня: +${formatNum(plus)} ккал к вашей цели` : 'Норма дня без прибавки (прибавка = 0)',
      })
    }
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

  // ОСТАТОК калорий на день (отзыв Кати: «там должно быть остаток
  // калорий» вместо баланса «+902»). Режим — goals.countBurned,
  // переключатель в «Ещё → Дневник питания»: по умолчанию СТРОГИЙ
  // (цель − съедено, сожжённое не прибавляется — отзыв Кати: «строгий
  // остаток по умолчанию»), «с учётом сожжённых» возвращает активность
  // в остаток. Цели нет — остаток не считаем
  const countBurned = Boolean(goals.countBurned)
  const rem = remainderOf(target, consumed, burned, countBurned)

  // Анимация колец перезапускается при каждом возврате на вкладку
  // «Главная» — как у доната ИМТ, который заливается при переходе
  // на свою вкладку (запрос пользователя)
  const [runId, setRunId] = useState(0)
  useFocusEffect(useCallback(() => { setRunId((n) => n + 1) }, []))

  // Левая половина (кольцо + пилюля) — Pressable для правки цели
  // (короткий тап — отзыв Кати: долгий тап был неочевиден), иначе
  // обычный View. История по дням — во вкладке «Дневник»
  const Row = onEditKcalGoal ? Pressable : View
  // Строка «Итог» — просто итог дня с огоньком, без тапов (история
  // калорий по дням — в панели истории «Отчётов» на «Дневнике»)
  // Правое кольцо — Pressable для правки цели (короткий тап), иначе View
  const BurnZone = onEditBurnGoal ? Pressable : View

  const ringColor = over > 0 ? '#FBBF24' : done ? '#34D399' : null // null → градиент
  // Тон блока «Остаток»: зелёный — остаток в плюсе (можно ещё съесть),
  // жёлтый — небольшой перебор (до 100 ккал — погрешность дня),
  // красный — больший перебор. Цели нет — зелёный (сравнивать не с чем)
  const remTone =
    rem == null || rem >= 0
      ? { text: '#34D399' }
      : rem >= -100
        ? { text: '#FBBF24' }
        : { text: '#FB7185' }

  return (
    <View
      accessibilityLabel="Сводка за день"
      // Без mx — ширина ровно та же, что у «Приёмов пищи» и остальных
      // блоков Главной (отзыв Кати: блоки были разной ширины)
      className="rounded-3xl border border-bear-bodyLine bg-bear-bodyCard p-3"
    >
      <View className="flex-row items-center justify-between gap-2">
        <View className="min-w-0 flex-row items-center gap-2">
          <BodyChip icon={<Utensils size={17} />} />
          <Text maxFontSizeMultiplier={MAX} className="font-bold text-[20px] tracking-tight text-bear-text">
            Съедено за сегодня
          </Text>
        </View>
        {streak > 0 ? (
          <View
            accessibilityLabel={`Стрик: ${streak} ${pluralDays(streak)} подряд`}
            className="shrink-0 flex-row items-center gap-1 rounded-full px-2.5 py-1.5"
            style={{ backgroundColor: 'rgba(251,146,60,0.13)' }}
          >
            <Flame size={14} color="#fb923c" />
            <Text maxFontSizeMultiplier={MAX} className="font-bold text-[15px] text-[#fdba74]">
              {`${streak} ${pluralDays(streak)}`}
            </Text>
          </View>
        ) : null}
      </View>

      {/* кольца «съедено» и «сожжено» одного размера + узкая карточка
          статуса точно посередине между ними (отзыв Кати). items-start
          на строке выравнивает всё по верхнему краю: круг занимает
          верхние 84 px колонки кольца, контейнер карточки той же высоты
          (RING) — поэтому центр карточки всегда совпадает с центрами
          кругов, даже если подписи под кольцами крупнее. Тап по левому
          кольцу или карточке — правка цели по калориям, по кольцу
          «сожжено» — цели сжигания (короткий тап вместо долгого);
          история по дням — во вкладке «Дневник» */}
      <View className="mt-2.5 flex-row items-start gap-2">
        <Row
          onPress={onEditKcalGoal}
          accessibilityRole={onEditKcalGoal ? 'button' : undefined}
          accessibilityLabel={
            onEditKcalGoal
              ? `Съедено ${formatNum(consumed)} из ${formatNum(target)} килокалорий. Нажмите, чтобы изменить цель по калориям`
              : undefined
          }
          className="shrink-0 items-center"
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
        </Row>

        {/* Блок «Остаток» — по середине между кольцами (отзыв Кати),
            БЕЗ РАМКИ и фона (отзыв Кати: «убери рамку»): только тексты.
            Контейнер занимает всё пространство между кольцами,
            высота — с кольцо (84 px), блок внутри — по содержимому
            и по центру; max-w-full страхует от вылезания при крупном
            системном шрифте (adjustsFontSizeToFit дожмёт текст) */}
        <View className="min-w-0 flex-1 items-center justify-center" style={{ height: RING }}>
          <Row
            onPress={onEditKcalGoal}
            accessibilityRole={onEditKcalGoal ? 'button' : undefined}
            accessibilityLabel={
              onEditKcalGoal
                ? `Остаток ${rem == null ? 'неизвестен' : formatNum(Math.abs(rem))} килокалорий. Нажмите, чтобы изменить цель по калориям`
                : undefined
            }
            className="max-w-full"
          >
            {/* «Остаток»: огонёк и подпись в строку, ниже — остаток
                калорий на день. ЦИФРА КРУПНЕЕ (отзыв Кати: «остаток
                очень мелко написан»): значение 27px, «ккал» мельче в той
                же строке — раньше «1 016 ккал» одной строкой 22px не
                влезало в узкий столбик между кольцами, дожим шрифта
                (adjustsFontSizeToFit) сжимал её до ~15px; теперь число
                короче и помещается без сжатия, мелкой строкой — пояснение */}
            <View
              accessibilityLabel={
                `Остаток калорий на сегодня: ` +
                (rem == null
                  ? 'цель не задана'
                  : rem >= 0
                    ? `${formatNum(rem)} килокалорий${countBurned ? ' с учётом сожжённых' : ''}`
                    : `перебор ${formatNum(Math.abs(rem))} килокалорий`)
              }
              className="max-w-full items-center px-3 py-2"
            >
              <View className="flex-row items-center gap-1">
                <Flame size={15} color={remTone.text} />
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.8}
                  maxFontSizeMultiplier={MAX}
                  className="font-bold text-[13.5px] leading-tight"
                  style={{ color: remTone.text }}
                >
                  Остаток
                </Text>
              </View>
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
                maxFontSizeMultiplier={MAX}
                className="mt-0.5 font-extrabold leading-tight"
                style={{ color: remTone.text, fontSize: 27 }}
              >
                {rem == null ? '—' : rem >= 0 ? formatNum(rem) : `−${formatNum(Math.abs(rem))}`}
                <Text className="font-bold" style={{ fontSize: 13, color: '#8B96B8' }}>
                  {' ккал'}
                </Text>
              </Text>
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
                maxFontSizeMultiplier={MAX}
                className="mt-0.5 font-sans text-[11px] leading-tight text-bear-sub2"
              >
                {rem == null
                  ? 'цель не задана'
                  : rem >= 0
                    ? countBurned
                      ? 'с учётом сожжённых'
                      : 'без учёта сожжённых'
                    : 'съедено больше нормы'}
              </Text>
            </View>
          </Row>
        </View>

        <BurnZone
          onPress={onEditBurnGoal}
          accessibilityRole={onEditBurnGoal ? 'button' : undefined}
          accessibilityLabel={
            onEditBurnGoal
              ? `Сожжено за сегодня ${formatNum(burned)} килокалорий. Нажмите, чтобы изменить цель сжигания`
              : undefined
          }
          className="shrink-0 items-center"
        >
          {/* сожжено — кольцо того же диаметра, что и «съедено» (отзыв
              Кати про разные кольца): зелёная дуга (#34D399 — красное
              кольцо тревожило, отзыв Кати), внутри число и «из N ккал»,
              под кольцом подпись «сожжено» */}
          <KcalRing
            value={burned}
            goal={burnGoal > 0 ? burnGoal : null}
            caption="сожжено"
            pct={burnPct}
            color="#34D399"
            runId={runId}
            accessibilityLabel={`Сожжено ${formatNum(burned)} килокалорий за сегодня${burnGoal > 0 ? ` из ${formatNum(burnGoal)}` : ''}`}
          />
        </BurnZone>
      </View>

      {/* Особый день — метка и перерасчёт нормы ТЕПЕРЬ ВИДНЫ (отзыв
          Кати: корректировку калорий в особые дни «нигде не фиксируется»).
          Есть метка — цветной чип «эмодзи Тип · норма N ккал (+M)»,
          нет — пунктирный «+ Особый день». Тап открывает окно выбора;
          дни менструации подставляются сами из трекера цикла */}
      <Pressable
        onPress={() => setMarkOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={
          dayMark
            ? `Особый день: ${markMeta.label}, норма ${formatNum(target)} килокалорий. Нажмите, чтобы изменить`
            : 'Отметить особый день: менструация, командировка или праздник'
        }
        className={`mt-2.5 flex-row items-center gap-1.5 self-start rounded-full px-3 py-1.5 active:opacity-75 ${
          dayMark ? '' : 'border border-dashed border-white/15'
        }`}
        style={
          dayMark
            ? { backgroundColor: `${markMeta.color}1F`, borderColor: `${markMeta.color}55`, borderWidth: 1 }
            : null
        }
      >
        <Text className="text-[14px] leading-none">{dayMark ? markMeta.emoji : '＋'}</Text>
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
          maxFontSizeMultiplier={MAX}
          className="font-bold text-[13.5px] leading-tight"
          style={{ color: dayMark ? markMeta.color : '#8B96B8' }}
        >
          {dayMark
            ? `${markMeta.label} · норма ${formatNum(target)} ккал${
                dayMark.delta > 0 ? ` (+${formatNum(dayMark.delta)})` : ''
              }`
            : 'Особый день'}
        </Text>
        <ChevronDown size={14} color={dayMark ? markMeta.color : '#8B96B8'} />
      </Pressable>

      {/* нутриенты одной строкой в заданном порядке (Катя попросила
          вернуть одну строку вместо сетки 2×2: «верни бжу и клетчатку
          в одну строку как было»):
          1. Белки  2. Жиры  3. Углеводы  4. Клетчатка.
          В конце — маленький карандашик: свои нормы нутриентов */}
      <View
        accessibilityLabel={
          `Белки ${formatNum(Math.round(bju.p))} из ${formatNum(norms.p)} грамм, `
          + `жиры ${formatNum(Math.round(bju.f))} из ${formatNum(norms.f)} грамм, `
          + `углеводы ${formatNum(Math.round(bju.c))} из ${formatNum(norms.c)} грамм, `
          + `клетчатка ${formatNum(Math.round(bju.fib || 0))} из ${formatNum(norms.fib)} грамм`
        }
        className="mt-2.5 flex-row items-center"
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
          <Pencil size={14} color="#8B96B8" />
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
                <Text className="font-bold text-[20px] text-bear-text">🥗 Нормы нутриентов</Text>
                <Pressable
                  onPress={() => setNormsOpen(false)}
                  accessibilityLabel="Закрыть"
                  className="p-1"
                >
                  <X hitSlop={10} size={22} color="#A5AECB" />
                </Pressable>
              </View>
              <Text className="mt-1 font-sans text-[15px] leading-relaxed text-bear-sub">
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
                <Text className="text-center font-bold text-[19px] text-white">Сохранить</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* Окно «Особый день»: выбор типа дня; выбранный подсвечен своим
          цветом с галочкой. Дни менструации приходят из трекера цикла
          автоматически (footnote), командировку и праздник отмечает
          сама. Прибавки правятся в «Ещё → Дневник питания» */}
      <Modal
        visible={markOpen}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setMarkOpen(false)}
      >
        <Pressable
          className="flex-1 items-center justify-center bg-black/60 px-8"
          onPress={() => setMarkOpen(false)}
        >
          <Pressable
            className="w-full rounded-3xl border border-white/10 bg-bear-pop p-5"
            onPress={() => {}}
            accessibilityLabel="Особый день"
          >
            <View className="flex-row items-center justify-between">
              <Text className="font-bold text-[20px] text-bear-text">🗓 Особый день</Text>
              <Pressable
                onPress={() => setMarkOpen(false)}
                accessibilityLabel="Закрыть"
                className="p-1"
              >
                <X hitSlop={10} size={22} color="#A5AECB" />
              </Pressable>
            </View>
            <Text className="mt-1 font-sans text-[15px] leading-relaxed text-bear-sub">
              В особый день норма калорий пересчитывается с прибавкой: остаток на Главной, кольцо «съедено» и «Цель: N/7 дн» в отчётах считают по норме этого дня.
            </Text>
            <View className="mt-3 gap-2">
              {Object.keys(DAY_TYPES).map((t) => {
                const meta = DAY_TYPES[t]
                const active = dayMark && dayMark.type === t
                return (
                  <Pressable
                    key={t}
                    onPress={() => pickDayMark(t)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: Boolean(active) }}
                    accessibilityLabel={`Отметить день: ${meta.label}`}
                    className="flex-row items-center gap-2.5 rounded-2xl border px-3 py-2.5 active:opacity-75"
                    style={{
                      borderColor: active ? `${meta.color}66` : 'rgba(255,255,255,0.09)',
                      backgroundColor: active ? `${meta.color}1A` : 'rgba(255,255,255,0.03)',
                    }}
                  >
                    <Text className="text-[21px]">{meta.emoji}</Text>
                    <View className="min-w-0 flex-1">
                      <Text className="font-bold text-[16px] text-bear-text">{meta.label}</Text>
                      <Text
                        numberOfLines={1}
                        maxFontSizeMultiplier={MAX}
                        className="font-sans text-[13px] text-bear-sub2"
                      >
                        {`+${formatNum(dayDeltas[t] || 0)} ккал к норме`}
                      </Text>
                    </View>
                    {active && (
                      <View
                        className="h-6 w-6 shrink-0 items-center justify-center rounded-full"
                        style={{ backgroundColor: `${meta.color}33` }}
                      >
                        <Check size={14} color={meta.color} />
                      </View>
                    )}
                  </Pressable>
                )
              })}
            </View>
            {/* Снять ручную метку (авто-день цикла кнопкой не убирается —
                он считается из трекера) */}
            {dayMark && !dayMark.auto && (
              <Pressable
                onPress={() => {
                  setDayMark(todayKeyStr, null)
                  setMarkOpen(false)
                  toast({ title: '↩ Обычный день', description: 'Метка снята — считаем по базовой норме' })
                }}
                accessibilityRole="button"
                accessibilityLabel="Вернуть обычный день"
                className="mt-2.5 flex-row items-center justify-center gap-1.5 rounded-2xl bg-white/5 py-2.5 active:opacity-70"
              >
                <RotateCcw size={15} color="#AEB9D9" />
                <Text className="font-bold text-[16px] text-bear-soft">Вернуть обычный день</Text>
              </Pressable>
            )}
            <Text className="mt-2.5 font-sans text-[13px] leading-snug text-bear-dim">
              🌙 Дни менструации отмечаются сами, если включён трекер цикла
              («Ещё» → «Цикл»). Размер прибавок — «Ещё» → «Дневник питания» →
              «Особые дни».
              {!(target > 0) ? ' Норма калорий не задана — прибавка заработает, когда зададите цель.' : ''}
            </Text>
          </Pressable>
        </Pressable>
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
        <Text numberOfLines={1} className="font-sans text-[15px] text-bear-sub2">
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
        className="rounded-2xl border border-white/10 bg-white/5 py-2.5 text-center font-bold text-[19px] text-bear-text"
      />
    </View>
  )
}

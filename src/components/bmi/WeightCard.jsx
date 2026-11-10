// Карточка «Динамика веса» — оформление по макету пользователя:
// шапка-секция (иконка + заголовок + пилюля периода с дропдауном
// «Неделя / Месяц / Всё») — по решению пользователя секция по умолчанию
// СВЁРНУТА: тап по шапке разворачивает/сворачивает содержимое. Ниже ряд:
// слева узкая карточка «Текущий вес» с ростом под весом (карандаш — окно
// изменения роста: поле роста из окна записи веса убрано как дубль),
// целью, прогрессом до цели (без цели — здоровый диапазон по росту)
// и ОДНОЙ заметной кнопкой записи — крупный «+» БЕЗ текста
// (отзыв Кати: «просто +, текст не нужен, сделай плюс крупнее»; раньше
// кнопки «Изменить» и «+» дублировали друг друга — дубль убран ещё
// раньше; цель правится тапом по строке «Цель» с карандашом —
// то же окно записи веса с полем цели), под ней — справа — карточка с пилюлей
// «Изменение: N кг», графиком (линия красная/зелёная по цели — отзыв
// Кати) с днями и внутренней строкой-
// поддержкой («Ваш вес стабилен…» с лайком — весStrip из lib/data/bmi;
// текст строится по движению веса за ВЫБРАННЫЙ ПЕРИОД относительно
// направления цели — поправела при цели «похудеть» — «вес уходит от
// цели», а не похвала; стоит на месте при недостигнутой цели — честное
// «вес стоит на месте» с остатком пути и советом, без похвалы —
// отзыв Кати). Значение «Текущий вес» подсвечивается по
// калькулятору ИМТ и цели (перебор — красный, норма — зелёный, сушка —
// янтарный, поддержка — голубой, набор — фиолетовый — отзыв Кати).
// Журнал веса больше не живёт отдельной секцией под блоком
// (решение пользователя): тап по графику в правой карточке открывает
// окно журнала — список взвешиваний (тап по записи — изменить,
// корзина — удалить). Записей нет — в окне мишка «Запишите первый вес»
// с кнопкой записи (рекомендация пользователя); запись сегодняшнего
// дня подсвечена («Сегодня» фиолетовым, как «сегодня» в истории
// показателей). Журнал всегда открывается СвЁРНУТЫМ: видна свежая
// запись, остальные — по кнопке «Показать все записи (N)» (просьба
// Кати), разворот не запоминается.
//
// Аудит по скринам Кати (все записи «сегодня»): «Изменение: 0 кг»
// при любых вводах — окно периода добивало дни без записей текущим
// весом, ряд становился плоским. Теперь если записей нет раньше окна
// периода, график показывает сами записи журнала, а «Изменение»
// считается ОТ ПЕРВОЙ записи (подпись «с первой записи»); при одной
// записи — «Изменение: —, нужно ещё взвешивание».
// Поверхность карточек — фиолетовая, одинаковая с ИМТ-блоком выше.
// Кольцо «Прогресс» из старой карточки переехало
// в блок замеров («Общий прогресс», MeasurementsCard) — карточка
// стала легче.

import { useEffect, useState } from 'react'
import { Alert, DeviceEventEmitter, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import {
  Activity,
  Calendar,
  ChartLine,
  Check,
  ChevronDown,
  ChevronUp,
  NotebookText,
  Pencil,
  Plus,
  ThumbsUp,
  Trash2,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react-native'
import { useProfileStore } from '@/store/useProfileStore'
import { useFoodStore } from '@/store/useFoodStore'
import { goalRewardAfterSave } from '@/lib/goal'
import { consumeOpenWeightModal } from '@/lib/navEvents'
import {
  weekWeights,
  monthWeights,
  allWeights,
  healthyRange,
  calcBmi,
  fmtDecimal,
  shortDateNum,
  weightStrip,
} from '@/lib/data/bmi'
import { WeightChart } from './WeightChart'
import { WeightModal } from './WeightModal'
import { useToast } from '../ui/Toast'

// Поверхность карточек — та же, что у ИМТ-блока выше (фиолетовая
// bodyCard с фиолетовой обводкой): цвета блоков «Динамики веса»
// и «Измерений тела» выровнены с ИМТ (решение пользователя)
const CARD = {
  backgroundColor: 'rgba(29,18,64,0.82)',
  borderColor: 'rgba(168,85,247,0.30)',
  borderWidth: 1,
}

const PERIODS = [
  { id: 'week', label: 'Неделя' },
  { id: 'month', label: 'Месяц' },
  { id: 'all', label: 'Всё' },
]
const DELTA_CAPTION = { week: 'за неделю', month: 'за месяц', all: 'за всё время' }

// «24.10» из ISO-даты измерения
const shortDay = (iso) =>
  new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })

export function WeightCard() {
  const heightCm = useProfileStore((s) => s.heightCm)
  const weightKg = useProfileStore((s) => s.weightKg)
  // Цель питания («Моя цель» в «Ещё»): lose — сушка/похудеть,
  // maintain — поддержка, gain — набор. Влияет на подсветку
  // «Текущего веса» (отзыв Кати)
  const foodGoal = useFoodStore((s) => s.goal)
  const goalWeightKg = useProfileStore((s) => s.goalWeightKg)
  const goalReachedAt = useProfileStore((s) => s.goalReachedAt)
  const weights = useProfileStore((s) => s.weights)
  const addWeight = useProfileStore((s) => s.addWeight)
  const updateWeight = useProfileStore((s) => s.updateWeight)
  const removeWeight = useProfileStore((s) => s.removeWeight)
  const setProfile = useProfileStore((s) => s.setProfile)
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  // Секция развёрнута по умолчанию (отзыв Кати: сворачивание «Динамики
  // веса» и «Измерений тела» по умолчанию мешало — данные не видны
  // сразу). Не храним в сторe — состояние локальное
  const [secOpen, setSecOpen] = useState(true)
  const [period, setPeriod] = useState('week')
  const [menuOpen, setMenuOpen] = useState(false)
  const [journalOpen, setJournalOpen] = useState(false)
  // Свёрнутый вид журнала: свежая запись, остальные по кнопке
  const [showAllRecs, setShowAllRecs] = useState(false)
  const [editing, setEditing] = useState(null) // измерение на изменении
  const [kgText, setKgText] = useState('')
  // Окно изменения роста (карандаш в карточке «Текущий вес»)
  const [heightOpen, setHeightOpen] = useState(false)
  const [heightText, setHeightText] = useState('')

  // Сквозное раскрытие секции: пилюля «Динамика веса» в шапке вкладки
  // разворачивает секцию, затем экран докручивает до неё
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('nutribear/expand-weight-section', () =>
      setSecOpen(true)
    )
    return () => sub.remove()
  }, [])

  // Сквозное открытие окна веса: из тапа «запишите вес» в золотой
  // карточке и из уведомления о взвешивании (живое событие + флаг,
  // оставленный на случай, когда вкладка ещё не была смонтирована)
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('nutribear/open-weight', () => setOpen(true))
    if (consumeOpenWeightModal()) setOpen(true)
    return () => sub.remove()
  }, [])

  // «Всегда свёрнут»: при каждом открытии журнала показывается только
  // свежая запись, разворот не запоминается (просьба Кати)
  useEffect(() => {
    if (journalOpen) setShowAllRecs(false)
  }, [journalOpen])

  // ── Ряд графика и база «Изменения» (аудит по скринам Кати) ──
  // Раньше окно периода добивало дни без записей текущим весом: если
  // все записи сделаны сегодня (журнал только начинается), ряд был
  // плоским и «Изменение» висело на «0 кг», сколько бы разных весов
  // ни вводить (вопрос Кати: «почему в карточке изменение всегда 0?»).
  // Теперь: если записей НЕТ раньше окна периода — показываем сами
  // записи журнала и движение ОТ ПЕРВОЙ записи, подпись «с первой
  // записи». Одна запись — сравнивать не с чем: «Изменение: —»
  const allPts = allWeights(weights)
  const fewData = weights.length < 2
  // Записи журнала по возрастанию даты — БЕЗ схлопывания по дням
  // (allWeights оставил бы от шести сегодняшних взвешиваний одну
  // точку — и динамика снова потерялась бы)
  const journalPts = [...weights]
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(-24)
    .map((r) => ({ label: shortDateNum(new Date(r.date)), kg: r.kg }))
  // Есть ли записи РАНЬШЕ окна периода (неделя — 6 дней назад,
  // месяц — 29): день как число ггггммдд — сравнение дат без строк
  const winStart = new Date()
  winStart.setDate(winStart.getDate() - (period === 'month' ? 29 : 6))
  const winStartNum =
    winStart.getFullYear() * 10000 + (winStart.getMonth() + 1) * 100 + winStart.getDate()
  const hasOlder =
    period !== 'all' &&
    weights.some((r) => {
      const d = new Date(r.date)
      return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate() < winStartNum
    })

  let data
  let deltaLabel = DELTA_CAPTION[period]
  if (period === 'all' && allPts.length >= 2) {
    // «Всё» — одна точка на день, подпись своя (проверять раньше
    // фолбэка: у «Всё» окна нет и hasOlder всегда false)
    data = allPts
  } else if (!fewData && !hasOlder) {
    // Весь журнал внутри окна — честная база только одна: первая запись
    data = journalPts.length >= 2 ? journalPts : allPts
    deltaLabel = 'с первой записи'
  } else {
    data =
      period === 'month'
        ? monthWeights(weightKg, weights)
        : weekWeights(weightKg, weights)
  }
  const last = data[data.length - 1]
  const periodDelta = Math.round((last.kg - data[0].kg) * 10) / 10

  // Зелёный — вес движется к норме, красный — в сторону (без цели)
  const { min, max } = healthyRange(heightCm)
  const towardNorm =
    (periodDelta < 0 && last?.kg >= min) || (periodDelta > 0 && last?.kg <= max)

  // Прогресс к цели: «до цели −3,5 кг» или «Цель достигнута!»
  const goalDiff =
    goalWeightKg != null ? Math.round((weightKg - goalWeightKg) * 10) / 10 : 0
  const goalReached = goalWeightKg != null && Math.abs(goalDiff) < 0.05

  // Направление цели: «похудеть» — цель ниже текущего веса, «набрать» — выше
  const wantDown = goalWeightKg != null && goalWeightKg < weightKg - 0.05
  const wantUp = goalWeightKg != null && goalWeightKg > weightKg + 0.05

  // Прогресс до цели — полоса от самой первой записи журнала к цели
  // (отзыв Кати: левый блок «Динамики веса» выглядел недоделанным —
  // под кнопкой записи зияла пустота). weights хранит «новые сверху»,
  // поэтому самая ранняя запись ищется по дате — порядок не важен
  const startRec =
    weights.length > 0
      ? weights.reduce((a, b) => (new Date(a.date) <= new Date(b.date) ? a : b))
      : null
  const startKg = startRec ? startRec.kg : weightKg
  let goalPct = 0
  if (goalWeightKg != null) {
    if (goalReached) {
      goalPct = 1
    } else if (wantUp && goalWeightKg > startKg) {
      goalPct = (weightKg - startKg) / (goalWeightKg - startKg)
    } else if (wantDown && startKg > goalWeightKg) {
      goalPct = (startKg - weightKg) / (startKg - goalWeightKg)
    }
    goalPct = Math.max(0, Math.min(1, goalPct))
  }

  // Движение к цели за ВЫБРАННЫЙ ПЕРИОД, а не за всю историю (отзыв
  // Кати: «моя цель похудеть — я ввожу вес больше, а он пишет
  // „отличная работа!“» — раньше ход считался от самой первой записи,
  // и недельная прибавка хвалилась). Поправела за период — «вес уходит
  // от цели», сбросила — «движется к цели», стоит на месте — «стабилен»
  const periodTowardGoal = goalReached
    ? true
    : wantDown
      ? periodDelta < -0.05 ? true : periodDelta > 0.05 ? false : null
      : wantUp
        ? periodDelta > 0.05 ? true : periodDelta < -0.05 ? false : null
        : null

  // Строка-поддержка: с целью — по движению к цели за период, без цели —
  // по движению к здоровой норме. Если вес стоит на месте, а цель ещё
  // НЕ достигнута, — без похвалы (отзыв Кати: недобор веса, цель
  // «набрать», а подсказка была «отличная работа!»): честно говорим,
  // сколько осталось до цели и что делать — набору — добавить калорий,
  // похудению — слегка снизить калорийность
  const strip = weightStrip({
    delta: fewData ? null : periodDelta,
    towardGoal: goalWeightKg != null ? periodTowardGoal : null,
    towardNorm,
    goalReached,
    goalPendingKg:
      goalWeightKg != null && !goalReached ? Math.abs(goalDiff) : null,
    gaining: wantUp,
  })
  const toneColor =
    strip.tone === 'bad' ? '#FB7185' : strip.tone === 'info' ? '#8B96B8' : '#34D399'

  // Цвет линии графика (отзыв Кати: «в зависимости от цели — линия
  // красная/зелёная»): красная — за период вес уходит от цели (или,
  // без цели, от здоровой нормы), зелёная — к цели/норме или на месте.
  // Одна запись — вывода нет: нейтральная серая
  const away =
    goalWeightKg != null ? periodTowardGoal === false : towardNorm === false
  const lineColor = fewData ? '#8B96B8' : away ? '#fb7185' : '#4ade80'

  // Подсветка «Текущего веса» (отзыв Кати): по калькулятору ИМТ перебор —
  // красный, недостаток веса — жёлтый; в норме цвет уточняет цель
  // питания: сушка (похудеть) — янтарный, поддержка — голубой,
  // набор — фиолетовый, без цели — зелёный
  const bmiNow = calcBmi(weightKg, heightCm)
  const weightTone =
    bmiNow >= 25
      ? '#FB7185'
      : bmiNow > 0 && bmiNow < 18.5
        ? '#FACC15'
        : foodGoal === 'lose'
          ? '#FBBF24'
          : foodGoal === 'maintain'
            ? '#38BDF8'
            : foodGoal === 'gain'
              ? '#A78BFA'
              : '#4ADE80'

  // Ключ сегодняшнего дня (локальная дата) — запись сегодняшнего
  // взвешивания в журнале подсвечивается словом «Сегодня»
  const todayStr = new Date().toDateString()

  function handleSave({ heightCm: h, weightKg: w, weightChanged, goalKg }) {
    // Награда за достижение цели: чистые правила в lib/goal.js — при смене
    // цели старая дата не остаётся висеть про новую цель, при повторном
    // достижении после отката дата ставится заново (стрик удержания)
    const reward = goalRewardAfterSave({
      prevGoal: goalWeightKg,
      prevReachedAt: goalReachedAt,
      prevWeight: weightKg,
      weight: w,
      weightChanged,
      goalKg,
    })

    if (h !== heightCm) setProfile({ heightCm: h })
    if (weightChanged) addWeight(w)
    if (goalKg !== undefined) setProfile({ goalWeightKg: goalKg })
    if (reward.reachedAt !== undefined) setProfile({ goalReachedAt: reward.reachedAt })

    if (reward.celebrate) {
      Alert.alert(
        '🎉 Цель достигнута!',
        `Вес ${fmtDecimal(w)} кг — ты у цели! Дальше — удержание: взвешивайся раз в неделю и держи норму калорий.`
      )
    }
  }

  // Русская запятая — тоже десятичный разделитель
  function saveEdit() {
    const w = Math.round(Number(String(kgText).trim().replace(',', '.')) * 10) / 10
    if (!Number.isFinite(w) || w < 25 || w > 300) {
      toast({ title: '⚖️ Проверьте вес', description: 'От 25 до 300 кг, например 72,5' })
      return
    }
    updateWeight(editing.id, w)
    toast({ title: '✏️ Изменено', description: `Вес измерения: ${fmtDecimal(w)} кг` })
    setEditing(null)
  }

  function removeMeasurement(w) {
    removeWeight(w.id)
    if (editing && editing.id === w.id) setEditing(null)
    toast({ title: '🗑 Измерение удалено', description: `${shortDay(w.date)} · ${fmtDecimal(w.kg)} кг` })
  }

  // Сохранить рост из карандаша в карточке «Текущий вес» — в окне записи
  // веса поля роста больше нет (убрали как дубль)
  function saveHeight() {
    const h = Math.round(Number(String(heightText).trim().replace(',', '.')))
    if (!Number.isFinite(h) || h < 80 || h > 250) {
      toast({ title: '❗ Проверьте рост', description: 'От 80 до 250 см, например 165' })
      return
    }
    setProfile({ heightCm: h })
    setHeightOpen(false)
    toast({ title: '📏 Рост обновлён', description: `${h} см — ИМТ пересчитан` })
  }

  return (
    <View accessibilityLabel="Динамика веса" className="gap-2.5">
      {/* Шапка-секция: тап по ней разворачивает/сворачивает блок;
          иконка + заголовок + круглый «+» записи веса + пилюля периода */}
      <Pressable
        onPress={() => setSecOpen((v) => !v)}
        accessibilityRole="button"
        accessibilityState={{ expanded: secOpen }}
        accessibilityLabel={secOpen ? 'Свернуть динамику веса' : 'Развернуть динамику веса'}
        className="flex-row items-center gap-2.5 active:opacity-80"
      >
        <View className="h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.06]">
          <ChartLine size={20} color="#7DD3FC" />
        </View>
        <Text className="min-w-0 flex-1 font-bold text-[22px] tracking-tight text-bear-text">
          Динамика веса
        </Text>

        {/* Период графика: пилюля с дропдауном, как на макете */}
        <View>
          {menuOpen && (
            // Невидимая шторка на тап мимо меню — закрывает дропдаун
            <Pressable
              accessibilityLabel="Закрыть выбор периода"
              onPress={() => setMenuOpen(false)}
              style={{ position: 'absolute', top: -999, left: -999, right: -999, bottom: -999 }}
            />
          )}
          <Pressable
            onPress={() => setMenuOpen((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel={`Период графика: ${PERIODS.find((p) => p.id === period)?.label}. Нажмите, чтобы изменить`}
            className="flex-row items-center gap-1 rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-[7px] active:opacity-70"
          >
            <Calendar size={15} color="#A78BFA" />
            <Text className="font-semibold text-[15px] text-[#D6DCF2]">
              {PERIODS.find((p) => p.id === period)?.label}
            </Text>
            {menuOpen ? (
              <ChevronUp size={14} color="#A5AECB" />
            ) : (
              <ChevronDown size={14} color="#A5AECB" />
            )}
          </Pressable>

          {menuOpen && (
            <View
              className="absolute right-0 top-9 z-10 w-[124px] overflow-hidden rounded-2xl border border-white/10 bg-bear-pop py-1.5"
              style={{ elevation: 16 }}
            >
              {PERIODS.map((p) => {
                const active = period === p.id
                return (
                  <Pressable
                    key={p.id}
                    onPress={() => {
                      setPeriod(p.id)
                      setMenuOpen(false)
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Период графика: ${p.label}`}
                    className="flex-row items-center justify-between px-3 py-2 active:opacity-60"
                  >
                    <Text
                      className={`font-semibold text-[16.5px] ${active ? 'text-white' : 'text-bear-sub'}`}
                    >
                      {p.label}
                    </Text>
                    {active && <Check size={15} color="#A78BFA" />}
                  </Pressable>
                )
              })}
            </View>
          )}
        </View>

        {/* Шеврон состояния секции — секция по умолчанию развёрнута */}
        {secOpen ? (
          <ChevronUp size={17} color="#A5AECB" />
        ) : (
          <ChevronDown size={17} color="#A5AECB" />
        )}
      </Pressable>

      {secOpen && (
        <>
      {/* Ряд: узкая карточка веса/цели + карточка с графиком */}
      <View className="flex-row items-stretch gap-2.5">
        {/* Текущий вес + цель + кнопка «Задать цель»; тап по весу — запись */}
        <View
          className="w-[122px] shrink-0 justify-between rounded-2xl p-3.5"
          style={CARD}
        >
          <View>
            <Pressable
              onPress={() => setOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Записать вес"
              className="active:opacity-70"
            >
              <Text maxFontSizeMultiplier={1.2} className="font-sans text-[15px] text-bear-sub">
                Текущий вес
              </Text>
              {/* Значение подсвечено по калькулятору ИМТ и цели (отзыв
                  Кати): перебор — красный, норма без цели — зелёный,
                  сушка — янтарный, поддержка — голубой, набор — фиолетовый */}
              <Text
                maxFontSizeMultiplier={1.15}
                className="mt-1.5 font-extrabold text-[27px] leading-none tracking-tight"
                style={{ color: weightTone }}
              >
                {fmtDecimal(weightKg)}
                <Text className="font-semibold text-[16.5px] text-bear-sub2"> кг</Text>
              </Text>
            </Pressable>

            {/* Рост — под весом, карандаш открывает окно изменения
                (поле роста из окна записи веса убрано как дубль) */}
            <Pressable
              onPress={() => {
                setHeightText(String(heightCm))
                setHeightOpen(true)
              }}
              accessibilityRole="button"
              accessibilityLabel={`Рост ${heightCm} сантиметров — изменить`}
              className="mt-1.5 flex-row items-center gap-1 self-start active:opacity-70"
            >
              <Text maxFontSizeMultiplier={1.2} className="font-sans text-[15px] text-bear-sub">Рост</Text>
              <Text maxFontSizeMultiplier={1.2} className="font-bold text-[16px] text-bear-text">
                {heightCm} см
              </Text>
              <Pencil size={15} color="#8DABFF" />
            </Pressable>
          </View>

          <View>
            <View className="flex-row items-center gap-1">
              {!fewData && periodDelta < 0 && (
                <TrendingDown size={14} color={toneColor === '#34D399' ? '#34d399' : '#fb7185'} />
              )}
              {!fewData && periodDelta > 0 && (
                <TrendingUp size={14} color={toneColor === '#34D399' ? '#34d399' : '#fb7185'} />
              )}
              <Text
                numberOfLines={1}
                maxFontSizeMultiplier={1.2}
                className="font-semibold text-[15px]"
                style={{ color: toneColor }}
              >
                {fewData
                  ? '—'
                  : periodDelta === 0
                    ? 'без изменений'
                    : `${periodDelta > 0 ? '+' : '−'}${fmtDecimal(Math.abs(periodDelta))} кг`}
              </Text>
            </View>
            <Text maxFontSizeMultiplier={1.2} className="mt-0.5 font-sans text-[14.5px] text-bear-dim">
              {fewData ? 'нужно ещё взвешивание' : deltaLabel}
            </Text>
          </View>

          <View>
            <View className="mb-2 h-px bg-white/[0.06]" />
            <Text maxFontSizeMultiplier={1.2} className="font-sans text-[15px] text-bear-sub">
              Цель
            </Text>
            {/* Цель редактируется тапом по строке (отзыв Кати: кнопка
                «Изменить» дублировала «+ Записать вес» — отдельной кнопки
                больше нет; карандаш открывает то же окно записи веса
                с полем цели) */}
            <Pressable
              onPress={() => setOpen(true)}
              accessibilityRole="button"
              accessibilityLabel={goalWeightKg != null ? `Цель ${fmtDecimal(goalWeightKg)} килограммов — изменить` : 'Задать цель по весу'}
              className="mt-0.5 flex-row items-center gap-1 self-start active:opacity-70"
            >
              <Text
                numberOfLines={1}
                maxFontSizeMultiplier={1.2}
                className="font-bold text-[17.5px] text-bear-text"
              >
                {goalWeightKg != null ? `${fmtDecimal(goalWeightKg)} кг` : 'не задана'}
              </Text>
              <Pencil size={15} color="#8DABFF" />
            </Pressable>

            {/* Прогресс до цели — полоса от первой записи журнала к цели
                (отзыв Кати: левый блок выглядел недоделанным — под кнопкой
                зияла пустота). Без цели — здоровый диапазон по росту,
                как в карточке «Вес» в «Отчётах» */}
            {goalWeightKg != null ? (
              goalReached ? (
                <View accessibilityLabel="Цель по весу достигнута" className="mt-2">
                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    maxFontSizeMultiplier={1.2}
                    className="font-semibold text-[13px]"
                    style={{ color: '#4ADE80' }}
                  >
                    Цель достигнута!
                  </Text>
                  <View className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <View
                      className="h-full rounded-full"
                      style={{ width: '100%', backgroundColor: '#4ADE80' }}
                    />
                  </View>
                </View>
              ) : (
                <View
                  accessibilityLabel={`До цели ${fmtDecimal(Math.abs(goalDiff))} килограммов, прогресс ${Math.round(goalPct * 100)} процентов`}
                  className="mt-2"
                >
                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    maxFontSizeMultiplier={1.2}
                    className="font-sans text-[13px] text-bear-dim"
                  >
                    До цели {fmtDecimal(Math.abs(goalDiff))} кг
                  </Text>
                  <View className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <View
                      className="h-full rounded-full"
                      style={{ width: `${Math.max(goalPct * 100, 4)}%`, backgroundColor: lineColor }}
                    />
                  </View>
                </View>
              )
            ) : (
              heightCm > 50 && (
                <Text
                  maxFontSizeMultiplier={1.2}
                  accessibilityLabel={`Здоровый диапазон для роста ${heightCm} сантиметров: от ${min} до ${max} килограммов`}
                  className="mt-2 font-sans text-[13px] leading-snug text-bear-dim"
                >
                  Норма: {min}–{max} кг
                </Text>
              )
            )}
          </View>

          {/* Записать вес — единственная кнопка записи: БЕЗ текста,
              только крупный «+» (отзыв Кати: «просто +, текст не нужен,
              сделай плюс крупнее»); подпись осталась в шапке карточки и
              в accessibilityLabel. Кнопка прижата к низу карточки —
              пустоты под ней больше нет */}
          <Pressable
            onPress={() => setOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Записать вес"
            className="mt-2 items-center justify-center rounded-xl border border-[#A78BFA]/50 bg-[#A78BFA]/25 py-2 active:opacity-70"
          >
            <Plus size={32} color="#C4B5FD" strokeWidth={2.75} />
          </Pressable>
        </View>

        {/* График + строка-поддержка */}
        <View className="min-w-0 flex-1 rounded-2xl p-3" style={CARD}>
          {/* Пилюля изменения за период: точка в цвет тона. Одна запись —
              «—»: сравнивать не с чем (аудит: «0 кг» при одном взвешивании
              читалось как «вес стоит», хотя пары точек просто нет) */}
          <View
            className="self-start rounded-full bg-white/[0.06] px-2.5 py-1.5"
            accessibilityLabel={
              fewData
                ? 'Изменение веса: пока нет данных — нужно ещё взвешивание'
                : `Изменение веса ${deltaLabel}: ${
                    periodDelta === 0
                      ? '0 кг'
                      : `${periodDelta > 0 ? '+' : '−'}${fmtDecimal(Math.abs(periodDelta))} кг`
                  }`
            }
          >
            <View className="flex-row items-center gap-1.5">
              <View
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: toneColor,
                }}
              />
              <Text maxFontSizeMultiplier={1.2} className="font-semibold text-[15px] text-bear-sub">
                {`Изменение: ${
                  fewData
                    ? '—'
                    : periodDelta === 0
                      ? '0 кг'
                      : `${periodDelta > 0 ? '+' : '−'}${fmtDecimal(Math.abs(periodDelta))} кг`
                }`}
              </Text>
            </View>
          </View>

          {/* График открывает журнал веса (решение пользователя:
              журнал больше не отдельная секция под блоком — тап по линии
              графика открывает окно журнала). Под графиком — подсказка
              с числом записей; пустой журнал открывает окно с мишкой.
              «Журнал веса», а не «измерений»: замеры сантиметром живут
              в «Измерениях тела», здесь — только взвешивания */}
          <Pressable
            onPress={() => setJournalOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={
              weights.length > 0
                ? `График веса — открыть журнал веса, записей: ${weights.length}`
                : 'График веса — открыть журнал веса'
            }
            className="active:opacity-70"
          >
            <WeightChart data={data} goalKg={goalWeightKg} color={lineColor} lastBadge height={128} />
            <View className="mt-1 flex-row items-center justify-center gap-1">
              <NotebookText size={14} color="#8DABFF" />
              <Text className="font-sans text-[14.5px] font-semibold text-[#8DABFF]">
                {weights.length > 0 ? `Журнал веса · ${weights.length}` : 'Журнал веса'}
              </Text>
            </View>
          </Pressable>

          {/* Строка-поддержка: «Ваш вес стабилен…» с лайком; при
              недостигнутой цели и стоячем весе — янтарный тон без похвалы */}
          <View
            accessibilityLabel={`${strip.title}. ${strip.text}`}
            className="mt-0.5 flex-row items-center gap-2 rounded-xl bg-white/[0.04] p-2.5"
          >
            <View
              className="h-9 w-9 shrink-0 items-center justify-center rounded-full"
              style={{
                backgroundColor:
                  strip.tone === 'bad' || strip.tone === 'push'
                    ? 'rgba(251,191,36,0.14)'
                    : 'rgba(56,189,248,0.14)',
              }}
            >
              <Activity
                size={16}
                color={
                  strip.tone === 'bad' || strip.tone === 'push'
                    ? '#FBBF24'
                    : '#38BDF8'
                }
              />
            </View>
            <View className="min-w-0 flex-1">
              {/* Без numberOfLines: заголовок «Ваш вес стабилен…» на узких
                  экранах и при увеличенном системном шрифте обрезался
                  многоточием до «Ваш вес…» (отзыв Кати) — пусть переносится */}
              <Text
                maxFontSizeMultiplier={1.2}
                className="font-bold text-[16px] text-bear-text"
              >
                {strip.title}
              </Text>
              {/* Без numberOfLines: фразы вроде «Отличная работа!
                  Продолжайте в том же духе.» на узких экранах не влезали
                  в две строки и обрезались многоточием — текст должен
                  читаться целиком (фразы короткие, в 2–3 строки) */}
              <Text
                maxFontSizeMultiplier={1.25}
                className="font-sans text-[14.5px] leading-snug text-bear-sub"
              >
                {strip.text}
              </Text>
            </View>
            {/* Правая иконка-тонус. «Палец вниз» удалён по отзыву Кати
                от 10.11 («удалить палец вниз») — при тоне bad иконки нет */}
            {strip.tone === 'push' ? (
              <ThumbsUp size={22} color="#FBBF24" />
            ) : strip.tone === 'info' ? null : strip.tone === 'bad' ? null : (
              <ThumbsUp size={22} color="#4ADE80" />
            )}
          </View>
        </View>
      </View>

        </>
      )}

      <WeightModal
        open={open}
        onClose={() => setOpen(false)}
        height={heightCm}
        weight={weightKg}
        goalWeight={goalWeightKg}
        onSave={handleSave}
      />

      {/* Журнал веса: окно поверх секции — открывается тапом по
          графику. Тап по записи — окно изменения (открывается поверх,
          оно ниже по JSX), корзина — удалить; запись сегодняшнего дня
          подсвечена. Пустой журнал — мишка и кнопка записи веса */}
      <Modal
        visible={journalOpen}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setJournalOpen(false)}
      >
        <View className="flex-1 items-center justify-center bg-black/60 px-6">
          <View className="w-full rounded-3xl border border-white/10 bg-bear-pop p-5">
            <View className="flex-row items-center justify-between">
              <Text className="font-bold text-[20px] text-bear-text">Журнал веса</Text>
              <Pressable
                onPress={() => setJournalOpen(false)}
                accessibilityRole="button"
                accessibilityLabel="Закрыть журнал веса"
                className="p-1"
              >
                <X hitSlop={10} size={22} color="#A5AECB" />
              </Pressable>
            </View>

            {weights.length === 0 ? (
              <View className="items-center py-5" accessibilityLabel="Журнал веса пуст">
                <Text className="text-[38px]">🐻</Text>
                <Text className="mt-2 font-bold text-[18px] text-bear-text">
                  Журнал пока пуст
                </Text>
                <Text
                  maxFontSizeMultiplier={1.25}
                  className="mt-1 text-center font-sans text-[15px] leading-snug text-bear-sub"
                >
                  Запишите первый вес — и здесь появится история взвешиваний
                </Text>
                <Pressable
                  onPress={() => {
                    setJournalOpen(false)
                    setOpen(true)
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Записать вес"
                  className="mt-4 w-full items-center rounded-2xl bg-[#7B6CF6] py-3 active:opacity-80"
                >
                  <Text className="font-bold text-[17.5px] text-white">Записать вес</Text>
                </Pressable>
              </View>
            ) : (
              <>
                <Text className="mt-1 font-sans text-[15px] text-bear-sub">
                  {`Записей: ${weights.length} · тап по записи — изменить${
                    weights.length > 1 && !showAllRecs ? ' · видна свежая' : ''
                  }`}
                </Text>

                <ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator={false} className="mt-3">
                  <View className="gap-1">
                    {(showAllRecs ? weights : weights.slice(0, 1)).map((w) => {
                      const isToday = new Date(w.date).toDateString() === todayStr
                      return (
                        <Pressable
                          key={w.id}
                          onPress={() => {
                            setEditing(w)
                            setKgText(String(w.kg))
                          }}
                          accessibilityRole="button"
                          accessibilityLabel={`Изменить вес ${fmtDecimal(w.kg)} кг от ${isToday ? 'сегодня' : shortDay(w.date)}`}
                          className="flex-row items-center gap-2 rounded-xl px-2.5 py-2 active:opacity-70"
                          style={{
                            backgroundColor: isToday
                              ? 'rgba(167,139,250,0.12)'
                              : 'rgba(255,255,255,0.04)',
                          }}
                        >
                          <Text
                            className={`shrink-0 font-sans text-[15px] ${
                              isToday ? 'font-bold text-[#A78BFA]' : 'text-bear-dim'
                            }`}
                          >
                            {isToday ? 'Сегодня' : shortDay(w.date)}
                          </Text>
                          <Text
                            numberOfLines={1}
                            className="min-w-0 flex-1 text-right font-semibold text-[17px] text-bear-text"
                          >
                            {fmtDecimal(w.kg)} кг
                          </Text>
                          <Pressable
                            onPress={() => removeMeasurement(w)}
                            accessibilityRole="button"
                            accessibilityLabel={`Удалить вес ${fmtDecimal(w.kg)} кг`}
                            className="shrink-0 rounded p-1 active:opacity-60"
                          >
                            <Trash2 size={15} color="#98A2C2" />
                          </Pressable>
                        </Pressable>
                      )
                    })}
                  </View>
                </ScrollView>

                {/* Свежая запись видна сразу, остальные — по тапу (просьба
                    Кати: «по умолчанию видно последнюю, остальное свернуть
                    всегда»); при одной записи кнопки нет */}
                {weights.length > 1 && (
                  <Pressable
                    onPress={() => setShowAllRecs((v) => !v)}
                    accessibilityRole="button"
                    accessibilityLabel={
                      showAllRecs
                        ? 'Свернуть журнал веса'
                        : `Показать все записи журнала: ${weights.length}`
                    }
                    className="mt-2.5 items-center rounded-xl bg-white/[0.06] py-2.5 active:opacity-70"
                  >
                    <Text className="font-semibold text-[15px] text-[#8DABFF]">
                      {showAllRecs ? 'Свернуть' : `Показать все записи (${weights.length})`}
                    </Text>
                  </Pressable>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Окно изменения измерения */}
      <Modal visible={Boolean(editing)} transparent animationType="fade" onRequestClose={() => setEditing(null)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1 items-center justify-center bg-black/60 px-6"
        >
          <View className="w-full rounded-3xl border border-white/10 bg-bear-pop p-5">
            <View className="flex-row items-center justify-between">
              <Text className="font-bold text-[20px] text-bear-text">Изменить вес</Text>
              <Pressable onPress={() => setEditing(null)} accessibilityRole="button" accessibilityLabel="Закрыть" className="p-1">
                <X hitSlop={10} size={22} color="#A5AECB" />
              </Pressable>
            </View>
            <Text className="mt-1 font-sans text-[15px] text-bear-sub">
              Измерение от {editing ? shortDay(editing.date) : ''}
            </Text>

            <Text className="mt-4 font-medium text-[16px] text-bear-sub">Вес, кг</Text>
            <TextInput
              value={kgText}
              onChangeText={setKgText}
              keyboardType="decimal-pad"
              maxLength={6}
              textAlign="center"
              accessibilityLabel="Новый вес измерения в килограммах"
              className="mt-1.5 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 font-semibold text-[19px] text-white"
            />

            {/* Кнопки: крестик закрытия — в шапке, здесь только «Сохранить» */}
            <View className="mt-5 flex-row">
              <Pressable
                onPress={saveEdit}
                accessibilityRole="button"
                accessibilityLabel="Сохранить новый вес"
                className="flex-1 items-center rounded-2xl bg-[#7B6CF6] py-3 active:opacity-80"
              >
                <Text className="font-bold text-[17.5px] text-white">Сохранить</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Окно изменения роста (карандаш в карточке «Текущий вес») */}
      <Modal visible={heightOpen} transparent animationType="fade" onRequestClose={() => setHeightOpen(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1 items-center justify-center bg-black/60 px-6"
        >
          <View className="w-full rounded-3xl border border-white/10 bg-bear-pop p-5">
            <View className="flex-row items-center justify-between">
              <Text className="font-bold text-[20px] text-bear-text">Изменить рост</Text>
              <Pressable onPress={() => setHeightOpen(false)} accessibilityRole="button" accessibilityLabel="Закрыть" className="p-1">
                <X hitSlop={10} size={22} color="#A5AECB" />
              </Pressable>
            </View>
            <Text className="mt-1 font-sans text-[15px] text-bear-sub">
              ИМТ и норма калорий пересчитаются сами
            </Text>

            <Text className="mt-4 font-medium text-[16px] text-bear-sub">Рост, см</Text>
            <TextInput
              value={heightText}
              onChangeText={setHeightText}
              keyboardType="number-pad"
              maxLength={3}
              textAlign="center"
              accessibilityLabel="Рост в сантиметрах"
              className="mt-1.5 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 font-semibold text-[19px] text-white"
            />

            <View className="mt-5 flex-row">
              <Pressable
                onPress={saveHeight}
                accessibilityRole="button"
                accessibilityLabel="Сохранить рост"
                className="flex-1 items-center rounded-2xl bg-[#7B6CF6] py-3 active:opacity-80"
              >
                <Text className="font-bold text-[17.5px] text-white">Сохранить</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  )
}

// Карточка «Динамика веса» — оформление по макету пользователя:
// шапка-секция (иконка + заголовок + пилюля периода с дропдауном
// «Неделя / Месяц / Всё») — по решению пользователя секция по умолчанию
// СВЁРНУТА: тап по шапке разворачивает/сворачивает содержимое. Ниже ряд:
// слева узкая карточка «Текущий вес» с ростом под весом (карандаш — окно
// изменения роста: поле роста из окна записи веса убрано как дубль),
// целью и кнопкой «Задать цель», справа — карточка с пилюлей
// «Изменение: N кг», зелёным графиком с днями и внутренней строкой-
// поддержкой («Ваш вес стабилен…» с лайком — весStrip из lib/data/bmi).
// Журнал веса больше не живёт отдельной секцией под блоком
// (решение пользователя): тап по графику в правой карточке открывает
// окно журнала — список взвешиваний (тап по записи — изменить,
// корзина — удалить). Записей нет — в окне мишка «Запишите первый вес»
// с кнопкой записи (рекомендация пользователя); запись сегодняшнего
// дня подсвечена («Сегодня» фиолетовым, как «сегодня» в истории
// показателей). Поверхность карточек — фиолетовая, одинаковая
// с ИМТ-блоком выше. Кольцо «Прогресс» из старой карточки переехало
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
  Target,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react-native'
import { useProfileStore } from '@/store/useProfileStore'
import { goalRewardAfterSave } from '@/lib/goal'
import { consumeOpenWeightModal } from '@/lib/navEvents'
import {
  weekWeights,
  monthWeights,
  allWeights,
  healthyRange,
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

  // «Всё» без минимум двух точек смысла не имеет — показываем неделю
  const allPts = allWeights(weights)
  const data =
    period === 'month'
      ? monthWeights(weightKg, weights)
      : period === 'all' && allPts.length >= 2
        ? allPts
        : weekWeights(weightKg, weights)
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

  // Движение к цели по направлению общего хода с первого измерения
  const oldest = weights.length > 0 ? weights[weights.length - 1] : null
  const deltaAll = oldest ? Math.round((weightKg - oldest.kg) * 10) / 10 : null
  const towardGoal =
    goalReached || (goalWeightKg != null && deltaAll != null
      ? goalDiff > 0.05 ? deltaAll < 0 : goalDiff < -0.05 ? deltaAll > 0 : true
      : null)

  // Строка-поддержка: с целью — по движению к цели, без цели — по
  // движению к здоровой норме (текст без слова «цель», тон тот же)
  const strip = weightStrip({
    delta: periodDelta,
    towardGoal: goalWeightKg != null ? towardGoal : null,
    towardNorm,
    goalReached,
  })
  const toneColor = strip.tone === 'bad' ? '#FB7185' : '#34D399'

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

        {/* Записать вес: круглый «+» (модалка веса) */}
        <Pressable
          onPress={() => setOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Записать вес"
          className="h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] active:opacity-70"
        >
          <Plus size={17} color="#A78BFA" />
        </Pressable>

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
        <View className="w-[122px] shrink-0 rounded-2xl p-3.5" style={CARD}>
          <Pressable
            onPress={() => setOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Записать вес"
            className="active:opacity-70"
          >
            <Text maxFontSizeMultiplier={1.2} className="font-sans text-[15px] text-bear-sub">
              Текущий вес
            </Text>
            <Text
              maxFontSizeMultiplier={1.15}
              className="mt-1.5 font-extrabold text-[27px] leading-none tracking-tight text-bear-text"
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

          <View className="mt-2 flex-row items-center gap-1">
            {periodDelta < 0 && (
              <TrendingDown size={14} color={toneColor === '#34D399' ? '#34d399' : '#fb7185'} />
            )}
            {periodDelta > 0 && (
              <TrendingUp size={14} color={toneColor === '#34D399' ? '#34d399' : '#fb7185'} />
            )}
            <Text
              numberOfLines={1}
              maxFontSizeMultiplier={1.2}
              className="font-semibold text-[15px]"
              style={{ color: toneColor }}
            >
              {periodDelta === 0
                ? 'без изменений'
                : `${periodDelta > 0 ? '+' : '−'}${fmtDecimal(Math.abs(periodDelta))} кг`}
            </Text>
          </View>
          <Text maxFontSizeMultiplier={1.2} className="mt-0.5 font-sans text-[14.5px] text-bear-dim">
            {DELTA_CAPTION[period]}
          </Text>

          <View className="my-2.5 h-px bg-white/[0.06]" />

          <Text maxFontSizeMultiplier={1.2} className="font-sans text-[15px] text-bear-sub">
            Цель
          </Text>
          <Text
            numberOfLines={1}
            maxFontSizeMultiplier={1.2}
            className="mt-0.5 font-bold text-[17.5px] text-bear-text"
          >
            {goalWeightKg != null ? `${fmtDecimal(goalWeightKg)} кг` : 'не задана'}
          </Text>

          <Pressable
            onPress={() => setOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={goalWeightKg != null ? 'Изменить цель по весу' : 'Задать цель по весу'}
            className="mt-2.5 flex-row items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.06] py-2 active:opacity-70"
          >
            <Target size={14} color="#8DABFF" />
            <Text className="font-bold text-[15px] text-[#8DABFF]">
              {goalWeightKg != null ? 'Изменить' : 'Задать цель'}
            </Text>
          </Pressable>
        </View>

        {/* График + строка-поддержка */}
        <View className="min-w-0 flex-1 rounded-2xl p-3" style={CARD}>
          {/* Пилюля изменения за период: точка в цвет тона */}
          <View
            className="self-start rounded-full bg-white/[0.06] px-2.5 py-1.5"
            accessibilityLabel={`Изменение веса ${DELTA_CAPTION[period]}: ${
              periodDelta === 0 ? '0 кг' : `${periodDelta > 0 ? '+' : '−'}${fmtDecimal(Math.abs(periodDelta))} кг`
            }`}
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
                  periodDelta === 0
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
            <WeightChart data={data} goalKg={goalWeightKg} lastBadge height={128} />
            <View className="mt-1 flex-row items-center justify-center gap-1">
              <NotebookText size={14} color="#8DABFF" />
              <Text className="font-sans text-[14.5px] font-semibold text-[#8DABFF]">
                {weights.length > 0 ? `Журнал веса · ${weights.length}` : 'Журнал веса'}
              </Text>
            </View>
          </Pressable>

          {/* Строка-поддержка: «Ваш вес стабилен…» с лайком */}
          <View
            accessibilityLabel={`${strip.title}. ${strip.text}`}
            className="mt-0.5 flex-row items-center gap-2 rounded-xl bg-white/[0.04] p-2.5"
          >
            <View
              className="h-9 w-9 shrink-0 items-center justify-center rounded-full"
              style={{
                backgroundColor:
                  strip.tone === 'bad' ? 'rgba(251,191,36,0.14)' : 'rgba(56,189,248,0.14)',
              }}
            >
              <Activity
                size={16}
                color={strip.tone === 'bad' ? '#FBBF24' : '#38BDF8'}
              />
            </View>
            <View className="min-w-0 flex-1">
              <Text
                numberOfLines={1}
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
            {strip.tone === 'bad' ? (
              <ThumbsDown size={22} color="#FBBF24" />
            ) : (
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
                  {`Записей: ${weights.length} · тап по записи — изменить`}
                </Text>

                <ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator={false} className="mt-3">
                  <View className="gap-1">
                    {weights.map((w) => {
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

// Карточка «Динамика веса» — оформление по макету пользователя:
// шапка-секция (иконка + заголовок + пилюля периода с дропдауном
// «Неделя / Месяц / Всё»), ниже ряд: слева узкая карточка «Текущий
// вес» с целью и кнопкой «Задать цель», справа — карточка с пилюлей
// «Изменение: N кг», зелёным графиком с днями и внутренней строкой-
// поддержкой («Ваш вес стабилен…» с лайком — весStrip из lib/data/bmi).
// Журнал измерений свёрнут в строку «Журнал измерений · N» — тап
// раскрывает список (тап по записи — изменить, корзина — удалить).
// Кольцо «Прогресс» из старой карточки переехало в блок замеров
// («Общий прогресс», MeasurementsCard) — карточка стала легче.

import { useEffect, useState } from 'react'
import { Alert, DeviceEventEmitter, Modal, Pressable, Text, TextInput, View } from 'react-native'
import {
  Activity,
  Calendar,
  ChartLine,
  Check,
  ChevronDown,
  ChevronUp,
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

const HIST_VISIBLE = 4 // строк журнала до «Ещё N»

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
  const [showAll, setShowAll] = useState(false)
  const [period, setPeriod] = useState('week')
  const [menuOpen, setMenuOpen] = useState(false)
  const [journalOpen, setJournalOpen] = useState(false)
  const [editing, setEditing] = useState(null) // измерение на изменении
  const [kgText, setKgText] = useState('')

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

  // Строка-поддержка: с целью — по движению к цели, без цели — по норме
  const strip = weightStrip({
    delta: periodDelta,
    towardGoal: goalWeightKg != null ? towardGoal : periodDelta === 0 ? null : towardNorm,
    goalReached,
  })
  const toneColor = strip.tone === 'bad' ? '#FB7185' : '#34D399'

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

  return (
    <View accessibilityLabel="Динамика веса" className="gap-2.5">
      {/* Шапка-секция: иконка + заголовок + пилюля периода (дропдаун) */}
      <View className="flex-row items-center gap-2.5">
        <View className="h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.06]">
          <ChartLine size={18} color="#7DD3FC" />
        </View>
        <Text className="min-w-0 flex-1 font-bold text-[17px] tracking-tight text-bear-text">
          Динамика веса
        </Text>

        {/* Записать вес: круглый «+» (модалка веса) */}
        <Pressable
          onPress={() => setOpen(true)}
          accessibilityLabel="Записать вес"
          className="h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] active:opacity-70"
        >
          <Plus size={15} color="#A78BFA" />
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
            <Calendar size={11} color="#A78BFA" />
            <Text className="font-semibold text-[11px] text-[#D6DCF2]">
              {PERIODS.find((p) => p.id === period)?.label}
            </Text>
            {menuOpen ? (
              <ChevronUp size={12} color="#A5AECB" />
            ) : (
              <ChevronDown size={12} color="#A5AECB" />
            )}
          </Pressable>

          {menuOpen && (
            <View
              className="absolute right-0 top-9 z-10 w-[124px] overflow-hidden rounded-2xl border border-white/10 bg-bear-pop py-1"
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
                      className={`font-semibold text-[12px] ${active ? 'text-white' : 'text-bear-sub'}`}
                    >
                      {p.label}
                    </Text>
                    {active && <Check size={13} color="#A78BFA" />}
                  </Pressable>
                )
              })}
            </View>
          )}
        </View>
      </View>

      {/* Ряд: узкая карточка веса/цели + карточка с графиком */}
      <View className="flex-row items-stretch gap-2.5">
        {/* Текущий вес + цель + кнопка «Задать цель»; тап по весу — запись */}
        <View className="w-[122px] shrink-0 rounded-2xl border border-white/5 bg-bear-card p-3.5">
          <Pressable
            onPress={() => setOpen(true)}
            accessibilityLabel="Записать вес"
            className="active:opacity-70"
          >
            <Text maxFontSizeMultiplier={1.2} className="font-sans text-[10.5px] text-bear-sub">
              Текущий вес
            </Text>
            <Text className="mt-1.5 font-extrabold text-[25px] leading-none tracking-tight text-bear-text">
              {fmtDecimal(weightKg)}
              <Text className="font-semibold text-[12px] text-bear-sub2"> кг</Text>
            </Text>
          </Pressable>

          <View className="mt-2 flex-row items-center gap-1">
            {periodDelta < 0 && (
              <TrendingDown size={12} color={toneColor === '#34D399' ? '#34d399' : '#fb7185'} />
            )}
            {periodDelta > 0 && (
              <TrendingUp size={12} color={toneColor === '#34D399' ? '#34d399' : '#fb7185'} />
            )}
            <Text
              numberOfLines={1}
              maxFontSizeMultiplier={1.2}
              className="font-semibold text-[10.5px]"
              style={{ color: toneColor }}
            >
              {periodDelta === 0
                ? 'без изменений'
                : `${periodDelta > 0 ? '+' : '−'}${fmtDecimal(Math.abs(periodDelta))} кг`}
            </Text>
          </View>
          <Text maxFontSizeMultiplier={1.2} className="mt-0.5 font-sans text-[9px] text-bear-dim">
            {DELTA_CAPTION[period]}
          </Text>

          <View className="my-2.5 h-px bg-white/[0.06]" />

          <Text maxFontSizeMultiplier={1.2} className="font-sans text-[10.5px] text-bear-sub">
            Цель
          </Text>
          <Text
            numberOfLines={1}
            maxFontSizeMultiplier={1.2}
            className="mt-0.5 font-bold text-[13px] text-bear-text"
          >
            {goalWeightKg != null ? `${fmtDecimal(goalWeightKg)} кг` : 'не задана'}
          </Text>

          <Pressable
            onPress={() => setOpen(true)}
            accessibilityLabel={goalWeightKg != null ? 'Изменить цель по весу' : 'Задать цель по весу'}
            className="mt-2.5 flex-row items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.06] py-2 active:opacity-70"
          >
            <Target size={12} color="#8DABFF" />
            <Text className="font-bold text-[10.5px] text-[#8DABFF]">
              {goalWeightKg != null ? 'Изменить' : 'Задать цель'}
            </Text>
          </Pressable>
        </View>

        {/* График + строка-поддержка */}
        <View className="min-w-0 flex-1 rounded-2xl border border-white/5 bg-bear-card p-3">
          {/* Пилюля изменения за период: точка в цвет тона */}
          <View
            className="self-start rounded-full bg-white/[0.06] px-2.5 py-1"
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
              <Text maxFontSizeMultiplier={1.2} className="font-semibold text-[10.5px] text-bear-sub">
                {`Изменение: ${
                  periodDelta === 0
                    ? '0 кг'
                    : `${periodDelta > 0 ? '+' : '−'}${fmtDecimal(Math.abs(periodDelta))} кг`
                }`}
              </Text>
            </View>
          </View>

          <WeightChart data={data} goalKg={goalWeightKg} lastBadge height={128} />

          {/* Строка-поддержка: «Ваш вес стабилен…» с лайком */}
          <View
            accessibilityLabel={`${strip.title}. ${strip.text}`}
            className="mt-0.5 flex-row items-center gap-2 rounded-xl bg-white/[0.04] p-2.5"
          >
            <View
              className="h-7 w-7 shrink-0 items-center justify-center rounded-full"
              style={{
                backgroundColor:
                  strip.tone === 'bad' ? 'rgba(251,191,36,0.14)' : 'rgba(56,189,248,0.14)',
              }}
            >
              <Activity
                size={14}
                color={strip.tone === 'bad' ? '#FBBF24' : '#38BDF8'}
              />
            </View>
            <View className="min-w-0 flex-1">
              <Text
                numberOfLines={1}
                maxFontSizeMultiplier={1.2}
                className="font-bold text-[11.5px] text-bear-text"
              >
                {strip.title}
              </Text>
              <Text
                numberOfLines={2}
                maxFontSizeMultiplier={1.25}
                className="font-sans text-[9.5px] leading-snug text-bear-sub"
              >
                {strip.text}
              </Text>
            </View>
            {strip.tone === 'bad' ? (
              <ThumbsDown size={20} color="#FBBF24" />
            ) : (
              <ThumbsUp size={20} color="#4ADE80" />
            )}
          </View>
        </View>
      </View>

      {/* Журнал измерений: свёрнут в строку, тап раскрывает список.
          Тап по записи — окно изменения, корзина — удалить */}
      {weights.length > 0 && (
        <View>
          <Pressable
            onPress={() => setJournalOpen((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel={
              journalOpen
                ? 'Скрыть журнал измерений'
                : `Журнал измерений, записей: ${weights.length} — открыть`
            }
            className="flex-row items-center justify-between rounded-xl bg-white/[0.04] px-3.5 py-2.5 active:opacity-70"
          >
            <Text className="font-semibold text-[11.5px] text-bear-sub">
              {`Журнал измерений · ${weights.length}`}
            </Text>
            {journalOpen ? (
              <ChevronUp size={14} color="#A5AECB" />
            ) : (
              <ChevronDown size={14} color="#A5AECB" />
            )}
          </Pressable>

          {journalOpen && (
            <View className="mt-1.5 gap-1">
              {(showAll ? weights : weights.slice(0, HIST_VISIBLE)).map((w) => (
                <Pressable
                  key={w.id}
                  onPress={() => {
                    setEditing(w)
                    setKgText(String(w.kg))
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Изменить вес ${fmtDecimal(w.kg)} кг от ${shortDay(w.date)}`}
                  className="flex-row items-center gap-2 rounded-xl bg-white/[0.04] px-2.5 py-2 active:opacity-70"
                >
                  <Text className="shrink-0 font-sans text-[11px] text-bear-dim">
                    {shortDay(w.date)}
                  </Text>
                  <Text
                    numberOfLines={1}
                    className="min-w-0 flex-1 text-right font-semibold text-[12.5px] text-bear-text"
                  >
                    {fmtDecimal(w.kg)} кг
                  </Text>
                  <Pressable
                    onPress={() => removeMeasurement(w)}
                    accessibilityRole="button"
                    accessibilityLabel={`Удалить вес ${fmtDecimal(w.kg)} кг`}
                    className="shrink-0 rounded p-1 active:opacity-60"
                  >
                    <Trash2 size={13} color="#98A2C2" />
                  </Pressable>
                </Pressable>
              ))}
              {weights.length > HIST_VISIBLE && (
                <Pressable
                  onPress={() => setShowAll((v) => !v)}
                  accessibilityRole="button"
                  accessibilityLabel={showAll ? 'Скрыть старые измерения' : 'Показать все измерения'}
                  className="px-1 py-1 active:opacity-70"
                >
                  <Text className="font-sans text-[11px] font-semibold text-[#8DABFF]">
                    {showAll ? 'Свернуть' : `Ещё ${weights.length - HIST_VISIBLE}`}
                  </Text>
                </Pressable>
              )}
            </View>
          )}
        </View>
      )}

      <WeightModal
        open={open}
        onClose={() => setOpen(false)}
        height={heightCm}
        weight={weightKg}
        goalWeight={goalWeightKg}
        onSave={handleSave}
      />

      {/* Окно изменения измерения */}
      <Modal visible={Boolean(editing)} transparent animationType="fade" onRequestClose={() => setEditing(null)}>
        <View className="flex-1 items-center justify-center bg-black/60 px-6">
          <View className="w-full rounded-3xl border border-white/10 bg-bear-pop p-5">
            <View className="flex-row items-center justify-between">
              <Text className="font-bold text-[15px] text-bear-text">Изменить вес</Text>
              <Pressable onPress={() => setEditing(null)} accessibilityLabel="Закрыть" className="p-1">
                <X size={20} color="#A5AECB" />
              </Pressable>
            </View>
            <Text className="mt-1 font-sans text-[11px] text-bear-sub">
              Измерение от {editing ? shortDay(editing.date) : ''}
            </Text>

            <Text className="mt-4 font-medium text-xs text-bear-sub">Вес, кг</Text>
            <TextInput
              value={kgText}
              onChangeText={setKgText}
              keyboardType="decimal-pad"
              maxLength={6}
              textAlign="center"
              accessibilityLabel="Новый вес измерения в килограммах"
              className="mt-1.5 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 font-semibold text-[14px] text-white"
            />

            {/* Кнопки: крестик закрытия — в шапке, здесь только «Сохранить» */}
            <View className="mt-5 flex-row">
              <Pressable
                onPress={saveEdit}
                accessibilityRole="button"
                accessibilityLabel="Сохранить новый вес"
                className="flex-1 items-center rounded-2xl bg-[#7B6CF6] py-3 active:opacity-80"
              >
                <Text className="font-bold text-[13px] text-white">Сохранить</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

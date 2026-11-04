// Карточка «Динамика веса» — оформление по макету пользователя:
// заголовок с кнопкой «+» (модалка записи веса), пилюли периода
// (неделя/месяц/всё), ряд «вес сейчас + цель» с бейджем
// «Достигнуто!», график на всю ширину с плашкой значения над
// последней точкой и золотым пунктиром цели; ниже — два столбца:
// «Журнал измерений» (тап по записи — изменить, корзина — удалить)
// и «Прогресс» (кольцо % пути к цели, общий Δ кг с первого измерения
// и короткая поддержка). Кольцо считается от первого измерения:
// пройдено (старт − сейчас) / (старт − цель).

import { useEffect, useState } from 'react'
import { Alert, DeviceEventEmitter, Modal, Pressable, Text, TextInput, View } from 'react-native'
import Svg, { Circle, Text as SvgText } from 'react-native-svg'
import { TrendingDown, TrendingUp, Plus, Trash2, X } from 'lucide-react-native'
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
} from '@/lib/data/bmi'
import { WeightChart } from './WeightChart'
import { WeightModal } from './WeightModal'
import { useToast } from '../ui/Toast'
import { fontFamilies } from '../home/ring-font'

const HIST_VISIBLE = 4 // строк журнала в столбце до «Ещё N»

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
  const weekDelta = Math.round((last.kg - data[0].kg) * 10) / 10

  // Зелёный — вес движется к норме, красный — в сторону
  const { min, max } = healthyRange(heightCm)
  const towardNorm =
    (weekDelta < 0 && last?.kg >= min) || (weekDelta > 0 && last?.kg <= max)

  // Прогресс к цели: «до цели −3,5 кг» или «Цель достигнута!»
  const goalDiff =
    goalWeightKg != null ? Math.round((weightKg - goalWeightKg) * 10) / 10 : 0
  const goalReached = goalWeightKg != null && Math.abs(goalDiff) < 0.05

  // Общий ход с первого измерения и % пути к цели (для карточки «Прогресс»):
  // пройдено (старт − сейчас) / (старт − цель) — работает и на похудение,
  // и на набор; без цели кольца нет — только Δ кг
  const oldest = weights.length > 0 ? weights[weights.length - 1] : null
  const deltaAll = oldest ? Math.round((weightKg - oldest.kg) * 10) / 10 : null
  const towardGoal =
    goalReached || (goalWeightKg != null && deltaAll != null
      ? goalDiff > 0.05 ? deltaAll < 0 : goalDiff < -0.05 ? deltaAll > 0 : true
      : null)
  const progressPct = goalReached
    ? 100
    : goalWeightKg != null && oldest && Math.abs(oldest.kg - goalWeightKg) > 0.05
      ? Math.max(
          0,
          Math.min(
            100,
            Math.round(((oldest.kg - weightKg) / (oldest.kg - goalWeightKg)) * 100)
          )
        )
      : null
  const motivation = goalReached
    ? 'Цель достигнута — удерживай результат!'
    : towardGoal
      ? 'Ты на верном пути — продолжай!'
      : 'Главное — регулярность, всё получится!'

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
    <View accessibilityLabel="Динамика веса" className="rounded-3xl border border-white/5 bg-bear-card p-5">
      <View className="flex-row items-center justify-between gap-2">
        <Text className="font-bold text-[15px] tracking-tight text-bear-text">
          Динамика веса
        </Text>
        <Pressable
          onPress={() => setOpen(true)}
          accessibilityLabel="Записать вес"
          className="h-7 w-7 items-center justify-center rounded-full bg-white/10 active:opacity-70"
        >
          <Plus size={16} color="rgba(255,255,255,0.8)" />
        </Pressable>
      </View>

      {/* Период графика: неделя / месяц / весь журнал */}
      <View className="mt-2 flex-row gap-1.5">
        {PERIODS.map((p) => {
          const active = period === p.id
          return (
            <Pressable
              key={p.id}
              onPress={() => setPeriod(p.id)}
              accessibilityRole="button"
              accessibilityLabel={`Период графика: ${p.label}`}
              className={`rounded-full px-3 py-1 active:opacity-70 ${active ? 'bg-white/15' : 'bg-white/5'}`}
            >
              <Text
                className={`font-semibold text-[11px] ${active ? 'text-white' : 'text-bear-sub'}`}
              >
                {p.label}
              </Text>
            </Pressable>
          )
        })}
      </View>

      {/* Вес сейчас и цель — ряд как на макете: большой вес и тренд
          слева, цель с бейджем справа (тап — окно записи веса) */}
      <View className="mt-3 flex-row items-end justify-between gap-3">
        <View className="min-w-0">
          <Text className="font-extrabold text-[24px] leading-tight tracking-tight text-bear-text">
            {fmtDecimal(weightKg)}
            <Text className="font-semibold text-[13px] text-bear-sub2"> кг</Text>
          </Text>
          <View className="mt-1 flex-row items-center gap-1">
            {weekDelta < 0 && <TrendingDown size={14} color={towardNorm ? '#34d399' : '#fb7185'} />}
            {weekDelta > 0 && <TrendingUp size={14} color={towardNorm ? '#34d399' : '#fb7185'} />}
            <Text
              className={`font-semibold text-[12px] ${
                weekDelta === 0 ? 'text-bear-sub2' : towardNorm ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {weekDelta === 0
                ? 'без изм.'
                : `${weekDelta > 0 ? '+' : '−'}${fmtDecimal(Math.abs(weekDelta))} кг`}
            </Text>
            <Text numberOfLines={1} className="font-sans text-[10px] text-bear-dim">
              {`· ${DELTA_CAPTION[period]}`}
            </Text>
          </View>
        </View>

        {goalWeightKg != null ? (
          <Pressable
            onPress={() => setOpen(true)}
            accessibilityLabel={
              goalReached
                ? 'Цель по весу достигнута — нажмите, чтобы изменить'
                : 'Цель по весу — нажмите, чтобы изменить'
            }
            className="shrink-0 items-end active:opacity-70"
          >
            <Text className="font-sans text-[11px] text-bear-sub">
              Цель {fmtDecimal(goalWeightKg)} кг
            </Text>
            {goalReached ? (
              <View
                className="mt-1 rounded-full px-2 py-[3px]"
                style={{ backgroundColor: 'rgba(52,211,153,0.14)' }}
              >
                <Text numberOfLines={1} className="font-bold text-[10.5px] text-emerald-300">
                  {goalReachedAt
                    ? `Достигнуто · ${shortDateNum(new Date(goalReachedAt))}`
                    : 'Достигнуто!'}
                </Text>
              </View>
            ) : (
              <View
                className="mt-1 rounded-full px-2 py-[3px]"
                style={{ backgroundColor: 'rgba(141,171,255,0.13)' }}
              >
                <Text numberOfLines={1} className="font-bold text-[10.5px] text-[#8DABFF]">
                  {`до цели ${goalDiff > 0 ? '−' : '+'}${fmtDecimal(Math.abs(goalDiff))} кг`}
                </Text>
              </View>
            )}
          </Pressable>
        ) : (
          <Pressable
            onPress={() => setOpen(true)}
            accessibilityLabel="Задать цель по весу"
            className="shrink-0 items-end active:opacity-70"
          >
            <Text className="font-sans text-[11px] text-bear-sub">Цель не задана</Text>
            <View
              className="mt-1 rounded-full px-2 py-[3px]"
              style={{ backgroundColor: 'rgba(141,171,255,0.13)' }}
            >
              <Text className="font-bold text-[10.5px] text-[#8DABFF]">Задать цель</Text>
            </View>
          </Pressable>
        )}
      </View>

      {/* График на всю ширину: над последней точкой — плашка значения,
          цель — золотой пунктир (как на макете) */}
      <View className="mt-1">
        <WeightChart data={data} goalKg={goalWeightKg} lastBadge />
      </View>

      {/* Журнал измерений + «Прогресс» — два столбца, как на макете.
          Тап по записи — окно изменения, корзина — удалить */}
      {weights.length > 0 && (
        <View className="mt-1 flex-row items-stretch gap-3">
          <View className="min-w-0 flex-1">
            <Text className="px-1 font-sans text-[10px] font-semibold uppercase tracking-wide text-bear-sub">
              {`Журнал измерений · ${weights.length}`}
            </Text>
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
                  <Text numberOfLines={1} className="min-w-0 flex-1 text-right font-semibold text-[12.5px] text-bear-text">
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
          </View>

          {/* Прогресс: кольцо % пути к цели (от первого измерения),
              общий Δ кг и короткая поддержка */}
          <View
            accessibilityLabel={
              progressPct != null
                ? `Прогресс к цели: ${progressPct}%, ${motivation}`
                : motivation
            }
            className="w-[116px] shrink-0 rounded-2xl border border-bear-bodyLine bg-white/[0.04] p-3"
          >
            <Text className="text-center font-sans text-[10px] font-semibold uppercase tracking-wide text-bear-sub">
              Прогресс
            </Text>
            {progressPct != null && (
              <View className="mt-1 items-center">
                <MiniRing pct={progressPct} />
              </View>
            )}
            <Text
              numberOfLines={1}
              className="mt-1 text-center font-bold text-[13px]"
              style={{
                color:
                  deltaAll == null || deltaAll === 0 || towardGoal == null
                    ? '#8B96B8'
                    : towardGoal
                      ? '#4ade80'
                      : '#fb7185',
              }}
            >
              {`${deltaAll > 0 ? '+' : deltaAll < 0 ? '−' : ''}${fmtDecimal(Math.abs(deltaAll))} кг`}
            </Text>
            <Text maxFontSizeMultiplier={1.25} className="mt-0.5 text-center font-sans text-[9.5px] leading-snug text-bear-dim">
              {motivation}
            </Text>
          </View>
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

// Маленькое кольцо прогресса для карточки «Прогресс»: одна фиолетовая
// дуга — % пути от первого измерения к цели, в центре — процент.
function MiniRing({ pct }) {
  const R = 26
  const CIRC = 2 * Math.PI * R
  const len = (Math.min(100, Math.max(0, pct)) / 100) * CIRC
  return (
    <Svg width={64} height={64} viewBox="0 0 64 64">
      <Circle cx="32" cy="32" r={R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="7" />
      {len > 0 && (
        <Circle
          cx="32"
          cy="32"
          r={R}
          fill="none"
          stroke="#A78BFA"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={`${len} ${CIRC}`}
          transform="rotate(-90 32 32)"
        />
      )}
      <SvgText
        x="32"
        y="37"
        fill="#EEF2FB"
        fontSize="13"
        fontWeight="800"
        fontFamily={fontFamilies.extrabold}
        textAnchor="middle"
      >
        {`${pct}%`}
      </SvgText>
    </Svg>
  )
}

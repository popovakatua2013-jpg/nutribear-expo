// Карточка «Динамика веса»: график за неделю, текущий вес и изменение,
// кнопка «+» открывает модалку записи веса. Ниже — журнал измерений:
// тап по записи (карандашик) — изменить, корзина — удалить.

import { useState } from 'react'
import { Modal, Pressable, Text, TextInput, View } from 'react-native'
import { TrendingDown, TrendingUp, Plus, Pencil, Trash2, X } from 'lucide-react-native'
import { useProfileStore } from '@/store/useProfileStore'
import { weekWeights, monthWeights, allWeights, healthyRange, fmtDecimal } from '@/lib/data/bmi'
import { WeightChart } from './WeightChart'
import { WeightModal } from './WeightModal'
import { useToast } from '../ui/Toast'

const HIST_VISIBLE = 8

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
  const weights = useProfileStore((s) => s.weights)
  const addWeight = useProfileStore((s) => s.addWeight)
  const updateWeight = useProfileStore((s) => s.updateWeight)
  const removeWeight = useProfileStore((s) => s.removeWeight)
  const setProfile = useProfileStore((s) => s.setProfile)
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [histOpen, setHistOpen] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const [period, setPeriod] = useState('week')
  const [editing, setEditing] = useState(null) // измерение на изменении
  const [kgText, setKgText] = useState('')

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

  function handleSave({ heightCm: h, weightKg: w, weightChanged, goalKg }) {
    if (h !== heightCm) setProfile({ heightCm: h })
    if (weightChanged) addWeight(w)
    if (goalKg !== undefined) setProfile({ goalWeightKg: goalKg })
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

      <View className="mt-2 flex-row items-stretch gap-3">
        <View className="min-w-0 flex-1">
          <WeightChart data={data} />
        </View>

        <View className="w-[86px] shrink-0 justify-center">
          <Text className="text-right font-extrabold text-[22px] leading-tight tracking-tight text-bear-text">
            {fmtDecimal(weightKg)}
            <Text className="font-semibold text-[13px] text-bear-sub2"> кг</Text>
          </Text>
          <View className="mt-1 flex-row items-center justify-end gap-1">
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
          </View>
          <Text className="mt-0.5 text-right font-sans text-[10px] text-bear-dim">
            {DELTA_CAPTION[period]}
          </Text>
        </View>
      </View>

      {/* Прогресс к цели по весу (тап — изменить или убрать в модалке) */}
      {goalWeightKg != null && (
        <Pressable
          onPress={() => setOpen(true)}
          accessibilityLabel={
            goalReached
              ? 'Цель по весу достигнута — нажмите, чтобы изменить'
              : 'Цель по весу — нажмите, чтобы изменить'
          }
          className="mt-2 flex-row items-center justify-between rounded-xl bg-white/[0.04] px-3 py-2 active:opacity-70"
        >
          <Text className="font-medium text-[12px] text-bear-soft">
            🎯 Цель {fmtDecimal(goalWeightKg)} кг
          </Text>
          {goalReached ? (
            <Text className="font-bold text-[12px] text-emerald-400">🎉 Цель достигнута!</Text>
          ) : (
            <Text className="font-bold text-[12px] text-[#8DABFF]">
              до цели {goalDiff > 0 ? '−' : '+'}
              {fmtDecimal(Math.abs(goalDiff))} кг
            </Text>
          )}
        </Pressable>
      )}

      {/* Журнал измерений: изменить / удалить */}
      {weights.length > 0 && (
        <View className="mt-3 border-t border-white/5 pt-2">
          <Pressable
            onPress={() => setHistOpen((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel="Показать журнал измерений веса"
            className="flex-row items-center justify-between px-1 py-1.5 active:opacity-70"
          >
            <Text className="font-sans text-[11px] font-semibold uppercase tracking-wide text-bear-sub">
              Журнал измерений · {weights.length}
            </Text>
            <Text className="font-sans text-[11px] text-[#8DABFF]">
              {histOpen ? 'скрыть' : 'открыть'}
            </Text>
          </Pressable>

          {histOpen && (
            <View className="mt-1 gap-1">
              {(showAll ? weights : weights.slice(0, HIST_VISIBLE)).map((w) => (
                <View
                  key={w.id}
                  className="flex-row items-center gap-2.5 rounded-xl bg-white/[0.04] px-3 py-2"
                >
                  <Text className="shrink-0 font-sans text-[11px] text-bear-dim">
                    {shortDay(w.date)}
                  </Text>
                  <Text className="min-w-0 flex-1 font-semibold text-[13px] text-bear-text">
                    {fmtDecimal(w.kg)} кг
                  </Text>
                  <Pressable
                    onPress={() => {
                      setEditing(w)
                      setKgText(String(w.kg))
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Изменить вес ${fmtDecimal(w.kg)} кг`}
                    className="shrink-0 rounded p-1 active:opacity-60"
                  >
                    <Pencil size={13} color="#8B96B8" />
                  </Pressable>
                  <Pressable
                    onPress={() => removeMeasurement(w)}
                    accessibilityRole="button"
                    accessibilityLabel={`Удалить вес ${fmtDecimal(w.kg)} кг`}
                    className="shrink-0 rounded p-1 active:opacity-60"
                  >
                    <Trash2 size={14} color="#98A2C2" />
                  </Pressable>
                </View>
              ))}
              {weights.length > HIST_VISIBLE && (
                <Pressable
                  onPress={() => setShowAll((v) => !v)}
                  accessibilityRole="button"
                  accessibilityLabel={showAll ? 'Скрыть старые измерения' : 'Показать все измерения'}
                  className="px-1 py-1.5 active:opacity-70"
                >
                  <Text className="font-sans text-[11px] font-semibold text-[#8DABFF]">
                    {showAll ? 'Скрыть' : `Показать все (${weights.length})`}
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

            <View className="mt-5 flex-row gap-2">
              <Pressable
                onPress={() => setEditing(null)}
                accessibilityRole="button"
                accessibilityLabel="Отменить изменение веса"
                className="flex-1 items-center rounded-2xl border border-white/10 bg-white/5 py-3 active:opacity-70"
              >
                <Text className="font-bold text-[13px] text-bear-soft">Отмена</Text>
              </Pressable>
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

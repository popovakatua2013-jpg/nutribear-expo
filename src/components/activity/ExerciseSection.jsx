// Секция «Тренировки»: список за сегодня, сумма сожжённых калорий
// и окно добавления/изменения тренировки (каталог упражнений + минуты).
// Тап по записи — изменение, корзина — удаление.

import { useState } from 'react'
import { Modal, Pressable, ScrollView, Text, View } from 'react-native'
import { Dumbbell, Pencil, Plus, Trash2, X } from 'lucide-react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useExerciseStore, todayKey, dayBurned } from '@/store/useExerciseStore'
import { useProfileStore } from '@/store/useProfileStore'
import { EXERCISES, QUICK_MINUTES, kcalBurned } from '@/lib/data/exercises'
import { useToast } from '../ui/Toast'
import { formatNum } from '@/lib/format'

export function ExerciseSection() {
  const logs = useExerciseStore((s) => s.logs)
  const addLog = useExerciseStore((s) => s.addLog)
  const updateLog = useExerciseStore((s) => s.updateLog)
  const removeLog = useExerciseStore((s) => s.removeLog)
  const weightKg = useProfileStore((s) => s.weightKg)
  const { toast } = useToast()

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null) // запись на изменение
  const [exId, setExId] = useState(null)
  const [minutes, setMinutes] = useState(null)

  const key = todayKey()
  const items = logs[key] || []
  const burned = dayBurned(logs, key)

  // Открыть окно: без записи — «добавить», с записью — «изменить»
  function openModal(entry) {
    if (entry) {
      setEditing(entry)
      setExId(entry.exId)
      setMinutes(entry.minutes)
    } else {
      setEditing(null)
      setExId(null)
      setMinutes(null)
    }
    setOpen(true)
  }

  function closeModal() {
    setOpen(false)
    setEditing(null)
  }

  const ex = EXERCISES.find((e) => e.id === exId)
  const kcal = ex && minutes ? kcalBurned(ex.met, weightKg, minutes) : 0

  function save() {
    const payload = { exId: ex.id, name: ex.name, emoji: ex.emoji, minutes, kcal }
    if (editing) {
      updateLog(key, editing.id, payload)
      toast({
        title: `${ex.emoji} ${ex.name} — изменено`,
        description: `${minutes} мин · ≈ ${kcal} ккал`,
      })
    } else {
      addLog(key, payload)
      toast({
        title: `${ex.emoji} ${ex.name} — ${minutes} мин`,
        description: `Сожжено ≈ ${kcal} ккал · тренировка записана`,
      })
    }
    closeModal()
  }

  function remove(entry) {
    removeLog(key, entry.id)
    if (editing && editing.id === entry.id) closeModal()
    toast({ title: '🗑 Удалено', description: `${entry.name} убрана из дневника` })
  }

  return (
    <View accessibilityLabel="Тренировки" className="rounded-3xl border border-white/5 bg-bear-card p-5">
      <View className="flex-row items-center justify-between gap-3">
        <View className="flex-row items-center gap-2">
          <Dumbbell size={18} color="#f472b6" />
          <Text className="font-bold text-[15px] tracking-tight text-bear-text">
            Тренировки
          </Text>
        </View>
        <Pressable
          onPress={() => openModal(null)}
          className="flex-row items-center gap-1 rounded-full bg-white/5 px-3 py-1.5 active:opacity-70"
        >
          <Plus size={14} color="#AEB9D9" />
          <Text className="font-bold text-[12px] text-bear-soft">Добавить</Text>
        </Pressable>
      </View>

      {items.length === 0 ? (
        <Text className="mt-3 font-sans text-[12px] leading-relaxed text-bear-sub2">
          Добавьте прогулку или тренировку — отмечайте активность дня.
        </Text>
      ) : (
        <View className="mt-3 gap-2">
          {items.map((e) => (
            <Pressable
              key={e.id}
              onPress={() => openModal(e)}
              accessibilityRole="button"
              accessibilityLabel={`Изменить ${e.name}`}
              className="flex-row items-center gap-3 rounded-2xl bg-white/[0.03] px-3.5 py-2.5 active:opacity-70"
            >
              <Text className="text-[18px]">{e.emoji}</Text>
              <View className="min-w-0 flex-1">
                <Text className="font-bold text-[13px] text-bear-text">{e.name}</Text>
                <Text className="font-sans text-[11px] text-bear-sub2">
                  {e.minutes} мин · {formatNum(e.kcal)} ккал
                </Text>
              </View>
              <View className="shrink-0 flex-row items-center gap-1">
                <View className="h-8 w-8 items-center justify-center rounded-full bg-white/5">
                  <Pencil size={13} color="#A5AECB" />
                </View>
                <Pressable
                  onPress={() => remove(e)}
                  accessibilityLabel={`Удалить ${e.name}`}
                  className="h-8 w-8 items-center justify-center rounded-full bg-white/5"
                >
                  <Trash2 size={14} color="#98A2C2" />
                </Pressable>
              </View>
            </Pressable>
          ))}
        </View>
      )}

      {burned > 0 && (
        <Text className="mt-3 rounded-2xl bg-[#f87171]/[0.07] px-3.5 py-2.5 font-semibold text-[12px] text-[#f87171]">
          🔥 Сожжено за сегодня: {formatNum(burned)} ккал
        </Text>
      )}

      {/* Окно добавления/изменения тренировки */}
      <Modal visible={open} transparent animationType="fade" onRequestClose={closeModal}>
        <View className="flex-1 justify-end bg-black/60 px-3 pb-3">
          <View className="max-h-[85%] overflow-hidden rounded-3xl border border-white/10 bg-bear-pop">
            {/* Шапка */}
            <View className="flex-row items-center justify-between border-b border-bear-line px-5 pb-3 pt-4">
              <View className="flex-1">
                <Text className="font-bold text-[15px] text-bear-text">
                  {editing ? 'Изменить тренировку' : 'Новая тренировка'}
                </Text>
                <Text className="mt-0.5 font-sans text-[11px] text-bear-sub">
                  Расчёт по формуле MET для веса {weightKg} кг
                </Text>
              </View>
              <Pressable onPress={closeModal} accessibilityLabel="Закрыть" className="p-1">
                <X size={20} color="#A5AECB" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 24 }}>
              {/* Каталог упражнений: сетка 2 колонки */}
              <View className="gap-2">
                {EXERCISES.reduce((rows, e, i) => {
                  if (i % 2 === 0) rows.push([])
                  rows[rows.length - 1].push(e)
                  return rows
                }, []).map((row) => (
                  <View key={row[0].id} className="flex-row gap-2">
                    {row.map((e) => (
                      <ExButton key={e.id} e={e} exId={exId} setExId={setExId} />
                    ))}
                    {row.length === 1 && <View className="flex-1" />}
                  </View>
                ))}
              </View>

              {ex && (
                <View className="mt-3 gap-2.5 rounded-2xl border border-white/5 bg-white/[0.03] p-3.5">
                  <View className="flex-row flex-wrap gap-2">
                    {QUICK_MINUTES.map((m) => {
                      const active = minutes === m
                      const pill = (
                        <Text className={`px-3 py-1.5 font-semibold text-[12px] ${active ? 'text-white' : 'text-bear-soft'}`}>
                          {m} мин
                        </Text>
                      )
                      return (
                        <Pressable key={m} onPress={() => setMinutes(m)} className="overflow-hidden rounded-full">
                          {active ? (
                            <LinearGradient start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} colors={['#4D7CFE', '#8B5CF6', '#A45BFF']}>
                              {pill}
                            </LinearGradient>
                          ) : (
                            <View className="bg-white/5">{pill}</View>
                          )}
                        </Pressable>
                      )
                    })}
                  </View>
                  <Text className="font-sans text-[12px] text-bear-sub2">
                    Сожжено: <Text className="font-bold text-[#f87171]">{kcal} ккал</Text>
                  </Text>
                </View>
              )}

              <Pressable
                onPress={save}
                disabled={!ex || !minutes}
                className={`mt-4 overflow-hidden rounded-2xl ${!ex || !minutes ? 'opacity-40' : ''}`}
              >
                <LinearGradient start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} colors={['#4D7CFE', '#8B5CF6', '#A45BFF']}>
                  <Text className="w-full py-3.5 text-center font-bold text-[14px] text-white">
                    {editing ? 'Сохранить' : 'Добавить тренировку'}
                  </Text>
                </LinearGradient>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  )
}

function ExButton({ e, exId, setExId }) {
  const active = exId === e.id
  return (
    <Pressable
      onPress={() => setExId(e.id)}
      className={`min-w-0 flex-1 flex-row items-center gap-2 rounded-2xl border p-3 ${
        active ? 'border-[#6c8cff]/60 bg-[#6c8cff]/10' : 'border-white/5 bg-white/[0.03]'
      }`}
    >
      <Text className="text-[20px]">{e.emoji}</Text>
      <View className="min-w-0 flex-1">
        <Text numberOfLines={1} className="font-bold text-[12px] text-bear-text">
          {e.name}
        </Text>
        <Text className="font-sans text-[10px] text-bear-sub2">MET {e.met}</Text>
      </View>
    </Pressable>
  )
}

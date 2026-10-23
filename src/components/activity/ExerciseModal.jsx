// Модалка добавления тренировки: каталог упражнений + выбор минут,
// превью сожжённых калорий по текущему весу профиля.

import { useState } from 'react'
import { Modal, Pressable, ScrollView, Text, View } from 'react-native'
import { X } from 'lucide-react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useExerciseStore, todayKey } from '@/store/useExerciseStore'
import { useProfileStore } from '@/store/useProfileStore'
import { EXERCISES, QUICK_MINUTES, kcalBurned } from '@/lib/data/exercises'
import { useToast } from '../ui/Toast'

export function ExerciseModal({ open, onClose }) {
  const addLog = useExerciseStore((s) => s.addLog)
  const weightKg = useProfileStore((s) => s.weightKg)
  const { toast } = useToast()
  const [exId, setExId] = useState(null)
  const [minutes, setMinutes] = useState(null)

  const ex = EXERCISES.find((e) => e.id === exId)
  const kcal = ex && minutes ? kcalBurned(ex.met, weightKg, minutes) : 0

  function save() {
    addLog(todayKey(), { exId: ex.id, name: ex.name, emoji: ex.emoji, minutes, kcal })
    onClose()
    toast({
      title: `${ex.emoji} ${ex.name} — ${minutes} мин`,
      description: `Сожжено ≈ ${kcal} ккал · тренировка записана`,
    })
  }

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/60 px-3 pb-3">
        <View className="max-h-[85%] overflow-hidden rounded-3xl border border-white/10 bg-bear-pop">
          {/* Шапка */}
          <View className="flex-row items-center justify-between border-b border-bear-line px-5 pb-3 pt-4">
            <View className="flex-1">
              <Text className="font-bold text-[15px] text-bear-text">Новая тренировка</Text>
              <Text className="mt-0.5 font-sans text-[11px] text-bear-sub">
                Расчёт по формуле MET для веса {weightKg} кг
              </Text>
            </View>
            <Pressable onPress={onClose} accessibilityLabel="Закрыть" className="p-1">
              <X size={20} color="#8A94B3" />
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
                  Добавить тренировку
                </Text>
              </LinearGradient>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
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

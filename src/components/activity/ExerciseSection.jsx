// Секция «Тренировки»: список за сегодня и сумма сожжённых калорий.
// Показываются в разделе «Активность», на дневной баланс питания не влияют.

import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { Dumbbell, Plus, Trash2 } from 'lucide-react-native'
import { ExerciseModal } from './ExerciseModal'
import { useExerciseStore, todayKey, dayBurned } from '@/store/useExerciseStore'
import { formatNum } from '@/lib/format'

export function ExerciseSection() {
  const logs = useExerciseStore((s) => s.logs)
  const removeLog = useExerciseStore((s) => s.removeLog)
  const [open, setOpen] = useState(false)

  const key = todayKey()
  const items = logs[key] || []
  const burned = dayBurned(logs, key)

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
          onPress={() => setOpen(true)}
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
            <View
              key={e.id}
              className="flex-row items-center gap-3 rounded-2xl bg-white/[0.03] px-3.5 py-2.5"
            >
              <Text className="text-[18px]">{e.emoji}</Text>
              <View className="min-w-0 flex-1">
                <Text className="font-bold text-[13px] text-bear-text">{e.name}</Text>
                <Text className="font-sans text-[11px] text-bear-sub2">
                  {e.minutes} мин · {formatNum(e.kcal)} ккал
                </Text>
              </View>
              <Pressable
                onPress={() => removeLog(key, e.id)}
                accessibilityLabel={`Удалить ${e.name}`}
                className="h-8 w-8 items-center justify-center rounded-full bg-white/5"
              >
                <Trash2 size={14} color="#7C87A8" />
              </Pressable>
            </View>
          ))}
        </View>
      )}

      {burned > 0 && (
        <Text className="mt-3 rounded-2xl bg-[#f87171]/[0.07] px-3.5 py-2.5 font-semibold text-[12px] text-[#f87171]">
          🔥 Сожжено за сегодня: {formatNum(burned)} ккал
        </Text>
      )}

      <ExerciseModal open={open} onClose={() => setOpen(false)} />
    </View>
  )
}

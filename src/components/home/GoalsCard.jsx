// Карточка «Ваши цели»: прогресс по калориям, воде, шагам и активности

import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { Droplets, Dumbbell, Flame, Footprints, Pencil, Target } from 'lucide-react-native'
import { formatNum } from '@/lib/format'
import { GoalRow } from './GoalRow'
import { GoalsEditModal } from './GoalsEditModal'

export function GoalsCard({ d }) {
  const [editOpen, setEditOpen] = useState(false)

  return (
    <View
      accessibilityLabel="Ваши цели"
      className="rounded-3xl border border-bear-line bg-bear-card p-5"
    >
      <View className="mb-4 flex-row items-center justify-between gap-2">
        <View className="flex-row items-center gap-2">
          <Target size={18} color="#FB7185" />
          <Text className="font-bold text-[15px] tracking-tight text-bear-text">
            Ваши цели
          </Text>
        </View>
        <Pressable
          onPress={() => setEditOpen(true)}
          accessibilityLabel="Редактировать цели"
          accessibilityRole="button"
          className="h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/5 active:bg-white/10"
        >
          <Pencil size={14} color="#6C8CFF" />
        </Pressable>
      </View>

      <View className="gap-3.5">
        <GoalRow
          icon={<Flame size={16} color="#FFFFFF" />}
          color="#FB7185"
          label="Калории"
          goalText={`${formatNum(d.kcalTarget)} ккал`}
          pctValue={d.kcalPct}
        />
        <GoalRow
          icon={<Droplets size={16} color="#FFFFFF" />}
          color="#38BDF8"
          label="Вода"
          goalText={`${d.glassesGoal} ст.`}
          pctValue={d.waterPct}
        />
        <GoalRow
          icon={<Footprints size={16} color="#FFFFFF" />}
          color="#4ADE80"
          label="Шаги"
          goalText={`${formatNum(d.stepsGoal)} шагов`}
          pctValue={d.stepsPct}
        />
        <GoalRow
          icon={<Dumbbell size={16} color="#FFFFFF" />}
          color="#A78BFA"
          label="Активность"
          goalText={`${d.minutesGoal} мин`}
          pctValue={d.minutesPct}
        />
      </View>

      <GoalsEditModal open={editOpen} onClose={() => setEditOpen(false)} />
    </View>
  )
}

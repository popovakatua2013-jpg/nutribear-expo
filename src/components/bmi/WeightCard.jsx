// Карточка «Динамика веса»: график за неделю, текущий вес и изменение,
// кнопка «+» открывает модалку записи веса

import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { TrendingDown, TrendingUp, Plus } from 'lucide-react-native'
import { useProfileStore } from '@/store/useProfileStore'
import { weekWeights, healthyRange, fmtDecimal } from '@/lib/data/bmi'
import { WeightChart } from './WeightChart'
import { WeightModal } from './WeightModal'

export function WeightCard() {
  const heightCm = useProfileStore((s) => s.heightCm)
  const weightKg = useProfileStore((s) => s.weightKg)
  const weights = useProfileStore((s) => s.weights)
  const addWeight = useProfileStore((s) => s.addWeight)
  const setProfile = useProfileStore((s) => s.setProfile)
  const [open, setOpen] = useState(false)

  const data = weekWeights(weightKg, weights)
  const weekDelta =
    data.length === 7 ? Math.round((data[6].kg - data[0].kg) * 10) / 10 : 0

  // Зелёный — вес движется к норме, красный — в сторону
  const { min, max } = healthyRange(heightCm)
  const towardNorm =
    (weekDelta < 0 && data[6]?.kg >= min) || (weekDelta > 0 && data[6]?.kg <= max)

  function handleSave({ heightCm: h, weightKg: w, weightChanged }) {
    if (h !== heightCm) setProfile({ heightCm: h })
    if (weightChanged) addWeight(w)
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
            за неделю
          </Text>
        </View>
      </View>

      <WeightModal
        open={open}
        onClose={() => setOpen(false)}
        height={heightCm}
        weight={weightKg}
        onSave={handleSave}
      />
    </View>
  )
}

// Выбор цели питания: Похудение / Поддержка / Набор веса.
// Управляет дневной нормой калорий (общие данные с разделом «Питание»)

import { Pressable, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Target } from 'lucide-react-native'
import { useFoodStore } from '@/store/useFoodStore'
import { useGoalsStore } from '@/store/useGoalsStore'
import { useProfileStore } from '@/store/useProfileStore'
import { useToast } from '../ui/Toast'
import { GOALS, getDailyTarget } from '@/lib/data/goals'
import { healthyRange } from '@/lib/data/bmi'
import { formatNum } from '@/lib/format'

export function GoalPicker() {
  const goal = useFoodStore((s) => s.goal)
  const setGoal = useFoodStore((s) => s.setGoal)
  const applyPreset = useGoalsStore((s) => s.applyPreset)
  const { toast } = useToast()

  function pick(id) {
    if (id === goal) return
    setGoal(id)
    applyPreset(id)
    const g = GOALS.find((x) => x.id === id)
    let description = `Дневная норма — ${formatNum(getDailyTarget(id))} ккал`
    // Мягкая подсказка: при похудении с лишним весом стоит поставить
    // и цель по весу (во вкладке ИМТ) — без навязчивости
    if (id === 'lose') {
      const { weightKg, heightCm, goalWeightKg } = useProfileStore.getState()
      if (goalWeightKg == null && weightKg > healthyRange(heightCm).max) {
        description += ' · поставьте и цель по весу во вкладке ИМТ'
      }
    }
    toast({
      title: `${g.emoji} Цель: ${g.label}`,
      description,
    })
  }

  return (
    <View accessibilityLabel="Цель питания" className="rounded-3xl border border-white/5 bg-bear-card p-5">
      <View className="flex-row items-center gap-2">
        <Target size={18} color="#c084fc" />
        <Text className="font-bold text-[15px] tracking-tight text-bear-text">Моя цель</Text>
      </View>

      <View className="mt-3 gap-2" accessibilityLabel="Цель питания">
        {GOALS.map((g) => {
          const active = goal === g.id
          const body = (
            <>
              <Text className="text-xl">{g.emoji}</Text>
              <View className="min-w-0 flex-1">
                <Text className={`font-bold text-[13px] ${active ? 'text-white' : 'text-bear-text'}`}>
                  {g.label}
                </Text>
                <Text className={`font-sans text-[11px] leading-snug ${active ? 'text-white/75' : 'text-bear-sub2'}`}>
                  {g.hint}
                </Text>
              </View>
              <Text className={`font-bold text-[12px] ${active ? 'text-white' : 'text-bear-sub'}`}>
                {formatNum(getDailyTarget(g.id))} ккал
              </Text>
            </>
          )
          return (
            <Pressable
              key={g.id}
              onPress={() => pick(g.id)}
              accessibilityLabel={g.label}
              className="overflow-hidden rounded-2xl"
            >
              {active ? (
                <LinearGradient start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} colors={['#4D7CFE', '#8B5CF6', '#A45BFF']}>
                  <View className="flex-row items-center gap-3 px-4 py-3">{body}</View>
                </LinearGradient>
              ) : (
                <View className="flex-row items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3">
                  {body}
                </View>
              )}
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

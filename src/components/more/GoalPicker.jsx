// Выбор цели питания: Похудение / Поддержка / Набор веса.
// Управляет дневной нормой калорий (общие данные с разделом «Питание»)

import { Alert, Pressable, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Target } from 'lucide-react-native'
import { CollapsibleCard } from '../ui/CollapsibleCard'
import { useFoodStore } from '@/store/useFoodStore'
import { useGoalsStore } from '@/store/useGoalsStore'
import { useProfileStore } from '@/store/useProfileStore'
import { useToast } from '../ui/Toast'
import { GOALS, getDailyTarget } from '@/lib/data/goals'
import { applyGoalChoice } from '@/lib/data/goals-apply'
import { healthyRange } from '@/lib/data/bmi'
import { recommendedKcal } from '@/lib/goal'
import { formatNum } from '@/lib/format'

export function GoalPicker() {
  const goal = useFoodStore((s) => s.goal)
  const { toast } = useToast()

  function pick(id) {
    if (id === goal) return
    // id пресета и норма калорий меняются всегда вместе (единая точка)
    applyGoalChoice(id)
    const g = GOALS.find((x) => x.id === id)
    let description = `Дневная норма — ${formatNum(getDailyTarget(id))} ккал`
    // Мягкая подсказка: при похудении с лишним весом стоит поставить
    // и цель по весу (во вкладке Тело) — без навязчивости
    if (id === 'lose') {
      const { weightKg, heightCm, goalWeightKg } = useProfileStore.getState()
      if (goalWeightKg == null && weightKg > healthyRange(heightCm).max) {
        description += ' · поставьте и цель по весу во вкладке Тело'
      }
    }
    toast({
      title: `${g.emoji} Цель: ${g.label}`,
      description,
    })

    // Личный расчёт: пресеты — средние цифры, по вашим данным точнее.
    // Спрашиваем, только если расходятся заметно (≥ 10 ккал)
    const prof = useProfileStore.getState()
    if (prof.hasBio) {
      const target = recommendedKcal({
        sex: prof.sex,
        age: prof.age,
        heightCm: prof.heightCm,
        weightKg: prof.weightKg,
        activityId: prof.activityId,
        goalId: id,
      })
      const current = useGoalsStore.getState().goals.kcal
      if (Math.abs(current - target) >= 10) {
        Alert.alert(
          'Пересчитать под вас?',
          `Пресет — средняя цифра. По вашим данным (рост, вес, возраст, активность) при цели «${g.label}» рекомендуем ≈ ${formatNum(target)} ккал в день. Сейчас в целях ${formatNum(current)} ккал.`,
          [
            { text: 'Оставить', style: 'cancel' },
            {
              text: 'Пересчитать',
              onPress: () => useGoalsStore.getState().setGoals({ kcal: target }),
            },
          ]
        )
      }
    }
  }

  // Сводка в свёрнутой шапке: текущая цель и её дневная норма
  const currentGoal = GOALS.find((x) => x.id === goal)

  return (
    <CollapsibleCard
      storageKey="goal"
      accessibilityLabel="Цель питания"
      icon={<Target size={20} color="#c084fc" />}
      title="Моя цель"
      summary={
        currentGoal
          ? `${currentGoal.label} · ${formatNum(getDailyTarget(goal))} ккал`
          : undefined
      }
    >
      <View className="mt-1 gap-2" accessibilityLabel="Цель питания">
        {GOALS.map((g) => {
          const active = goal === g.id
          const body = (
            <>
              <Text className="text-[26px]">{g.emoji}</Text>
              <View className="min-w-0 flex-1">
                <Text className={`font-bold text-[17.5px] ${active ? 'text-white' : 'text-bear-text'}`}>
                  {g.label}
                </Text>
                <Text className={`font-sans text-[15px] leading-snug ${active ? 'text-white/75' : 'text-bear-sub2'}`}>
                  {g.hint}
                </Text>
              </View>
              <Text className={`font-bold text-[16.5px] ${active ? 'text-white' : 'text-bear-sub'}`}>
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
    </CollapsibleCard>
  )
}

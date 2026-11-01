// Экран «Организм»: живой двойник, который отражает твой день.
// Гидратация — из воды, белок и калории — из дневника питания,
// активность — из шагов. Цели — из профиля.

import { useCallback, useMemo, useRef, useState } from 'react'
import { ScrollView, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { OrganismStage } from '@/components/organism/OrganismStage'
import { GenomeCard } from '@/components/organism/GenomeCard'
import { useFoodStore } from '@/store/useFoodStore'
import { useActivityStore, selectTotalSteps } from '@/store/useActivityStore'
import { useGoalsStore } from '@/store/useGoalsStore'
import { bjuSum } from '@/lib/data/bju'
import { computeOrganism } from '@/lib/data/organism'

const PET_PHRASES = [
  'Мур-р… Продолжай!',
  'Как приятно! Спасибо!',
  'Ещё-ещё, я люблю заботу',
  'Ты лучший друг моего генома',
]

export default function OrganismScreen() {
  const insets = useSafeAreaInsets()

  // Реальные данные дня из сторов
  const entries = useFoodStore((s) => s.entries)
  const waterMl = useActivityStore((s) => s.waterMl)
  // Шаги: датчик телефона + добавленные вручную — organism видит весь день
  const stepsToday = useActivityStore(selectTotalSteps)
  const goals = useGoalsStore((s) => s.goals)

  // Оси организма из дневника и воды
  const { kcal, proteinG } = useMemo(() => {
    const flat = Object.values(entries).flat()
    return { kcal: flat.reduce((s, e) => s + (e.kcal || 0), 0), proteinG: bjuSum(flat).p }
  }, [entries])

  const org = useMemo(
    () =>
      computeOrganism({
        waterMl,
        waterGoalMl: goals.waterMl,
        proteinG,
        kcal,
        kcalGoal: goals.kcal,
        steps: stepsToday,
        stepsGoal: goals.steps,
      }),
    [waterMl, goals.waterMl, proteinG, kcal, goals.kcal, stepsToday, goals.steps]
  )

  const stats = {
    waterMl,
    waterGoalMl: goals.waterMl,
    proteinG,
    kcal,
    kcalGoal: goals.kcal,
    steps: stepsToday,
    stepsGoal: goals.steps,
  }

  // Реплика: базовая по состоянию, при поглаживании — милая, потом возврат
  const [phrase, setPhrase] = useState('')
  const phraseTimer = useRef(null)
  const basePhrase = org.phrase
  const shownPhrase = phrase || basePhrase

  const handlePet = useCallback(() => {
    setPhrase(PET_PHRASES[Math.floor(Math.random() * PET_PHRASES.length)])
    clearTimeout(phraseTimer.current)
    phraseTimer.current = setTimeout(() => setPhrase(''), 3000)
  }, [])

  return (
    <View className="flex-1 bg-bear-bg">
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingHorizontal: 16,
          gap: 16,
          paddingBottom: 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="font-extrabold text-[19px] tracking-tight text-bear-text">
          Организм
        </Text>

        <OrganismStage
          state={org.state}
          hydration={org.axes.hydration}
          protein={org.axes.protein}
          phrase={shownPhrase}
          onPet={handlePet}
        />

        <GenomeCard org={org} stats={stats} />
      </ScrollView>
    </View>
  )
}

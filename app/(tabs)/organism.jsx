// Экран «Организм»: живой двойник, который отражает твой день.
// Гидратация — из воды, белок и калории — из дневника питания,
// активность — из шагов. Магазин переехал сюда как «Забота и декор».

import { useCallback, useMemo, useRef, useState } from 'react'
import { ScrollView, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { OrganismStage } from '@/components/organism/OrganismStage'
import { GenomeCard } from '@/components/organism/GenomeCard'
import { CareSection } from '@/components/organism/CareSection'
import { useFoodStore } from '@/store/useFoodStore'
import { useActivityStore, selectTotalSteps } from '@/store/useActivityStore'
import { useGoalsStore } from '@/store/useGoalsStore'
import { useShopStore } from '@/store/useShopStore'
import { bjuSum } from '@/lib/data/bju'
import { SHOP_ITEMS } from '@/lib/data/shop'
import { computeOrganism } from '@/lib/data/organism'
import { formatNum } from '@/lib/format'

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
  const coins = useShopStore((s) => s.coins)
  const owned = useShopStore((s) => s.owned)

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

  // Купленные предметы живут на сцене
  const decor = useMemo(() => SHOP_ITEMS.filter((i) => owned[i.id]), [owned])

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
        <View className="flex-row items-center justify-between">
          <Text className="font-extrabold text-[19px] tracking-tight text-bear-text">
            Организм
          </Text>
          <View className="flex-row items-center gap-1.5 rounded-full border border-bear-line bg-bear-card px-3 py-1.5">
            <Text className="text-[13px]">🪙</Text>
            <Text className="font-bold text-[13px] text-amber-300">{formatNum(coins)}</Text>
          </View>
        </View>

        <OrganismStage
          state={org.state}
          hydration={org.axes.hydration}
          protein={org.axes.protein}
          phrase={shownPhrase}
          decor={decor}
          onPet={handlePet}
        />

        <GenomeCard org={org} stats={stats} />

        <CareSection />
      </ScrollView>
    </View>
  )
}

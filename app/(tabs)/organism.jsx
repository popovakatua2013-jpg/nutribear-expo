// Экран «Организм»: живой двойник, который отражает твой день.
// Гидратация — из воды, белок и калории — из дневника питания,
// активность — из шагов. Ниже — игровые системы по макету:
// Эволюция, Рейд стаи, Генные капсулы (демо-экономика, без pay-to-win).

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ScrollView, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { OrganismStage } from '@/components/organism/OrganismStage'
import { GenomeCard } from '@/components/organism/GenomeCard'
import { EvolutionCard } from '@/components/organism/EvolutionCard'
import { RaidCard } from '@/components/organism/RaidCard'
import { CapsuleCard } from '@/components/organism/CapsuleCard'
import { useFoodStore } from '@/store/useFoodStore'
import { useActivityStore, selectTotalSteps } from '@/store/useActivityStore'
import { useGoalsStore } from '@/store/useGoalsStore'
import { useExerciseStore } from '@/store/useExerciseStore'
import { useOrganismGameStore, weekNumberOf } from '@/store/useOrganismGameStore'
import { dayKeyOf } from '@/store/useHistoryStore'
import { bjuSum } from '@/lib/data/bju'
import { computeOrganism } from '@/lib/data/organism'
import {
  BOSSES,
  dayCombo,
  dayRaidDamage,
  mondayKeyOf,
  myWeekTotals,
  packDamage,
  weekDayIdx,
} from '@/lib/data/organism-game'

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
  // Шаги: датчик телефона + добавленные вручную — организм видит весь день
  const stepsToday = useActivityStore(selectTotalSteps)
  const goals = useGoalsStore((s) => s.goals)
  const exerciseLogs = useExerciseStore((s) => s.logs)

  // Оси организма из дневника и воды
  const flatEntries = useMemo(() => Object.values(entries).flat(), [entries])
  const { kcal, proteinG } = useMemo(
    () => ({ kcal: flatEntries.reduce((s, e) => s + (e.kcal || 0), 0), proteinG: bjuSum(flatEntries).p }),
    [flatEntries]
  )

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

  /* ── Игровые системы: гены, рейд, капсулы ── */
  const game = useOrganismGameStore()
  const dayKey = dayKeyOf()
  const glasses = Math.floor(waterMl / 250)
  const workouts = (exerciseLogs[dayKey] || []).length
  const combo = dayCombo(flatEntries.length, glasses, workouts)

  // Ежедневная синхронизация: комбо, стрик, стабильность, гены за расцвет
  useEffect(() => {
    game.syncDay({ dayKey, combo, state: org.state })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayKey, combo, org.state])

  // Рейд: мой вклад за сегодня (еда = удар, вода = щит, тренировка = крит)
  useEffect(() => {
    game.syncRaid({ dayKey, dmg: dayRaidDamage(kcal, workouts), shield: glasses, crit: workouts })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayKey, kcal, workouts, glasses])

  // Расчёт рейда на текущую неделю
  const weekKey = mondayKeyOf()
  const weekNo = weekNumberOf(game.createdAt)
  const boss = BOSSES[(weekNo - 1) % BOSSES.length]
  const mine = myWeekTotals(game.raidDays, weekKey)
  const pack = packDamage(weekKey, weekDayIdx())
  const raidHp = boss.hp - mine.dmg - pack

  // Босс павший — зафиксировать награду (один раз в неделю)
  useEffect(() => {
    if (raidHp <= 0 && !game.raidKilled) game.settleRaid({ bossName: boss.name })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raidHp, game.raidKilled])

  const handleEvolve = useCallback(
    ({ cost, fromName, toName }) => game.evolve({ cost, fromName, toName }),
    []
  )
  const handleOpenCapsule = useCallback(() => game.openCapsule(), [])

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

        <EvolutionCard
          org={org}
          genes={game.genes}
          evoStage={game.evoStage}
          evoBranch={game.evoBranch}
          stableDays={game.stableDays}
          mutationUnlocked={game.mutationUnlocked}
          log={game.log}
          onEvolve={handleEvolve}
        />

        <RaidCard
          boss={boss}
          hp={raidHp}
          maxHp={boss.hp}
          weekNo={weekNo}
          myDmg={mine.dmg}
          myShield={mine.shield}
          packDmg={pack}
          killed={game.raidKilled}
          rewarded={game.raidRewarded}
        />

        <CapsuleCard
          combo={combo}
          streak={game.streak}
          capsules={game.capsules}
          onOpen={handleOpenCapsule}
        />

        <Text className="text-center font-sans text-[11px]" style={{ color: 'rgba(127,168,144,0.7)' }}>
          Демо-экономика · без pay-to-win · ресурсы только из дневника
        </Text>
      </ScrollView>
    </View>
  )
}

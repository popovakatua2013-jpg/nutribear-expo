// Экран «Организм»: живой двойник, который отражает твой день.
// Гидратация — из воды, белок и калории — из дневника питания,
// активность — из шагов. Ниже — игровые системы по макету:
// Экспедиции, Эволюция, Рейд стаи, Генные капсулы (демо-экономика,
// без pay-to-win).

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ScrollView, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { OrganismStage } from '@/components/organism/OrganismStage'
import { GenomeCard } from '@/components/organism/GenomeCard'
import { ExpeditionCard } from '@/components/organism/ExpeditionCard'
import { EvolutionCard } from '@/components/organism/EvolutionCard'
import { RaidCard } from '@/components/organism/RaidCard'
import { CapsuleCard } from '@/components/organism/CapsuleCard'
import { useFoodStore } from '@/store/useFoodStore'
import { useActivityStore, selectTotalSteps } from '@/store/useActivityStore'
import { useGoalsStore } from '@/store/useGoalsStore'
import { useExerciseStore } from '@/store/useExerciseStore'
import { useUiPrefsStore } from '@/store/useUiPrefsStore'
import { useOrganismGameStore, weekNumberOf } from '@/store/useOrganismGameStore'
import { dayKeyOf } from '@/store/useHistoryStore'
import { bjuSum } from '@/lib/data/bju'
import { computeOrganism } from '@/lib/data/organism'
import {
  BOSSES,
  PIMPLE_SPOTS,
  dayCombo,
  dayRaidDamage,
  genomeAvg70,
  mondayKeyOf,
  myWeekTotals,
  packDamage,
  raidBattleHp,
  raidHealAbsorb,
  weekDayIdx,
} from '@/lib/data/organism-game'
import { CollectionCard } from '@/components/organism/CollectionCard'

// Реплики при поглаживании — по состоянию организма: в упадке не мурчит,
// а просит помочь
const PET_PHRASES = {
  bloom: [
    'Мур-р… Продолжай!',
    'Как приятно! Спасибо!',
    'Ещё-ещё, я люблю заботу',
    'Ты лучший друг моего генома',
  ],
  normal: [
    'Мур-р… Хорошо!',
    'Спасибо! Так гораздо лучше',
    'Тепло… Погладь ещё разок',
    'С тобой мне спокойно',
  ],
  decline: [
    'Ой… лучше сначала помоги мне',
    'Мне нехорошо… добавь воды и еды',
    'Погладишь потом — сначала стакан воды',
    'Я в упадке… позаботься обо мне, пожалуйста',
  ],
}

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

  // Единый геном для бейджа на сцене и карточки эволюции (из 70, 4 оси)
  const genome = genomeAvg70(org.axes)

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

  // Расчёт рейда на текущую неделю: крит удваивает урон еды (день с
  // тренировкой), пропущенные дни лечат босса, щиты (вода) гасят лечение
  const weekKey = mondayKeyOf()
  const weekNo = weekNumberOf(game.createdAt)
  const boss = BOSSES[(weekNo - 1) % BOSSES.length]
  const mine = myWeekTotals(game.raidDays, weekKey)
  const pack = packDamage(weekKey, weekDayIdx())
  const elapsedDays = weekDayIdx() + 1
  const myDays = Object.values(game.raidDays).filter((v) => v && v.weekKey === weekKey).length
  const skips = Math.max(0, elapsedDays - myDays)
  const raidHp = raidBattleHp(boss.hp, mine.dmg, pack, skips, mine.shield)
  const { heal, absorb } = raidHealAbsorb(skips, mine.shield)

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
  const handleConvertMutagen = useCallback(() => game.convertMutagen(), [])
  const handleStartExpedition = useCallback((key) => game.startExpedition(key), [])
  const handleCollectExpedition = useCallback(() => game.collectExpedition(), [])

  // Прыщи от игнора: сегодня ни стакана воды и/или ни одной записи еды.
  // Считаем сколько должно быть пятен, вычитаем уже выдавленные (по индексам)
  const haptics = useUiPrefsStore((s) => s.haptics)
  const pimpleTotal = useMemo(() => {
    const noWater = waterMl < 250
    const noFood = flatEntries.length === 0
    let n = (noWater ? 2 : 0) + (noFood ? 2 : 0)
    if (org.state === 'decline') n += 1
    if (noWater && noFood) n += 1 // полный игнор дня
    return Math.min(n, PIMPLE_SPOTS.length)
  }, [waterMl, flatEntries.length, org.state])

  const poppedIdx = game.pimplePop.dayKey === dayKey ? game.pimplePop.popped : []
  const pimples = PIMPLE_SPOTS.slice(0, pimpleTotal)
    .map((spot, idx) => ({ ...spot, idx }))
    .filter((p) => !poppedIdx.includes(p.idx))

  const handlePopPimple = useCallback(
    (spot) => {
      const res = game.popPimple({ dayKey, total: pimpleTotal, index: spot.idx })
      if (res.doneAll) {
        setPhrase('Фух! Чисто! Спасибо, что выдавил всё')
        clearTimeout(phraseTimer.current)
        phraseTimer.current = setTimeout(() => setPhrase(''), 3500)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [game.popPimple, dayKey, pimpleTotal]
  )

  // Реплика: базовая по состоянию, при поглаживании — милая, потом возврат
  const [phrase, setPhrase] = useState('')
  const phraseTimer = useRef(null)
  const basePhrase = org.phrase
  const shownPhrase = phrase || basePhrase

  const handlePet = useCallback(() => {
    const list = PET_PHRASES[org.state] || PET_PHRASES.normal
    setPhrase(list[Math.floor(Math.random() * list.length)])
    clearTimeout(phraseTimer.current)
    phraseTimer.current = setTimeout(() => setPhrase(''), 3000)
  }, [org.state])

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
          genome={genome}
          pimples={pimples}
          onPopPimple={handlePopPimple}
          haptics={haptics}
        />

        <GenomeCard org={org} stats={stats} />

        <ExpeditionCard
          expedition={game.expedition}
          onStart={handleStartExpedition}
          onCollect={handleCollectExpedition}
        />

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
          heal={heal}
          absorb={absorb}
        />

        <CapsuleCard
          combo={combo}
          streak={game.streak}
          capsules={game.capsules}
          mutagen={game.mutagen}
          onOpen={handleOpenCapsule}
          onConvert={handleConvertMutagen}
        />

        <CollectionCard items={game.items} opened={game.opened} />

        <Text className="text-center font-sans text-[11px]" style={{ color: 'rgba(127,168,144,0.7)' }}>
          Демо-экономика · без pay-to-win · ресурсы только из дневника
        </Text>
      </ScrollView>
    </View>
  )
}

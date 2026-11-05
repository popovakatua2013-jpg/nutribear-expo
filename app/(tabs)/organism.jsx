// Экран «Организм»: живой двойник, который отражает твой день.
// Гидратация — из воды, белок и калории — из дневника питания,
// активность — из шагов. Ниже — игровые системы по макету:
// Экспедиции, Эволюция, Рейд стаи, Генные капсулы (демо-экономика,
// без pay-to-win).

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Alert, Pressable, ScrollView, Text, View } from 'react-native'
import { ChevronDown, Info, Stethoscope, X } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { OrganismStage } from '@/components/organism/OrganismStage'
import { AuditCard } from '@/components/organism/AuditCard'
import { AuditPaywall } from '@/components/organism/AuditPaywall'
import { GenomeCard } from '@/components/organism/GenomeCard'
import { ExpeditionCard } from '@/components/organism/ExpeditionCard'
import { EvolutionCard } from '@/components/organism/EvolutionCard'
import { RaidCard } from '@/components/organism/RaidCard'
import { CapsuleCard } from '@/components/organism/CapsuleCard'
import { QuestCard } from '@/components/organism/QuestCard'
import { AdventureLog } from '@/components/organism/AdventureLog'
import { ChapterCard } from '@/components/organism/ChapterCard'
import { PetCard } from '@/components/organism/PetCard'
import { CodexCard } from '@/components/organism/CodexCard'
import { TowerCard } from '@/components/organism/TowerCard'
import { CraftCard } from '@/components/organism/CraftCard'
import { useFoodStore } from '@/store/useFoodStore'
import { useActivityStore, selectTotalSteps } from '@/store/useActivityStore'
import { useGoalsStore } from '@/store/useGoalsStore'
import { useExerciseStore } from '@/store/useExerciseStore'
import { useUiPrefsStore } from '@/store/useUiPrefsStore'
import { useOrganismGameStore, weekNumberOf } from '@/store/useOrganismGameStore'
import { useProStore } from '@/store/useProStore'
import { useHistoryStore, dayKeyOf } from '@/store/useHistoryStore'
import { pickPimpleDonePhrase, pickPimplePopPhrase } from '@/lib/data/audit'
import { bjuSum } from '@/lib/data/bju'
import { computeOrganism } from '@/lib/data/organism'
import {
  PIMPLE_SPOTS,
  bossForWeek,
  craftedHas,
  dayCombo,
  dayRaidDamage,
  genomeAvg70,
  mondayKeyOf,
  myWeekTotals,
  packDamage,
  pickReaction,
  raidBattleHp,
  raidHealAbsorb,
  raidMedals,
  skinOf,
  weekDayIdx,
} from '@/lib/data/organism-game'
import { CollectionCard } from '@/components/organism/CollectionCard'
import { SoftGlow } from '@/components/ui/SoftGlow'

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

  // Метрики дня для квестов и энциклопедии (всё из живых данных)
  const balanceOk = goals.kcal > 0 && kcal >= goals.kcal * 0.8 && kcal <= goals.kcal * 1.15
  const questMetrics = {
    glasses,
    steps: stepsToday,
    workouts,
    protein: proteinG,
    meals: flatEntries.length,
    balance: balanceOk ? 1 : 0,
  }
  const unlocks = useMemo(
    () => [
      ...(goals.waterMl > 0 && glasses * 250 >= goals.waterMl ? ['water'] : []),
      ...(goals.steps > 0 && stepsToday >= goals.steps ? ['steps'] : []),
      ...(workouts >= 1 ? ['workout'] : []),
      ...(proteinG >= 50 ? ['protein'] : []),
      ...(flatEntries.length >= 3 ? ['meals'] : []),
      ...(balanceOk ? ['balance'] : []),
      ...(game.streak >= 3 ? ['streak3'] : []),
    ],
    [goals.waterMl, goals.steps, glasses, stepsToday, workouts, proteinG, flatEntries.length, balanceOk, game.streak]
  )

  // Ежедневная синхронизация: комбо, стрик, стабильность, гены за расцвет,
  // кормёжка питомца, башня, энциклопедия, итоги главы
  useEffect(() => {
    game.syncDay({ dayKey, combo, state: org.state, unlocks })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayKey, combo, org.state, unlocks])

  // Рейд: мой вклад за сегодня (еда = удар, вода = щит, тренировка = крит)
  useEffect(() => {
    game.syncRaid({ dayKey, dmg: dayRaidDamage(kcal, workouts), shield: glasses, crit: workouts })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayKey, kcal, workouts, glasses])

  // Расчёт рейда на текущую неделю: крит удваивает урон еды (день с
  // тренировкой), пропущенные дни лечат босса, щиты (вода) гасят лечение.
  // После престижа — боссы-легенды.
  const weekKey = mondayKeyOf()
  const weekNo = weekNumberOf(game.createdAt)
  const boss = bossForWeek(weekNo, game.prestigeCount)
  const mine = myWeekTotals(game.raidDays, weekKey)
  const pack = packDamage(weekKey, weekDayIdx())
  const elapsedDays = weekDayIdx() + 1
  const myDays = Object.values(game.raidDays).filter((v) => v && v.weekKey === weekKey).length
  const skips = Math.max(0, elapsedDays - myDays)
  const raidHp = raidBattleHp(boss.hp, mine.dmg, pack, skips, mine.shield)
  const { heal, absorb } = raidHealAbsorb(skips, mine.shield)
  const medals = raidMedals(mine, myDays)
  // Скорость походов и скин сцены — от синтеза и аур
  const speed = craftedHas(game.crafted, 'speed') ? 0.9 : 1
  const skin = skinOf(game.activeSkin)
  const gold = (game.prestigeCount || 0) > 0

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
  // Обучающая подсказка «как работает организм» — закрывается крестиком
  const orgHintDone = useUiPrefsStore((s) => s.orgHintDone)
  const setOrgHintDone = useUiPrefsStore((s) => s.setOrgHintDone)
  // Premium: фразы прыщей и полнота аудита зависят от подписки
  const pro = useProStore((s) => s.pro)
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
      // каждый выдавленный прыщ — своя шутка (позитивный чёрный юмор),
      // последний — особая реплика благодарности
      setPhrase(res.doneAll ? pickPimpleDonePhrase(pro) : pickPimplePopPhrase(pro))
      clearTimeout(phraseTimer.current)
      phraseTimer.current = setTimeout(() => setPhrase(''), 3500)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [game.popPimple, dayKey, pimpleTotal, pro]
  )

  // Реплика: базовая по состоянию, при поглаживании — милая, потом возврат
  const [phrase, setPhrase] = useState('')
  const phraseTimer = useRef(null)
  const basePhrase = org.phrase
  const shownPhrase = phrase || basePhrase

  // Утренняя реакция организма: раз в день при открытии вкладки
  useEffect(() => {
    if (game.lastReactKey === dayKey) return
    game.markReacted(dayKey)
    setPhrase(
      pickReaction({
        state: org.state,
        streak: game.streak,
        wave: game.tower.wave,
        expedition: game.expedition,
        bossHpPct: Math.round((raidHp / boss.hp) * 100),
        petLevel: Math.floor((game.pet?.fedDays || 0) / 3) + 1,
        codexCount: (game.codex || []).length,
      })
    )
    phraseTimer.current = setTimeout(() => setPhrase(''), 4500)
    return () => clearTimeout(phraseTimer.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayKey])

  /* ── Аудит организма: Доктор Топтыгин + пейволл Premium ── */
  const [paywallOpen, setPaywallOpen] = useState(false)
  const handleRunAudit = useCallback(({ dayKey: k, score }) => {
    const res = game.runAudit({ dayKey: k, score })
    // счёт аудита — в дневную историю: сводка дня и отчёты видят тренд,
    // не заходя во вкладку «Организм» (история хранит дольше auditDays)
    useHistoryStore.getState().record(k, { audit: score })
    return res
  }, [])
  const handleAuditActivated = useCallback(() => {
    setPhrase('Premium активирован! Теперь осмотр полный — готовься к редким диагнозам')
    clearTimeout(phraseTimer.current)
    phraseTimer.current = setTimeout(() => setPhrase(''), 4000)
  }, [])

  const handlePet = useCallback(() => {
    const list = PET_PHRASES[org.state] || PET_PHRASES.normal
    setPhrase(list[Math.floor(Math.random() * list.length)])
    clearTimeout(phraseTimer.current)
    phraseTimer.current = setTimeout(() => setPhrase(''), 3000)
  }, [org.state])

  /* ── Новые игровые системы: квесты, крафт, скины, престиж ── */
  const handleClaimQuest = useCallback(
    (questKey) => {
      const ok = game.claimQuest({ dayKey, questKey, metrics: questMetrics })
      if (ok) {
        setPhrase('📜 Квест закрыт! Организм делится генами')
        clearTimeout(phraseTimer.current)
        phraseTimer.current = setTimeout(() => setPhrase(''), 3000)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [game.claimQuest, dayKey, questMetrics]
  )

  const handleCraft = useCallback(
    (recipeKey) => {
      const ok = game.craftArtifact(recipeKey)
      if (ok) {
        setPhrase('⚗️ Артефакт синтезирован — бонус уже работает!')
        clearTimeout(phraseTimer.current)
        phraseTimer.current = setTimeout(() => setPhrase(''), 3000)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [game.craftArtifact]
  )

  const handleSetSkin = useCallback((name) => game.setSkin(name), [])

  const handlePrestige = useCallback(() => {
    Alert.alert(
      'Новая игра+?',
      'Формы и гены начнут путь заново, но коллекция, энциклопедия, питомец, синтез и летопись останутся. Боссы-легенды ждут!',
      [
        { text: 'Пока нет', style: 'cancel' },
        {
          text: '👑 Начать',
          onPress: () => {
            const ok = game.doPrestige()
            if (ok) {
              setPhrase('👑 НОВАЯ ИГРА+ Задекларирована! Легенды уже шевелятся…')
              clearTimeout(phraseTimer.current)
              phraseTimer.current = setTimeout(() => setPhrase(''), 4500)
            }
          },
        },
      ]
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.doPrestige])

  // Организм в упадке и осмотр ещё не проведён — приглашение к доктору:
  // тап доскролливает до карточки аудита
  const scrollRef = useRef(null)
  const auditYRef = useRef(0)
  const auditNotDone = (game.auditDays || {})[dayKey] == null
  const showAuditInvite = org.state === 'decline' && auditNotDone
  const scrollToAudit = () => {
    scrollRef.current?.scrollTo({ y: Math.max(0, auditYRef.current - 8), animated: true })
  }

  return (
    <View className="flex-1 bg-bear-bg">
      {/* Неоновая дымка в шапке — единый стиль страниц (как на «Теле») */}
      <SoftGlow id="glowOrgTR" w={190} h={160} peak={0.3} color="#A855F7" style={{ top: -26, right: -46 }} />
      <SoftGlow id="glowOrgL" w={120} h={150} peak={0.14} color="#7C3AED" style={{ top: 60, left: -40 }} />
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingHorizontal: 16,
          gap: 16,
          paddingBottom: 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="font-extrabold text-[24px] tracking-tight text-bear-text">
          Организм
        </Text>

        {/* Обучающая подсказка: объясняет, как организм отражает день.
            Закрывается крестиком (запоминается) — больше не навязывается */}
        {!orgHintDone && (
          <View
            className="flex-row items-start gap-2.5 rounded-2xl px-3.5 py-3"
            style={{
              backgroundColor: 'rgba(168,85,247,0.08)',
              borderWidth: 1,
              borderColor: 'rgba(168,85,247,0.22)',
            }}
          >
            <Info size={18} color="#C084FC" style={{ marginTop: 1 }} />
            <Text className="min-w-0 flex-1 font-sans text-[16.5px] leading-snug" style={{ color: '#E9D5FF' }}>
              Это живой двойник твоего дня: вода наполняет гидратацию, дневник
              питания даёт белок и энергию, шаги и тренировки — активность.
              Гладь его, выдавливай прыщи, если игнорируешь день, и ходи к
              доктору на осмотр — он подскажет, что чинить.
            </Text>
            <Pressable
              onPress={() => setOrgHintDone(true)}
              accessibilityRole="button"
              accessibilityLabel="Закрыть подсказку"
              hitSlop={8}
              className="-mt-0.5 -mr-1 p-1 active:opacity-60"
            >
              <X hitSlop={10} size={16} color="#C084FC" />
            </Pressable>
          </View>
        )}

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
          skin={skin}
          gold={gold}
        />

        <QuestCard dayKey={dayKey} metrics={questMetrics} claims={game.questClaims[dayKey]} onClaim={handleClaimQuest} />

        <PetCard pet={game.pet} dayKey={dayKey} />

        {/* Организм в упадке — зовём к доктору (тап скроллит к аудиту) */}
        {showAuditInvite && (
          <Pressable
            onPress={scrollToAudit}
            accessibilityRole="button"
            accessibilityLabel="Пройти осмотр у Доктора Топтыгина"
            className="flex-row items-center gap-2.5 rounded-2xl px-3.5 py-3"
            style={{
              backgroundColor: 'rgba(250,204,21,0.08)',
              borderWidth: 1,
              borderColor: 'rgba(250,204,21,0.25)',
            }}
          >
            <Stethoscope size={18} color="#FACC15" />
            <Text className="flex-1 font-medium text-[16.5px] leading-snug" style={{ color: '#FDE68A' }}>
              Организм в упадке. Доктор Топтыгин подскажет, что чинить
            </Text>
            <ChevronDown size={18} color="#FDE68A" />
          </Pressable>
        )}

        <View onLayout={(e) => (auditYRef.current = e.nativeEvent.layout.y)}>
          <AuditCard
            org={org}
            streak={game.streak}
            auditDays={game.auditDays || {}}
            dayKey={dayKey}
            kcal={kcal}
            kcalGoal={goals.kcal}
            pro={pro}
            onRunAudit={handleRunAudit}
            onOpenPaywall={() => setPaywallOpen(true)}
            haptics={haptics}
          />
        </View>

        <GenomeCard org={org} stats={stats} />

        <ChapterCard
          weekNo={weekNo}
          weekKey={weekKey}
          goodDays={game.goodDays}
          chapters={game.chapters}
          chapterLastWeek={game.chapterLastWeek}
        />

        <ExpeditionCard
          expedition={game.expedition}
          evoStage={game.evoStage}
          speed={speed}
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
          prestigeCount={game.prestigeCount}
          onEvolve={handleEvolve}
          onPrestige={handlePrestige}
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
          medals={medals}
        />

        <CapsuleCard
          combo={combo}
          streak={game.streak}
          capsules={game.capsules}
          mutagen={game.mutagen}
          onOpen={handleOpenCapsule}
          onConvert={handleConvertMutagen}
        />

        <CraftCard mutagen={game.mutagen} crafted={game.crafted} onCraft={handleCraft} />

        <TowerCard tower={game.tower} />

        <CollectionCard
          items={game.items}
          opened={game.opened}
          activeSkin={game.activeSkin}
          onSetSkin={handleSetSkin}
        />

        <CodexCard codex={game.codex} />

        <AdventureLog log={game.log} createdAt={game.createdAt} />

        <Text className="text-center font-sans text-[15px]" style={{ color: 'rgba(127,168,144,0.7)' }}>
          Демо-экономика · без pay-to-win · ресурсы только из дневника
        </Text>
      </ScrollView>

      {/* пейволл аудита: все 6 систем, редкие диагнозы, история */}
      <AuditPaywall
        visible={paywallOpen}
        onClose={() => setPaywallOpen(false)}
        onActivated={handleAuditActivated}
      />
    </View>
  )
}

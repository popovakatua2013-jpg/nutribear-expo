// Квесты дня: 3 задания из пула, детерминированные на сутки. Прогресс —
// из живых метрик дня (вода, шаги, тренировка, белок, приёмы, баланс).
// Награда +2 гена за квест, все три — +1 кристалл. Не выполнил — просто
// завтра новые: ничего наказующего.

import { Pressable, Text, View } from 'react-native'
import { ScrollText } from 'lucide-react-native'
import { GameCard, GameHeader, RightPill, Panel, GradBar, GAME } from './GameUi'
import { QUEST_REWARD, questProgress, questsForDay } from '@/lib/data/organism-game'

export function QuestCard({ dayKey, metrics, claims, onClaim }) {
  const quests = questsForDay(dayKey)
  const done = quests.filter((q) => questProgress(q, metrics).done).length
  const claimed = claims || []

  return (
    <GameCard>
      <GameHeader
        icon={ScrollText}
        iconColor={GAME.yellow}
        iconBg="rgba(250,204,21,0.13)"
        title="Квесты дня"
        subtitle="закрой задания — организм делится генами"
        right={<RightPill text={`${done}/3`} color={GAME.yellow} />}
      />

      <View className="mt-3 gap-2">
        {quests.map((q) => {
          const pr = questProgress(q, metrics)
          const isClaimed = claimed.includes(q.key)
          const pct = Math.round((pr.cur / pr.goal) * 100)
          return (
            <Panel key={q.key} style={isClaimed ? { borderColor: 'rgba(163,230,53,0.35)' } : undefined}>
              <View className="flex-row items-center gap-2.5">
                <Text className="text-[24px]">{q.emoji}</Text>
                <View className="min-w-0 flex-1">
                  <Text className="font-bold text-[17.5px] leading-tight" style={{ color: GAME.text }}>
                    {q.name}
                  </Text>
                  <Text className="mt-0.5 font-sans text-[15.5px] leading-tight" style={{ color: GAME.dim }}>
                    {q.sub}
                  </Text>
                </View>
                {isClaimed ? (
                  <Text className="font-bold text-[16px]" style={{ color: GAME.lime }}>
                    ✓ +{QUEST_REWARD.genes} 🧬
                  </Text>
                ) : (
                  <Text className="font-bold text-[16px]" style={{ color: GAME.dim2 }}>
                    +{QUEST_REWARD.genes} 🧬
                  </Text>
                )}
              </View>
              <View className="mt-2.5 flex-row items-center gap-2.5">
                <View className="min-w-0 flex-1">
                  <GradBar
                    pct={pct}
                    colors={pr.done ? [GAME.lime, GAME.emerald] : [GAME.cyan, GAME.lime]}
                  />
                </View>
                {isClaimed ? (
                  <Text className="font-bold text-[15.5px]" style={{ color: GAME.lime }}>
                    закрыт
                  </Text>
                ) : pr.done ? (
                  <Pressable
                    onPress={() => onClaim(q.key)}
                    accessibilityRole="button"
                    accessibilityLabel={`Забрать награду за квест ${q.name}`}
                    className="rounded-xl px-3.5 py-2 active:opacity-80"
                    style={{ backgroundColor: GAME.lime }}
                  >
                    <Text className="font-extrabold text-[15.5px]" style={{ color: '#12200F' }}>
                      Забрать
                    </Text>
                  </Pressable>
                ) : (
                  <Text className="shrink-0 font-semibold text-[15px]" style={{ color: GAME.dim2 }}>
                    {q.metric === 'steps' ? `${pr.cur}/${pr.goal}` : `${pr.cur} из ${pr.goal}`}
                  </Text>
                )}
              </View>
            </Panel>
          )
        })}
      </View>

      <Text className="mt-3 px-1 font-sans text-[15.5px] leading-snug" style={{ color: GAME.dim2 }}>
        Все три за день — ещё +{QUEST_REWARD.allBonusCrystals} кристалл. Завтра — новые задания.
      </Text>
    </GameCard>
  )
}

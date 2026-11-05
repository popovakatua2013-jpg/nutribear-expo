// Экспедиции: организм уходит в поход на реальное время (4/8/12 ч).
// Idle-механика из веб-прототипа: закрыл приложение — время идёт само,
// вернулся — забери гены и кристаллы. Демо-экономика, без pay-to-win.

import { useEffect, useState } from 'react'
import { Modal, Pressable, Text, View } from 'react-native'
import { Compass, Timer } from 'lucide-react-native'
import { GameCard, GameHeader, RightPill, Panel, GradBar, GAME } from './GameUi'
import { EXPEDITIONS, expeditionProgress, fmtRemaining } from '@/lib/data/organism-game'

export function ExpeditionCard({ expedition, onStart, onCollect }) {
  // Тик раз в 30 секунд — двигает таймер и полоску, пока организм в пути
  // (таймер показывает минуты, чаще перерисовываться незачем)
  const [, setTick] = useState(0)
  useEffect(() => {
    if (!expedition) return
    const t = setInterval(() => setTick((n) => n + 1), 30000)
    return () => clearInterval(t)
  }, [expedition])

  const [result, setResult] = useState(null) // { name, genes, crystals, tale }
  const pr = expedition ? expeditionProgress(expedition) : null
  const back = pr && pr.done
  const active = pr && !pr.done

  const handleCollect = () => {
    const loot = onCollect()
    if (loot) setResult(loot)
  }

  return (
    <GameCard>
      <GameHeader
        icon={Compass}
        iconColor={GAME.cyan}
        iconBg="rgba(103,232,249,0.13)"
        title="Экспедиции"
        subtitle="уходит в поход — время идёт даже с закрытым приложением"
        right={
          active && (
            <RightPill icon={Timer} text={fmtRemaining(pr.remainingMs)} color={GAME.cyan} />
          )
        }
      />

      {/* в пути: прогресс и добыча, которая ждёт */}
      {active && (
        <Panel style={{ marginTop: 12 }}>
          <View className="flex-row items-start justify-between gap-3">
            <Text className="flex-1 font-semibold text-[15.5px] leading-snug" style={{ color: GAME.dim }}>
              {EXPEDITIONS.find((e) => e.key === expedition.key)?.emoji}{' '}
              {EXPEDITIONS.find((e) => e.key === expedition.key)?.name}
            </Text>
            <Text className="font-extrabold text-[17px]" style={{ color: GAME.text }}>
              осталось {fmtRemaining(pr.remainingMs)}
            </Text>
          </View>
          <View className="mt-2.5">
            <GradBar pct={Math.round(pr.fraction * 100)} colors={[GAME.cyan, GAME.lime]} />
          </View>
          <Text className="mt-2.5 font-sans text-[14px]" style={{ color: GAME.dim2 }}>
            ждёт дома: +{EXPEDITIONS.find((e) => e.key === expedition.key)?.genes} 🧬 · +
            {EXPEDITIONS.find((e) => e.key === expedition.key)?.crystals} 💎
          </Text>
        </Panel>
      )}

      {/* вернулся: забрать добычу */}
      {back && (
        <Panel style={{ marginTop: 12, borderColor: 'rgba(163,230,53,0.35)' }}>
          <Text className="font-extrabold text-[17.5px]" style={{ color: GAME.lime }}>
            Организм вернулся!
          </Text>
          <Text className="mt-1 font-sans text-[15px] leading-snug" style={{ color: GAME.dim }}>
            Из похода «{EXPEDITIONS.find((e) => e.key === expedition.key)?.name}» он принёс добычу —
            гены и кристаллы уже ждут.
          </Text>
          <Pressable
            onPress={handleCollect}
            className="mt-3.5 items-center rounded-2xl py-3.5"
            style={{ backgroundColor: GAME.lime }}
          >
            <Text className="font-extrabold text-[17.5px]" style={{ color: '#12200F' }}>
              Забрать добычу
            </Text>
          </Pressable>
        </Panel>
      )}

      {/* выбор маршрута — только когда организма дома нет в походе */}
      {!expedition && (
        <View className="mt-3 gap-2">
          {EXPEDITIONS.map((e) => (
            <View
              key={e.key}
              className="flex-row items-center gap-2.5 rounded-xl px-3 py-3"
              style={{ backgroundColor: GAME.panel, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' }}
            >
              <Text className="text-[24px]">{e.emoji}</Text>
              <View className="min-w-0 flex-1">
                <Text className="font-bold text-[15.5px]" style={{ color: GAME.text }}>
                  {e.name}
                </Text>
                <Text className="mt-0.5 font-sans text-[14px]" style={{ color: GAME.dim }}>
                  {e.hours} ч · +{e.genes} 🧬 · +{e.crystals} 💎
                </Text>
              </View>
              <Pressable
                onPress={() => onStart(e.key)}
                className="items-center rounded-2xl px-4 py-2.5"
                style={{ backgroundColor: GAME.cyan }}
              >
                <Text className="font-extrabold text-[15.5px]" style={{ color: '#062B33' }}>
                  В путь
                </Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}

      <View className="mt-3 flex-row items-start gap-2 px-1">
        <Compass size={16} color={GAME.lime} />
        <Text className="flex-1 font-sans text-[14.5px] leading-relaxed" style={{ color: GAME.dim }}>
          Чем дальше путь, тем богаче добыча: закрой приложение — организм всё равно дойдёт.
        </Text>
      </View>

      {/* добыча привезена */}
      <Modal visible={!!result} transparent animationType="fade" onRequestClose={() => setResult(null)}>
        <View className="flex-1 items-center justify-center px-8" style={{ backgroundColor: 'rgba(2,8,5,0.82)' }}>
          {result && (
            <View
              className="w-full rounded-3xl p-5"
              style={{ backgroundColor: GAME.card, borderWidth: 1, borderColor: GAME.cyan }}
            >
              <View className="items-center">
                <View className="h-12 w-12 items-center justify-center rounded-full" style={{ backgroundColor: 'rgba(103,232,249,0.16)' }}>
                  <Compass size={24} color={GAME.cyan} />
                </View>
                <Text className="mt-3 font-extrabold text-[21px]" style={{ color: GAME.text }}>
                  {result.name}
                </Text>
                <Text className="mt-1 font-bold text-[17px]" style={{ color: GAME.cyan }}>
                  +{result.genes} 🧬 · +{result.crystals} 💎
                </Text>
                <Text className="mt-2 text-center font-medium text-[15px] leading-snug" style={{ color: GAME.dim }}>
                  {result.tale}
                </Text>
                <Pressable
                  onPress={() => setResult(null)}
                  className="mt-4 w-full items-center rounded-2xl py-3"
                  style={{ backgroundColor: GAME.lime }}
                >
                  <Text className="font-extrabold text-[17px]" style={{ color: '#12200F' }}>
                    Отлично
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </Modal>
    </GameCard>
  )
}

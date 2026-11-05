// Генные капсулы: комбо-шкала дня (за события дневника), стрик —
// капсула на 7-й день, честные шансы до вскрытия (60/25/10/5),
// дубликаты превращаются в мутаген. Демо-экономика, без pay-to-win.

import { useState } from 'react'
import { Modal, Pressable, Text, View } from 'react-native'
import { Package, Flame, Sparkles, Dna } from 'lucide-react-native'
import { GameCard, GameHeader, RightPill, Panel, GradBar, GAME } from './GameUi'
import { COMBO_GOAL, DUP_MUTAGEN, DROPS, MUTAGEN_PER_CAPSULE, STREAK_FOR_CAPSULE } from '@/lib/data/organism-game'

export function CapsuleCard({ combo, streak, capsules, mutagen = 0, onOpen, onConvert }) {
  const [result, setResult] = useState(null) // { drop, itemName, dup } | 'empty'

  const handleOpen = () => {
    if (capsules <= 0) return
    setResult(onOpen())
  }

  return (
    <GameCard>
      <GameHeader
        icon={Package}
        iconColor={GAME.yellow}
        iconBg="rgba(250,204,21,0.13)"
        title="Генные капсулы"
        subtitle="шансы показаны до открытия — редкость честная"
        right={<RightPill icon={Package} text={String(capsules)} color={GAME.yellow} />}
      />

      {/* комбо-шкала дня */}
      <Panel style={{ marginTop: 12 }}>
        <View className="flex-row items-start justify-between gap-3">
          <Text className="flex-1 font-semibold text-[17.5px] leading-snug" style={{ color: GAME.dim }}>
            комбо-шкала дня · за каждое событие дневника
          </Text>
          <Text className="font-extrabold text-[19px]" style={{ color: GAME.text }}>
            {combo} / {COMBO_GOAL}
          </Text>
        </View>
        <View className="mt-2.5">
          <GradBar pct={combo} colors={[GAME.yellow, '#BEF264']} />
        </View>

        <View className="mt-3.5 flex-row items-center gap-3">
          <View className="w-[104px] flex-row items-start gap-1.5">
            <Flame size={17} color="#FB923C" />
            <Text className="font-bold text-[17px] leading-tight" style={{ color: '#FDBA74' }}>
              стрик {streak} · капсула на {STREAK_FOR_CAPSULE}
            </Text>
          </View>
          <Pressable
            onPress={handleOpen}
            disabled={capsules <= 0}
            className="flex-1 items-center rounded-2xl py-3.5"
            style={{
              backgroundColor: capsules > 0 ? GAME.yellow : 'rgba(255,255,255,0.07)',
              opacity: capsules > 0 ? 1 : 0.5,
            }}
          >
            <Text className="font-extrabold text-[20px]" style={{ color: capsules > 0 ? '#231A02' : GAME.dim2 }}>
              Открыть капсулу
            </Text>
          </Pressable>
        </View>
      </Panel>

      {/* мутации: мутаген из дубликатов и стабильности меняется на капсулы */}
      <View className="mt-3 flex-row items-center gap-2.5 rounded-xl px-3 py-2.5" style={{ backgroundColor: GAME.panel, borderWidth: 1, borderColor: 'rgba(196,181,253,0.18)' }}>
        <Dna size={17} color="#C4B5FD" />
        <Text className="flex-1 font-bold text-[17px] leading-tight" style={{ color: '#C4B5FD' }}>
          мутаген: {mutagen} · {MUTAGEN_PER_CAPSULE} → капсула
        </Text>
        <Pressable
          onPress={onConvert}
          disabled={mutagen < MUTAGEN_PER_CAPSULE}
          accessibilityRole="button"
          accessibilityLabel={`Обменять ${MUTAGEN_PER_CAPSULE} мутагена на капсулу`}
          className="items-center rounded-xl px-3.5 py-2"
          style={{
            backgroundColor: mutagen >= MUTAGEN_PER_CAPSULE ? '#C4B5FD' : 'rgba(255,255,255,0.07)',
            opacity: mutagen >= MUTAGEN_PER_CAPSULE ? 1 : 0.6,
          }}
        >
          <Text
            className="font-extrabold text-[16.5px]"
            style={{ color: mutagen >= MUTAGEN_PER_CAPSULE ? '#231A02' : GAME.dim2 }}
          >
            Обменять
          </Text>
        </Pressable>
      </View>

      {/* честная таблица шансов */}
      <View className="mt-3 gap-2">
        {DROPS.map((d) => (
          <View
            key={d.key}
            className="flex-row items-center gap-2.5 rounded-xl px-3 py-3"
            style={{ backgroundColor: GAME.panel, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' }}
          >
            <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
            <Text className="flex-1 font-medium text-[17.5px]" style={{ color: GAME.text }}>
              {d.name} · <Text style={{ color: GAME.dim }}>{d.reward}</Text>
            </Text>
            <Text className="font-extrabold text-[18px]" style={{ color: GAME.text }}>
              {Math.round(d.p * 100)}%
            </Text>
          </View>
        ))}
      </View>

      <View className="mt-3 flex-row items-start gap-2 px-1">
        <Sparkles size={16} color={GAME.lime} />
        <Text className="flex-1 font-sans text-[16.5px] leading-relaxed" style={{ color: GAME.dim }}>
          Дубликаты не пропадают — превращаются в мутаген, а мутаген меняется
          на капсулы. Редкая аура сезона — статус, который не купить.
        </Text>
      </View>

      {/* результат вскрытия */}
      <Modal visible={!!result} transparent animationType="fade" onRequestClose={() => setResult(null)}>
        <View className="flex-1 items-center justify-center px-8" style={{ backgroundColor: 'rgba(2,8,5,0.82)' }}>
          {result && result.drop && (
            <View
              className="w-full rounded-3xl p-5"
              style={{ backgroundColor: GAME.card, borderWidth: 1, borderColor: result.drop.color }}
            >
              <View className="items-center">
                <View className="h-12 w-12 items-center justify-center rounded-full" style={{ backgroundColor: `${result.drop.color}22` }}>
                  <View className="h-3 w-3 rounded-full" style={{ backgroundColor: result.drop.color }} />
                </View>
                <Text className="mt-3 font-extrabold text-[23px]" style={{ color: GAME.text }}>
                  {result.drop.name}
                </Text>
                <Text className="mt-1 font-bold text-[19px]" style={{ color: result.drop.color }}>
                  {result.itemName || result.drop.reward}
                </Text>
                {result.itemName && (
                  <Text className="mt-2 text-center font-medium text-[17px] leading-snug" style={{ color: GAME.dim }}>
                    {result.dup
                      ? `Дубликат коллекции — превращён в +${DUP_MUTAGEN} мутагена`
                      : 'Новый предмет в коллекции организма!'}
                  </Text>
                )}
                <Pressable
                  onPress={() => setResult(null)}
                  className="mt-4 w-full items-center rounded-2xl py-3"
                  style={{ backgroundColor: GAME.lime }}
                >
                  <Text className="font-extrabold text-[19px]" style={{ color: '#12200F' }}>
                    Забрать
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

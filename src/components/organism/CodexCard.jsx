// Энциклопедия питания: коллекция «жителей биома». Житель открывается,
// когда цель дня впервые закрыта (вода, шаги, белок, тренировка, приёмы,
// баланс калорий, серия 3 дня). У каждого — настоящий факт о пользе:
// коллекционирование незаметно обучает.

import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { Sparkles } from 'lucide-react-native'
import { GameCard, GameHeader, RightPill, GAME } from './GameUi'
import { CODEX } from '@/lib/data/organism-game'

export function CodexCard({ codex }) {
  const opened = new Set(codex || [])
  const [selKey, setSelKey] = useState(null)
  const sel = CODEX.find((c) => c.key === selKey && opened.has(c.key))

  return (
    <GameCard>
      <GameHeader
        icon={Sparkles}
        iconColor={GAME.cyan}
        iconBg="rgba(103,232,249,0.13)"
        title="Энциклопедия"
        subtitle="жители биома открываются за цели дня"
        right={<RightPill text={`${opened.size}/${CODEX.length}`} color={GAME.cyan} />}
      />

      <View className="mt-3 flex-row flex-wrap gap-2">
        {CODEX.map((c) => {
          const has = opened.has(c.key)
          const active = selKey === c.key && has
          return (
            <Pressable
              key={c.key}
              onPress={() => has && setSelKey(has && selKey === c.key ? null : c.key)}
              accessibilityRole="button"
              accessibilityLabel={has ? `Житель ${c.name}: показать факт` : 'Ещё не открыт'}
              disabled={!has}
              className="min-w-[30%] flex-1 items-center rounded-2xl px-2 py-3"
              style={{
                backgroundColor: active ? 'rgba(103,232,249,0.12)' : GAME.panel,
                borderWidth: 1,
                borderColor: active ? 'rgba(103,232,249,0.4)' : 'rgba(255,255,255,0.05)',
                opacity: has ? 1 : 0.55,
              }}
            >
              <Text className="text-[26px]">{has ? c.emoji : '❓'}</Text>
              <Text className="mt-1 font-bold text-[15px]" style={{ color: has ? GAME.text : GAME.dim2 }}>
                {has ? c.name : '???'}
              </Text>
            </Pressable>
          )
        })}
      </View>

      {sel ? (
        <View
          className="mt-3 rounded-xl px-3.5 py-3"
          style={{ backgroundColor: GAME.panel, borderWidth: 1, borderColor: 'rgba(103,232,249,0.25)' }}
        >
          <Text className="font-sans text-[16px] leading-snug" style={{ color: GAME.dim }}>
            {sel.emoji} <Text className="font-bold" style={{ color: GAME.text }}>{sel.name}:</Text> {sel.fact}
          </Text>
        </View>
      ) : (
        <Text className="mt-3 px-1 font-sans text-[15.5px] leading-snug" style={{ color: GAME.dim2 }}>
          Тапни по открытому жителю — узнаешь, чем именно он помогает организму.
        </Text>
      )}
    </GameCard>
  )
}

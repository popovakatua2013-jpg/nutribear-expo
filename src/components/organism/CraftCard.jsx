// Синтез артефактов: мутаген (дубликаты капсул + стабильность) превращается
// в именной артефакт с пассивным бонусом. 9 мутагена = ровно 3 дубликата.
// Выбор за игроком: обменять мутаген на капсулу или скрафтить артефакт.

import { Pressable, Text, View } from 'react-native'
import { FlaskConical } from 'lucide-react-native'
import { GameCard, GameHeader, RightPill, Panel, GAME } from './GameUi'
import { CRAFT_COST, CRAFTS } from '@/lib/data/organism-game'

export function CraftCard({ mutagen, crafted, onCraft }) {
  const made = new Set(crafted || [])

  return (
    <GameCard>
      <GameHeader
        icon={FlaskConical}
        iconColor="#C084FC"
        iconBg="rgba(192,132,252,0.13)"
        title="Синтез"
        subtitle="мутаген → именной артефакт"
        right={<RightPill text={`${mutagen} 🧪`} color="#C084FC" />}
      />

      <View className="mt-3 gap-2">
        {CRAFTS.map((c) => {
          const has = made.has(c.key)
          const afford = (mutagen || 0) >= CRAFT_COST
          return (
            <Panel key={c.key} style={has ? { borderColor: 'rgba(163,230,53,0.35)' } : undefined}>
              <View className="flex-row items-center gap-2.5">
                <Text className="text-[24px]">{c.emoji}</Text>
                <View className="min-w-0 flex-1">
                  <Text className="font-bold text-[17.5px] leading-tight" style={{ color: GAME.text }}>
                    {c.name}
                  </Text>
                  <Text className="mt-0.5 font-sans text-[15.5px] leading-snug" style={{ color: GAME.dim }}>
                    {c.bonusText}
                  </Text>
                </View>
                {has ? (
                  <Text className="font-bold text-[15.5px]" style={{ color: GAME.lime }}>
                    создан ✓
                  </Text>
                ) : (
                  <Pressable
                    onPress={() => onCraft(c.key)}
                    accessibilityRole="button"
                    accessibilityLabel={`Синтезировать ${c.name} за ${CRAFT_COST} мутагена`}
                    disabled={!afford}
                    className="rounded-xl px-3 py-2 active:opacity-80"
                    style={{ backgroundColor: afford ? '#C084FC' : 'rgba(255,255,255,0.08)' }}
                  >
                    <Text
                      className="font-extrabold text-[15.5px]"
                      style={{ color: afford ? '#1E1033' : GAME.dim2 }}
                    >
                      {CRAFT_COST} 🧪
                    </Text>
                  </Pressable>
                )}
              </View>
            </Panel>
          )
        })}
      </View>

      <Text className="mt-3 px-1 font-sans text-[15.5px] leading-snug" style={{ color: GAME.dim2 }}>
        Мутаген копится от дубликатов капсул и стабильности. Каждое зелье — один раз;
        выбор «капсула или артефакт» всегда за тобой.
      </Text>
    </GameCard>
  )
}

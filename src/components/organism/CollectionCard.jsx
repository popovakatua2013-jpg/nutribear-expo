// Коллекция организма: артефакты биомов и ауры сезона + счётчик вскрытых
// капсул. Раньше добыча хранилась, но нигде не показывалась — увидеть её
// можно было только в журнале. Теперь всё найденное — на одной карточке:
// найденное подсвечено, ненайденное — «???».

import { Text, View } from 'react-native'
import { Backpack } from 'lucide-react-native'
import { GameCard, GameHeader, GAME } from './GameUi'
import { ARTIFACTS, AURAS } from '@/lib/data/organism-game'

export function CollectionCard({ items, opened }) {
  const owned = new Set(items || [])
  const all = [
    ...ARTIFACTS.map((name) => ({ name, kind: 'артефакт', color: '#C084FC' })),
    ...AURAS.map((name) => ({ name, kind: 'аура', color: GAME.yellow })),
  ]

  return (
    <GameCard>
      <GameHeader
        icon={Backpack}
        iconColor={GAME.lime}
        iconBg="rgba(163,230,53,0.13)"
        title="Коллекция"
        subtitle={`найдено ${owned.size} из ${all.length} · вскрыто капсул: ${opened}`}
      />

      <View className="mt-3 flex-row flex-wrap justify-between">
        {all.map((it) => {
          const has = owned.has(it.name)
          return (
            <View
              key={it.name}
              className="mb-2 w-[31.5%] items-center rounded-xl px-1.5 py-2.5"
              style={{
                backgroundColor: has ? 'rgba(163,230,53,0.10)' : GAME.panel,
                borderWidth: 1,
                borderColor: has ? `${it.color}55` : 'rgba(255,255,255,0.05)',
              }}
            >
              <View
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: has ? it.color : 'rgba(255,255,255,0.12)' }}
              />
              <Text
                numberOfLines={2}
                className="mt-1.5 text-center font-semibold text-[15px] leading-tight"
                style={{ color: has ? GAME.text : GAME.dim2 }}
              >
                {has ? it.name : '???'}
              </Text>
              <Text className="mt-0.5 font-sans text-[14.5px]" style={{ color: has ? it.color : GAME.dim2 }}>
                {it.kind}
              </Text>
            </View>
          )
        })}
      </View>

      <Text className="font-sans text-[16px] leading-relaxed" style={{ color: GAME.dim2 }}>
        Капсулы дают ген и кристаллы, иногда — артефакт или ауру. Дубликат не
        пропадает: он превращается в мутаген и приближает новую капсулу.
      </Text>
    </GameCard>
  )
}

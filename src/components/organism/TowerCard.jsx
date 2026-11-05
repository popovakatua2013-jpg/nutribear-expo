// Башня испытаний: волна = день с заполненной шкалой подряд. Провал не
// сбрасывает в ноль, а мягко спускает на одну волну. Каждая 3-я волна —
// награда (+2 гена, +2 кристалла).

import { Text, View } from 'react-native'
import { TowerControl } from 'lucide-react-native'
import { GameCard, GameHeader, RightPill, GradBar, GAME } from './GameUi'

export function TowerCard({ tower }) {
  const wave = tower?.wave || 0
  const toReward = wave === 0 ? 3 : 3 - (wave % 3)

  return (
    <GameCard>
      <GameHeader
        icon={TowerControl}
        iconColor={GAME.yellow}
        iconBg="rgba(250,204,21,0.13)"
        title="Башня испытаний"
        subtitle="серия дней с заполненной шкалой"
        right={<RightPill text={`волна ${wave}`} color={GAME.yellow} />}
      />

      <View className="mt-3">
        <GradBar
          pct={wave === 0 ? 2 : ((wave % 3) / 3) * 100}
          colors={[GAME.yellow, GAME.lime]}
        />
        <Text className="mt-2 px-1 font-sans text-[15.5px] leading-snug" style={{ color: GAME.dim }}>
          {wave === 0
            ? 'Начни волну: один хороший день — и башня поддастся.'
            : toReward === 3
              ? `Волна ${wave} взята — награда уже у тебя. Держи ритм!`
              : `До награды: ${toReward} ${toNextLabel(toReward)}. Слабый день спустит всего на одну волну — не страшно.`}
        </Text>
      </View>
    </GameCard>
  )
}

function toNextLabel(n) {
  return n === 1 ? 'день' : 'дня'
}

// Питомец-компаньон: растёт от «хороших» дней (кормёжка = день с
// заполненной шкалой). Каждые 3 кормёжки — уровень (+2 кристалла за рост).
// С 3-го уровня помогает организму: +1 ген за день расцвета, с 6-го — +2.

import { Text, View } from 'react-native'
import { HeartHandshake } from 'lucide-react-native'
import { GameCard, GameHeader, RightPill, GradBar, GAME } from './GameUi'
import { petLevelOf } from '@/store/useOrganismGameStore'

// Лестница питомца: яйцо → живность → верный друг
function petEmoji(level) {
  if (level >= 7) return '🦁'
  if (level >= 6) return '🐻'
  if (level >= 5) return '🐺'
  if (level >= 4) return '🦊'
  if (level >= 3) return '🦎'
  if (level >= 2) return '🐣'
  return '🥚'
}

function petName(level) {
  if (level >= 7) return 'Легендарный лев'
  if (level >= 6) return 'Медведь-хранитель'
  if (level >= 5) return 'Верный волк'
  if (level >= 4) return 'Лисёнок-трикстер'
  if (level >= 3) return 'Юный дракончик'
  if (level >= 2) return 'Птенец'
  return 'Таинственное яйцо'
}

export function PetCard({ pet, dayKey }) {
  const fedDays = pet?.fedDays || 0
  const level = petLevelOf(fedDays)
  const toNext = 3 - (fedDays % 3)
  const fedToday = pet?.lastFedKey === dayKey
  const growth = Math.floor(fedDays / 3)
  const bloomBonus = growth >= 2 ? '+2 гена' : growth >= 1 ? '+1 ген' : 'появится с 3-й кормёжки'

  return (
    <GameCard>
      <GameHeader
        icon={HeartHandshake}
        iconColor={GAME.pink}
        iconBg="rgba(253,164,175,0.13)"
        title="Питомец"
        subtitle="кормится твоими хорошими днями"
        right={<RightPill text={`ур. ${level}`} color={GAME.pink} />}
      />

      <View className="mt-3 flex-row items-center gap-3.5">
        <View
          className="h-16 w-16 items-center justify-center rounded-2xl"
          style={{ backgroundColor: 'rgba(0,0,0,0.28)', borderWidth: 1, borderColor: GAME.line }}
        >
          <Text className="text-[34px]">{petEmoji(level)}</Text>
        </View>
        <View className="min-w-0 flex-1">
          <Text className="font-extrabold text-[18.5px]" style={{ color: GAME.text }}>
            {petName(level)}
          </Text>
          <Text className="mt-0.5 font-sans text-[15.5px] leading-snug" style={{ color: GAME.dim }}>
            {fedToday
              ? 'Сегодня накормлен ✅ — спасибо за хороший день!'
              : 'Наполни шкалу дня — и питомец получит кормёжку.'}
          </Text>
          <Text className="mt-0.5 font-sans text-[15.5px] leading-snug" style={{ color: GAME.dim2 }}>
            Бонус расцвета: {bloomBonus} · до уровня {level + 1}: {toNext}{' '}
            {toNext === 1 ? 'день' : 'дня'}
          </Text>
        </View>
      </View>

      <View className="mt-3">
        <GradBar pct={((fedDays % 3) / 3) * 100} colors={[GAME.pink, GAME.yellow]} height={7} />
      </View>
    </GameCard>
  )
}

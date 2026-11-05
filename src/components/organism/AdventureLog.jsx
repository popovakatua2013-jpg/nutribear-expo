// Дневник приключений: журнал организма в тональности летописи —
// «День N», эмодзи-иконка события, живой текст. Читается как история
// путешествия, а не как лог событий.

import { Text, View } from 'react-native'
import { BookOpen } from 'lucide-react-native'
import { GameCard, GameHeader, Dot, GAME } from './GameUi'
import { adventureTale } from '@/lib/data/organism-game'

export function AdventureLog({ log, createdAt }) {
  const createdAtMs = createdAt ? Date.parse(`${createdAt}T00:00:00`) : null
  const tales = (log || []).map((e) => adventureTale(e, createdAtMs))

  return (
    <GameCard>
      <GameHeader
        icon={BookOpen}
        iconColor={GAME.cyan}
        iconBg="rgba(103,232,249,0.13)"
        title="Дневник приключений"
        subtitle={`летопись организма · ${tales.length} ${tales.length === 1 ? 'запись' : 'записей'}`}
      />

      <View className="mt-3 gap-2">
        {tales.length === 0 && (
          <Dot>Летопись пока пуста. Всё впереди — сделай первый день запоминающимся!</Dot>
        )}
        {tales.map((t, i) => (
          <Dot key={(log[i] && log[i].id) || i} color={i === 0 ? GAME.lime : GAME.emerald}>
            {t.emoji} {t.dayLabel} · {t.text}
          </Dot>
        ))}
      </View>
    </GameCard>
  )
}

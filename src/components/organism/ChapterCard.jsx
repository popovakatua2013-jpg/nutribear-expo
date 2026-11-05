// Глава сезона: неделя = одна глава летописи. 5 дней расцвета за неделю —
// глава закрыта победой (артефакт + кристаллы, итог приходит в понедельник).
// Прогресс живой: полоса заполняется каждый день расцвета.

import { Text, View } from 'react-native'
import { Feather } from 'lucide-react-native'
import { GameCard, GameHeader, RightPill, GradBar, GAME } from './GameUi'
import { CHAPTER_WIN_DAYS, chapterIntro } from '@/lib/data/organism-game'

export function ChapterCard({ weekNo, weekKey, goodDays, chapters, chapterLastWeek }) {
  const goodThisWeek = Object.entries(goodDays || {}).filter(
    ([k, v]) => v && k >= weekKey
  ).length
  const win = goodThisWeek >= CHAPTER_WIN_DAYS
  const prev = chapterLastWeek && chapters?.[chapterLastWeek]

  return (
    <GameCard>
      <GameHeader
        icon={Feather}
        iconColor={GAME.emerald}
        iconBg="rgba(52,211,153,0.13)"
        title={`Глава ${weekNo}`}
        subtitle={chapterIntro(weekNo)}
        right={
          win ? (
            <RightPill text="победа близко" color={GAME.lime} />
          ) : (
            <RightPill text={`${goodThisWeek}/${CHAPTER_WIN_DAYS}`} color={GAME.emerald} />
          )
        }
      />

      <View className="mt-3">
        <GradBar
          pct={(goodThisWeek / CHAPTER_WIN_DAYS) * 100}
          colors={[GAME.emerald, GAME.lime]}
        />
        <Text className="mt-2 px-1 font-sans text-[15.5px] leading-snug" style={{ color: GAME.dim }}>
          {CHAPTER_WIN_DAYS} дней расцвета за неделю — глава закрыта победой:
          артефакт биома и +3 кристалла в награду.
        </Text>
      </View>

      {prev && (
        <View
          className="mt-3 rounded-xl px-3 py-2.5"
          style={{ backgroundColor: GAME.panel, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' }}
        >
          <Text className="font-sans text-[15.5px] leading-snug" style={{ color: GAME.dim2 }}>
            {prev.win
              ? `📖 Прошлая глава закрыта победой: ${prev.best} дней расцвета.`
              : `📖 Прошлая глава: ${prev.best} из ${CHAPTER_WIN_DAYS}. В новой получится!`}
          </Text>
        </View>
      )}
    </GameCard>
  )
}

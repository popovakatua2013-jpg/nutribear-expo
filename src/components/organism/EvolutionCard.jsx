// Эволюция: текущая форма, склонность (сильнейшая ось генома), средний
// геном X/70, цена в генах и кнопка «Эволюционировать». Ветку выбирает
// геном, а не магазин — как в веб-макете. Ниже — история организма.

import { Pressable, Text, View } from 'react-native'
import { Sparkles, TrendingUp, Dna } from 'lucide-react-native'
import { GameCard, GameHeader, Panel, Caps, GradBar, Dot, GAME } from './GameUi'
import {
  BRANCHES,
  EVOLVE_GENOME,
  FORM_FINAL,
  GENOME_MAX,
  formName,
  genomeAvg70,
  journalDayLabel,
  nextEvolution,
  tendencyOf,
} from '@/lib/data/organism-game'

export function EvolutionCard({ org, genes, evoStage, evoBranch, stableDays, mutationUnlocked, log, onEvolve }) {
  const axes = org.axes
  const avg = genomeAvg70(axes)
  const tend = tendencyOf(axes)
  const branch = evoBranch || tend.name
  const form = formName(evoStage, branch)
  const next = nextEvolution(evoStage)

  const needGenes = next ? genes < next.cost : false
  const needGenome = next ? avg < next.genome : false
  const canEvolve = next && !needGenes && !needGenome

  const hint = !next
    ? 'Достигнута финальная форма — Титан. Легенда стаи.'
    : needGenes
      ? `Не хватает генов: открывай капсулы и держи комбо дня.`
      : needGenome
        ? `Не хватает генома: тяните оси событиями дневника.`
        : 'Геном созрел — организм готов эволюционировать!'

  // Чипы ветки: Силач I / II / III и Титан
  const chips = [`${branch} I`, `${branch} II`, `${branch} III`, FORM_FINAL]

  return (
    <GameCard>
      <GameHeader
        icon={Sparkles}
        iconColor="#A78BFA"
        iconBg="rgba(139,92,246,0.16)"
        title="Эволюция"
        subtitle="ветку выбирает геном за недели, а не магазин"
      />

      <View className="mt-3 gap-3">
        {/* текущая форма + склонность */}
        <Panel>
          <View className="flex-row items-center justify-between gap-2">
            <View className="flex-1">
              <Caps>ТЕКУЩАЯ ФОРМА</Caps>
              <Text className="mt-1 font-extrabold text-[27px] leading-tight" style={{ color: GAME.text }}>
                {form}
              </Text>
            </View>
            <View
              className="flex-row items-center gap-1.5 rounded-full px-3 py-2"
              style={{ backgroundColor: 'rgba(0,0,0,0.3)', maxWidth: 150 }}
            >
              <TrendingUp size={15} color={GAME.lime} />
              <Text className="font-semibold text-[16px] leading-tight" style={{ color: GAME.text }}>
                склонность: {tend.name} ({tend.v})
              </Text>
            </View>
          </View>

          {/* средний геном */}
          <View className="mt-3.5 flex-row items-baseline justify-between">
            <Text className="font-semibold text-[17.5px]" style={{ color: GAME.dim }}>
              средний геном
            </Text>
            <Text className="font-extrabold text-[19px]" style={{ color: GAME.text }}>
              {avg} / {GENOME_MAX}
            </Text>
          </View>
          <View className="mt-2">
            <GradBar pct={(avg / GENOME_MAX) * 100} colors={[GAME.emerald, GAME.lime]} />
          </View>

          {/* цена + кнопка */}
          <View className="mt-3.5 flex-row items-stretch gap-2.5">
            <View
              className="justify-center rounded-2xl px-3"
              style={{ backgroundColor: 'rgba(163,230,53,0.10)', borderWidth: 1, borderColor: 'rgba(163,230,53,0.3)' }}
            >
              <View className="flex-row items-center gap-1.5">
                <Dna size={16} color={GAME.lime} />
                <Text className="font-bold text-[17.5px] leading-tight" style={{ color: GAME.lime }}>
                  цена: {next ? next.cost : '—'}
                </Text>
              </View>
              <Text className="mt-0.5 font-sans text-[15px]" style={{ color: GAME.dim2 }}>
                генов: {genes}
              </Text>
            </View>
            <Pressable
              onPress={canEvolve && next ? () => onEvolve({ cost: next.cost, fromName: form, toName: formName(next.to, branch) }) : undefined}
              disabled={!canEvolve || !next}
              className="flex-1 items-center justify-center rounded-2xl px-3 py-3.5"
              style={{
                backgroundColor: canEvolve ? GAME.lime : 'rgba(255,255,255,0.07)',
                borderWidth: 1,
                borderColor: canEvolve ? GAME.lime : 'rgba(255,255,255,0.05)',
                opacity: canEvolve ? 1 : 0.75,
              }}
              android_ripple={{ color: 'rgba(0,0,0,0.15)' }}
            >
              <Text className="font-bold text-[19px]" style={{ color: canEvolve ? '#12200F' : GAME.dim2 }}>
                Эволюционировать
              </Text>
            </Pressable>
          </View>

          <Text className="mt-3 font-sans text-[16.5px] leading-snug" style={{ color: GAME.dim }}>
            {hint}
          </Text>
        </Panel>

        {/* ветви */}
        <View className="flex-row gap-2">
          {chips.map((c, i) => {
            // чип горит, когда стадия достигнута (включая текущую),
            // следующая — обведена лаймом
            const reached = evoStage >= i + 1
            const isNext = next && next.to === i + 1
            return (
              <View
                key={c}
                className="flex-1 items-center rounded-xl py-2"
                style={{
                  backgroundColor: reached ? 'rgba(52,211,153,0.14)' : 'rgba(0,0,0,0.25)',
                  borderWidth: 1,
                  borderColor: isNext ? 'rgba(163,230,53,0.45)' : 'rgba(255,255,255,0.05)',
                }}
              >
                <Text className="font-semibold text-[15px] leading-tight" style={{ color: reached ? GAME.emerald : GAME.dim }}>
                  {c}
                </Text>
              </View>
            )
          })}
        </View>

        {/* история организма */}
        <Caps style={{ marginTop: 2 }}>ИСТОРИЯ ОРГАНИЗМА</Caps>
        <View className="gap-2">
          <Dot>Организм создан из первых записей дневника.</Dot>
          <Dot color={mutationUnlocked ? GAME.lime : GAME.dim2}>
            {mutationUnlocked
              ? 'Стабильность 7 дней — открыта первая мутация.'
              : `Стабильность ${Math.min(stableDays, 7)} / 7 дней — первая мутация скоро.`}
          </Dot>
          {log.slice(0, 3).map((e) => (
            <Dot key={e.id} color={GAME.emerald}>
              {journalDayLabel(e.ts)} · {e.text}
            </Dot>
          ))}
        </View>
      </View>
    </GameCard>
  )
}

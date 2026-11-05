// Рейд стаи: недельная кооперативная цель. Босс с HP, мой вклад
// (еда = удар, вода = щит, тренировка = крит) и суммарный вклад стаи.
// Стая симулируется нейтрально: вклад участников детерминированный,
// никаких «таблиц позора» — как в макете.

import { Text, View } from 'react-native'
import { Skull, Users, Utensils, Droplets, Dumbbell } from 'lucide-react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { GameCard, GameHeader, RightPill, Caps, GAME } from './GameUi'
import { PACK_SIZE } from '@/lib/data/organism-game'

export function RaidCard({ boss, hp, maxHp, weekNo, myDmg, myShield, packDmg, killed, rewarded, heal = 0, absorb = 0, medals = [] }) {
  const hpPct = Math.max(0, Math.min(100, (hp / maxHp) * 100))
  const dead = hp <= 0

  return (
    <GameCard>
      <GameHeader
        icon={Skull}
        iconColor={GAME.red}
        iconBg="rgba(239,68,68,0.13)"
        title={boss.legend ? 'Легендарный рейд' : 'Рейд стаи'}
        subtitle={
          boss.legend
            ? `босс-легенда · неделя ${weekNo} · награда та же, характер злее`
            : `недельная кооперативная цель · неделя ${weekNo}`
        }
        right={<RightPill icon={Users} text={String(PACK_SIZE)} color={GAME.emerald} />}
      />

      {/* босс */}
      <View
        className="mt-3 rounded-2xl p-3.5"
        style={{ backgroundColor: 'rgba(58,12,20,0.5)', borderWidth: 1, borderColor: boss.legend ? 'rgba(250,204,21,0.4)' : 'rgba(248,113,113,0.22)' }}
      >
        <View className="flex-row items-baseline justify-between gap-2">
          <Text className="font-extrabold text-[20.5px]" style={{ color: GAME.pink }}>
            {dead ? `${boss.emoji} ${boss.name}` : boss.name}
          </Text>
          <Text className="font-extrabold text-[18px]" style={{ color: GAME.pink }}>
            {Math.max(0, hp)} <Text style={{ color: GAME.dim2 }}>/ {maxHp} HP</Text>
          </Text>
        </View>
        <View className="mt-2.5 h-2.5 w-full overflow-hidden rounded-full" style={{ backgroundColor: '#2A0E14' }}>
          <View style={{ width: `${Math.max(1.5, hpPct)}%`, height: '100%', borderRadius: 999, overflow: 'hidden' }}>
            <LinearGradient colors={['#DC2626', '#F87171']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ flex: 1 }} />
          </View>
        </View>

        {/* регенерация за пропущенные дни и то, что погасили щиты */}
        {heal > 0 && (
          <Text className="mt-1.5 font-sans text-[15px]" style={{ color: GAME.dim2 }}>
            босс подлечился +{heal} HP{absorb > 0 ? ` · щиты погасили ${absorb}` : ''}
          </Text>
        )}

        {/* урон / щиты / стая */}
        <View className="mt-3 flex-row gap-2">
          <Stat label="ВАШ УРОН" value={myDmg} />
          <Stat label="ЩИТЫ" value={myShield} />
          <Stat label="СТАЯ" value={packDmg} accent />
        </View>
      </View>

      {/* механика */}
      <View className="mt-3 flex-row gap-2">
        <Chip icon={Utensils} color={GAME.lime} text="приём пищи = удар" />
        <Chip icon={Droplets} color={GAME.cyan} text="вода = щит от лечения" />
        <Chip icon={Dumbbell} color={GAME.yellow} text="тренировка = крит ×2" />
      </View>

      {dead && (
        <View
          className="mt-3 rounded-2xl px-3.5 py-3"
          style={{ backgroundColor: 'rgba(52,211,153,0.1)', borderWidth: 1, borderColor: 'rgba(52,211,153,0.35)' }}
        >
          <Text className="font-bold text-[17.5px]" style={{ color: GAME.emerald }}>
            {rewarded ? 'Босс павший! Награда стаи получена: +15 генов, +5 кристаллов.' : 'Босс павший! Ждём нового в следующую неделю.'}
          </Text>
        </View>
      )}

      {/* медали вклада: честные пороги от реальных итогов недели */}
      {medals.length > 0 && (
        <View className="mt-3 flex-row flex-wrap gap-1.5">
          {medals.map((m) => (
            <View
              key={m.name}
              className="flex-row items-center gap-1.5 rounded-full px-3 py-1.5"
              style={{ backgroundColor: 'rgba(0,0,0,0.28)', borderWidth: 1, borderColor: 'rgba(250,204,21,0.35)' }}
            >
              <Text className="text-[15px]">{m.emoji}</Text>
              <Text className="font-bold text-[15px]" style={{ color: GAME.yellow }}>
                {m.name}
              </Text>
            </View>
          ))}
        </View>
      )}

      <Text className="mt-3 font-sans text-[16.5px] leading-relaxed" style={{ color: GAME.dim }}>
        Механика честная: за каждый день недели без еды босс лечится +30 HP,
        но стаканы воды гасят лечение (−6 HP за стакан), а день с тренировкой
        бьёт критом — урон еды удваивается. Вклад показан нейтрально —
        «вклад в урон» вместо таблицы позора.
      </Text>
    </GameCard>
  )
}

function Stat({ label, value, accent }) {
  return (
    <View className="flex-1 rounded-xl px-2 py-2.5" style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}>
      <Caps style={{ textAlign: 'center' }}>{label}</Caps>
      <Text
        className="mt-1 text-center font-extrabold text-[23px]"
        style={{ color: accent ? GAME.emerald : GAME.text }}
      >
        {value}
      </Text>
    </View>
  )
}

function Chip({ icon: Icon, color, text }) {
  return (
    <View
      className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl px-1.5 py-2.5"
      style={{ backgroundColor: 'rgba(0,0,0,0.25)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' }}
    >
      <Icon size={15} color={color} />
      <Text className="font-medium text-[15px] leading-tight" style={{ color: GAME.dim }}>
        {text}
      </Text>
    </View>
  )
}

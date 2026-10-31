// Сводка за день «Съедено за сегодня»: отдельный блок над планом питания.
// Собирает главные числа дня в одном месте: съедено/норма ккал,
// осталось или перебор (плашка с огоньком), прогресс-бар и БЖУ за день.

import { StyleSheet, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Flame } from 'lucide-react-native'
import { formatNum } from '@/lib/format'
import { bjuLine } from '@/lib/data/bju'
import { ProgressBar } from '../ui/ProgressBar'

const MAX = 1.25

export function DailySummary({ consumed = 0, target = 0, bju = { p: 0, f: 0, c: 0 } }) {
  const pct = target > 0 ? Math.min(100, (consumed / target) * 100) : 0
  const remaining = Math.max(0, target - consumed)
  const over = Math.max(0, consumed - target)
  const done = consumed > 0 && remaining === 0 && over === 0

  return (
    <View
      accessibilityLabel="Сводка за день"
      className="overflow-hidden rounded-3xl border border-bear-line bg-bear-card p-5"
    >
      {/* мягкая фиолетовая подсветка сверху — глубина без пестроты */}
      <LinearGradient
        start={{ x: 0, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        colors={['rgba(123,108,246,0.16)', 'rgba(123,108,246,0)']}
        style={StyleSheet.absoluteFill}
      />
      <View className="flex-row items-end justify-between gap-3">
        <View className="min-w-0 flex-1">
          <Text maxFontSizeMultiplier={MAX} className="font-medium text-xs text-bear-sub">
            Съедено за сегодня
          </Text>
          <Text
            maxFontSizeMultiplier={MAX}
            className="mt-1 font-extrabold text-[22px] tracking-tight text-bear-text"
          >
            {formatNum(consumed)}
            <Text maxFontSizeMultiplier={MAX} className="font-semibold text-[14px] text-bear-sub">
              {'  '}/ {formatNum(target)} ккал
            </Text>
          </Text>
        </View>

        <View
          className={`shrink-0 flex-row items-center gap-1.5 rounded-full px-3 py-1.5 ${
            over > 0 ? 'bg-amber-400/10' : done ? 'bg-emerald-400/10' : 'bg-[#1A2647]'
          }`}
        >
          <Flame size={14} color={over > 0 ? '#FCD34D' : done ? '#6EE7B7' : '#AEB9D9'} />
          <Text
            maxFontSizeMultiplier={MAX}
            className={`font-semibold text-xs ${
              over > 0 ? 'text-amber-300' : done ? 'text-emerald-300' : 'text-bear-soft'
            }`}
          >
            {over > 0
              ? `+${formatNum(over)} ккал`
              : done
                ? 'Цель достигнута'
                : `Осталось ${formatNum(remaining)}`}
          </Text>
        </View>
      </View>

      {/* прогресс дня */}
      <View className="mt-3">
        <ProgressBar pct={pct} h={8} tone={done ? 'emerald' : over > 0 ? 'amber' : 'grad'} />
      </View>

      {/* БЖУ за день */}
      <Text maxFontSizeMultiplier={MAX} className="mt-3 px-1 font-sans text-[11px] text-bear-dim">
        За день: <Text maxFontSizeMultiplier={MAX} className="font-semibold text-bear-sub">{bjuLine(bju)}</Text>
      </Text>
    </View>
  )
}

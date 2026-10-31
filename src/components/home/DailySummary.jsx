// Сводка «Съедено за сегодня» — компактная версия референса:
// слева кольцо прогресса 80 px с процентом от дневной нормы,
// справа — калории крупно и пилюля статуса («Осталось / Перебор /
// Цель достигнута»); ниже — нутриенты сеткой 2×2 (белки, жиры,
// углеводы, клетчатка): цветная точка + подпись + значение,
// под ними тонкий бар. Нормы БЖУ — «классическая тарелка»
// (20/30/50% калорий), клетчатка — 25 г/день (ВОЗ, FIBER_NORM).

import { Text, View } from 'react-native'
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg'
import { Flame } from 'lucide-react-native'
import { formatNum } from '@/lib/format'
import { FIBER_NORM } from '@/lib/data/nutrition'
import { ProgressBar } from '../ui/ProgressBar'

const MAX = 1.25
const RING = 80
const SW = 9
const R = (RING - SW) / 2
const C = 2 * Math.PI * R

// Нормы нутриентов от дневной нормы калорий
function macroTargets(kcal) {
  return {
    p: Math.round((kcal * 0.2) / 4),
    f: Math.round((kcal * 0.3) / 9),
    c: Math.round((kcal * 0.5) / 4),
    fib: FIBER_NORM,
  }
}

function NutrientCell({ label, value, target, color }) {
  const pct = target > 0 ? Math.min(100, (value / target) * 100) : 0
  return (
    <View className="min-w-0 flex-1">
      <View className="flex-row items-center gap-1.5">
        <View className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
        <Text
          numberOfLines={1}
          maxFontSizeMultiplier={MAX}
          className="min-w-0 flex-1 font-sans text-[10.5px] text-bear-sub"
        >
          {label}
        </Text>
        <Text
          maxFontSizeMultiplier={MAX}
          className="shrink-0 font-sans text-[10.5px] text-bear-sub2"
        >
          {`${formatNum(Math.round(value))} / ${formatNum(target)} г`}
        </Text>
      </View>
      <View className="mt-1">
        <ProgressBar pct={pct} h={3} color={color} />
      </View>
    </View>
  )
}

export function DailySummary({ consumed = 0, target = 0, bju = { p: 0, f: 0, c: 0, fib: 0 } }) {
  const pct = target > 0 ? Math.min(100, (consumed / target) * 100) : 0
  const remaining = Math.max(0, target - consumed)
  const over = Math.max(0, consumed - target)
  const done = consumed > 0 && remaining === 0 && over === 0
  const norms = macroTargets(target)

  const ringColor = over > 0 ? '#FBBF24' : done ? '#34D399' : null // null → градиент
  const pillTone = over > 0
    ? { border: 'rgba(251,191,36,0.35)', bg: 'rgba(251,191,36,0.08)', text: '#FCD34D' }
    : done
      ? { border: 'rgba(52,211,153,0.35)', bg: 'rgba(52,211,153,0.08)', text: '#6EE7B7' }
      : { border: 'rgba(167,139,250,0.35)', bg: 'rgba(123,108,246,0.1)', text: '#A78BFA' }

  return (
    <View
      accessibilityLabel="Сводка за день"
      className="rounded-3xl border border-bear-line bg-bear-card p-4"
    >
      <Text maxFontSizeMultiplier={MAX} className="font-bold text-[14.5px] tracking-tight text-bear-text">
        Съедено за сегодня
      </Text>

      {/* кольцо + калории + плашка остатка */}
      <View className="mt-3 flex-row items-center gap-3.5">
        <View
          accessibilityRole="progressbar"
          accessibilityLabel={`Выполнено ${Math.round(pct)} процентов дневной нормы`}
          className="shrink-0"
          style={{ width: RING, height: RING }}
        >
          <Svg width={RING} height={RING}>
            <Defs>
              <LinearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor="#8B5CF6" />
                <Stop offset="1" stopColor="#6C8CFF" />
              </LinearGradient>
            </Defs>
            <Circle cx={RING / 2} cy={RING / 2} r={R} stroke="rgba(255,255,255,0.07)" strokeWidth={SW} fill="none" />
            <Circle
              cx={RING / 2}
              cy={RING / 2}
              r={R}
              stroke={ringColor || 'url(#ringGrad)'}
              strokeWidth={SW}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${(C * pct) / 100} ${C}`}
              transform={`rotate(-90 ${RING / 2} ${RING / 2})`}
            />
          </Svg>
          <View className="absolute inset-0 items-center justify-center">
            <Text maxFontSizeMultiplier={MAX} className="font-extrabold text-[17px] leading-tight text-bear-text">
              {Math.round(pct)}%
            </Text>
            <Text maxFontSizeMultiplier={MAX} className="font-sans text-[8px] leading-tight text-bear-dim">
              от нормы
            </Text>
          </View>
        </View>

        <View className="min-w-0 flex-1">
          <Text maxFontSizeMultiplier={MAX} className="font-extrabold text-[20px] leading-tight tracking-tight text-bear-text">
            {formatNum(consumed)}
            <Text maxFontSizeMultiplier={MAX} className="font-semibold text-[12.5px] text-bear-sub">
              {`  / ${formatNum(target)} ккал`}
            </Text>
          </Text>

          <View
            className="mt-1.5 shrink-0 flex-row items-center self-start gap-1 rounded-full px-2.5 py-1"
            style={{ borderWidth: 1, borderColor: pillTone.border, backgroundColor: pillTone.bg }}
          >
            <Flame size={12} color={pillTone.text} />
            <Text maxFontSizeMultiplier={MAX} className="font-semibold text-[11px]" style={{ color: pillTone.text }}>
              {over > 0
                ? `Перебор +${formatNum(over)}`
                : done
                  ? 'Цель достигнута 🎉'
                  : `Осталось ${formatNum(remaining)}`}
            </Text>
          </View>
        </View>
      </View>

      {/* нутриенты сеткой 2×2: точка + подпись + значение, под ними бар */}
      <View className="mt-3 flex-row gap-3">
        <NutrientCell label="Белки" value={bju.p} target={norms.p} color="#34D399" />
        <NutrientCell label="Жиры" value={bju.f} target={norms.f} color="#FB923C" />
      </View>
      <View className="mt-2.5 flex-row gap-3">
        <NutrientCell label="Углеводы" value={bju.c} target={norms.c} color="#38BDF8" />
        <NutrientCell label="Клетчатка" value={bju.fib || 0} target={norms.fib} color="#2DD4BF" />
      </View>
    </View>
  )
}

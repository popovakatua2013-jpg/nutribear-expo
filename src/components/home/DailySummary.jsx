// Сводка «Съедено за сегодня» — компактная версия референса:
// слева кольцо 72 px, внутри — съеденные ккал («0 из 1800 ккал»),
// справа такое же кольцо с сожжёнными за день ккал, между ними —
// пилюля статуса («Осталось / Перебор / Цель достигнута»). Долгий тап
// по левой половине — изменить цель по калориям, по правому кольцу и
// строке итога — цель «сжечь за день» (карточка «Калории» с главной
// убрана как дубликат, её единственная уникальная функция переехала
// сюда). Мини-чипы шагов/воды/минут удалены — эти цифры живут в трёх
// карточках над сводкой. Ниже — строка «Итог: съедено − сожжено»,
// далее нутриенты сеткой 2×2 (белки, жиры, углеводы, клетчатка):
// цветная точка + подпись + значение, под ними тонкий бар. Нормы
// БЖУ — «классическая тарелка» (20/30/50% калорий), клетчатка —
// 25 г/день (ВОЗ, FIBER_NORM).

import { Text, View, Pressable } from 'react-native'
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg'
import { Flame, Pencil } from 'lucide-react-native'
import { formatNum } from '@/lib/format'
import { FIBER_NORM } from '@/lib/data/nutrition'
import { daysLabel } from '@/lib/streak'
import { ProgressBar } from '../ui/ProgressBar'

const MAX = 1.25
const RING = 72
const SW = 8
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

// Кольцо прогресса с числом внутри: слева — съедено от цели калориями,
// справа — сожжено за день. Заливка дуги — процент, внутри крупно
// значение и мелко «из N ккал», под кольцом — подпись
function KcalRing({ value, goal, caption, pct, color, gradient, accessibilityLabel }) {
  const dash = (C * Math.max(0, Math.min(100, pct))) / 100
  return (
    <View className="items-center" style={{ width: RING }}>
      <View
        accessibilityRole="progressbar"
        accessibilityLabel={accessibilityLabel}
        style={{ width: RING, height: RING }}
      >
        <Svg width={RING} height={RING}>
          {gradient && (
            <Defs>
              <LinearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor="#8B5CF6" />
                <Stop offset="1" stopColor="#6C8CFF" />
              </LinearGradient>
            </Defs>
          )}
          <Circle cx={RING / 2} cy={RING / 2} r={R} stroke="rgba(255,255,255,0.07)" strokeWidth={SW} fill="none" />
          <Circle
            cx={RING / 2}
            cy={RING / 2}
            r={R}
            stroke={color || 'url(#ringGrad)'}
            strokeWidth={SW}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${C}`}
            transform={`rotate(-90 ${RING / 2} ${RING / 2})`}
          />
        </Svg>
        <View className="absolute inset-0 items-center justify-center">
          <Text
            adjustsFontSizeToFit
            numberOfLines={1}
            maxFontSizeMultiplier={MAX}
            className="text-center font-extrabold text-[16px] leading-tight text-bear-text"
            style={{ width: RING - 16 }}
          >
            {formatNum(value)}
          </Text>
          <Text maxFontSizeMultiplier={MAX} className="font-sans text-[8px] leading-tight text-bear-dim">
            {goal != null ? `из ${formatNum(goal)} ккал` : 'ккал'}
          </Text>
        </View>
      </View>
      <Text maxFontSizeMultiplier={MAX} className="mt-1 font-sans text-[9.5px] text-bear-sub">
        {caption}
      </Text>
    </View>
  )
}

export function DailySummary({
  consumed = 0,
  target = 0,
  bju = { p: 0, f: 0, c: 0, fib: 0 },
  burned = 0, // вся активность за день: тренировки + шаги
  burnGoal = 0, // цель «сжечь за день», ккал
  streak = 0, // дней подряд с дневником (чип с огоньком)
  onEditBurnGoal, // долгий тап по кольцу сжигания и строке итога — изменить цель
  onEditKcalGoal, // долгий тап по левой половине — изменить цель по калориям
}) {
  const pct = target > 0 ? Math.min(100, (consumed / target) * 100) : 0
  const remaining = Math.max(0, target - consumed)
  const over = Math.max(0, consumed - target)
  const done = consumed > 0 && remaining === 0 && over === 0
  const norms = macroTargets(target)

  const burnPct = burnGoal > 0 ? Math.round((burned / burnGoal) * 100) : 0
  const net = consumed - burned // итог дня с учётом активности

  // Левая половина (кольцо + пилюля) — Pressable, когда умеет менять
  // цель по калориям долгим тапом, иначе обычный View
  const Row = onEditKcalGoal ? Pressable : View
  // Правое кольцо — Pressable для правки цели сжигания, иначе View
  const BurnZone = onEditBurnGoal ? Pressable : View
  // Строка итога — тоже правка цели сжигания долгим тапом
  const NetRow = onEditBurnGoal ? Pressable : View

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
      <View className="flex-row items-center justify-between gap-2">
        <Text maxFontSizeMultiplier={MAX} className="font-bold text-[14.5px] tracking-tight text-bear-text">
          Съедено за сегодня
        </Text>
        {streak > 0 ? (
          <View
            accessibilityLabel={`Стрик: ${streak} ${daysLabel(streak)} подряд`}
            className="shrink-0 flex-row items-center gap-1 rounded-full px-2.5 py-1"
            style={{ backgroundColor: 'rgba(251,146,60,0.13)' }}
          >
            <Flame size={12} color="#fb923c" />
            <Text maxFontSizeMultiplier={MAX} className="font-bold text-[11px] text-[#fdba74]">
              {`${streak} ${daysLabel(streak)}`}
            </Text>
          </View>
        ) : null}
      </View>

      {/* кольцо «съедено» + пилюля остатка + кольцо «сожжено». Долгий тап
          по левой половине — цель по калориям, по правому кольцу — цель
          сжигания: единственные уникальные действия бывшей карточки
          «Калории» и старой строки «Сожжено за сегодня» */}
      <View className="mt-3 flex-row items-center gap-2.5">
        <Row
          onLongPress={onEditKcalGoal}
          delayLongPress={450}
          accessibilityRole={onEditKcalGoal ? 'button' : undefined}
          accessibilityLabel={
            onEditKcalGoal
              ? `Съедено ${formatNum(consumed)} из ${formatNum(target)} килокалорий. Долгий тап — изменить цель по калориям`
              : undefined
          }
          className="min-w-0 flex-1 flex-row items-center gap-2.5"
        >
          <KcalRing
            value={consumed}
            goal={target}
            caption="съедено"
            pct={pct}
            gradient
            accessibilityLabel={`Съедено ${formatNum(consumed)} из ${formatNum(target)} килокалорий, ${Math.round(pct)} процентов дневной нормы`}
          />
          <View className="min-w-0 flex-1 items-center">
            <View
              className="flex-row items-center self-center gap-1 rounded-full px-2.5 py-1"
              style={{ borderWidth: 1, borderColor: pillTone.border, backgroundColor: pillTone.bg }}
            >
              <Flame size={12} color={pillTone.text} />
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.85}
                maxFontSizeMultiplier={MAX}
                className="font-semibold text-[11px]"
                style={{ color: pillTone.text }}
              >
                {over > 0
                  ? `Перебор +${formatNum(over)}`
                  : done
                    ? 'Цель достигнута'
                    : `Осталось ${formatNum(remaining)}`}
              </Text>
            </View>
          </View>
        </Row>

        <BurnZone
          onLongPress={onEditBurnGoal}
          delayLongPress={450}
          accessibilityRole={onEditBurnGoal ? 'button' : undefined}
          accessibilityLabel={
            onEditBurnGoal
              ? `Сожжено за сегодня ${formatNum(burned)} килокалорий. Долгий тап — изменить цель сжигания`
              : undefined
          }
          className="shrink-0"
        >
          <KcalRing
            value={burned}
            goal={burnGoal > 0 ? burnGoal : null}
            caption="сожжено"
            pct={burnPct}
            color="#f87171"
            accessibilityLabel={`Сожжено ${formatNum(burned)} килокалорий за сегодня${burnGoal > 0 ? ` из ${formatNum(burnGoal)}` : ''}`}
          />
        </BurnZone>
      </View>

      {/* итог дня с учётом активности; долгий тап — изменить цель сжигания */}
      <NetRow
        onLongPress={onEditBurnGoal}
        delayLongPress={450}
        accessibilityRole={onEditBurnGoal ? 'button' : undefined}
        accessibilityLabel={
          onEditBurnGoal
            ? `Итог дня: съедено ${formatNum(consumed)} минус сожжено ${formatNum(burned)} равно ${formatNum(net)} килокалорий. Долгий тап — изменить цель сжигания`
            : undefined
        }
        className="mt-2.5 flex-row items-center gap-2 rounded-2xl bg-[#f87171]/[0.07] px-3 py-2.5"
      >
        <Flame size={13} color="#f87171" />
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.85}
          maxFontSizeMultiplier={MAX}
          className="min-w-0 flex-1 font-semibold text-[11px] text-bear-sub"
        >
          {`Итог: съедено ${formatNum(consumed)} − сожжено ${formatNum(burned)} = ${formatNum(net)} ккал`}
        </Text>
        {onEditBurnGoal && <Pencil size={12} color="#8B96B8" />}
      </NetRow>

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

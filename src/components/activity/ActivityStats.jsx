// Компактный ряд из трёх карточек за сегодня: «Шаги», «Вода»,
// «Активность» — в одну строку (361dp ≈ 102dp на карточку).
// Карточка: сверху иконка слева и «+» (шаги/вода) или кольцо цели
// сжигания (активность) справа; ниже — подпись, значение, подстрока
// и итоговая строка. Текст однострочный и при нехватке ширины сжимается
// (adjustsFontSizeToFit, минимум 80%), а не обрезается; иконки/шрифты
// уменьшены против полноразмерной версии, чтобы всё влезало в узкую
// колонку. Карточку «Калории» убрали ранее — она дублировала сводку
// «Съедено за сегодня» (там и съедено/цель, и пилюля «Осталось/Перебор»,
// и сожжено; долгий тап по строке калорий в сводке — изменить цель).
// Тап по карточке открывает ИСТОРИЮ показателя по дням (вся история
// живёт внутри блоков): «Шаги» — шаги за день, «Вода» — вода за день
// (быстрое добавление — на «+», ручной ввод шагов и правка стаканов —
// из подвала окна истории), «Активность» — скролл к тренировкам.
// Долгий тап по «Вода» и «Активность» — изменить цель прямо с главной.
// «+» на шагах/воде добавляет 1 000 шагов / стакан воды.

import { Pressable, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Footprints, Dumbbell, Droplets, Plus } from 'lucide-react-native'
import { formatNum } from '@/lib/format'
import { BurnRing } from '../ui/BurnRing'

// однострочный текст, который при нехватке ширины сжимается, а не режется
function FitLine({ className, maxFontSizeMultiplier = 1.25, children }) {
  return (
    <Text
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.8}
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      className={className}
    >
      {children}
    </Text>
  )
}

function StatCard({ colors, Icon, label, value, sub, foot, onPlus, plusLabel, onPress, onLongPress, longHint, ring }) {
  const Root = onPress || onLongPress ? Pressable : View
  return (
    <Root
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={450}
      accessibilityRole={onPress || onLongPress ? 'button' : undefined}
      accessibilityLabel={
        onLongPress && !onPress
          ? `${label}. ${longHint || 'Долгий тап — изменить цель'}`
          : onPress
            ? `Открыть: ${label}`
            : undefined
      }
      className={`flex-1 rounded-2xl border p-3 ${colors.border} ${colors.bg} ${onPress || onLongPress ? 'active:opacity-80' : ''}`}
    >
      {/* шапка: иконка слева, «+»/кольцо справа */}
      <View className="flex-row items-center justify-between">
        <LinearGradient
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          colors={colors.icon}
          style={{ width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon size={16} color="#FFFFFF" />
        </LinearGradient>

        {ring ? (
          // Кольцо прогресса цели сжигания (на карточке «Активность»)
          <BurnRing pct={ring.pct} />
        ) : (
          onPlus && (
            <Pressable
              onPress={onPlus}
              accessibilityRole="button"
              accessibilityLabel={plusLabel}
              hitSlop={6}
              className={`h-8 w-8 shrink-0 items-center justify-center rounded-full border active:opacity-70 ${colors.btn}`}
            >
              <Plus size={15} color={colors.tint} strokeWidth={2.5} />
            </Pressable>
          )
        )}
      </View>

      {/* текст — на всю ширину карточки, ничего не обрезается */}
      <FitLine className="mt-2 font-medium text-[10px] text-bear-soft">
        {label}
      </FitLine>
      <FitLine maxFontSizeMultiplier={1.2} className="font-extrabold text-[17px] leading-tight tracking-tight text-bear-text">
        {value}
      </FitLine>
      <FitLine className="mt-0.5 font-sans text-[9.5px] text-bear-sub2">
        {sub}
      </FitLine>
      {/* итоговая строка — есть у всех карточек, поэтому ряды одной высоты */}
      {foot}
    </Root>
  )
}

// Итоговая строка карточки: всегда присутствует (даже «цель не задана»),
// чтобы верхний и нижний ряды были одинаковой высоты
function Foot({ tone = 'muted', children }) {
  const color =
    tone === 'good' ? 'text-emerald-300'
      : tone === 'warn' ? 'text-rose-300'
        : tone === 'accent' ? 'text-violet-300'
          : tone === 'sky' ? 'text-sky-300'
            : 'text-bear-sub2'
  return (
    <FitLine className={`mt-0.5 font-bold text-[10px] ${color}`}>
      {children}
    </FitLine>
  )
}

export function ActivityStats({
  steps, burned, minutes, minutesGoal, minutesPct, waterPct, waterMl,
  stepsGoal, waterGoalMl, burnGoal, onEditBurnGoal,
  onAddSteps, onAddWater, onOpenWaterHistory, onEditWaterGoal,
  onOpenStepsHistory, onGoActivity,
}) {
  // остаток/перебор по шагам: короткие формулировки, чтобы влезать в 130dp
  const stepsLeft = stepsGoal - steps
  const stepsFoot = stepsGoal > 0 ? (
    steps > stepsGoal ? (
      <Foot tone="good">сверх +{formatNum(steps - stepsGoal)}</Foot>
    ) : steps === stepsGoal ? (
      <Foot tone="good">цель достигнута</Foot>
    ) : (
      <Foot tone="accent">осталось {formatNum(stepsLeft)}</Foot>
    )
  ) : (
    <Foot>цель не задана</Foot>
  )

  // у «Активности» процент дневной цели переехал из подстроки в итоговую строку
  const minutesFoot = minutesGoal > 0 ? (
    <Foot tone={minutes >= minutesGoal ? 'good' : 'accent'}>
      {minutesPct}% от цели
    </Foot>
  ) : (
    <Foot>цель не задана</Foot>
  )

  const waterLeft = waterGoalMl - waterMl
  const waterFoot = waterGoalMl > 0 ? (
    waterMl > waterGoalMl ? (
      <Foot tone="sky">сверх +{formatNum(waterMl - waterGoalMl)} мл</Foot>
    ) : waterMl === waterGoalMl ? (
      <Foot tone="good">цель достигнута</Foot>
    ) : (
      <Foot tone="sky">осталось {formatNum(waterLeft)} мл</Foot>
    )
  ) : (
    <Foot>цель не задана</Foot>
  )

  const cards = [
    {
      colors: {
        border: 'border-emerald-400/20',
        bg: 'bg-emerald-400/[0.06]',
        icon: ['#34D399', '#16A34A'],
        btn: 'border-emerald-400/30 bg-emerald-400/10',
        tint: '#34D399',
      },
      Icon: Footprints,
      label: 'Шаги сегодня',
      value: formatNum(steps),
      sub: `/ ${formatNum(stepsGoal)}`,
      foot: stepsFoot,
      onPlus: onAddSteps,
      plusLabel: 'Добавить 1 000 шагов',
      onPress: onOpenStepsHistory, // тап — история шагов по дням (ввод — из окна истории)
    },
    {
      colors: {
        border: 'border-sky-400/20',
        bg: 'bg-sky-400/[0.06]',
        icon: ['#38BDF8', '#2563EB'],
        btn: 'border-sky-400/30 bg-sky-400/10',
        tint: '#38BDF8',
      },
      Icon: Droplets,
      label: 'Вода',
      value: `${waterPct}%`,
      sub: `из ${formatNum(waterGoalMl / 1000)} л · ${formatNum(waterMl)} мл`,
      foot: waterFoot,
      onPlus: onAddWater,
      plusLabel: 'Выпить стакан воды',
      onPress: onOpenWaterHistory, // тап — история воды по дням (стаканы — из окна истории)
      onLongPress: onEditWaterGoal, // долгий тап — изменить цель воды
    },
    {
      colors: {
        border: 'border-violet-400/20',
        bg: 'bg-violet-400/[0.06]',
        icon: ['#A78BFA', '#9333EA'],
      },
      Icon: Dumbbell,
      label: 'Активность',
      value: `${minutes} мин`,
      sub: `из ${formatNum(minutesGoal)} мин`,
      // Кольцо прогресса цели сжигания (как в сводке, но на главной)
      ring: burnGoal > 0 ? { pct: Math.round((burned / burnGoal) * 100) } : null,
      foot: minutesFoot,
      onPress: onGoActivity, // тап — плавный скролл к блоку «Тренировки» (на этой же странице)
      onLongPress: onEditBurnGoal, // долгий тап — изменить цель сжигания
      longHint: 'Долгий тап — изменить цель сжигания',
    },
  ]

  // Компактный ряд: три карточки в одну строку — «Шаги», «Вода»,
  // «Активность»; flex-1 делит ширину поровну, текст сжимается сам
  return (
    <View className="flex-row gap-3">
      {cards.map((c) => <StatCard key={c.label} {...c} />)}
    </View>
  )
}

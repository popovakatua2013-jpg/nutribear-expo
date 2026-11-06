// Компактный ряд из трёх карточек за сегодня: «Шаги», «Вода»,
// «Активность» — в одну строку (361dp ≈ 102dp на карточку).
// Кольца прогресса убраны по просьбе Кати (в маленьких блоках лишние):
// центр карточки — иконка-чип на цветном градиенте, под ней крупное
// значение и подстрока, дальше подпись и итоговая строка. Кнопка «+»
// быстрого добавления — в углу карточки (шаги/вода). Тапы и
// долгие тапы прежние: «Шаги» — записать шаги вручную, «Вода» — стаканы
// за день (долгий тап — изменить цель воды), «Активность» — раскрыть/
// скрыть блок «Тренировки» (долгий тап — изменить цель сжигания).
// Тексты однострочные и при нехватке ширины сжимаются
// (adjustsFontSizeToFit), а не обрезаются. Карточку «Калории» убрали
// ранее — она дублировала сводку. История по дням — во вкладке
// «Дневник» (тап по карточке-итогу в «Отчётах»).
// Поверхность плиток — bear-bodyCard с цветной обводкой показателя.

import { Pressable, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { ChevronDown, ChevronUp, Dumbbell, Droplets, Footprints, Plus } from 'lucide-react-native'
import { formatNum } from '@/lib/format'
import { formatLiters } from '@/lib/data/reports'

// однострочный текст, который при нехватке ширины сжимается, а не режется
function FitLine({ className, maxFontSizeMultiplier = 1.25, style, children }) {
  return (
    <Text
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.8}
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      className={className}
      style={style}
    >
      {children}
    </Text>
  )
}

function StatCard({ colors, Icon, label, value, sub, foot, onPlus, plusLabel, onPress, onLongPress, longHint }) {
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
      className={`relative min-w-0 flex-1 items-center rounded-2xl border bg-bear-bodyCard px-2 pb-2.5 pt-2 ${
        colors.border
      } ${onPress || onLongPress ? 'active:opacity-80' : ''}`}
    >
      {/* «+» быстрого добавления — в углу карточки */}
      {onPlus && (
        <Pressable
          onPress={onPlus}
          accessibilityRole="button"
          accessibilityLabel={plusLabel}
          hitSlop={6}
          className={`absolute right-1.5 top-1.5 z-10 h-7 w-7 items-center justify-center rounded-full border active:opacity-70 ${colors.btn}`}
        >
          <Plus size={14} color={colors.tint} strokeWidth={2.5} />
        </Pressable>
      )}

      {/* иконка-чип на градиенте — вместо прежнего кольца */}
      <LinearGradient
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        colors={colors.icon}
        style={{
          width: 30,
          height: 30,
          borderRadius: 15,
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: 2,
        }}
      >
        <Icon size={16} color="#FFFFFF" />
      </LinearGradient>

      {/* значение + подстрока крупно по центру */}
      <FitLine
        maxFontSizeMultiplier={1.2}
        className="mt-2 text-center font-extrabold text-[19px] leading-tight tracking-tight text-bear-text"
      >
        {value}
      </FitLine>
      <FitLine
        maxFontSizeMultiplier={1.15}
        className="mt-0.5 text-center font-sans text-[10.5px] leading-tight text-bear-dim"
      >
        {sub}
      </FitLine>

      {/* подпись под значением */}
      <FitLine className="mt-1.5 font-semibold text-[12.5px] text-bear-soft">
        {label}
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
    <FitLine maxFontSizeMultiplier={1.2} className={`mt-0.5 font-bold text-[12.5px] ${color}`}>
      {children}
    </FitLine>
  )
}

export function ActivityStats({
  steps, burned, minutes, minutesGoal, minutesPct, waterPct, waterMl,
  stepsGoal, waterGoalMl, burnGoal, onEditBurnGoal,
  onAddSteps, onAddWater, onOpenWater, onEditWaterGoal,
  onOpenStepsInput, onGoActivity, exOpen = false,
}) {
  // остаток/перебор по шагам: короткие формулировки, чтобы влезать в карточку
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

  // у «Активности» итоговая строка двойная: процент дневной цели слева
  // и шеврон раскрытия тренировок справа (тап по карточке разворачивает
  // блок «Тренировки» прямо под плитками)
  const minutesFoot = (
    <View className="mt-0.5 w-full flex-row items-center justify-between">
      <FitLine
        maxFontSizeMultiplier={1.2}
        className={`min-w-0 flex-1 font-bold text-[12.5px] ${
          minutesGoal > 0
            ? minutes >= minutesGoal ? 'text-emerald-300' : 'text-violet-300'
            : 'text-bear-sub2'
        }`}
      >
        {minutesGoal > 0 ? `${minutesPct}% от цели` : 'цель не задана'}
      </FitLine>
      {exOpen ? (
        <ChevronUp size={13} color="#A78BFA" />
      ) : (
        <ChevronDown size={13} color="#A78BFA" />
      )}
    </View>
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
      onPress: onOpenStepsInput, // тап — записать шаги вручную (за сегодня)
    },
    {
      colors: {
        border: 'border-sky-400/20',
        icon: ['#38BDF8', '#2563EB'],
        btn: 'border-sky-400/30 bg-sky-400/10',
        tint: '#38BDF8',
      },
      Icon: Droplets,
      label: 'Вода',
      value: `${waterPct}%`,
      sub: `из ${formatLiters(waterGoalMl)} · ${formatNum(waterMl)} мл`,
      foot: waterFoot,
      onPlus: onAddWater,
      plusLabel: 'Выпить стакан воды',
      onPress: onOpenWater, // тап — изменить стаканы за день
      onLongPress: onEditWaterGoal, // долгий тап — изменить цель воды
    },
    {
      colors: {
        border: 'border-violet-400/20',
        icon: ['#A78BFA', '#9333EA'],
      },
      Icon: Dumbbell,
      label: 'Активность',
      value: `${minutes} мин`,
      sub: `из ${formatNum(minutesGoal)} мин`,
      // процент цели по минутам — в итоговой строке; процент сжигания
      // живёт в сводке и на долгом тапе
      foot: minutesFoot,
      // тап — раскрыть/скрыть тренировки прямо под плитками (этот же блок)
      onPress: onGoActivity,
      onLongPress: onEditBurnGoal, // долгий тап — изменить цель сжигания
      longHint: 'Долгий тап — изменить цель сжигания',
    },
  ]

  // Компактный ряд: три карточки в одну строку — «Шаги», «Вода»,
  // «Активность»; flex-1 делит ширину поровну, текст сжимается сам.
  // Раскрытые тренировки рендерит родитель (блок «Активность» на главной)
  return (
    <View className="flex-row gap-3">
      {cards.map((c) => <StatCard key={c.label} {...c} />)}
    </View>
  )
}

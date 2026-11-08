// Ряд из трёх карточек за сегодня: «Шаги», «Вода», «Активность» — в одну
// строку (361dp ≈ 96dp на карточку). Оформление по макету Кати: сверху
// каждой карточки подпись «Сегодня», цветной чип-иконка на градиенте,
// крупное значение с целью («0 / 7 000»), подпись с маленькой иконкой
// и внизу пилюля итога с цветной галочкой («осталось 7 000»).
// Кнопки «+» убраны по отзыву Кати: тап по карточке и есть добавить/
// открыть — «Шаги» открывает ввод шагов, «Вода» — стаканы за день
// (долгий тап — изменить цель воды). Тренировки с главного убраны
// совсем (отзыв Кати: «полностью удаляем тренировки с главного экрана»)
// — им посвящена отдельная вкладка «Тренировки»: тап по плитке
// «Активность» больше ничего не раскрывает (долгий тап — изменить
// цель сжигания).
// Тексты однострочные и при нехватке ширины сжимаются
// (adjustsFontSizeToFit), а не обрезаются. Карточку «Калории» убрали
// ранее — она дублировала сводку. История по дням — во вкладке
// «Дневник» (тап по карточке-итогу в «Отчётах»).
// Поверхность плиток — bear-bodyCard с цветной обводкой показателя.

import { Pressable, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import {
  Check,
  Dumbbell,
  Droplets,
  Flame,
  Footprints,
} from 'lucide-react-native'
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

function StatCard({ colors, Icon, LabelIcon, label, value, sub, foot, onPress, onLongPress, longHint }) {
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
      className={`min-w-0 flex-1 items-center rounded-2xl border bg-bear-bodyCard px-1.5 pb-2.5 pt-2 ${
        colors.border
      } ${onPress || onLongPress ? 'active:opacity-80' : ''}`}
    >
      {/* «Сегодня» — подпись сверху каждой карточки (запрос Кати) */}
      <Text
        numberOfLines={1}
        maxFontSizeMultiplier={1.2}
        className="font-sans text-[10px] leading-tight text-bear-sub2"
      >
        Сегодня
      </Text>

      {/* иконка-чип на градиенте — по макету, крупнее прежней */}
      <LinearGradient
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        colors={colors.icon}
        style={{
          width: 38,
          height: 38,
          borderRadius: 19,
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: 6,
        }}
      >
        <Icon size={20} color="#FFFFFF" strokeWidth={2.2} />
      </LinearGradient>

      {/* значение + цель крупно по центру */}
      <FitLine
        maxFontSizeMultiplier={1.2}
        className="mt-2 text-center font-extrabold text-[23px] leading-tight tracking-tight text-bear-text"
      >
        {value}
      </FitLine>
      <FitLine
        maxFontSizeMultiplier={1.15}
        className="mt-0.5 text-center font-sans text-[11.5px] leading-tight text-bear-dim"
      >
        {sub}
      </FitLine>

      {/* подпись с маленькой иконкой — как на макете. LabelIcon обязателен
          у каждой карточки — страховка ниже не даёт отсутствующей иконке
          уронить весь экран (краш «displayName of undefined») */}
      <View className="mt-2 w-full flex-row items-center justify-center gap-1">
        {LabelIcon ? (
          <LabelIcon size={12} color={colors.tint} strokeWidth={2.2} />
        ) : null}
        <FitLine
          maxFontSizeMultiplier={1.15}
          className="min-w-0 shrink text-center font-semibold text-[12.5px] text-bear-soft"
        >
          {label}
        </FitLine>
      </View>

      {/* пилюля итога — есть у всех карточек, поэтому ряды одной высоты */}
      {foot}
    </Root>
  )
}

// Итоговая пилюля карточки: цветная галочка + текст («осталось 7 000»),
// всегда присутствует (даже «цель не задана»), чтобы верхний и нижний
// ряды были одинаковой высоты
function Foot({ tone = 'muted', children }) {
  const map = {
    good: { dot: 'bg-emerald-400/90', text: 'text-emerald-300' },
    warn: { dot: 'bg-rose-400/90', text: 'text-rose-300' },
    accent: { dot: 'bg-violet-400/90', text: 'text-violet-300' },
    sky: { dot: 'bg-sky-400/90', text: 'text-sky-300' },
    muted: { dot: 'bg-white/20', text: 'text-bear-sub2' },
  }
  const t = map[tone] || map.muted
  return (
    <View className="mt-2 w-full flex-row items-center gap-1 rounded-full bg-white/[0.05] px-1 py-1">
      <View className={`h-3 w-3 shrink-0 items-center justify-center rounded-full ${t.dot}`}>
        <Check size={8} color="#FFFFFF" strokeWidth={3.5} />
      </View>
      <FitLine maxFontSizeMultiplier={1.15} className={`min-w-0 flex-1 font-bold text-[11px] ${t.text}`}>
        {children}
      </FitLine>
    </View>
  )
}

export function ActivityStats({
  steps, burned, minutes, minutesGoal, minutesPct, waterPct, waterMl,
  stepsGoal, waterGoalMl, burnGoal, onEditBurnGoal,
  onOpenWater, onEditWaterGoal,
  onOpenStepsInput,
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

  // у «Активности» итоговая пилюля: процент дневной цели по минутам
  const minutesFoot = (
    <View className="mt-2 w-full flex-row items-center gap-1 rounded-full bg-white/[0.05] px-1 py-1">
      <View
        className={`h-3 w-3 shrink-0 items-center justify-center rounded-full ${
          minutesGoal > 0 && minutes >= minutesGoal ? 'bg-emerald-400/90' : 'bg-violet-400/90'
        }`}
      >
        <Check size={8} color="#FFFFFF" strokeWidth={3.5} />
      </View>
      <FitLine
        maxFontSizeMultiplier={1.15}
        className={`min-w-0 flex-1 font-bold text-[11px] ${
          minutesGoal > 0
            ? minutes >= minutesGoal ? 'text-emerald-300' : 'text-violet-300'
            : 'text-bear-sub2'
        }`}
      >
        {minutesGoal > 0 ? `${minutesPct}% от цели` : 'цель не задана'}
      </FitLine>
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
        border: 'border-emerald-400/25',
        icon: ['#34D399', '#16A34A'],
        tint: '#34D399',
      },
      Icon: Footprints,
      LabelIcon: Footprints, // маленькая иконка в подписи — как на макете
      label: 'Шаги сегодня',
      value: formatNum(steps),
      sub: `/ ${formatNum(stepsGoal)}`,
      foot: stepsFoot,
      onPress: onOpenStepsInput, // тап — записать шаги вручную (за сегодня)
    },
    {
      colors: {
        border: 'border-sky-400/25',
        icon: ['#38BDF8', '#2563EB'],
        tint: '#38BDF8',
      },
      Icon: Droplets,
      LabelIcon: Droplets, // маленькая иконка в подписи — как на макете
      label: 'Вода',
      value: `${waterPct}%`,
      sub: `из ${formatLiters(waterGoalMl)} · ${formatNum(waterMl)} мл`,
      foot: waterFoot,
      onPress: onOpenWater, // тап — изменить стаканы за день
      onLongPress: onEditWaterGoal, // долгий тап — изменить цель воды
    },
    {
      colors: {
        border: 'border-violet-400/25',
        icon: ['#A78BFA', '#9333EA'],
        tint: '#A78BFA',
      },
      Icon: Dumbbell,
      LabelIcon: Flame, // у «Активности» подпись с огоньком — как на макете
      label: 'Активность',
      value: `${minutes} мин`,
      sub: `из ${formatNum(minutesGoal)} мин`,
      // процент цели по минутам — в итоговой пилюле; процент сжигания
      // живёт в сводке и на долгом тапе
      foot: minutesFoot,
      // тапа нет: тренировки переехали во вкладку «Тренировки»;
      // долгий тап — изменить цель сжигания
      onLongPress: onEditBurnGoal,
      longHint: 'Долгий тап — изменить цель сжигания',
    },
  ]

  // Компактный ряд: три карточки в одну строку — «Шаги», «Вода»,
  // «Активность»; flex-1 делит ширину поровну, текст сжимается сам.
  return (
    <View className="flex-row gap-2">
      {cards.map((c) => <StatCard key={c.label} {...c} />)}
    </View>
  )
}

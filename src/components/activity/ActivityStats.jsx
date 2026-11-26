// Ряд из трёх карточек за сегодня: «Шаги», «Вода», «Активность» — в одну
// строку (361dp ≈ 96dp на карточку). Оформление по макету Кати: сверху
// каждой карточки подпись «Сегодня», цветной чип-иконка на градиенте,
// крупное значение с целью («0 / 7 000»), подпись с маленькой иконкой
// и внизу пилюля итога с цветной галочкой («осталось 7 000»).
// Кнопки «+» убраны по отзыву Кати: тап по карточке и есть добавить/
// открыть — «Шаги» открывает ввод шагов, «Вода» — стаканы за день
// (долгий тап — изменить цель воды). Блок тренировок живёт сразу под
// плитками (ExerciseSection, вернули по решению Кати): тап по плитке
// «Активность» открывает окно «что посчитано» (тренировки + шаги —
// отзыв Кати от 10.11: «блок не открывается — должно быть видно, что
// именно посчитано в активность»; долгий тап — изменить цель сжигания).
// Тексты однострочные и при нехватке ширины сжимаются
// (adjustsFontSizeToFit), а не обрезаются. Карточку «Калории» убрали
// ранее — она дублировала сводку. История по дням — во вкладке
// «Дневник» (тап по карточке-итогу в «Отчётах»).
// Поверхность плиток — GradientTile (правка Кати 25.11, пятый круг:
// «активность дня — не совпадает с блоком „Съедено сегодня“ по
// оформлению»): плоская bodyCard с серой рамкой читалась «дырой» между
// светящимися блоками главной. Теперь каждая плитка — градиентная
// поверхность с неоновой каймой активной темы (GradientTile, тот же
// язык, что у NeonCard, но без ореолов — плиткам свечение наружу не
// нужно).

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
import { useThemeColors } from '@/lib/use-theme'
import { GradientTile } from '../ui/GradientTile'


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
      className={`min-w-0 flex-1 ${onPress || onLongPress ? 'active:opacity-80' : ''}`}
    >
      <GradientTile radius={16} className="items-center px-1.5 pb-2.5 pt-2">
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
      </GradientTile>
    </Root>
  )
}

// Итоговая пилюля карточки: цветная галочка + текст («осталось 7 000»),
// всегда присутствует (даже «цель не задана»), чтобы верхний и нижний
// ряды были одинаковой высоты
function Foot({ tone = 'muted', children }) {
  // Цвета подписи — из темы (правка Кати 25.11: «проверь по всем темам»):
  // «хорошо» светится темой, предупреждение — тревожным цветом темы,
  // «небо» (вода) — мягким оттенком темы
  const themeColors = useThemeColors()
  const map = {
    good: { dot: themeColors.good, text: themeColors.good },
    warn: { dot: themeColors.bad, text: themeColors.bad },
    accent: { dot: themeColors.accentBright, text: themeColors.accentBright },
    sky: { dot: themeColors.accentSoft, text: themeColors.accentSoft },
    muted: { dot: themeColors.dim, text: themeColors.sub2 },
  }
  const t = map[tone] || map.muted
  return (
    <View className="mt-2 w-full flex-row items-center gap-1 rounded-full bg-bear-overlay px-1 py-1">
      <View className="h-3 w-3 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: t.dot }}>
        <Check size={8} color={themeColors.bg} strokeWidth={3.5} />
      </View>
      <FitLine maxFontSizeMultiplier={1.15} className="min-w-0 flex-1 font-bold text-[11px]" style={{ color: t.text }}>
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
  onOpenActivity, // тап по «Активность» — что посчитано (тренировки + шаги)
}) {
  const themeColors = useThemeColors()
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

  // у «Активности» итоговая пилюля: процент дневной цели по минутам.
  // Правка Кати 25.11 (четвёртый круг: «на вкладке активность сегодня
  // % от цели не перекрашен»): фиксированные фиолетово/изумрудные классы
  // (violet-400/emerald-300) заменены токенами темы — цель достигнута —
  // «хорошо» темы, в процессе — акцент темы
  const minutesDone = minutesGoal > 0 && minutes >= minutesGoal
  const minutesFoot = (
    <View className="mt-2 w-full flex-row items-center gap-1 rounded-full bg-bear-overlay px-1 py-1">
      <View
        className="h-3 w-3 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: minutesDone ? themeColors.good : themeColors.accent }}
      >
        <Check size={8} color={themeColors.bg} strokeWidth={3.5} />
      </View>
      <FitLine
        maxFontSizeMultiplier={1.15}
        className="min-w-0 flex-1 font-bold text-[11px]"
        style={{
          color: minutesGoal > 0
            ? minutesDone ? themeColors.good : themeColors.accent
            : themeColors.sub2,
        }}
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
      // Цвет плитки — из темы (в неонах светится тем же неоном, что и
      // вся «Главная»; правка Кати 25.11)
      colors: {
        border: 'border-bear-accentBorder',
        icon: [themeColors.accentBright, themeColors.accent],
        tint: themeColors.accentBright,
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
        border: 'border-bear-accentBorder',
        icon: [themeColors.accentSoft, themeColors.accent],
        tint: themeColors.accentSoft,
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
        // Рамка — accentBorder темы (правка Кати 25.11, четвёртый круг:
        // «все рамки согласно темам» — у «Активности» оставался чужой
        // фиолетовый border-violet-400/25)
        border: 'border-bear-accentBorder',
        // Плитка «Активность» — градиентом активной темы (правка Кати
        // «сделай в точности как на скрине»: плитки светятся неоном темы)
        icon: [themeColors.accentBright, themeColors.accent],
        tint: themeColors.accentBright,
      },
      Icon: Dumbbell,
      LabelIcon: Flame, // у «Активности» подпись с огоньком — как на макете
      label: 'Активность',
      value: `${minutes} мин`,
      sub: `из ${formatNum(minutesGoal)} мин`,
      // процент цели по минутам — в итоговой пилюле; процент сжигания
      // живёт в сводке и на долгом тапе
      foot: minutesFoot,
      // тап — окно «что посчитано в активность» (тренировки + шаги,
      // отзыв Кати от 10.11); долгий тап — изменить цель сжигания
      onPress: onOpenActivity,
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

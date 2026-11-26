// Карточка «Цикл» на «Ещё» (редизайн по шаблону Катиного референса:
// кольцо «7 дней / до след. цикла» слева, подписи справа, тап раскрывает
// настройку). Внутри — тумблер, пресеты длины цикла, отметка начала
// последних месячных (степперы −/+ + «Началось сегодня»).
// Отзыв Кати 16.11: подпись «Включить трекер» и сноска «Без медицины…»
// убраны (очевидно из тумблера; медицина — в дисклеймере), пилюля
// «Включить» при выключенном трекере удалена — включение тумблером.
// Без медицинских рекомендаций — только фазы, прогноз и мягкие подсказки.
// Данные хранятся только на устройстве.
// Режим embedded (редизайн «Ещё» в групповое меню): без своей карточки и
// шапки-заголовка — кольцо слева, пресеты длины справа, настройки в
// свёрнутой строке «Настройки цикла» (компактно — отзыв Кати 16.11).

import { useEffect, useState } from 'react'
import { Pressable, Switch, Text, View } from 'react-native'
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop, Text as SvgText } from 'react-native-svg'
import { ChevronDown, Trash2 } from 'lucide-react-native'
import { useCycleStore, dayKeyOf, daysToNext, phaseOf } from '@/store/useCycleStore'
import { useToast } from '../ui/Toast'
import { BodyChip } from '../ui/BodyChip'
import { fontFamilies } from '../home/ring-font'
import { useThemeColors } from '@/lib/use-theme'


const MONTHS_RU = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
]

// 'ГГГГ-ММ-ДД' → «21 октября» (+ год, если не текущий)
function formatDateRu(key) {
  const d = new Date(`${key}T00:00:00`)
  if (Number.isNaN(d.getTime())) return '—'
  const base = `${d.getDate()} ${MONTHS_RU[d.getMonth()]}`
  return d.getFullYear() === new Date().getFullYear() ? base : `${base} ${d.getFullYear()}`
}

// Что показать в кольце: { value, caption, progress }
// progress — доля пройденного цикла (0…1) для дуги
function ringState(enabled, lastStart, length) {
  if (!enabled) return { value: '—', caption: 'выключен', progress: 0 }
  if (!lastStart) return { value: '—', caption: 'отметьте начало', progress: 0 }
  const ph = phaseOf(lastStart, length)
  const left = daysToNext(lastStart, length)
  // Задержка: следующее начало уже позади — дни считаем от него
  if (left != null && left < 0) {
    return { value: `${Math.abs(left)} дн`, caption: 'задержка', progress: 1 }
  }
  if (left === 0) {
    return { value: 'сегодня', caption: 'ожидается', progress: ph ? ph.dayInCycle / ph.cycleLength : 0 }
  }
  return {
    value: left != null ? `${left} дн` : '—',
    caption: 'до след. цикла',
    progress: ph ? Math.min(1, ph.dayInCycle / ph.cycleLength) : 0,
  }
}

// Кольцо цикла: дорожка + фиолетово-розовая дуга пройденной части цикла
function CycleRing({ value, caption, progress }) {
  const themeColors = useThemeColors()
  const SIZE = 96
  const R = 41
  const CIRC = 2 * Math.PI * R
  const arc = Math.max(0, Math.min(1, progress)) * CIRC
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={`Цикл: ${value} ${caption}`}
      className="h-[96px] w-[96px] shrink-0"
    >
      <Svg width={SIZE} height={SIZE} viewBox="0 0 96 96">
        <Defs>
          <SvgGradient id="cycleRing" x1="0" y1="0" x2="1" y2="1">
            {/* Градиент темы (accentBright → accent): раньше половина дуги
                была розовым #F472B6 — на «Кремовой» и неонах выглядело
                чужим цветом (отзыв Кати 25.11: «кольца и графики — по темам») */}
            <Stop offset="0" stopColor={themeColors.accentBright} />
            <Stop offset="1" stopColor={themeColors.accent} />
          </SvgGradient>
        </Defs>
        {/* Трек — рамка темы: белый rgba был невидим на светлой теме */}
        <Circle cx="48" cy="48" r={R} fill="none" stroke={themeColors.line} strokeWidth="7" />
        {arc > 0 && (
          <Circle
            cx="48"
            cy="48"
            r={R}
            fill="none"
            stroke="url(#cycleRing)"
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={`${arc} ${CIRC}`}
            transform="rotate(-90 48 48)"
          />
        )}
        <SvgText
          x="48"
          y="46"
          fill={themeColors.text}
          fontSize="14.5"
          fontWeight="800"
          fontFamily={fontFamilies.extrabold}
          textAnchor="middle"
        >
          {value}
        </SvgText>
        <SvgText
          x="48"
          y="60"
          fill={themeColors.dim}
          fontSize="8"
          fontFamily={fontFamilies.regular}
          textAnchor="middle"
        >
          {caption}
        </SvgText>
      </Svg>
    </View>
  )
}

// Степпер: подпись слева, значение + кнопки −/+ справа
function Stepper({ label, value, onMinus, onPlus, disabled }) {
  const btn =
    'h-8 w-8 items-center justify-center rounded-full bg-bear-overlay active:bg-bear-overlay2'
  return (
    <View className="flex-row items-center justify-between gap-2 py-1.5">
      <Text className="min-w-0 flex-1 font-sans text-[15px] text-bear-sub">{label}</Text>
      <View className="flex-row items-center gap-2">
        <Pressable
          onPress={onMinus}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel={`Меньше: ${label}`}
          className={btn}
        >
          <Text className="font-bold text-[17px] text-bear-soft">−</Text>
        </Pressable>
        <Text className="min-w-[92px] text-center font-semibold text-[15px] text-bear-text">
          {value}
        </Text>
        <Pressable
          onPress={onPlus}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel={`Больше: ${label}`}
          className={btn}
        >
          <Text className="font-bold text-[17px] text-bear-soft">+</Text>
        </Pressable>
      </View>
    </View>
  )
}

export function CycleCard({ embedded = false }) {
  const themeColors = useThemeColors()
  // Единый акцент всех переключателей (унификация цвета по отзыву
  // Кати от 11.11) — теперь акцент активной темы
  const switchColors = { true: themeColors.accent, false: themeColors.overlay2 }
  const enabled = useCycleStore((s) => s.enabled)
  const lastStart = useCycleStore((s) => s.lastStart)
  const length = useCycleStore((s) => s.length)
  const bleed = useCycleStore((s) => s.bleed)
  const setEnabled = useCycleStore((s) => s.setEnabled)
  const setSettings = useCycleStore((s) => s.setSettings)
  const shiftLastStart = useCycleStore((s) => s.shiftLastStart)
  const logStart = useCycleStore((s) => s.logStart)
  const resetAll = useCycleStore((s) => s.resetAll)
  const { toast } = useToast()

  const [open, setOpen] = useState(false)
  // Компактный режим (отзыв Кати 16.11: «сделай вкладку цикл компактно»):
  // настройки (тумблер, даты, длительность) свёрнуты в строку «Настройки
  // цикла»; сама раскрывается, когда трекер выключен — чтобы тумблер
  // был на виду, и сворачивается после включения
  const [settingsOpen, setSettingsOpen] = useState(false)
  useEffect(() => {
    setSettingsOpen(!enabled)
  }, [enabled])
  const phase = enabled && lastStart ? phaseOf(lastStart, length, bleed) : null
  const ring = ringState(enabled, lastStart, length)

  function markToday() {
    const ok = logStart(dayKeyOf())
    toast(
      ok
        ? { title: '🌙 Начало цикла отмечено', description: 'Подсказки по фазам появятся на Главной' }
        : { title: 'Этот день уже отмечен', description: 'Начало цикла не менялось' }
    )
  }

  function wipe() {
    resetAll()
    toast({ title: 'Данные цикла удалены', description: 'Всё стёрто с этого телефона' })
  }

  // Настройка трекера: тумблер + степперы + удаление. В обычном режиме —
  // по тапу на шапку, во встроенном — в свёрнутой строке «Настройки
  // цикла» (отзыв Кати 16.11: «сделай компактно»). Тумблер с подписью
  // в одной строке (раньше тумблер висел один, без названия)
  const settingsBlock = (
    <View>
      <View className="flex-row items-center justify-between rounded-2xl border border-bear-line bg-bear-card2 px-4 py-3">
        <Text className="font-bold text-[16px] text-bear-text">Трекер цикла</Text>
        <Switch
          value={enabled}
          onValueChange={setEnabled}
          trackColor={switchColors}
          thumbColor={themeColors.accentOn}
          accessibilityLabel="Трекер цикла вкл/выкл"
        />
      </View>

      {enabled && (
        <View className="mt-2 gap-1 rounded-2xl border border-bear-line bg-bear-card2 p-3">
          <Stepper
            label="Начало последних месячных"
            value={lastStart ? formatDateRu(lastStart) : 'не отмечено'}
            disabled={!lastStart}
            onMinus={() => shiftLastStart(-1)}
            onPlus={() => shiftLastStart(1)}
          />
          <Pressable
            onPress={markToday}
            accessibilityRole="button"
            accessibilityLabel="Отметить начало месячных сегодня"
            className="mt-1 self-start rounded-full bg-[#F472B6]/15 px-4 py-2 active:opacity-80"
          >
            <Text className="font-bold text-[13px] text-[#F9A8D4]">🌙 Началось сегодня</Text>
          </Pressable>

          <Stepper
            label="Средняя длина цикла"
            value={`${length} дн.`}
            onMinus={() => setSettings({ length: length - 1 })}
            onPlus={() => setSettings({ length: length + 1 })}
          />
          <Stepper
            label="Длительность месячных"
            value={`${bleed} дн.`}
            onMinus={() => setSettings({ bleed: bleed - 1 })}
            onPlus={() => setSettings({ bleed: bleed + 1 })}
          />

          {phase && (
            <Text className="mt-1 font-sans text-[12.5px] leading-[17px] text-bear-dim">
              Сейчас: день {phase.dayInCycle}, следующее начало ≈ {formatDateRu(phase.nextStart)}
            </Text>
          )}

          <Pressable
            onPress={wipe}
            accessibilityRole="button"
            accessibilityLabel="Удалить все данные цикла"
            className="mt-1 flex-row items-center gap-1.5 self-start rounded-full px-2 py-1 active:opacity-60"
          >
            <Trash2 size={13} color={themeColors.bad} />
            <Text className="font-sans text-[12.5px] text-[#F87171]">Удалить данные цикла</Text>
          </Pressable>
        </View>
      )}
    </View>
  )

  // Статусная колонка: во встроенном режиме без заголовка «Цикл» —
  // он уже в строке меню
  const statusCol = (
    <View className="min-w-0 flex-1">
      {!embedded && (
        <Text className="font-extrabold text-[21px] tracking-tight text-bear-text">Цикл</Text>
      )}
      {enabled ? (
        <>
          <Text className="font-semibold text-[15px] text-bear-bright">Трекер цикла</Text>
          <Text
            maxFontSizeMultiplier={1.2}
            className="font-sans text-[13px] leading-[17px] text-bear-dim"
          >
            Фазы цикла и подсказки
          </Text>
        </>
      ) : (
        <>
          <Text className="font-semibold text-[15px] text-bear-sub">Трекер выключен</Text>
          <Text
            maxFontSizeMultiplier={1.2}
            className="font-sans text-[13px] leading-[17px] text-bear-dim"
          >
            Включите — появятся фазы и подсказки
          </Text>
        </>
      )}
    </View>
  )

  // Шапка: при включённом трекере — кольцо «N дней до след. цикла»
  // (как на шаблоне), при выключенном — компактный чип 🌙 вместо
  // мёртвого кольца (скрин Кати: карточка выглядела полупустой)
  const headerInner = (
    <View className="flex-row items-center gap-3.5">
      {enabled ? (
        <CycleRing value={ring.value} caption={ring.caption} progress={ring.progress} />
      ) : (
        <BodyChip icon={<Text className="text-[21px]">🌙</Text>} size={44} />
      )}
      {statusCol}
    </View>
  )

  // Пилюли — как на шаблоне: быстрые пресеты длины цикла (активная
  // подсвечена; точная подгонка — степпером внутри настроек). Сам ряд
  // без отступа — отступ даёт обёртка: в обычной карточке он под
  // колонкой текста (кольцо 96px), во встроенном — справа от кольца
  const pills = enabled
    ? [24, 28, 32].map((v) => {
        const active = v === length
        return (
          <Pressable
            key={v}
            onPress={() => setSettings({ length: v })}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`Длина цикла ${v} дней`}
            hitSlop={4}
            className="rounded-full px-2.5 py-1.5 active:opacity-80"
            style={{ backgroundColor: active ? themeColors.accent : themeColors.overlay }}
          >
            <Text
              maxFontSizeMultiplier={1.05}
              className={`font-semibold text-[12.5px] ${active ? 'text-white' : 'text-bear-dim'}`}
            >
              {`${v} дн`}
            </Text>
          </Pressable>
        )
      })
    : null

  const pillsRow = enabled ? (
    <View className="mt-2.5 flex-row flex-wrap items-center gap-1.5 pl-[126px]">{pills}</View>
  ) : null

  // Встроено в строку меню — КОМПАКТНО (отзыв Кати 16.11): кольцо слева,
  // пресеты длины справа; вся настройка (тумблер, даты, длительность,
  // удаление) — в одной свёрнутой строке «Настройки цикла». Строка сама
  // раскрыта, когда трекер выключен (тумблер на виду), и сворачивается
  // после включения — см. settingsOpen в шапке компонента
  if (embedded) {
    return (
      <View accessibilityLabel="Цикл">
        <View className="flex-row items-center gap-3.5">
          {enabled ? (
            <CycleRing value={ring.value} caption={ring.caption} progress={ring.progress} />
          ) : (
            <BodyChip icon={<Text className="text-[21px]">🌙</Text>} size={44} />
          )}
          {enabled ? (
            <View className="min-w-0 flex-1 flex-row flex-wrap items-center gap-1.5">{pills}</View>
          ) : (
            <Text
              maxFontSizeMultiplier={1.2}
              className="min-w-0 flex-1 font-sans text-[13px] leading-[17px] text-bear-dim"
            >
              Включите — фазы и подсказки появятся на Главной
            </Text>
          )}
        </View>

        <Pressable
          onPress={() => setSettingsOpen((s) => !s)}
          accessibilityRole="button"
          accessibilityState={{ expanded: settingsOpen }}
          accessibilityLabel={settingsOpen ? 'Свернуть настройки цикла' : 'Настройки цикла'}
          className="mt-2.5 flex-row items-center justify-between rounded-2xl border border-bear-line bg-bear-card2 px-4 py-2.5 active:opacity-80"
        >
          <Text className="font-bold text-[15px] text-bear-text">Настройки цикла</Text>
          <ChevronDown
            size={18}
            color={themeColors.sub}
            style={{ transform: [{ rotate: settingsOpen ? '180deg' : '0deg' }] }}
          />
        </Pressable>

        {settingsOpen && <View className="mt-1">{settingsBlock}</View>}
      </View>
    )
  }

  return (
    <View accessibilityLabel="Цикл" className="overflow-hidden rounded-3xl border border-bear-bodyLine bg-bear-bodyCard">
      <View className="px-4 pb-3.5 pt-4">
        <Pressable
          onPress={() => setOpen((s) => !s)}
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          accessibilityLabel={open ? 'Свернуть цикл' : 'Настройки цикла'}
          className="flex-row items-center gap-3.5 active:opacity-80"
        >
          {headerInner}
          <ChevronDown
            size={20}
            color={themeColors.sub}
            style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}
          />
        </Pressable>

        {pillsRow}
      </View>

      {open && <View className="px-4 pb-4">{settingsBlock}</View>}
    </View>
  )
}

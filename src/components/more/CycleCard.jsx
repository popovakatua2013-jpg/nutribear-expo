// Карточка «Цикл» на «Ещё» (редизайн по шаблону Катиного референса:
// кольцо «7 дней / до след. цикла» слева, подписи справа, тап раскрывает
// настройку). Внутри — прежние контролы: тумблер, длина цикла и месячных,
// отметка начала последних месячных (степперы −/+ + «Началось сегодня»).
// Без медицинских рекомендаций — только фазы, прогноз и мягкие подсказки.
// Данные хранятся только на устройстве.
// Режим embedded (редизайн «Ещё» в групповое меню): без своей карточки и
// шапки-заголовка — кольцо, статус, пресеты и настройка встраиваются
// в строку меню «Цикл» (настройка всегда раскрыта, раскрытие — на MenuRow).

import { useState } from 'react'
import { Pressable, Switch, Text, View } from 'react-native'
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop, Text as SvgText } from 'react-native-svg'
import { ChevronDown, Trash2 } from 'lucide-react-native'
import { useCycleStore, dayKeyOf, daysToNext, phaseOf } from '@/store/useCycleStore'
import { useToast } from '../ui/Toast'
import { BodyChip } from '../ui/BodyChip'
import { fontFamilies } from '../home/ring-font'

// Единый акцент всех переключателей — #7B6CF6 (унификация цвета
// по отзыву Кати от 11.11: у CycleCard и SyncCard был синий #4D7CFE,
// в остальных карточках — фиолетовый)
const SWITCH_COLORS = {
  true: '#7B6CF6',
  false: 'rgba(255,255,255,0.15)',
}

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
            <Stop offset="0" stopColor="#F472B6" />
            <Stop offset="1" stopColor="#A78BFA" />
          </SvgGradient>
        </Defs>
        <Circle cx="48" cy="48" r={R} fill="none" stroke="rgba(255,255,255,0.09)" strokeWidth="7" />
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
          fill="#EEF2FB"
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
          fill="#8B96B8"
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
    'h-8 w-8 items-center justify-center rounded-full bg-white/5 active:bg-white/10'
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
  // по тапу на шапку, во встроенном — всегда (раскрытие на MenuRow)
  const settingsBlock = (
    <View>
      <View className="flex-row items-center justify-between gap-2">
        <View className="min-w-0 flex-1">
          <Text className="font-semibold text-[15px] text-bear-text">Включить трекер</Text>
          <Text className="mt-0.5 font-sans text-[12.5px] leading-[17px] text-bear-sub">
            Без медицины. Данные — только на этом телефоне.
          </Text>
        </View>
        <Switch
          value={enabled}
          onValueChange={setEnabled}
          trackColor={SWITCH_COLORS}
          thumbColor="#fff"
          accessibilityLabel="Включить трекер цикла"
        />
      </View>

      {enabled && (
        <View className="mt-1 gap-1 rounded-2xl border border-white/5 bg-white/[0.03] p-3">
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
            <Trash2 size={13} color="#F87171" />
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
  // подсвечена; точная подгонка — степпером внутри), а при выключенном
  // трекере — одна яркая пилюля «Включить» прямо с карточки.
  // Отступ слева — под колонку текста (кольцо 96px либо чип 44px)
  const pillsRow = (
    <View className={`mt-2.5 flex-row flex-wrap items-center gap-1.5 ${enabled ? 'pl-[126px]' : 'pl-[74px]'}`}>
      {enabled ? (
        [24, 28, 32].map((v) => {
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
              style={{ backgroundColor: active ? '#7B6CF6' : 'rgba(255,255,255,0.06)' }}
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
      ) : (
        <Pressable
          onPress={() => {
            setEnabled(true)
            toast({
              title: '🌙 Трекер цикла включён',
              description: 'Отметьте начало последних месячных — подсказки появятся сами',
            })
          }}
          accessibilityRole="button"
          accessibilityLabel="Включить трекер цикла"
          hitSlop={4}
          className="rounded-full px-3.5 py-1.5 active:opacity-80"
          style={{ backgroundColor: 'rgba(244,114,182,0.16)' }}
        >
          <Text maxFontSizeMultiplier={1.1} className="font-bold text-[13px] text-[#F9A8D4]">
            🌙 Включить трекер
          </Text>
        </Pressable>
      )}
    </View>
  )

  // Встроено в строку меню: шапка + пресеты + настройка (всегда раскрыта)
  if (embedded) {
    return (
      <View accessibilityLabel="Цикл">
        {headerInner}
        {pillsRow}
        <View className="mt-3">{settingsBlock}</View>
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
            color="#A5AECB"
            style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}
          />
        </Pressable>

        {pillsRow}
      </View>

      {open && <View className="px-4 pb-4">{settingsBlock}</View>}
    </View>
  )
}

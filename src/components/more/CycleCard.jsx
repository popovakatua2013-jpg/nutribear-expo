// Трекер цикла в «Ещё»: тумблер + настройка длины цикла и месячных,
// отметка начала последних месячных (степперы −/+ по дням + быстрое
// «Началось сегодня»). Без медицинских рекомендаций — только фазы,
// прогноз и мягкие подсказки. Данные хранятся только на устройстве.

import { Pressable, Switch, Text, View } from 'react-native'
import { Trash2 } from 'lucide-react-native'
import { useCycleStore, dayKeyOf, phaseOf } from '@/store/useCycleStore'
import { CollapsibleCard } from '../ui/CollapsibleCard'
import { useToast } from '../ui/Toast'

const SWITCH_COLORS = {
  true: '#4D7CFE',
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

export function CycleCard() {
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

  const phase = enabled && lastStart ? phaseOf(lastStart, length, bleed) : null

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

  return (
    <CollapsibleCard
      storageKey="cycle"
      accessibilityLabel="Цикл"
      title="Цикл"
      summary={enabled ? 'Включён' : undefined}
    >
      <View className="mt-1 gap-2">
        <View className="flex-row items-center justify-between gap-2">
          <View className="min-w-0 flex-1">
            <Text className="font-semibold text-[15px] text-bear-text">Трекер цикла</Text>
            <Text className="mt-0.5 font-sans text-[12.5px] leading-[17px] text-bear-sub">
              Фазы цикла и подсказки про аппетит. Без медицины. Данные — только на этом телефоне.
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
    </CollapsibleCard>
  )
}

// Контролы голодания: выбор плана (14/10, 16/8) и кнопка
// «Начать сейчас / Завершить» с тостами. Голодание всегда стартует
// от текущего времени — окно питания вычисляется из фактического старта.

import { Pressable, Text, View } from 'react-native'
import { useFastingStore } from '@/store/useFastingStore'
import { useToast } from '../ui/Toast'
import { fmtH, fmtClock, two } from '@/lib/data/fasting'

const START_HOURS = [8, 10, 12] // час начала окна питания
const PLANS = [14, 16] // часов голодания

function Pill({ on, onPress, children }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      className={`rounded-full px-3 py-1.5 ${on ? '' : 'bg-white/5'}`}
      style={on ? { backgroundColor: '#7B6CF6' } : null}
    >
      <Text className={`font-semibold text-[12px] ${on ? 'text-white' : 'text-bear-soft'}`}>
        {children}
      </Text>
    </Pressable>
  )
}

export function FastingControls({ running, planLabel }) {
  const windowStart = useFastingStore((s) => s.windowStart)
  const windowHours = useFastingStore((s) => s.windowHours)
  const startedAt = useFastingStore((s) => s.startedAt)
  const start = useFastingStore((s) => s.start)
  const stop = useFastingStore((s) => s.stop)
  const setWindowStart = useFastingStore((s) => s.setWindowStart)
  const setWindowHours = useFastingStore((s) => s.setWindowHours)
  const { toast } = useToast()

  function toggle() {
    if (running) {
      const dur = fmtH(Date.now() - startedAt)
      stop()
      toast({ title: '🍽 Голодание завершено', description: `Длилось ${dur}` })
    } else {
      // Окно питания считаем от фактического момента старта:
      // начали в 01:00 при 16/8 → окно откроется в 17:00
      const openAt = Date.now() + windowHours * 3600000
      start()
      toast({
        title: '⏱ Голодание начато',
        description: `План ${planLabel}. Окно питания откроется в ${fmtClock(openAt)}`,
      })
    }
  }

  return (
    <View className="mt-4 gap-2">
      {!running && (
        <View className="flex-row flex-wrap items-center gap-2">
          <Text className="font-semibold text-[11px] text-bear-sub2">Окно:</Text>
          {START_HOURS.map((h) => (
            <Pill key={h} on={windowStart === h} onPress={() => setWindowStart(h)}>
              {`${two(h)}:00`}
            </Pill>
          ))}
          <Text className="font-semibold text-[11px] text-bear-sub2">План:</Text>
          {PLANS.map((h) => (
            <Pill
              key={h}
              on={windowHours === 24 - h}
              onPress={() => setWindowHours(24 - h)}
            >
              {`${h}/${24 - h}`}
            </Pill>
          ))}
        </View>
      )}
      <Pressable
        onPress={toggle}
        accessibilityRole="button"
        className={`self-end rounded-full px-5 py-2 ${running ? 'bg-white/5' : ''}`}
        style={running ? null : { backgroundColor: '#7B6CF6' }}
      >
        <Text
          className={`font-bold text-[13px] ${running ? 'text-bear-soft' : 'text-white'}`}
        >
          {running ? 'Завершить' : 'Начать сейчас'}
        </Text>
      </Pressable>
    </View>
  )
}

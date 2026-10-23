// Контролы голодания: выбор старта окна и плана (14/10, 16/8),
// кнопка «Начать / Завершить» с тостами.

import { Pressable, Text, View } from 'react-native'
import { useFastingStore } from '@/store/useFastingStore'
import { useToast } from '../ui/Toast'
import { two, fmtH } from '@/lib/data/fasting'

const START_HOURS = [8, 10, 12]
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

export function FastingControls({ running, winLabel, planLabel }) {
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
      start()
      toast({
        title: '⏱ Голодание начато',
        description: `Цель — ${planLabel}. Окно питания: ${winLabel}`,
      })
    }
  }

  return (
    <View className="mt-4 gap-2">
      {!running && (
        <View className="flex-row flex-wrap items-center gap-2">
          <Text className="font-semibold text-[11px] text-bear-sub2">Старт окна:</Text>
          {START_HOURS.map((h) => (
            <Pill key={h} on={windowStart === h} onPress={() => setWindowStart(h)}>
              {`${two(h)}:00`}
            </Pill>
          ))}
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
          {running ? 'Завершить' : 'Начать голодание'}
        </Text>
      </Pressable>
    </View>
  )
}

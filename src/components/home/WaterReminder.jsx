// Напоминания о воде: тумблер в шапке окна + панель интервалов
// (30/60/90/120 минут и своё значение от 5 до 720)

import { useState } from 'react'
import { Pressable, Switch, Text, TextInput, View } from 'react-native'
import { Bell } from 'lucide-react-native'
import { useActivityStore } from '@/store/useActivityStore'
import { useToast } from '../ui/Toast'

// Тумблер без текста — ставится в шапку окна «Вода»
export function ReminderToggle() {
  const reminder = useActivityStore((s) => s.reminder)
  const setReminder = useActivityStore((s) => s.setReminder)
  const { toast } = useToast()

  return (
    <View className="flex-row items-center">
      <Bell size={16} color={reminder.enabled ? '#7DD3FC' : '#8B96B8'} />
      <Switch
        accessibilityLabel="Напоминания о воде"
        value={reminder.enabled}
        onValueChange={(v) => {
          setReminder({ enabled: v })
          toast({
            title: v ? '🔔 Напоминания включены' : 'Напоминания выключены',
            description: v ? 'Будем напоминать пить воду' : undefined,
          })
        }}
        trackColor={{ true: '#7B6CF6', false: 'rgba(255,255,255,0.15)' }}
        thumbColor="#fff"
        style={{ transform: [{ scale: 0.75 }] }}
      />
    </View>
  )
}

export function ReminderIntervals() {
  const reminder = useActivityStore((s) => s.reminder)
  const setReminder = useActivityStore((s) => s.setReminder)
  const [custom, setCustom] = useState('')
  const PILLS = [30, 60, 90, 120]
  const isCustom = !PILLS.includes(reminder.everyMin)

  function applyCustom() {
    const n = Math.round(Number(custom))
    if (!n || n < 5 || n > 720) return
    setReminder({ everyMin: n })
  }

  return (
    <View>
      <Text className="font-sans text-[11px] leading-snug text-bear-sub">
        Напомним, если норма не выпита. С 8:00 до 23:00.
      </Text>
      <View className="mt-2 flex-row flex-wrap gap-1.5">
        {PILLS.map((m) => (
          <Text
            key={m}
            onPress={() => setReminder({ everyMin: m })}
            accessibilityRole="button"
            className={`rounded-full px-3 py-1.5 font-semibold text-xs ${
              reminder.everyMin === m ? 'text-white' : 'bg-white/5 text-bear-sub'
            }`}
            style={reminder.everyMin === m ? { backgroundColor: '#7B6CF6' } : null}
          >
            {m} мин
          </Text>
        ))}
        <View
          className={`flex-row items-center gap-1 rounded-full px-2 py-1 ${
            isCustom ? '' : 'bg-white/5'
          }`}
          style={isCustom ? { backgroundColor: '#7B6CF6' } : null}
        >
          <Text className={`font-semibold text-xs ${isCustom ? 'text-white' : 'text-bear-sub'}`}>
            Своё:
          </Text>
          <TextInput
            accessibilityLabel="Свой интервал в минутах"
            value={isCustom ? String(reminder.everyMin) : custom}
            onChangeText={(t) => {
              setCustom(t)
              const n = Math.round(Number(t))
              if (n >= 5 && n <= 720) setReminder({ everyMin: n })
            }}
            onEndEditing={applyCustom}
            keyboardType="number-pad"
            maxLength={3}
            placeholder="—"
            placeholderTextColor="#8B96B8"
            className="w-7 font-semibold text-xs text-white"
          />
          <Text className={`font-semibold text-xs ${isCustom ? 'text-white' : 'text-bear-sub'}`}>
            мин
          </Text>
        </View>
      </View>
    </View>
  )
}

// Напоминания о воде: колокольчик в шапке окна (тап — вкл/выкл,
// перечёркнутый колокольчик — выключено) + панель интервалов
// (30/60/90/120 минут и своё значение от 5 до 720)

import { useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'
import { Bell, BellOff } from 'lucide-react-native'
import { useActivityStore } from '@/store/useActivityStore'
import { requestNotifPermission } from '@/lib/reminders'
import { useToast } from '../ui/Toast'

// Только колокольчик, без переключателя — ставится в шапку окна «Вода».
// Тап — включить/выключить: обычный колокольчик — включено,
// перечёркнутый (BellOff) — выключено. При включении запрашивает
// разрешение на уведомления: без него напоминания приходить не могут.
export function ReminderToggle() {
  const reminder = useActivityStore((s) => s.reminder)
  const setReminder = useActivityStore((s) => s.setReminder)
  const { toast } = useToast()

  async function handleToggle() {
    const next = !reminder.enabled
    if (next) {
      const ok = await requestNotifPermission()
      if (!ok) {
        toast({
          title: '🔔 Нужно разрешение',
          description: 'Разрешите уведомления NutriBear в настройках телефона',
        })
        return
      }
    }
    setReminder({ enabled: next })
    toast({
      title: next ? '🔔 Напоминания включены' : 'Напоминания выключены',
      description: next
        ? `Будем напоминать каждые ${reminder.everyMin} мин, если норма не выпита`
        : undefined,
    })
  }

  return (
    <Pressable
      onPress={handleToggle}
      accessibilityRole="button"
      accessibilityLabel={
        reminder.enabled
          ? 'Напоминания о воде включены, нажмите, чтобы выключить'
          : 'Напоминания о воде выключены, нажмите, чтобы включить'
      }
      hitSlop={8}
      className="p-1 active:opacity-70"
    >
      {reminder.enabled ? (
        <Bell size={18} color="#7DD3FC" />
      ) : (
        <BellOff size={18} color="#8B96B8" />
      )}
    </Pressable>
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
        Уведомления придут, даже если приложение закрыто, но не побеспокоят,
        если норма уже выпита. Тихие часы: 23:00–8:00.
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

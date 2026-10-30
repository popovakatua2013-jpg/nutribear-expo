// Карточка «Напоминания о еде» в разделе «Ещё»: общий тумблер и время
// завтрака, обеда, ужина. Уведомления планирует src/lib/reminders.js —
// карточка только меняет настройки и запрашивает разрешение.

import { useState } from 'react'
import { Switch, Text, TextInput, View } from 'react-native'
import { UtensilsCrossed } from 'lucide-react-native'
import { useActivityStore } from '@/store/useActivityStore'
import { requestNotifPermission } from '@/lib/reminders'
import { useToast } from '../ui/Toast'

const ROWS = [
  { key: 'breakfast', label: 'Завтрак', emoji: '🌅' },
  { key: 'lunch', label: 'Обед', emoji: '☀️' },
  { key: 'dinner', label: 'Ужин', emoji: '🌙' },
]

// Поле времени «ЧЧ:ММ»: цифры вводятся подряд, двоеточие ставится само.
// Время уходит в стор только когда введены все 4 цифры и оно корректно.
function TimeField({ value, onChange }) {
  const [text, setText] = useState(value)
  const [focused, setFocused] = useState(false)

  // Пока поле в фокусе показываем локальный ввод, иначе — значение стора
  const shown = focused ? text : value

  function handle(t) {
    const d = t.replace(/\D/g, '').slice(0, 4)
    let next = d
    if (d.length > 2) next = `${d.slice(0, 2)}:${d.slice(2)}`
    setText(next)
    if (d.length === 4) {
      const hh = Number(d.slice(0, 2))
      const mm = Number(d.slice(2))
      if (hh <= 23 && mm <= 59) onChange(`${d.slice(0, 2)}:${d.slice(2)}`)
    }
  }

  return (
    <TextInput
      value={shown}
      onChangeText={handle}
      onFocus={() => {
        setText(value)
        setFocused(true)
      }}
      onEndEditing={() => setFocused(false)}
      keyboardType="number-pad"
      maxLength={5}
      textAlign="center"
      accessibilityLabel="Время напоминания, часы и минуты"
      className="w-[64px] rounded-xl border border-white/10 bg-white/5 py-1.5 font-semibold text-[13px] text-bear-text"
    />
  )
}

export function MealRemindersCard() {
  const meals = useActivityStore((s) => s.reminder.meals)
  const setReminder = useActivityStore((s) => s.setReminder)
  const { toast } = useToast()

  async function toggle(v) {
    if (v) {
      const ok = await requestNotifPermission()
      if (!ok) {
        toast({
          title: '🔔 Нужно разрешение',
          description: 'Разрешите уведомления NutriBear в настройках телефона',
        })
        return
      }
    }
    setReminder({ meals: { ...meals, enabled: v } })
    toast({
      title: v ? '🍽 Напоминания о приёмах включены' : 'Напоминания о приёмах выключены',
      description: v
        ? `Завтрак ${meals.breakfast} · Обед ${meals.lunch} · Ужин ${meals.dinner}`
        : undefined,
    })
  }

  return (
    <View
      accessibilityLabel="Напоминания о приёмах пищи"
      className="rounded-3xl border border-bear-line bg-bear-card p-4"
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2.5">
          <UtensilsCrossed size={18} color="#F59E0B" />
          <Text className="font-bold text-[15px] tracking-tight text-bear-text">
            Напоминания о еде
          </Text>
        </View>
        <Switch
          accessibilityLabel="Включить напоминания о приёмах пищи"
          value={meals.enabled}
          onValueChange={toggle}
          trackColor={{ true: '#7B6CF6', false: 'rgba(255,255,255,0.15)' }}
          thumbColor="#fff"
        />
      </View>
      <Text className="mt-1 font-sans text-[11.5px] leading-snug text-bear-sub">
        {meals.enabled
          ? 'Уведомление придёт в выбранное время — даже если приложение закрыто.'
          : 'Подскажем, когда пора завтракать, обедать и ужинать.'}
      </Text>

      {meals.enabled && (
        <View className="mt-3 gap-2">
          {ROWS.map((r) => (
            <View
              key={r.key}
              className="flex-row items-center gap-2.5 rounded-2xl bg-white/[0.04] px-3.5 py-2.5"
            >
              <Text className="text-[15px]">{r.emoji}</Text>
              <Text className="min-w-0 flex-1 font-semibold text-[13px] text-bear-text">
                {r.label}
              </Text>
              <TimeField
                value={meals[r.key]}
                onChange={(t) => setReminder({ meals: { ...meals, [r.key]: t } })}
              />
            </View>
          ))}
        </View>
      )}
    </View>
  )
}

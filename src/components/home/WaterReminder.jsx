// Напоминания о воде: колокольчик в шапке окна (тап — вкл/выкл,
// перечёркнутый колокольчик — выключено) + панель интервалов:
// пилюли 30/60/90/120 минут, свой интервал — через карандашик
// (тап раскрывает ввод, галочка — применить, крестик — отменить)

import { useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'
import { Bell, BellOff, Check, Pencil, X } from 'lucide-react-native'
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
        <Bell size={20} color="#7DD3FC" />
      ) : (
        <BellOff size={20} color="#8B96B8" />
      )}
    </Pressable>
  )
}

export function ReminderIntervals() {
  const reminder = useActivityStore((s) => s.reminder)
  const setReminder = useActivityStore((s) => s.setReminder)
  const { toast } = useToast()
  const [editing, setEditing] = useState(false) // раскрыт ввод своего интервала
  const [custom, setCustom] = useState('')
  const PILLS = [30, 60, 90, 120]
  const isCustom = !PILLS.includes(reminder.everyMin)

  // Свой интервал: от 5 до 720 минут; true — применили
  function applyCustom() {
    const n = Math.round(Number(String(custom).replace(',', '.')))
    if (!n || n < 5 || n > 720) {
      toast({ title: '⏰ Проверьте интервал', description: 'От 5 до 720 минут, например 45' })
      return false
    }
    setReminder({ everyMin: n })
    return true
  }

  function openEdit() {
    setCustom(isCustom ? String(reminder.everyMin) : '')
    setEditing(true)
  }

  function closeEdit(saved) {
    if (saved) setEditing(false)
  }

  return (
    <View>
      <Text className="font-sans text-[13px] leading-snug text-bear-sub">
        Уведомления придут, даже если приложение закрыто, но не побеспокоят,
        если норма уже выпита. Тихие часы: 23:00–8:00.
      </Text>
      <View className="mt-2 flex-row flex-wrap items-center gap-1.5">
        {PILLS.map((m) => (
          <Text
            key={m}
            onPress={() => {
              setReminder({ everyMin: m })
              setEditing(false)
            }}
            accessibilityRole="button"
            className={`rounded-full px-3 py-1.5 font-semibold text-[14px] ${
              reminder.everyMin === m && !editing ? 'text-white' : 'bg-white/5 text-bear-sub'
            }`}
            style={reminder.everyMin === m && !editing ? { backgroundColor: '#7B6CF6' } : null}
          >
            {m} мин
          </Text>
        ))}
        {/* Свой интервал, когда он активен — выделенная пилюля со значением */}
        {isCustom && !editing && (
          <Text
            onPress={openEdit}
            accessibilityRole="button"
            accessibilityLabel={`Свой интервал: ${reminder.everyMin} минут, нажмите, чтобы изменить`}
            className="rounded-full px-3 py-1.5 font-semibold text-[14px] text-white"
            style={{ backgroundColor: '#7B6CF6' }}
          >
            {reminder.everyMin} мин
          </Text>
        )}
        {editing ? (
          // Режим карандашика: ввод своего интервала + применить/отменить
          <View className="flex-row items-center gap-1 rounded-full bg-white/5 py-0.5 pl-2 pr-0.5">
            <TextInput
              autoFocus
              accessibilityLabel="Свой интервал в минутах"
              value={custom}
              onChangeText={setCustom}
              onSubmitEditing={() => closeEdit(applyCustom())}
              keyboardType="number-pad"
              maxLength={3}
              placeholder="45"
              placeholderTextColor="#8B96B8"
              className="w-9 text-center font-semibold text-[14px] text-white"
            />
            <Text className="font-sans text-[13px] text-bear-sub">мин</Text>
            <Pressable
              onPress={() => closeEdit(applyCustom())}
              accessibilityRole="button"
              accessibilityLabel="Применить свой интервал"
              className="ml-0.5 rounded-full p-1 active:opacity-70"
              style={{ backgroundColor: '#22C55E' }}
            >
              <Check size={15} color="#fff" strokeWidth={2.5} />
            </Pressable>
            <Pressable
              onPress={() => setEditing(false)}
              accessibilityRole="button"
              accessibilityLabel="Отменить ввод интервала"
              className="rounded-full bg-white/10 p-1 active:opacity-70"
            >
              <X hitSlop={10} size={15} color="#A5AECB" />
            </Pressable>
          </View>
        ) : (
          // Карандашик: раскрыть ввод своего интервала (от 5 до 720 минут)
          <Pressable
            onPress={openEdit}
            accessibilityRole="button"
            accessibilityLabel="Изменить: свой интервал напоминаний"
            hitSlop={4}
            className="h-9 w-9 items-center justify-center rounded-full bg-white/5 active:opacity-70"
          >
            <Pencil size={14} color="#8B96B8" />
          </Pressable>
        )}
      </View>
    </View>
  )
}

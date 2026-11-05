// Карточка «Напоминания о еде» в разделе «Ещё»: общий тумблер и время
// завтрака, обеда, ужина. Уведомления планирует src/lib/reminders.js —
// карточка только меняет настройки и запрашивает разрешение.

import { useState } from 'react'
import { Pressable, Switch, Text, TextInput, View } from 'react-native'
import { UtensilsCrossed } from 'lucide-react-native'
import { useActivityStore } from '@/store/useActivityStore'
import { useProfileStore } from '@/store/useProfileStore'
import { requestNotifPermission } from '@/lib/reminders'
import { CollapsibleCard } from '../ui/CollapsibleCard'
import { useToast } from '../ui/Toast'

const ROWS = [
  { key: 'breakfast', label: 'Завтрак', emoji: '🌅' },
  { key: 'lunch', label: 'Обед', emoji: '☀️' },
  { key: 'dinner', label: 'Ужин', emoji: '🌙' },
]

// Поле времени «ЧЧ:ММ»: цифры вводятся подряд, двоеточие ставится само.
// Время уходит в стор только когда введены все 4 цифры и оно корректно.
// Экспортируется для карточки взвешивания (WeighReminderCard).
export function TimeField({ value, onChange }) {
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
      className="w-[64px] rounded-xl border border-white/10 bg-white/5 py-1.5 font-semibold text-[15.5px] text-bear-text"
    />
  )
}

export function MealRemindersCard() {
  const meals = useActivityStore((s) => s.reminder.meals)
  const setReminder = useActivityStore((s) => s.setReminder)
  // Имя из профиля — в примере подкола: «Катя, булочки?»
  const firstName = (useProfileStore((s) => s.name) || '').trim().split(/\s+/)[0]
  const { toast } = useToast()

  // Стиль пинков: мягко / с характером (дефолт) / с перцем.
  // Тон действует на все пинки медведя: еда, вода, весы, тренировка
  const style = meals.style === 'soft' ? 'soft' : meals.style === 'spicy' ? 'spicy' : 'bear'
  const STYLES = [
    { key: 'soft', label: 'Мягко', a11y: 'Стиль напоминаний: мягко' },
    { key: 'bear', label: 'С характером 🐻', a11y: 'Стиль напоминаний: с характером' },
    { key: 'spicy', label: 'С перцем 🌶', a11y: 'Стиль напоминаний: с перцем' },
  ]

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
    <CollapsibleCard
      storageKey="meal-reminders"
      accessibilityLabel="Напоминания о приёмах пищи"
      icon={<UtensilsCrossed size={20} color="#F59E0B" />}
      title="Напоминания о еде"
      right={
        <Switch
          accessibilityLabel="Включить напоминания о приёмах пищи"
          value={meals.enabled}
          onValueChange={toggle}
          trackColor={{ true: '#7B6CF6', false: 'rgba(255,255,255,0.15)' }}
          thumbColor="#fff"
        />
      }
    >
      <Text className="font-sans text-[14px] leading-snug text-bear-sub">
        {meals.enabled
          ? 'Уведомление придёт в выбранное время — даже если приложение закрыто.'
          : 'Подскажем, когда пора завтракать, обедать и ужинать.'}
      </Text>

      {meals.enabled && (
        <View className="mt-3 gap-2">
          {/* Стиль пинков: мягко / с характером / с перцем */}
          <View className="flex-row gap-1.5">
            {STYLES.map((st) => {
              const active = style === st.key
              return (
                <Pressable
                  key={st.key}
                  accessibilityRole="button"
                  accessibilityLabel={st.a11y}
                  accessibilityState={{ selected: active }}
                  onPress={() => setReminder({ meals: { ...meals, style: st.key } })}
                  className={`flex-1 items-center rounded-xl border py-2 ${
                    active ? 'border-[#7B6CF6] bg-[#7B6CF6]/20' : 'border-white/10 bg-white/5'
                  }`}
                >
                  <Text
                    className={`text-[14.5px] ${
                      active ? 'font-semibold text-bear-text' : 'text-bear-sub'
                    }`}
                    numberOfLines={1}
                  >
                    {st.label}
                  </Text>
                </Pressable>
              )
            })}
          </View>
          <Text className="font-sans text-[13px] leading-snug text-bear-sub">
            {style === 'soft'
              ? 'Спокойные напоминания без шуток — как раньше. Относится ко всем пинкам: еда, вода, весы, тренировка.'
              : style === 'spicy'
                ? `Медведь добавляет дерзкую серию с драмой и мемами (${
                    firstName ? `«${firstName}, булочки?»` : '«Дневник объявил голодовку»'
                  }). Только добрые — без обещаний результата и рекламы.`
                : `Медведь видит пропуски и по-доброму подкалывает (${
                    firstName ? `«${firstName}, булочки?»` : '«Уже булочки жуёшь?»'
                  }). Если приём уже записан — пинок не придёт.`}
          </Text>
          {ROWS.map((r) => (
            <View
              key={r.key}
              className="flex-row items-center gap-2.5 rounded-2xl bg-white/[0.04] px-3.5 py-2.5"
            >
              <Text className="text-[18px]">{r.emoji}</Text>
              <Text className="min-w-0 flex-1 font-semibold text-[15.5px] text-bear-text">
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
    </CollapsibleCard>
  )
}

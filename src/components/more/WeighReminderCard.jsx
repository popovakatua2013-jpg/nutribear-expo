// Карточка «Взвешивание» в разделе «Ещё»: еженедельное напоминание
// встать на весы. Выбирается день недели (Пн–Вс) и время «ЧЧ:ММ».
// Уведомления планирует src/lib/reminders.js (триггер WEEKLY),
// тап по уведомлению открывает вкладку с динамикой веса.

import { Pressable, Switch, Text, View } from 'react-native'
import { Scale } from 'lucide-react-native'
import { useActivityStore } from '@/store/useActivityStore'
import { requestNotifPermission } from '@/lib/reminders'
import { useToast } from '../ui/Toast'
import { TimeField } from './MealRemindersCard'

const DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
// «Каждую понедельник» нельзя: винительный падеж у всех дней разный
const DAY_ACC = [
  'в понедельник',
  'во вторник',
  'в среду',
  'в четверг',
  'в пятницу',
  'в субботу',
  'в воскресенье',
]

export function WeighReminderCard() {
  const weigh = useActivityStore((s) => s.reminder.weigh)
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
    setReminder({ weigh: { ...weigh, enabled: v } })
    toast({
      title: v ? '⚖️ Напоминание о взвешивании включено' : 'Напоминание о взвешивании выключено',
      description: v
        ? `Напомним ${DAY_ACC[weigh.weekday] || 'в субботу'} в ${weigh.time}`
        : undefined,
    })
  }

  return (
    <View
      accessibilityLabel="Напоминание о взвешивании"
      className="rounded-3xl border border-bear-line bg-bear-card p-4"
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2.5">
          <Scale size={18} color="#7DD3FC" />
          <Text className="font-bold text-[15px] tracking-tight text-bear-text">
            Взвешивание
          </Text>
        </View>
        <Switch
          accessibilityLabel="Включить напоминание о взвешивании"
          value={weigh.enabled}
          onValueChange={toggle}
          trackColor={{ true: '#7B6CF6', false: 'rgba(255,255,255,0.15)' }}
          thumbColor="#fff"
        />
      </View>
      <Text className="mt-1 font-sans text-[11.5px] leading-snug text-bear-sub">
        {weigh.enabled
          ? 'Раз в неделю напомним встать на весы и записать вес.'
          : 'Раз в неделю — самое точное измерение динамики.'}
      </Text>

      {weigh.enabled && (
        <View className="mt-3 gap-2">
          <View className="flex-row flex-wrap gap-1.5">
            {DAYS.map((d, i) => {
              const active = weigh.weekday === i
              return (
                <Pressable
                  key={d}
                  onPress={() => setReminder({ weigh: { ...weigh, weekday: i } })}
                  accessibilityRole="button"
                  accessibilityLabel={`День недели ${d}`}
                  className={`rounded-full px-3 py-1.5 active:opacity-70 ${active ? '' : 'bg-white/5'}`}
                  style={active ? { backgroundColor: '#7B6CF6' } : null}
                >
                  <Text className={`font-semibold text-xs ${active ? 'text-white' : 'text-bear-sub'}`}>
                    {d}
                  </Text>
                </Pressable>
              )
            })}
          </View>
          <View className="flex-row items-center gap-2.5 rounded-2xl bg-white/[0.04] px-3.5 py-2.5">
            <Text className="text-[15px]">⏰</Text>
            <Text className="min-w-0 flex-1 font-semibold text-[13px] text-bear-text">
              Время напоминания
            </Text>
            <TimeField
              value={weigh.time}
              onChange={(t) => setReminder({ weigh: { ...weigh, time: t } })}
            />
          </View>
        </View>
      )}
    </View>
  )
}

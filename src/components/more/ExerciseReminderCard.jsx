// Карточка «Тренировка» в разделе «Ещё»: ежедневный пинок о занятии
// в выбранное время. Если тренировка в этот день уже записана в дневник,
// уведомление молчит (проверка в момент срабатывания — см. reminders.js).
// Тап по уведомлению открывает вкладку «Активность».

import { Switch, Text, View } from 'react-native'
import { Dumbbell } from 'lucide-react-native'
import { useActivityStore } from '@/store/useActivityStore'
import { requestNotifPermission } from '@/lib/reminders'
import { CollapsibleCard } from '../ui/CollapsibleCard'
import { useToast } from '../ui/Toast'
import { TimeField } from './MealRemindersCard'

export function ExerciseReminderCard() {
  const exercise = useActivityStore((s) => s.reminder.exercise)
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
    setReminder({ exercise: { ...exercise, enabled: v } })
    toast({
      title: v ? '🏋️ Пинок о тренировке включён' : 'Пинок о тренировке выключен',
      description: v ? `Каждый день в ${exercise.time} — если занятие ещё не записано` : undefined,
    })
  }

  return (
    <CollapsibleCard
      storageKey="exercise-reminder"
      accessibilityLabel="Напоминание о тренировке"
      icon={<Dumbbell size={20} color="#F97316" />}
      title="Тренировка"
      right={
        <Switch
          accessibilityLabel="Включить напоминание о тренировке"
          value={exercise?.enabled}
          onValueChange={toggle}
          trackColor={{ true: '#7B6CF6', false: 'rgba(255,255,255,0.15)' }}
          thumbColor="#fff"
        />
      }
    >
      <Text className="font-sans text-[14px] leading-snug text-bear-sub">
        {exercise?.enabled
          ? 'Пинок придёт в выбранное время — если тренировка ещё не записана.'
          : 'Диван не победит: ежедневное напоминание о занятии.'}
      </Text>

      {exercise?.enabled && (
        <View className="mt-3 gap-2">
          <View className="flex-row items-center gap-2.5 rounded-2xl bg-white/[0.04] px-3.5 py-2.5">
            <Text className="text-[18px]">⏰</Text>
            <Text className="min-w-0 flex-1 font-semibold text-[15.5px] text-bear-text">
              Время пинка
            </Text>
            <TimeField
              value={exercise.time}
              onChange={(t) => setReminder({ exercise: { ...exercise, time: t } })}
            />
          </View>
        </View>
      )}
    </CollapsibleCard>
  )
}

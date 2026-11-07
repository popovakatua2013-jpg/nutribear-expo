// Карточка «Сон» в разделе «Ещё»: вечерний пинок «пора спать» в выбранное
// время (по умолчанию 22:30 — трекер сна, отзыв Кати «да давай»). Проверок
// «уже записан?» нет: будущую ночь нельзя записать заранее, пинок всегда
// уместен. Тап по уведомлению открывает окно «Записать сон» на вкладке
// Активности (reminders.js → navEvents → ReportsSection).

import { Switch, Text, View } from 'react-native'
import { MoonStar } from 'lucide-react-native'
import { useActivityStore } from '@/store/useActivityStore'
import { requestNotifPermission } from '@/lib/reminders'
import { CollapsibleCard } from '../ui/CollapsibleCard'
import { useToast } from '../ui/Toast'
import { TimeField } from './MealRemindersCard'

// Запасной блок, если в состоянии ещё нет пинка о сне (старая копия
// без миграции): выключенный переключатель со временем по умолчанию
const SLEEP_FALLBACK = { enabled: false, time: '22:30' }

export function SleepReminderCard() {
  const sleep = useActivityStore((s) => s.reminder?.sleep) || SLEEP_FALLBACK
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
    setReminder({ sleep: { ...sleep, enabled: v } })
    toast({
      title: v ? '🌙 Вечерний пинок включён' : 'Вечерний пинок выключен',
      description: v ? `Каждый день в ${sleep.time} — мягкий сигнал, что пора в кровать` : undefined,
    })
  }

  return (
    <CollapsibleCard
      storageKey="sleep-reminder"
      accessibilityLabel="Напоминание о сне"
      icon={<MoonStar size={20} color="#c084fc" />}
      title="Сон"
      right={
        <Switch
          accessibilityLabel="Включить напоминание о сне"
          value={sleep?.enabled}
          onValueChange={toggle}
          trackColor={{ true: '#7B6CF6', false: 'rgba(255,255,255,0.15)' }}
          thumbColor="#fff"
        />
      }
    >
      <Text className="font-sans text-[16px] leading-snug text-bear-sub">
        {sleep?.enabled
          ? 'Пинок придёт в выбранное время — мягкий сигнал, что пора в кровать.'
          : 'Недосып тормозит вес сильнее, чем кажется: вечерний пинок напомнит лечь вовремя.'}
      </Text>

      {sleep?.enabled && (
        <View className="mt-3 gap-2">
          <View className="flex-row items-center gap-2.5 rounded-2xl bg-white/[0.04] px-3.5 py-2.5">
            <Text className="text-[20px]">🌙</Text>
            <Text className="min-w-0 flex-1 font-semibold text-[17.5px] text-bear-text">
              Время пинка
            </Text>
            <TimeField
              value={sleep.time}
              onChange={(t) => setReminder({ sleep: { ...sleep, time: t } })}
            />
          </View>
        </View>
      )}
    </CollapsibleCard>
  )
}

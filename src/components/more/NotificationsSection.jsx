// Секция «Уведомления» на «Ещё» — все напоминания и отклик приложения
// в ОДНОМ свёрнутом блоке (отзыв Кати: «сделать вкладку "Уведомления"
// и туда вместить о взвешивание, тренировка, еда, вибрация, сон и т.д;
// всегда свёрнуто по умолчанию»). Внутри — прежние карточки-настройки:
// напоминания о еде, взвешивание, вечерняя подсказка, тренировка,
// сон и вибрация (тактильный отклик). Свёрнутое состояние НЕ
// запоминается: секция всегда открывается свёрнутой.

import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { Bell, ChevronDown } from 'lucide-react-native'
import { BodyChip } from '../ui/BodyChip'
import { MealRemindersCard } from './MealRemindersCard'
import { WeighReminderCard } from './WeighReminderCard'
import { ExerciseReminderCard } from './ExerciseReminderCard'
import { SleepReminderCard } from './SleepReminderCard'
import { WeighNudgeCard } from './WeighNudgeCard'
import { HapticsCard } from './HapticsCard'

export function NotificationsSection() {
  // Всегда свёрнуто по умолчанию (отзыв Кати) — без запоминания
  const [open, setOpen] = useState(false)

  return (
    <View
      accessibilityLabel="Уведомления"
      className="overflow-hidden rounded-3xl border border-bear-bodyLine bg-bear-bodyCard"
    >
      <Pressable
        onPress={() => setOpen((s) => !s)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={open ? 'Свернуть уведомления' : 'Раскрыть уведомления'}
        className="min-w-0 flex-row items-center gap-2.5 px-4 py-3.5 active:opacity-70"
      >
        <BodyChip icon={<Bell size={20} color="#C4B5FD" />} />
        <View className="min-w-0 flex-1">
          <Text className="font-bold text-[20px] tracking-tight text-bear-text">
            Уведомления
          </Text>
          <Text
            numberOfLines={1}
            maxFontSizeMultiplier={1.2}
            className="font-sans text-[13.5px] leading-snug text-bear-dim"
          >
            Еда, взвешивание, тренировки, сон и вибрация
          </Text>
        </View>
        <ChevronDown
          size={20}
          color="#A5AECB"
          style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}
        />
      </Pressable>

      {open && (
        <View className="gap-2 px-3 pb-3">
          <MealRemindersCard />
          <WeighReminderCard />
          <WeighNudgeCard />
          <ExerciseReminderCard />
          <SleepReminderCard />
          <HapticsCard />
        </View>
      )}
    </View>
  )
}

// Секция «Уведомления» на «Ещё» (редизайн по шаблону Катиного референса:
// шапка + ряд быстрых тумблеров, как плитки «Напоминания» в референсе, и
// «Все настройки» — прежний полный набор внутри). Быстрые тумблеры:
// тренировки и калории (возвращать ли сожжённое), напоминания о еде,
// взвешивание — работают без раскрытия секции. Внутри — прежние
// карточки-настройки: еда, взвешивание, вечерняя подсказка, тренировка,
// сон и вибрация (тактильный отклик). Свёрнутое состояние НЕ
// запоминается: секция всегда открывается свёрнутой.

import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { Bell, ChevronDown, Flame, Scale, UtensilsCrossed } from 'lucide-react-native'
import { BodyChip } from '../ui/BodyChip'
import { MealRemindersCard } from './MealRemindersCard'
import { WeighReminderCard } from './WeighReminderCard'
import { ExerciseReminderCard } from './ExerciseReminderCard'
import { SleepReminderCard } from './SleepReminderCard'
import { WeighNudgeCard } from './WeighNudgeCard'
import { HapticsCard } from './HapticsCard'
import { useGoalsStore } from '@/store/useGoalsStore'
import { useActivityStore } from '@/store/useActivityStore'
import { requestNotifPermission } from '@/lib/reminders'
import { useToast } from '../ui/Toast'

// Компактный тумблер для плиток (стандартный Switch шире плитки)
function MiniToggle({ value, onChange, label }) {
  return (
    <Pressable
      onPress={() => onChange(!value)}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={label}
      hitSlop={6}
      className="h-[22px] w-[40px] justify-center rounded-full"
      style={{
        backgroundColor: value ? '#7B6CF6' : 'rgba(255,255,255,0.15)',
        alignItems: value ? 'flex-end' : 'flex-start',
        paddingHorizontal: 2,
      }}
    >
      <View className="h-[18px] w-[18px] rounded-full bg-white" />
    </Pressable>
  )
}

// Плитка быстрого тумблера: иконка + переключатель сверху, подпись снизу
function QuickTile({ icon, title, sub, value, onChange, a11y }) {
  return (
    <View className="min-w-0 flex-1 rounded-2xl bg-white/[0.04] p-2.5">
      <View className="flex-row items-center justify-between gap-1">
        {icon}
        <MiniToggle value={value} onChange={onChange} label={a11y} />
      </View>
      <Text
        maxFontSizeMultiplier={1.1}
        className="mt-1.5 font-bold text-[13px] leading-[16px] text-bear-text"
      >
        {title}
      </Text>
      <Text maxFontSizeMultiplier={1.1} className="font-sans text-[11.5px] leading-[14px] text-bear-dim">
        {sub}
      </Text>
    </View>
  )
}

export function NotificationsSection() {
  // Всегда свёрнуто по умолчанию (отзыв Кати) — без запоминания
  const [open, setOpen] = useState(false)
  const { toast } = useToast()

  const countBurned = useGoalsStore((s) => Boolean(s.goals.countBurned))
  const setGoals = useGoalsStore((s) => s.setGoals)
  const meals = useActivityStore((s) => s.reminder.meals)
  const weigh = useActivityStore((s) => s.reminder.weigh)
  const setReminder = useActivityStore((s) => s.setReminder)

  // Включение напоминаний требует разрешения на уведомления
  async function toggleWithPermission(current, patch, on) {
    if (on) {
      const ok = await requestNotifPermission()
      if (!ok) {
        toast({
          title: '🔔 Нужно разрешение',
          description: 'Разрешите уведомления NutriBear в настройках телефона',
        })
        return
      }
    }
    setReminder(patch(current, on))
  }

  return (
    <View
      accessibilityLabel="Уведомления"
      className="overflow-hidden rounded-3xl border border-bear-bodyLine bg-bear-bodyCard"
    >
      <Pressable
        onPress={() => setOpen((s) => !s)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={open ? 'Свернуть уведомления' : 'Раскрыть все настройки уведомлений'}
        className="min-w-0 flex-row items-center gap-2.5 px-4 py-3.5 active:opacity-70"
      >
        <BodyChip icon={<Bell size={20} color="#C4B5FD" />} />
        <View className="min-w-0 flex-1">
          <Text className="font-extrabold text-[20px] tracking-tight text-bear-text">
            Напоминания
          </Text>
          <Text
            numberOfLines={1}
            maxFontSizeMultiplier={1.2}
            className="font-sans text-[13.5px] leading-snug text-bear-dim"
          >
            {open ? 'Все настройки — тумблеры и время' : 'Быстрые тумблеры · «Все настройки» внутри'}
          </Text>
        </View>
        <ChevronDown
          size={20}
          color="#A5AECB"
          style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}
        />
      </Pressable>

      {/* Быстрые тумблеры — видны всегда, работают без раскрытия секции.
          Заголовки короткие («Калории», «Еда», «Вес»): в узкую плитку
          длинные слова («Напоминания») не помещаются без обреза */}
      <View className="flex-row gap-2 px-3 pb-3">
        <QuickTile
          a11y="Тренировки возвращают калории"
          icon={<Flame size={18} color="#F97316" />}
          title="Калории"
          sub={countBurned ? 'тренировки возвращают' : 'тренировки не возвращают'}
          value={countBurned}
          onChange={(v) => setGoals({ countBurned: v })}
        />
        <QuickTile
          a11y="Напоминания о еде"
          icon={<UtensilsCrossed size={18} color="#F59E0B" />}
          title="Еда"
          sub={meals.enabled ? 'напоминания вкл' : 'по времени'}
          value={meals.enabled}
          onChange={(v) => toggleWithPermission(meals, (m, on) => ({ meals: { ...m, enabled: on } }), v)}
        />
        <QuickTile
          a11y="Напоминание о взвешивании"
          icon={<Scale size={18} color="#7DD3FC" />}
          title="Вес"
          sub={weigh.enabled ? 'напоминание вкл' : 'раз в неделю'}
          value={weigh.enabled}
          onChange={(v) => toggleWithPermission(weigh, (w, on) => ({ weigh: { ...w, enabled: on } }), v)}
        />
      </View>

      {open && (
        <View className="gap-2 px-3 pb-3">
          <Text className="px-1 font-sans text-[12.5px] text-bear-dim">
            Все настройки напоминаний и отклика приложения
          </Text>
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

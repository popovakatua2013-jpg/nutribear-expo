// Секция «Напоминания» на «Ещё» (редизайн по шаблону Катиного референса:
// шапка + ряд быстрых тумблеров «Тренировка / Пей воду / Взвешивание»
// и чип «Все» с полным набором внутри). Быстрые тумблеры работают без
// раскрытия секции; состояние общее с карточками «Сон» и «Время пинка»
// (одни и те же поля стора). Внутри — прежние карточки-настройки:
// еда, взвешивание, вечерняя подсказка, тренировка, сон, вибрация —
// и тумблер возврата калорий (переехал сюда из плиток по шаблону).
// Свёрнутое состояние НЕ запоминается: секция всегда открывается свёрнутой.

import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { Bell, ChevronRight, Droplets, Dumbbell, Scale } from 'lucide-react-native'
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
  const reminder = useActivityStore((s) => s.reminder)
  const weigh = reminder.weigh
  const exercise = reminder.exercise
  const water = { enabled: reminder.enabled, everyMin: reminder.everyMin }
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
        <Text className="min-w-0 flex-1 font-extrabold text-[20px] tracking-tight text-bear-text">
          Напоминания
        </Text>
        {/* Чип «Все» — как на шаблоне: раскрывает полный набор настроек */}
        <View className="flex-row shrink-0 items-center gap-0.5 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5">
          <Text maxFontSizeMultiplier={1.1} className="font-semibold text-[13.5px] text-bear-soft">
            Все
          </Text>
          <ChevronRight size={14} color="#A5AECB" />
        </View>
      </Pressable>

      {/* Быстрые тумблеры — видны всегда, работают без раскрытия секции.
          Три плитки как на шаблоне: Тренировка (пинок о ней), Пей воду,
          Взвешивание. Подписи — коротким статусом */}
      <View className="flex-row gap-2 px-3 pb-3">
        <QuickTile
          a11y="Напоминание о тренировке"
          icon={<Dumbbell size={18} color="#A78BFA" />}
          title="Тренировка"
          sub={exercise.enabled ? `пинок в ${exercise.time}` : 'выключено'}
          value={Boolean(exercise.enabled)}
          onChange={(v) => toggleWithPermission(exercise, (x, on) => ({ exercise: { ...x, enabled: on } }), v)}
        />
        <QuickTile
          a11y="Напоминание о воде"
          icon={<Droplets size={18} color="#38BDF8" />}
          title="Пей воду"
          sub={water.enabled ? `каждые ${water.everyMin} мин` : 'выключено'}
          value={Boolean(water.enabled)}
          onChange={(v) => toggleWithPermission(water, (x, on) => ({ enabled: on }))}
        />
        <QuickTile
          a11y="Напоминание о взвешивании"
          icon={<Scale size={18} color="#7DD3FC" />}
          title="Взвешивание"
          sub={weigh.enabled ? 'по графику' : 'выключено'}
          value={Boolean(weigh.enabled)}
          onChange={(v) => toggleWithPermission(weigh, (x, on) => ({ weigh: { ...x, enabled: on } }), v)}
        />
      </View>

      {open && (
        <View className="gap-2 px-3 pb-3">
          <Text className="px-1 font-sans text-[12.5px] text-bear-dim">
            Все настройки напоминаний и отклика приложения
          </Text>
          {/* Возврат калорий тренировок — переехал из плиток внутрь «Все»:
              сожжённое возвращается в остаток дня или остаётся строгим */}
          <View className="flex-row items-center justify-between gap-2 rounded-2xl bg-white/[0.04] px-3.5 py-2.5">
            <View className="min-w-0 flex-1 pr-2">
              <Text className="font-semibold text-[15.5px] text-bear-text">Возвращать калории</Text>
              <Text maxFontSizeMultiplier={1.2} className="mt-0.5 font-sans text-[12.5px] leading-[16px] text-bear-sub">
                Сожжённое за тренировки прибавляется к остатку дня
              </Text>
            </View>
            <MiniToggle
              value={countBurned}
              onChange={(v) => setGoals({ countBurned: v })}
              label="Возвращать калории"
            />
          </View>
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

// Секция «Напоминания» — по схеме Кати: «Уведомление — раскрывающий
// список: тренировка, вода, взвешивание и т.д. — тумблер вкл/выкл,
// окно времени». Каждый тип — одна строка компактного списка:
//   🏋️ Тренировка  — тумблер + поле времени прямо в строке
//   💧 Вода        — тумблер + чип «каждые N мин» (тап — выбор интервала)
//   ⚖️ Взвешивание — тумблер + чип «Сб · 08:00» (тап — день и время)
//   🍽 Еда         — тумблер + чип с тремя временами (завтрак/обед/ужин)
//   🌙 Сон         — тумблер + поле времени прямо в строке
// Никаких подсказок и пояснений (отзыв Кати: «все подсказки убрать
// в напоминаниях»), никаких вложенных карточек и плиток — только
// список. «Возвращать калории» отсюда убрано: дубль настройки в
// строке «Дневник питания». Стиль пинков и «Напоминание мишки»
// переехали в группу «ПРИЛОЖЕНИЕ» — это не уведомления.

import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { ChevronDown } from 'lucide-react-native'
import { MiniToggle, PillPicker } from './MenuList'
import { TimeField } from './TimeField'
import { useActivityStore } from '@/store/useActivityStore'
import { requestNotifPermission } from '@/lib/reminders'
import { useToast } from '../ui/Toast'

const DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
const INTERVALS = [30, 60, 90, 120].map((n) => ({ key: n, label: `${n} мин` }))
const MEALS = [
  { key: 'breakfast', label: 'Завтрак' },
  { key: 'lunch', label: 'Обед' },
  { key: 'dinner', label: 'Ужин' },
]

// Чип «окно времени»: текущее значение + шеврон, тап раскрывает выбор
function TimeChip({ text, open, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      accessibilityLabel={`Окно времени: ${text}`}
      hitSlop={4}
      className="max-w-[180px] shrink-0 flex-row items-center gap-1 rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 active:opacity-70"
    >
      <Text
        numberOfLines={1}
        maxFontSizeMultiplier={1.1}
        className="min-w-0 font-sans text-[12.5px] text-bear-soft"
      >
        {text}
      </Text>
      <ChevronDown
        size={13}
        color="#A5AECB"
        style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}
      />
    </Pressable>
  )
}

// Строка списка: иконка + название + окно времени + тумблер вкл/выкл.
// timeEl — элемент окна времени в самой строке (поле ввода или чип);
// expand — что показать под строкой после тапа по чипу.
function ReminderRow({ icon, title, enabled, onToggle, timeEl, expanded, expand }) {
  return (
    <View className="rounded-2xl bg-white/[0.04]">
      <View className="flex-row items-center gap-2 px-3 py-2">
        <Text className="w-[24px] shrink-0 text-center text-[17px]">{icon}</Text>
        <Text
          numberOfLines={1}
          maxFontSizeMultiplier={1.1}
          className="min-w-0 flex-1 font-bold text-[15.5px] text-bear-text"
        >
          {title}
        </Text>
        {timeEl}
        <MiniToggle value={enabled} onChange={onToggle} label={title} />
      </View>
      {expanded && expand ? <View className="px-3 pb-2.5 pt-1">{expand}</View> : null}
    </View>
  )
}

export function NotificationsSection() {
  const { toast } = useToast()
  const reminder = useActivityStore((s) => s.reminder)
  const setReminder = useActivityStore((s) => s.setReminder)
  // Раскрытый чип окна времени (один за раз — список остаётся компактным)
  const [openKey, setOpenKey] = useState(null)
  const flip = (key) => setOpenKey((k) => (k === key ? null : key))

  // Запасные значения — если состояние восстановлено из старой копии
  const exercise = reminder.exercise || { enabled: false, time: '18:00' }
  const sleep = reminder.sleep || { enabled: false, time: '22:30' }
  const weigh = reminder.weigh || { enabled: false, weekday: 5, time: '08:00' }
  const meals =
    reminder.meals || { enabled: false, breakfast: '09:00', lunch: '13:00', dinner: '19:00' }

  // Включение напоминаний требует разрешения на уведомления
  async function toggle(patchFn, on) {
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
    setReminder(patchFn(on))
  }

  return (
    <View accessibilityLabel="Уведомления" className="gap-1.5">
      {/* Тренировка: время прямо в строке */}
      <ReminderRow
        icon="🏋️"
        title="Тренировка"
        enabled={Boolean(exercise.enabled)}
        onToggle={(on) => toggle((v) => ({ exercise: { ...exercise, enabled: v } }), on)}
        timeEl={
          <TimeField
            value={exercise.time}
            onChange={(t) => setReminder({ exercise: { ...exercise, time: t } })}
          />
        }
      />

      {/* Вода: интервал повторения — чип раскрывает выбор */}
      <ReminderRow
        icon="💧"
        title="Вода"
        enabled={Boolean(reminder.enabled)}
        onToggle={(on) => toggle((v) => ({ enabled: v }), on)}
        timeEl={
          <TimeChip
            text={`каждые ${reminder.everyMin || 60} мин`}
            open={openKey === 'water'}
            onPress={() => flip('water')}
          />
        }
        expanded={openKey === 'water'}
        expand={
          <PillPicker
            options={INTERVALS}
            value={reminder.everyMin || 60}
            onChange={(n) => setReminder({ everyMin: n })}
            accessibilityLabel="Интервал напоминаний о воде"
          />
        }
      />

      {/* Взвешивание: день недели + время — чип раскрывает выбор */}
      <ReminderRow
        icon="⚖️"
        title="Взвешивание"
        enabled={Boolean(weigh.enabled)}
        onToggle={(on) => toggle((v) => ({ weigh: { ...weigh, enabled: v } }), on)}
        timeEl={
          <TimeChip
            text={`${DAYS[weigh.weekday] || 'Сб'} · ${weigh.time}`}
            open={openKey === 'weigh'}
            onPress={() => flip('weigh')}
          />
        }
        expanded={openKey === 'weigh'}
        expand={
          <View className="gap-2">
            <PillPicker
              options={DAYS.map((d, i) => ({ key: i, label: d }))}
              value={weigh.weekday}
              onChange={(i) => setReminder({ weigh: { ...weigh, weekday: i } })}
              accessibilityLabel="День недели взвешивания"
            />
            <View className="flex-row items-center justify-end">
              <TimeField
                value={weigh.time}
                onChange={(t) => setReminder({ weigh: { ...weigh, time: t } })}
              />
            </View>
          </View>
        }
      />

      {/* Еда: время завтрака, обеда и ужина — чип раскрывает выбор */}
      <ReminderRow
        icon="🍽"
        title="Еда"
        enabled={Boolean(meals.enabled)}
        onToggle={(on) => toggle((v) => ({ meals: { ...meals, enabled: v } }), on)}
        timeEl={
          <TimeChip
            text={`${meals.breakfast} · ${meals.lunch} · ${meals.dinner}`}
            open={openKey === 'meals'}
            onPress={() => flip('meals')}
          />
        }
        expanded={openKey === 'meals'}
        expand={
          <View className="gap-1.5">
            {MEALS.map((m) => (
              <View
                key={m.key}
                className="flex-row items-center justify-between gap-2 rounded-xl bg-white/[0.03] px-2.5 py-1.5"
              >
                <Text
                  maxFontSizeMultiplier={1.1}
                  className="min-w-0 flex-1 font-semibold text-[14.5px] text-bear-text"
                >
                  {m.label}
                </Text>
                <TimeField
                  value={meals[m.key]}
                  onChange={(t) => setReminder({ meals: { ...meals, [m.key]: t } })}
                />
              </View>
            ))}
          </View>
        }
      />

      {/* Сон: время прямо в строке */}
      <ReminderRow
        icon="🌙"
        title="Сон"
        enabled={Boolean(sleep.enabled)}
        onToggle={(on) => toggle((v) => ({ sleep: { ...sleep, enabled: v } }), on)}
        timeEl={
          <TimeField
            value={sleep.time}
            onChange={(t) => setReminder({ sleep: { ...sleep, time: t } })}
          />
        }
      />
    </View>
  )
}

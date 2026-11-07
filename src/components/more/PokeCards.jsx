// Две карточки-«пинка» на «Ещё» — по референсу Кати: «Сон» и «Время
// пинка», в каждой слева цветной квадрат-иконка, справа чип со временем
// «22:30 ›». Тап раскрывает настройку: тумблер + поле времени.
// Карточки управляют теми же напоминаниями, что и раньше:
//   Сон → reminder.sleep (вечерний пинок «пора в кровать», по умолч. 22:30)
//   Время пинка → reminder.exercise (ежедневный пинок о тренировке,
//   по умолчанию 18:00; если тренировка уже записана — промолчит).
// Состояние общее с карточками внутри «Все настройки» — где включишь,
// там и работает.
// Режим embedded (редизайн «Ещё» в групповое меню): без своей карточки
// и шапки — настройка (тумблер + время) встраивается в строку меню
// «Сон» / «Время пинка», время дублируется в значении строки.

import { useState } from 'react'
import { Pressable, Switch, Text, View } from 'react-native'
import { ChevronRight, Moon, Sun } from 'lucide-react-native'
import { useActivityStore } from '@/store/useActivityStore'
import { requestNotifPermission } from '@/lib/reminders'
import { useToast } from '../ui/Toast'
import { TimeField } from './MealRemindersCard'

const SWITCH_COLORS = { true: '#7B6CF6', false: 'rgba(255,255,255,0.15)' }

// Карточка пинка: шапка (иконка в квадрате + заголовок + подпись + чип
// времени) и раскрывающаяся настройка (тумблер + время).
// embedded — только настройка, без карточки и шапки (строка меню — в MenuRow)
function PokeCard({
  icon,
  squareColor,
  title,
  sub,
  time,
  enabled,
  onToggle,
  onTime,
  hint,
  a11y,
  embedded = false,
}) {
  const [open, setOpen] = useState(false)

  // Настройка: тумблер + время (в обычном режиме — по тапу на шапку,
  // во встроенном — всегда; раскрытие делает MenuRow)
  const settings = (
    <>
      <View className="flex-row items-center justify-between gap-2 rounded-2xl bg-white/[0.04] px-3.5 py-2.5">
        <View className="min-w-0 flex-1 pr-2">
          <Text className="font-semibold text-[15.5px] text-bear-text">
            {enabled ? 'Пинок включён' : 'Пинок выключен'}
          </Text>
          <Text maxFontSizeMultiplier={1.2} className="mt-0.5 font-sans text-[12.5px] leading-[16px] text-bear-sub">
            {hint}
          </Text>
        </View>
        <Switch
          value={enabled}
          onValueChange={onToggle}
          trackColor={SWITCH_COLORS}
          thumbColor="#fff"
          accessibilityLabel={`Включить: ${title}`}
        />
      </View>
      {enabled && (
        <View className="mt-2 flex-row items-center gap-2.5 rounded-2xl border border-white/[0.07] bg-white/[0.03] px-3.5 py-2.5">
          <Text className="text-[20px]">⏰</Text>
          <Text className="min-w-0 flex-1 font-semibold text-[16.5px] text-bear-text">
            Время пинка
          </Text>
          <TimeField value={time} onChange={onTime} />
        </View>
      )}
    </>
  )

  // Встроено в строку меню — только настройка
  if (embedded) {
    return (
      <View accessibilityLabel={a11y} className="gap-1">
        {settings}
      </View>
    )
  }

  return (
    <View accessibilityLabel={a11y} className="overflow-hidden rounded-3xl border border-bear-bodyLine bg-bear-bodyCard">
      <Pressable
        onPress={() => setOpen((s) => !s)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={open ? `Свернуть: ${title}` : `Настроить: ${title}`}
        className="flex-row items-center gap-3 px-4 py-3.5 active:opacity-80"
      >
        {/* Цветной квадрат-иконка, как на шаблоне */}
        <View
          className="h-[46px] w-[46px] shrink-0 items-center justify-center rounded-2xl"
          style={{ backgroundColor: squareColor }}
        >
          {icon}
        </View>
        <View className="min-w-0 flex-1">
          <Text numberOfLines={1} maxFontSizeMultiplier={1.1} className="font-extrabold text-[18px] tracking-tight text-bear-text">
            {title}
          </Text>
          <Text
            numberOfLines={2}
            maxFontSizeMultiplier={1.15}
            className="font-sans text-[12.5px] leading-[16px] text-bear-dim"
          >
            {sub}
          </Text>
        </View>
        {/* Чип со временем «22:30 ›» — как на шаблоне */}
        <View className="flex-row shrink-0 items-center gap-0.5 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5">
          <Text maxFontSizeMultiplier={1.05} className="font-bold text-[14.5px] text-bear-text">
            {time}
          </Text>
          <ChevronRight size={14} color="#A5AECB" />
        </View>
      </Pressable>

      {open && <View className="px-4 pb-4">{settings}</View>}
    </View>
  )
}

// Включение пинка требует разрешения на уведомления — общая обёртка
function usePokeToggle() {
  const { toast } = useToast()
  return async (name, on, apply) => {
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
    apply(on)
    toast({
      title: on ? `🔔 Пинок «${name}» включён` : `Пинок «${name}» выключен`,
      description: on ? 'Придёт в выбранное время — мягкий сигнал' : undefined,
    })
  }
}

// «Сон»: вечерний пинок «пора в кровать» (reminder.sleep)
export function SleepDashboardCard({ embedded = false }) {
  const sleep = useActivityStore((s) => s.reminder?.sleep) || { enabled: false, time: '22:30' }
  const setReminder = useActivityStore((s) => s.setReminder)
  const toggle = usePokeToggle()

  return (
    <PokeCard
      a11y="Напоминание о сне"
      embedded={embedded}
      icon={<Sun size={22} color="#FBBF24" />}
      squareColor="rgba(251,191,36,0.16)"
      title="Сон"
      sub="Пинок придёт в выбранное время — мягкий сигнал"
      time={sleep.time}
      enabled={Boolean(sleep.enabled)}
      onToggle={(v) => toggle('Сон', v, (on) => setReminder({ sleep: { ...sleep, enabled: on } }))}
      onTime={(t) => setReminder({ sleep: { ...sleep, time: t } })}
      hint="Каждый день напомним лечь вовремя — недосып тормозит вес сильнее, чем кажется"
    />
  )
}

// «Время пинка»: ежедневный пинок о тренировке (reminder.exercise)
export function KickTimeCard({ embedded = false }) {
  const exercise = useActivityStore((s) => s.reminder?.exercise) || { enabled: false, time: '18:00' }
  const setReminder = useActivityStore((s) => s.setReminder)
  const toggle = usePokeToggle()

  return (
    <PokeCard
      a11y="Время пинка о тренировке"
      embedded={embedded}
      icon={<Moon size={22} color="#C4B5FD" />}
      squareColor="rgba(123,108,246,0.16)"
      title="Время пинка"
      sub="Мягкий сигнал, что пора"
      time={exercise.time}
      enabled={Boolean(exercise.enabled)}
      onToggle={(v) => toggle('Тренировка', v, (on) => setReminder({ exercise: { ...exercise, enabled: on } }))}
      onTime={(t) => setReminder({ exercise: { ...exercise, time: t } })}
      hint="Ежедневный пинок о тренировке. Если тренировка уже записана — промолчит"
    />
  )
}

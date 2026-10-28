// Карточка «Календарь»: сетка-статистика (цвет = норма калорий, точки =
// привычки), серия «дней подряд» в шапке, тап по дню — сводка дня.
// По умолчанию календарь свёрнут в компактную строку текущей недели —
// только числа; кнопка ⌄ разворачивает весь месяц.
// За новый личный рекорд серии начисляются монетки (один раз за рекорд).

import { useEffect, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Flame,
} from 'lucide-react-native'
import { DaysGrid, WeekdayRow } from './CalendarGrid'
import { DayDetailsModal } from './DayDetailsModal'
import { WeekStrip } from './WeekStrip'
import { bestStreak, calcStreak, firstActiveKey, monthSummary } from '@/lib/data/calendar'
import { useHistoryStore } from '@/store/useHistoryStore'
import { useFoodStore } from '@/store/useFoodStore'
import { useProfileStore } from '@/store/useProfileStore'
import { useExerciseStore } from '@/store/useExerciseStore'
import { useGoalsStore } from '@/store/useGoalsStore'
import { useShopStore } from '@/store/useShopStore'
import { useStreakStore } from '@/store/useStreakStore'
import { useToast } from '../ui/Toast'

const MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
]

// Склонение: 1 перебор, 2 перебора, 5 переборов
function plural(n, one, few, many) {
  const m10 = n % 10
  const m100 = n % 100
  if (m10 === 1 && m100 !== 11) return one
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few
  return many
}

export function HomeCalendar() {
  const today = new Date()
  const { toast } = useToast()
  const [view, setView] = useState({ y: today.getFullYear(), m: today.getMonth() })
  // По умолчанию свёрнут: компактная неделя, чтобы календарь не съедал экран
  const [open, setOpen] = useState(false)
  const [dayKey, setDayKey] = useState(null)

  const days = useHistoryStore((s) => s.days)
  const foodHistory = useFoodStore((s) => s.history)
  const weights = useProfileStore((s) => s.weights)
  const exLogs = useExerciseStore((s) => s.logs)
  const goals = useGoalsStore((s) => s.goals)
  const earn = useShopStore((s) => s.earn)
  const bump = useStreakStore((s) => s.bump)

  const streak = calcStreak(days, foodHistory, null)
  const record = bestStreak(days, foodHistory)

  // Первый день с данными: до него клетки бледные, листание назад — не глубже
  const firstKey = firstActiveKey(days, foodHistory, weights, exLogs)

  // Месячная сводка для отображаемого месяца (в свёрнутом виде он всегда текущий)
  const month = monthSummary(days, view, goals, weights, exLogs)

  // При сворачивании возвращаемся к текущему месяцу: неделя всегда текущая,
  // поэтому подпись месяца и сводка не должны отставать
  const toggleOpen = () => {
    setOpen((v) => !v)
    if (open) setView({ y: today.getFullYear(), m: today.getMonth() })
  }

  // Бонус за новый личный рекорд серии — начисляется один раз за рекорд
  useEffect(() => {
    const gain = bump(streak)
    if (gain > 0) {
      earn(gain)
      toast({
        title: `🔥 Серия ${streak} дней — новый рекорд!`,
        description: `Начислено ${gain} монеток 🪙`,
      })
    }
    // bump/earn стабильны (zustand), отслеживаем только длину серии
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streak])

  const shift = (delta) =>
    setView(({ y, m }) => {
      const d = new Date(y, m + delta, 1)
      return { y: d.getFullYear(), m: d.getMonth() }
    })

  // Листание месяцев: вперёд — только до текущего, назад — до месяца старта.
  // Пустые месяцы за пределами дневника не имеют смысла — шевроны гаснут.
  const canNext =
    view.y < today.getFullYear() ||
    (view.y === today.getFullYear() && view.m < today.getMonth())
  const firstMonth = firstKey
    ? { y: +firstKey.slice(0, 4), m: +firstKey.slice(5, 7) - 1 }
    : null
  const canPrev =
    !firstMonth ||
    view.y > firstMonth.y ||
    (view.y === firstMonth.y && view.m > firstMonth.m)

  const chevronBtn = 'h-8 w-8 items-center justify-center rounded-full active:bg-white/5'

  return (
    <View
      accessibilityLabel="Календарь"
      className="rounded-3xl border border-bear-line bg-bear-card px-4 py-3.5"
    >
      {/* Заголовок + серия дней (в свёрнутом виде — месяц в этой же строке) */}
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <CalendarDays size={18} color="#A78BFA" />
          <Text className="font-bold text-[15px] tracking-tight text-bear-text">
            Календарь
          </Text>
          {!open && (
            <Text className="font-medium text-[12px] text-bear-dim">
              · {MONTHS[view.m]} {view.y}
            </Text>
          )}
        </View>
        <View className="flex-row items-center gap-1">
          {streak > 1 && (
            <View className="flex-row items-center gap-1 rounded-full bg-amber-400/10 px-2.5 py-1">
              <Flame size={13} color="#FBBF24" />
              <Text className="font-bold text-[11px] text-amber-300">
                {streak} дн. подряд{record > streak ? ` · рекорд ${record}` : ''}
              </Text>
            </View>
          )}
          <Pressable
            onPress={toggleOpen}
            accessibilityLabel={open ? 'Свернуть календарь' : 'Развернуть календарь'}
            accessibilityRole="button"
            className={chevronBtn}
          >
            {open ? (
              <ChevronUp size={16} color="#8A94B3" />
            ) : (
              <ChevronDown size={16} color="#8A94B3" />
            )}
          </Pressable>
        </View>
      </View>

      {/* Навигация по месяцу — только в развёрнутом виде */}
      {open && (
        <View className="mt-2 flex-row items-center justify-between">
          <Pressable
            onPress={() => shift(-1)}
            disabled={!canPrev}
            accessibilityLabel="Предыдущий месяц"
            accessibilityRole="button"
            className={chevronBtn}
          >
            <ChevronLeft size={16} color={canPrev ? '#8A94B3' : '#3D4664'} />
          </Pressable>
          <Text className="font-bold text-[14px] tracking-tight text-bear-text">
            {MONTHS[view.m]} {view.y}
          </Text>
          <Pressable
            onPress={() => shift(1)}
            disabled={!canNext}
            accessibilityLabel="Следующий месяц"
            accessibilityRole="button"
            className={chevronBtn}
          >
            <ChevronRight size={16} color={canNext ? '#8A94B3' : '#3D4664'} />
          </Pressable>
        </View>
      )}

      {/* Месячная сводка: цветные цифры по отображаемому месяцу */}
      {month.ok + month.over + month.workouts + month.weighings > 0 && (
        <Text
          className="mt-1.5 px-1 font-sans text-[10.5px] text-bear-dim"
          numberOfLines={1}
        >
          {MONTHS[view.m]}:{' '}
          <Text className="font-bold text-emerald-400">{month.ok}</Text> в норме
          {month.over > 0 && (
            <>
              {' · '}
              <Text className="font-bold text-rose-400">{month.over}</Text>{' '}
              {plural(month.over, 'перебор', 'перебора', 'переборов')}
            </>
          )}
          {month.workouts > 0 && (
            <>{' · '}{month.workouts} трен.</>
          )}
          {month.weighings > 0 && (
            <>{' · '}{month.weighings} взвеш.</>
          )}
        </Text>
      )}

      {/* Сетка-статистика: свёрнуто — строка текущей недели, развёрнуто — месяц */}
      <View className="mt-1.5">
        <WeekdayRow />
        <View className="pt-1.5">
          {open ? (
            <DaysGrid
              view={view}
              today={today}
              history={days}
              goals={goals}
              weights={weights}
              exLogs={exLogs}
              foodHistory={foodHistory}
              firstKey={firstKey}
              onSelectDay={setDayKey}
            />
          ) : (
            <WeekStrip
              today={today}
              history={days}
              goals={goals}
              weights={weights}
              exLogs={exLogs}
              foodHistory={foodHistory}
              firstKey={firstKey}
              onSelectDay={setDayKey}
            />
          )}
        </View>
      </View>

      {/* Легенда */}
      {open && (
        <Text className="mt-2 px-1 font-sans text-[10px] leading-snug text-bear-dim">
          Зелёный — норма калорий соблюдена, розовый — перебор. Точки: синяя —
          норма воды, оранжевая — тренировка, зелёная — взвешивание. Тап по дню — сводка.
        </Text>
      )}

      <DayDetailsModal
        open={Boolean(dayKey)}
        onClose={() => setDayKey(null)}
        dayKey={dayKey}
        history={days}
        goals={goals}
        weights={weights}
      />
    </View>
  )
}
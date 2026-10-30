// Блок «Календарь» в стиле «тетради в линейку»: свёрнутый вид — тонкая
// строка недели (день + число + точки) и одна горизонтальная линия под
// ней, без карточки и рамки; тап по строке разворачивает полный месяц
// в карточке. Тап по дню — сводка дня.

import { useState } from 'react'
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
  const [view, setView] = useState({ y: today.getFullYear(), m: today.getMonth() })
  // По умолчанию свёрнут: компактная неделя, чтобы календарь не съедал экран
  const [open, setOpen] = useState(false)
  const [dayKey, setDayKey] = useState(null)

  const days = useHistoryStore((s) => s.days)
  const foodHistory = useFoodStore((s) => s.history)
  const weights = useProfileStore((s) => s.weights)
  const exLogs = useExerciseStore((s) => s.logs)
  const goals = useGoalsStore((s) => s.goals)

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
      className={
        open
          ? 'rounded-3xl border border-bear-line bg-bear-card px-4 py-3.5'
          : ''
      }
    >
      {/* Шапка: в свёрнутом виде — тонкая строка-тетрадь, вся строка нажимается */}
      {open ? (
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <CalendarDays size={18} color="#A78BFA" />
            <Text className="font-bold text-[15px] tracking-tight text-bear-text">
              Календарь
            </Text>
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
              accessibilityLabel="Свернуть календарь"
              accessibilityRole="button"
              className={chevronBtn}
            >
              <ChevronUp size={16} color="#A5AECB" />
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable
          onPress={toggleOpen}
          accessibilityLabel="Развернуть календарь"
          accessibilityRole="button"
          className="flex-row items-center justify-between active:opacity-70"
        >
          <View className="flex-row items-center gap-1.5">
            <CalendarDays size={13} color="#A78BFA" />
            <Text className="font-bold text-[13px] tracking-tight text-bear-text">
              Календарь
            </Text>
            <Text className="font-medium text-[11px] text-bear-dim">
              · {MONTHS[view.m]} {view.y}
            </Text>
          </View>
          <View className="flex-row items-center gap-1.5">
            {streak > 1 && (
              <View className="flex-row items-center gap-1 rounded-full bg-amber-400/10 px-2 py-0.5">
                <Flame size={11} color="#FBBF24" />
                <Text className="font-bold text-[10px] text-amber-300">
                  {streak} дн.{record > streak ? ` · рек. ${record}` : ''}
                </Text>
              </View>
            )}
            <ChevronDown size={14} color="#A5AECB" />
          </View>
        </Pressable>
      )}

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
            <ChevronLeft size={16} color={canPrev ? '#A5AECB' : '#3D4664'} />
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
            <ChevronRight size={16} color={canNext ? '#A5AECB' : '#3D4664'} />
          </Pressable>
        </View>
      )}

      {/* Месячная сводка — только в развёрнутом виде */}
      {open && month.ok + month.over + month.workouts + month.weighings > 0 && (
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

      {/* Сетка-статистика: развёрнуто — месяц с шапкой дней, свёрнуто —
          тетрадная строка недели и линейка под ней */}
      {open ? (
        <View className="mt-1.5">
          <WeekdayRow />
          <View className="pt-1.5">
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
          </View>
        </View>
      ) : (
        <View className="mt-1">
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
          {/* линия-«линейка» под строкой, как на странице тетради */}
          <View
            style={{
              height: 1,
              backgroundColor: 'rgba(255,255,255,0.12)',
              marginTop: 5,
            }}
          />
        </View>
      )}

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
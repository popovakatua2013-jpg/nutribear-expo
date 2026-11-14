// Экран «Привычки» — чек-лист на день с авто-отметкой воды и шагов.
// Доступ: «Ещё → Привычки» (карточка-вход). Доступ к стокам:
// useHabitsStore (отметки), useActivityStore (вода/шаги), useFoodStore
// (была ли запись дневника сегодня), useProfileStore (вес), useSleepStore.
//
// 5 привычек: вода, шаги, дневник, взвешивание, сон. Авто-отметка для
// воды и шагов (по достижении цели), остальные — ручной тап. Серия
// дней (streak) — сколько дней подряд закрыты ВСЕ 5.

import { useMemo } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { ArrowLeft, Check, Flame } from 'lucide-react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  useHabitsStore,
  dateKey,
  doneCount,
  dayProgress,
  streak,
} from '@/store/useHabitsStore'
import { useActivityStore, selectTotalSteps } from '@/store/useActivityStore'
import { useGoalsStore } from '@/store/useGoalsStore'
import { useFoodStore } from '@/store/useFoodStore'
import { useProfileStore } from '@/store/useProfileStore'

export default function HabitsScreen() {
  const insets = useSafeAreaInsets()
  const habits = useHabitsStore((s) => s.habits)
  const checks = useHabitsStore((s) => s.checks)
  const toggle = useHabitsStore((s) => s.toggle)

  // Авто-привычки: вычисляем done из сторов
  const waterMl = useActivityStore((s) => s.waterMl)
  const waterGoal = useGoalsStore((s) => s.goals.waterMl)
  const steps = useActivityStore(selectTotalSteps)
  const stepsGoal = useGoalsStore((s) => s.goals.steps)

  // Дневник: была ли сегодня запись (любая еда)
  const entries = useFoodStore((s) => s.entries)
  // Взвешивание: берем из последней записи профиля (упрощённо —
  // если вес в профиле > 0, считаем «заполнено», но это не «взвесился
  // сегодня»; полностью корректно нужно хранилище истории веса, задел
  // на будущее). Пока — ручная отметка.
  const weightKg = useProfileStore((s) => s.weightKg)

  const today = dateKey()

  // Карта авто-отметок для сегодняшнего дня (для doneCount/streak)
  const autoDoneToday = useMemo(
    () => ({
      water: waterGoal > 0 && waterMl >= waterGoal,
      steps: stepsGoal > 0 && steps >= stepsGoal,
    }),
    [waterMl, waterGoal, steps, stepsGoal]
  )

  // Серия дней: смотрим назад, для прошлых дней берём только ручные
  // отметки (авто-данные истории у нас сейчас не хранятся, поэтому
  // серия — нижняя оценка). Сегодня — с авто.
  const streakCount = useMemo(() => {
    // Простая серия по checks (без учёта авто в прошлом): сколько дней
    // подряд в checks есть все РУЧНЫЕ привычки. Это меньше реальной
    // серии (если авто всегда были), но стабильно.
    let count = 0
    let cur = today
    const manualHabits = habits.filter((h) => !h.autoCheck)
    for (let i = 0; i < 366; i++) {
      const dayChecks = checks[cur] || {}
      // Сегодня: учитываем авто; в прошлые дни — только ручные
      const isToday = cur === today
      const auto = isToday ? autoDoneToday : {}
      const allDone = habits.every((h) => {
        if (h.autoCheck) return Boolean(auto[h.id])
        return Boolean(dayChecks[h.id])
      })
      if (allDone) {
        count++
        cur = shiftDateBack(cur)
      } else {
        // Сегодня не закрыт — серия пока 0, но это нормально
        break
      }
    }
    return count
  }, [checks, habits, today, autoDoneToday])

  // Сколько закрыто сегодня (для шапки «3 из 5»)
  const done = doneCount({ habits, checks }, today, autoDoneToday)
  const pct = dayProgress({ habits, checks }, today, autoDoneToday)

  return (
    <View className="flex-1 bg-bear-bg" style={{ paddingTop: insets.top }}>
      {/* Шапка: назад, заголовок, серия */}
      <View className="flex-row items-center justify-between border-b border-white/5 px-3 pb-3.5 pt-2">
        <Pressable
          onPress={() => router.back()}
          accessibilityLabel="Назад"
          accessibilityRole="button"
          hitSlop={6}
          className="h-9 w-9 items-center justify-center rounded-full bg-white/5 active:opacity-70"
        >
          <ArrowLeft size={20} color="#AEB9D9" />
        </Pressable>
        <View className="min-w-0 flex-1 pl-2">
          <Text className="font-extrabold text-[21px] text-bear-text">Привычки</Text>
          <Text className="mt-0.5 text-[15px] text-[#8a94b3]">
            {done} из {habits.length} закрыто · {pct}%
          </Text>
        </View>
        {streakCount > 0 ? (
          <View
            accessibilityLabel={`Серия ${streakCount} дн.`}
            className="mr-1 flex-row items-center gap-1 rounded-full bg-amber-400/15 px-2.5 py-1"
          >
            <Flame size={16} color="#fbbf24" />
            <Text className="font-bold text-[15px] text-amber-300">{streakCount}</Text>
          </View>
        ) : null}
      </View>

      <ScrollView className="flex-1 px-4 py-4" contentContainerStyle={{ gap: 12, paddingBottom: insets.bottom + 16 }}>
        {/* Прогресс-бар */}
        <View className="overflow-hidden rounded-2xl bg-white/[0.04]">
          <View style={{ height: 8, width: `${pct}%` }} className="bg-[#4D7CFE]" />
        </View>

        {/* Подсказка про серию */}
        <Text className="px-1 text-[15px] text-[#8a94b3]">
          {streakCount > 0
            ? `Серия ${streakCount} ${pluralDays(streakCount)} подряд — не разрывай! 🔥`
            : 'Закрой все 5 привычек сегодня — начнётся серия.'}
        </Text>

        {/* Список привычек */}
        {habits.map((h) => {
          const done = h.autoCheck
            ? Boolean(autoDoneToday[h.id])
            : Boolean(checks[today]?.[h.id])
          const disabled = h.autoCheck // авто-привычки нельзя отметить вручную
          return (
            <Pressable
              key={h.id}
              onPress={() => !disabled && toggle(h.id, today)}
              disabled={disabled}
              accessibilityLabel={`${h.name} ${done ? '✓' : ''} ${
                disabled ? '(отмечается автоматически)' : ''
              }`}
              accessibilityRole="button"
              className={`flex-row items-center gap-3 rounded-2xl border p-4 ${
                done ? 'border-[#4ade80]/40 bg-[#4ade80]/8' : 'border-white/5 bg-bear-card'
              } ${disabled ? 'opacity-90' : 'active:opacity-70'}`}
            >
              <Text className="text-[26px]">{h.emoji}</Text>
              <View className="min-w-0 flex-1">
                <Text className="font-bold text-[18px] text-bear-text">{h.name}</Text>
                <Text className="mt-0.5 text-[14px] text-bear-sub2">
                  {h.goal}
                  {disabled ? ' · авто' : ''}
                </Text>
              </View>
              <View
                className={`h-7 w-7 items-center justify-center rounded-full ${
                  done ? 'bg-[#4ade80]' : 'bg-white/8'
                }`}
              >
                {done ? <Check size={18} color="#0f172a" /> : null}
              </View>
            </Pressable>
          )
        })}

        {/* Инфо-карточка: как это работает */}
        <View className="mt-2 rounded-2xl bg-white/[0.04] p-4">
          <Text className="font-bold text-[16px] text-bear-text">Как это работает</Text>
          <Text className="mt-1.5 text-[14.5px] leading-[20px] text-bear-sub2">
            Вода и шаги отмечаются автоматически — когда достигнете нормы
            за день. Дневник питания, взвешивание и сон отмечаете сами
            тапом по кружку. Серия растёт, когда закрыты ВСЕ 5 привычек.
          </Text>
        </View>
      </ScrollView>
    </View>
  )
}

// «дней» / «день» / «дня» — для подписи серии
function pluralDays(n) {
  const n10 = n % 10
  const n100 = n % 100
  if (n10 === 1 && n100 !== 11) return 'день'
  if (n10 >= 2 && n10 <= 4 && (n100 < 10 || n100 >= 20)) return 'дня'
  return 'дней'
}

// Сдвиг ключа даты назад на 1 день (локальная копия shiftDateKey с -1,
// чтобы не тянуть импорт shiftDateKey в компонент — он в сторе)
function shiftDateBack(key) {
  const [y, m, d] = key.split('-').map(Number)
  const dt = new Date(y, m - 1, d - 1)
  const yy = dt.getFullYear()
  const mm = String(dt.getMonth() + 1).padStart(2, '0')
  const dd = String(dt.getDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

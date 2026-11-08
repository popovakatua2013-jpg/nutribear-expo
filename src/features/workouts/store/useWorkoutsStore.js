// src/features/workouts/store/useWorkoutsStore.js
// Состояние вкладки «Тренировки»: настройки (язык, фильтр) и журнал
// сессий. persist синхронизирует данные с AsyncStorage
// (ключи @app/workouts/prefs и @app/workouts/sessions).

import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { CALENDAR_THRESHOLDS } from '../theme'
import { MOCK_WORKOUTS } from '../data/mockWorkouts'

// ============================================================
// Настройки: язык, последний фильтр — ключ @app/workouts/prefs
// ============================================================
export const usePrefsStore = create(
  persist(
    (set) => ({
      lang: 'ru',
      filterType: 'all',
      query: '',
      setLang: (lang) => set({ lang }),
      setFilterType: (filterType) => set({ filterType }),
      setQuery: (query) => set({ query }),
      resetFilters: () => set({ filterType: 'all', query: '' }),
    }),
    {
      name: '@app/workouts/prefs',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
)

// ============================================================
// Журнал сессий — ключ @app/workouts/sessions
// ============================================================
const newId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

export const useSessionsStore = create(
  persist(
    (set, get) => ({
      sessions: [],
      hydrated: false,

      // Начать тренировку: создаёт незавершённую сессию
      startSession: (workout) => {
        // Предыдущие незавершённые сессии той же тренировки закрываем как брошенные
        const closed = get().sessions.map((s) =>
          !s.completed && !s.finishedAt && s.workoutId === workout.id
            ? { ...s, finishedAt: new Date().toISOString() }
            : s,
        )
        const session = {
          id: newId(),
          workoutId: workout.id,
          startedAt: new Date().toISOString(),
          durationMin: 0,
          kcal: 0,
          completed: false,
        }
        set({ sessions: [...closed, session] })
        return session.id
      },

      // Завершить тренировку (полностью или частично)
      finishSession: (sessionId, result) =>
        set({
          sessions: get().sessions.map((s) =>
            s.id === sessionId
              ? {
                  ...s,
                  finishedAt: new Date().toISOString(),
                  durationMin: result.durationMin,
                  kcal: result.kcal,
                  completed: result.completed,
                }
              : s,
          ),
        }),
    }),
    {
      name: '@app/workouts/sessions',
      storage: createJSONStorage(() => AsyncStorage),
      // Флаг гидрации нужен скелетонам: показываем загрузку до восстановления журнала
      onRehydrateStorage: () => () => {
        useSessionsStore.setState({ hydrated: true })
      },
    },
  ),
)

// ============================================================
// Селекторы-агрегаторы
// ============================================================
const dayKey = (iso) => iso.slice(0, 10)
const minutesOf = (s) => (s.completed ? s.durationMin : 0)

function longestStreak(dates) {
  const sorted = [...dates].sort()
  let best = 0
  let run = 0
  let prev = null
  for (const d of sorted) {
    if (prev) {
      const gap =
        (new Date(d).getTime() - new Date(prev).getTime()) / 86_400_000
      run = Math.round(gap) === 1 ? run + 1 : 1
    } else {
      run = 1
    }
    best = Math.max(best, run)
    prev = d
  }
  return best
}

function currentStreak(dates) {
  const today = new Date()
  const key = (d) => d.toISOString().slice(0, 10)
  let streak = 0
  const cursor = new Date(today)
  // Серия продолжается, если тренировка была сегодня или вчера
  if (!dates.has(key(cursor))) cursor.setDate(cursor.getDate() - 1)
  while (dates.has(key(cursor))) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

export function buildBadges(sessions) {
  const completed = sessions.filter((s) => s.completed).length
  const streak = currentStreak(
    new Set(sessions.filter((s) => s.completed).map((s) => dayKey(s.startedAt))),
  )
  return [
    {
      id: 'first',
      title: { ru: 'Первая тренировка', en: 'First workout' },
      icon: 'medal',
      unlocked: completed >= 1,
      progress: completed >= 1 ? undefined : '0 / 1',
    },
    {
      id: 'streak7',
      title: { ru: 'Серия: 7 дней', en: '7-day streak' },
      icon: 'flame',
      unlocked: streak >= 7,
      progress: streak >= 7 ? undefined : `${Math.min(streak, 7)} / 7`,
    },
    {
      id: 'fifty',
      title: { ru: '50 тренировок', en: '50 workouts' },
      icon: 'star',
      unlocked: completed >= 50,
      progress: `${Math.min(completed, 50)} / 50`,
    },
  ]
}

/** Полный агрегат для экрана «Прогресс» */
export function selectSummary(sessions) {
  const now = new Date()
  const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const completedAll = sessions.filter((s) => s.completed)

  const monthSessions = completedAll.filter((s) =>
    s.startedAt.startsWith(monthPrefix),
  )

  // Неделя пн–вс: сдвигаемся к понедельнику текущей недели
  const monday = new Date(now)
  const dow = (now.getDay() + 6) % 7 // 0 = понедельник
  monday.setDate(now.getDate() - dow)
  monday.setHours(0, 0, 0, 0)

  const weekMinutes = Array.from({ length: 7 }, (_, i) => {
    const dayStart = new Date(monday)
    dayStart.setDate(monday.getDate() + i)
    const key = dayKey(dayStart.toISOString())
    return completedAll
      .filter((s) => dayKey(s.startedAt) === key)
      .reduce((acc, s) => acc + minutesOf(s), 0)
  })

  // Календарь текущего месяца
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const calendar = Array.from({ length: daysInMonth }, (_, i) => {
    const key = `${monthPrefix}-${String(i + 1).padStart(2, '0')}`
    const minutes = completedAll
      .filter((s) => dayKey(s.startedAt) === key)
      .reduce((acc, s) => acc + minutesOf(s), 0)
    const level =
      minutes === 0 ? 0 : minutes < CALENDAR_THRESHOLDS.l1 ? 1
      : minutes < CALENDAR_THRESHOLDS.l2 ? 2 : 3
    return { day: i + 1, level }
  })

  const activeDates = new Set(completedAll.map((s) => dayKey(s.startedAt)))

  return {
    streakDays: currentStreak(activeDates),
    recordDays: longestStreak(activeDates),
    monthWorkouts: monthSessions.length,
    monthMinutes: monthSessions.reduce((a, s) => a + minutesOf(s), 0),
    monthKcal: monthSessions.reduce((a, s) => a + (s.completed ? s.kcal : 0), 0),
    weekMinutes,
    calendar,
    badges: buildBadges(sessions),
  }
}

/** Незавершённая сессия для карточки «Продолжить» */
export function selectResumeSession(sessions) {
  const open = sessions.find((s) => !s.completed && !s.finishedAt)
  if (!open) return null
  const workout = MOCK_WORKOUTS.find((w) => w.id === open.workoutId)
  return workout ? { session: open, workout } : null
}

// Тесты стора привычек NutriBear: 5 дефолтных привычек (вода/шаги —
// авто, дневник/вес/сон — ручные), отметки по дням, серия дней (streak),
// прогресс дня. Авто-привычки нельзя отметить вручную — они вычисляются
// из сторов (useActivityStore), ручные — toggle тапом.

jest.requireActual('./helpers/react-native-stub')
jest.requireActual('./helpers/async-storage-stub')

const {
  useHabitsStore,
  DEFAULT_HABITS,
  dateKey,
  shiftDateKey,
  isHabitDone,
  doneCount,
  dayProgress,
  streak,
} = require('@/store/useHabitsStore')

describe('useHabitsStore: дефолтный набор', () => {
  test('5 привычек с правильными id', () => {
    expect(DEFAULT_HABITS).toHaveLength(5)
    const ids = DEFAULT_HABITS.map((h) => h.id)
    expect(ids).toEqual(['water', 'steps', 'diary', 'weight', 'sleep'])
  })

  test('вода и шаги — autoCheck=true (вычисляются из сторов)', () => {
    const water = DEFAULT_HABITS.find((h) => h.id === 'water')
    const steps = DEFAULT_HABITS.find((h) => h.id === 'steps')
    expect(water.autoCheck).toBe(true)
    expect(steps.autoCheck).toBe(true)
  })

  test('дневник/вес/сон — ручные (autoCheck=false)', () => {
    for (const id of ['diary', 'weight', 'sleep']) {
      const h = DEFAULT_HABITS.find((x) => x.id === id)
      expect(h.autoCheck).toBe(false)
    }
  })

  test('у каждой привычки есть emoji, name, goal', () => {
    for (const h of DEFAULT_HABITS) {
      expect(h.emoji).toBeTruthy()
      expect(h.name).toBeTruthy()
      expect(h.goal).toBeTruthy()
    }
  })
})

describe('useHabitsStore: отметки и toggle', () => {
  beforeEach(() => {
    useHabitsStore.setState({ checks: {} })
  })

  test('toggle ручной привычки — ставит и снимает отметку', () => {
    const today = dateKey()
    useHabitsStore.getState().toggle('diary', today)
    expect(useHabitsStore.getState().checks[today].diary).toBe(true)
    useHabitsStore.getState().toggle('diary', today)
    expect(useHabitsStore.getState().checks[today].diary).toBeUndefined()
  })

  test('toggle авто-привычки (вода) — игнор (нельзя отметить вручную)', () => {
    const today = dateKey()
    useHabitsStore.getState().toggle('water', today)
    expect(useHabitsStore.getState().checks[today]).toBeUndefined()
  })

  test('toggle несуществующей привычки — игнор', () => {
    const today = dateKey()
    useHabitsStore.getState().toggle('nonexistent', today)
    expect(useHabitsStore.getState().checks[today]).toBeUndefined()
  })

  test('toggle без dayKey — использует сегодня', () => {
    useHabitsStore.getState().toggle('diary')
    const today = dateKey()
    expect(useHabitsStore.getState().checks[today].diary).toBe(true)
  })

  test('reset — очищает все отметки', () => {
    useHabitsStore.getState().toggle('diary', dateKey())
    useHabitsStore.getState().reset()
    expect(useHabitsStore.getState().checks).toEqual({})
  })
})

describe('useHabitsStore: хелперы', () => {
  test('dateKey — формат YYYY-MM-DD', () => {
    const k = dateKey(new Date(2026, 10, 14)) // 2026-11-14
    expect(k).toBe('2026-11-14')
  })

  test('shiftDateKey — сдвиг вперёд/назад', () => {
    expect(shiftDateKey('2026-11-14', -1)).toBe('2026-11-13')
    expect(shiftDateKey('2026-11-14', 1)).toBe('2026-11-15')
    expect(shiftDateKey('2026-11-14', -14)).toBe('2026-10-31')
  })

  test('shiftDateKey — переход через месяц/год', () => {
    expect(shiftDateKey('2026-01-01', -1)).toBe('2025-12-31')
    expect(shiftDateKey('2026-03-01', -1)).toBe('2026-02-28')
  })
})

describe('useHabitsStore: isHabitDone / doneCount / dayProgress', () => {
  beforeEach(() => {
    useHabitsStore.setState({ checks: {} })
  })

  test('isHabitDone: ручная — берётся из checks', () => {
    const today = dateKey()
    const state = useHabitsStore.getState()
    expect(isHabitDone(state, 'diary', today)).toBe(false)
    useHabitsStore.getState().toggle('diary', today)
    const s2 = useHabitsStore.getState()
    expect(isHabitDone(s2, 'diary', today)).toBe(true)
  })

  test('isHabitDone: авто — берётся из параметра autoDone', () => {
    const state = useHabitsStore.getState()
    expect(isHabitDone(state, 'water', dateKey(), false)).toBe(false)
    expect(isHabitDone(state, 'water', dateKey(), true)).toBe(true)
  })

  test('isHabitDone: несуществующая привычка → false', () => {
    expect(isHabitDone(useHabitsStore.getState(), 'nope', dateKey())).toBe(false)
  })

  test('doneCount: 0 в пустом дне (без авто)', () => {
    const state = useHabitsStore.getState()
    expect(doneCount(state, dateKey(), {})).toBe(0)
  })

  test('doneCount: учитывает и авто, и ручные', () => {
    const today = dateKey()
    useHabitsStore.getState().toggle('diary', today)
    useHabitsStore.getState().toggle('weight', today)
    const state = useHabitsStore.getState()
    // 2 ручные + 2 авто (water/steps done=true)
    expect(doneCount(state, today, { water: true, steps: true })).toBe(4)
  })

  test('dayProgress: 0..100, целое число', () => {
    const today = dateKey()
    useHabitsStore.getState().toggle('diary', today)
    const state = useHabitsStore.getState()
    // 1 из 5 = 20%
    expect(dayProgress(state, today, {})).toBe(20)
    // 3 из 5 = 60% (1 ручная diary + 2 авто water/steps)
    expect(dayProgress(state, today, { water: true, steps: true })).toBe(60)
    // 5 из 5 = 100% (все 3 ручные + 2 авто)
    useHabitsStore.getState().toggle('weight', today)
    useHabitsStore.getState().toggle('sleep', today)
    const s2 = useHabitsStore.getState()
    expect(dayProgress(s2, today, { water: true, steps: true })).toBe(100)
  })
})

describe('useHabitsStore: серия дней (streak)', () => {
  beforeEach(() => {
    useHabitsStore.getState().reset()
  })

  test('streak=0 если сегодня ничего не закрыто', () => {
    const today = dateKey()
    expect(streak(useHabitsStore.getState(), today, {})).toBe(0)
  })

  test('streak=1 если сегодня закрыто всё, вчера — нет', () => {
    const today = dateKey()
    // Закрываем все 5 сегодня
    for (const id of ['diary', 'weight', 'sleep']) {
      useHabitsStore.getState().toggle(id, today)
    }
    const state = useHabitsStore.getState()
    // авто today: water+steps done
    const auto = { [today]: { water: true, steps: true } }
    expect(streak(state, today, auto)).toBe(1)
  })

  test('streak=3 если сегодня и 2 дня назад закрыто всё', () => {
    const today = dateKey()
    const y1 = shiftDateKey(today, -1)
    const y2 = shiftDateKey(today, -2)
    // Закрываем все ручные в today, y1, y2
    for (const day of [today, y1, y2]) {
      for (const id of ['diary', 'weight', 'sleep']) {
        useHabitsStore.getState().toggle(id, day)
      }
    }
    const state = useHabitsStore.getState()
    // авто во все 3 дня
    const auto = {
      [today]: { water: true, steps: true },
      [y1]: { water: true, steps: true },
      [y2]: { water: true, steps: true },
    }
    expect(streak(state, today, auto)).toBe(3)
  })

  test('streak обрывается на неполном дне', () => {
    const today = dateKey()
    const y1 = shiftDateKey(today, -1)
    const y2 = shiftDateKey(today, -2)
    // today и y1 закрыты, y2 — нет (нет weight)
    for (const day of [today, y1]) {
      for (const id of ['diary', 'weight', 'sleep']) {
        useHabitsStore.getState().toggle(id, day)
      }
    }
    // y2: только diary, без weight/sleep
    useHabitsStore.getState().toggle('diary', y2)
    const state = useHabitsStore.getState()
    const auto = {
      [today]: { water: true, steps: true },
      [y1]: { water: true, steps: true },
      [y2]: { water: true, steps: true },
    }
    // today + y1 = 2, y2 обрывает
    expect(streak(state, today, auto)).toBe(2)
  })
})

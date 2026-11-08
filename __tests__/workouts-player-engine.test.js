// Тесты плеера тренировок: чистый конечный автомат player/engine.js
// (prepare → exercise ⇄ rest → done), сборка плана planBuilder.js
// (детерминизм, сумма активных секунд, отдых после последнего) и итог
// сессии buildResult (калории пропорционально активному времени).
// Движок не зависит от React Native — тестируется напрямую.

jest.requireActual('./helpers/react-native-stub')
jest.requireActual('./helpers/async-storage-stub')

const {
  PLAYER_TIMINGS,
  initPlayerState,
  playerReducer,
  buildResult,
} = require('@/features/workouts/player/engine')
const {
  buildPlan,
  planActiveSec,
  planRestSec,
  wantsWarmup,
  wantsCooldown,
} = require('@/features/workouts/player/planBuilder')
const { MOCK_WORKOUTS } = require('@/features/workouts/data/mockWorkouts')
const {
  selectProgramState,
} = require('@/features/workouts/store/useWorkoutsStore')

const tick = (s, n = 1) => playerReducer(s, { type: 'tick', n })

describe('движок плеера: фазы', () => {
  test('старт — фаза «Приготовьтесь», 10 сек', () => {
    const s = initPlayerState([{ id: 'a', name: { ru: 'А' }, durationSec: 30, restSec: 0 }])
    expect(s.phase).toBe('prepare')
    expect(s.secondsLeft).toBe(PLAYER_TIMINGS.prepareSec)
    expect(s.activeSec).toBe(0)
  })

  test('startIndex > 0 — сразу упражнение с полным подходом', () => {
    const plan = [
      { id: 'a', name: { ru: 'А' }, durationSec: 30, restSec: 10 },
      { id: 'b', name: { ru: 'Б' }, durationSec: 45, restSec: 0 },
    ]
    const s = initPlayerState(plan, Date.now(), 1)
    expect(s.phase).toBe('exercise')
    expect(s.index).toBe(1)
    expect(s.secondsLeft).toBe(45)
    expect(s.phaseTotal).toBe(45)
    // некорректный индекс — безопасный старт с начала
    const bad = initPlayerState(plan, Date.now(), 99)
    expect(bad.phase).toBe('prepare')
    expect(bad.index).toBe(0)
  })

  test('отсчёт → первое упражнение', () => {
    let s = initPlayerState([{ id: 'a', name: { ru: 'А' }, durationSec: 30, restSec: 0 }])
    s = tick(s, PLAYER_TIMINGS.prepareSec)
    expect(s.phase).toBe('exercise')
    expect(s.index).toBe(0)
    expect(s.secondsLeft).toBe(30)
  })

  test('конец упражнения → отдых по умолчанию 20 сек', () => {
    let s = initPlayerState([
      { id: 'a', name: { ru: 'А' }, durationSec: 5, restSec: 0 },
      { id: 'b', name: { ru: 'Б' }, durationSec: 5, restSec: 0 },
    ])
    s = tick(s, 10) // prepare 10 → сразу exercise
    s = tick(s, 5) // конец упражнения «А»
    expect(s.phase).toBe('rest')
    expect(s.secondsLeft).toBe(PLAYER_TIMINGS.defaultRestSec)
    expect(s.activeSec).toBe(5)
  })

  test('конец отдыха → следующее упражнение', () => {
    let s = initPlayerState([
      { id: 'a', name: { ru: 'А' }, durationSec: 5, restSec: 10 },
      { id: 'b', name: { ru: 'Б' }, durationSec: 5, restSec: 0 },
    ])
    s = tick(s, 10 + 5) // prepare + первое упражнение
    expect(s.phase).toBe('rest')
    s = tick(s, 10)
    expect(s.phase).toBe('exercise')
    expect(s.index).toBe(1)
    expect(s.secondsLeft).toBe(5)
  })

  test('последнее упражнение → done, completed = true', () => {
    let s = initPlayerState([{ id: 'a', name: { ru: 'А' }, durationSec: 5, restSec: 0 }])
    s = tick(s, 10 + 5)
    expect(s.phase).toBe('done')
    expect(s.completed).toBe(true)
    // после done таймер стоит
    expect(tick(s, 100)).toBe(s)
  })

  test('пауза останавливает время, повтор — снимает', () => {
    let s = initPlayerState([{ id: 'a', name: { ru: 'А' }, durationSec: 30, restSec: 0 }])
    s = playerReducer(s, { type: 'skip' }) // сразу к упражнению
    s = playerReducer(s, { type: 'togglePause' })
    expect(tick(s, 50)).toBe(s)
    s = playerReducer(s, { type: 'togglePause' })
    expect(tick(s, 1).secondsLeft).toBe(29)
  })

  test('skip: отсчёт → сразу упражнение, упражнение → отдых, отдых → дальше', () => {
    let s = initPlayerState([
      { id: 'a', name: { ru: 'А' }, durationSec: 30, restSec: 10 },
      { id: 'b', name: { ru: 'Б' }, durationSec: 30, restSec: 0 },
    ])
    s = playerReducer(s, { type: 'skip' })
    expect(s.phase).toBe('exercise')
    s = playerReducer(s, { type: 'skip' })
    expect(s.phase).toBe('rest')
    s = playerReducer(s, { type: 'skip' })
    expect(s.phase).toBe('exercise')
    expect(s.index).toBe(1)
  })

  test('skip на паузе ничего не делает', () => {
    let s = initPlayerState([{ id: 'a', name: { ru: 'А' }, durationSec: 30, restSec: 0 }])
    s = playerReducer(s, { type: 'togglePause' })
    expect(playerReducer(s, { type: 'skip' })).toBe(s)
  })

  test('extendRest работает только в отдыхе и двигает обе величины', () => {
    let s = initPlayerState([
      { id: 'a', name: { ru: 'А' }, durationSec: 5, restSec: 10 },
      { id: 'b', name: { ru: 'Б' }, durationSec: 5, restSec: 0 },
    ])
    expect(playerReducer(s, { type: 'extendRest' })).toBe(s) // не отдых — без изменений
    s = tick(s, 15)
    expect(s.phase).toBe('rest')
    const before = s
    s = playerReducer(s, { type: 'extendRest' })
    expect(s.secondsLeft).toBe(before.secondsLeft + PLAYER_TIMINGS.extendRestSec)
    expect(s.phaseTotal).toBe(before.phaseTotal + PLAYER_TIMINGS.extendRestSec)
  })

  test('quit до конца: done, completed = false', () => {
    let s = initPlayerState([{ id: 'a', name: { ru: 'А' }, durationSec: 30, restSec: 0 }])
    s = tick(s, 12)
    s = playerReducer(s, { type: 'quit' })
    expect(s.phase).toBe('done')
    expect(s.completed).toBe(false)
  })

  test('батч tick наверстывает пропущенное, но останавливается на done', () => {
    let s = initPlayerState([{ id: 'a', name: { ru: 'А' }, durationSec: 5, restSec: 0 }])
    s = tick(s, 1000) // больше, чем весь план
    expect(s.phase).toBe('done')
    expect(s.completed).toBe(true)
    expect(s.activeSec).toBe(5)
  })
})

describe('итог сессии buildResult', () => {
  const workout = { id: 'w', durationMin: 5, kcal: 300 }
  const plan = [
    { id: 'a', name: { ru: 'А' }, durationSec: 150, restSec: 20 },
    { id: 'b', name: { ru: 'Б' }, durationSec: 150, restSec: 0 },
  ]

  test('полностью пройденный план: полный расход и все упражнения', () => {
    let s = initPlayerState(plan)
    // активная часть 300 сек + prepare 10 + отдых 20
    s = tick(s, 10 + 150 + 20 + 150)
    expect(s.phase).toBe('done')
    const res = buildResult(s, workout)
    expect(res.completed).toBe(true)
    expect(res.activeSec).toBe(300)
    expect(res.durationMin).toBe(5)
    expect(res.kcal).toBe(300)
    expect(res.exercisesDone).toBe(2)
  })

  test('прерванная: калории пропорционально активному времени', () => {
    let s = initPlayerState(plan)
    s = tick(s, 10 + 60) // prepare + минута упражнения
    s = playerReducer(s, { type: 'quit' })
    const res = buildResult(s, workout)
    expect(res.completed).toBe(false)
    expect(res.activeSec).toBe(60)
    expect(res.kcal).toBe(Math.round((300 * 60) / 300))
    expect(res.durationMin).toBe(1)
    expect(res.exercisesDone).toBe(0) // первое ещё не закончилось (60 из 150 сек)
  })

  test('прерванная в отдыхе: текущее упражнение уже засчитано', () => {
    let s = initPlayerState(plan)
    s = tick(s, 10 + 150) // prepare + целиком первое упражнение
    expect(s.phase).toBe('rest')
    s = playerReducer(s, { type: 'quit' })
    expect(buildResult(s, workout).exercisesDone).toBe(1)
  })

  test('выход до первого упражнения: ноль всего', () => {
    const s = initPlayerState(plan)
    const res = buildResult(s, workout)
    expect(res.activeSec).toBe(0)
    expect(res.durationMin).toBe(0)
    expect(res.kcal).toBe(0)
    expect(res.exercisesDone).toBe(0)
  })
})

describe('плансбордер', () => {
  test('каталог: план покрывает длительность тренировки, у последнего отдыха нет', () => {
    for (const w of MOCK_WORKOUTS) {
      const plan = buildPlan(w)
      // последний подход добавляется целиком + разминка (~105 сек) и
      // заминка (~90 сек), поэтому план может быть заметно длиннее цели —
      // но не короче её
      expect(planActiveSec(plan)).toBeGreaterThanOrEqual(w.durationMin * 60)
      expect(planActiveSec(plan)).toBeLessThan(w.durationMin * 60 + 220)
      expect(plan[plan.length - 1].restSec).toBe(0)
      expect(planRestSec(plan)).toBeGreaterThan(0) // между упражнениями отдых есть
      expect(plan.length).toBeGreaterThan(1)
    }
  })

  test('разминка/заминка: правила по типам и флагам', () => {
    const strength = MOCK_WORKOUTS.find((w) => w.id === 'w-abs')
    const plan = buildPlan(strength)
    expect(plan[0].kind).toBe('warmup') // разминка в начале
    expect(plan[plan.length - 1].kind).toBe('cooldown') // заминка в конце
    expect(wantsWarmup(strength)).toBe(true)
    expect(wantsCooldown(strength)).toBe(true)

    // йога — сама мягкая: без разминки и заминки
    const yoga = MOCK_WORKOUTS.find((w) => w.id === 'w-prenatal')
    const yogaPlan = buildPlan(yoga)
    expect(yogaPlan.some((e) => e.kind === 'warmup')).toBe(false)
    expect(yogaPlan.some((e) => e.kind === 'cooldown')).toBe(false)

    // растяжка — с разминкой, но без заминки
    const stretch = MOCK_WORKOUTS.find((w) => w.type === 'stretch')
    expect(wantsWarmup(stretch)).toBe(true)
    expect(wantsCooldown(stretch)).toBe(false)

    // «Утренняя зарядка» сама разминка — флаг noWarmup
    const morning = MOCK_WORKOUTS.find((w) => w.id === 'w-morning')
    expect(wantsWarmup(morning)).toBe(false)
    expect(buildPlan(morning).some((e) => e.kind === 'warmup')).toBe(false)
  })

  test('индивидуальный набор (exerciseIds): только свои упражнения, id уникальны', () => {
    const abs = MOCK_WORKOUTS.find((w) => w.id === 'w-abs')
    const plan = buildPlan(abs)
    const main = plan.filter((e) => e.kind === 'main')
    for (const e of main) {
      expect(e.id.startsWith('x-')).toBe(true) // только пул «пресс/талия»
    }
    const ids = new Set(plan.map((e) => e.id))
    expect(ids.size).toBe(plan.length) // все id плана уникальны
    // тип «strength» без набора — обычная библиотека силовых
    const upper = MOCK_WORKOUTS.find((w) => w.id === 'w-upper')
    const upperMain = buildPlan(upper).filter((e) => e.kind === 'main')
    expect(upperMain.some((e) => e.id.startsWith('s-'))).toBe(true)
  })

  test('план детерминированный: два прогона дают одно и то же', () => {
    const w = MOCK_WORKOUTS[1]
    expect(JSON.stringify(buildPlan(w))).toBe(JSON.stringify(buildPlan(w)))
  })

  test('упражнения плана несут пиктограмму и подсказку по технике', () => {
    const plan = buildPlan(MOCK_WORKOUTS[0])
    for (const e of plan) {
      expect(typeof e.emoji).toBe('string')
      expect(e.emoji.length).toBeGreaterThan(0)
      expect(typeof e.tip?.ru).toBe('string')
      expect(typeof e.tip?.en).toBe('string')
    }
  })

  test('явный список упражнений используется как есть (отдых последнего — 0)', () => {
    const w = {
      id: 'x', durationMin: 2, kcal: 50, type: 'yoga',
      exercises: [
        { id: 'e1', name: { ru: 'Одно', en: 'One' }, durationSec: 60, restSec: 99 },
        { id: 'e2', name: { ru: 'Два', en: 'Two' }, durationSec: 60, restSec: 15 },
      ],
    }
    const plan = buildPlan(w)
    expect(plan).toHaveLength(2)
    expect(plan[0].restSec).toBe(99)
    expect(plan[1].restSec).toBe(0)
  })

  test('buildResult: позиция для «Продолжить» (выход из отдыха — следующее упражнение)', () => {
    const workout = { id: 'w', durationMin: 5, kcal: 300 }
    const plan = [
      { id: 'a', name: { ru: 'А' }, durationSec: 150, restSec: 20 },
      { id: 'b', name: { ru: 'Б' }, durationSec: 150, restSec: 0 },
    ]
    // выход в середине первого упражнения — продолжаем с него же
    let s = initPlayerState(plan)
    s = tick(s, 10 + 60)
    s = playerReducer(s, { type: 'quit' })
    expect(buildResult(s, workout).position).toBe(0)
    // выход из отдыха после первого — продолжаем со второго
    s = tick(initPlayerState(plan), 10 + 150)
    s = playerReducer(s, { type: 'quit' })
    expect(buildResult(s, workout).position).toBe(1)
    // завершённая — позиция не нужна
    s = tick(initPlayerState(plan), 10_000)
    expect(buildResult(s, workout).position).toBe(0)
  })
})

describe('программа на неделю: selectProgramState', () => {
  const DAY = 86_400_000
  const iso = (daysAgo) => new Date(Date.now() - daysAgo * DAY).toISOString()

  test('день закрыт завершённой сессией его тренировки; отдых закрыт всегда', () => {
    // Программа «Старт»: день 0 — йога, день 1 — отдых, день 2 — ходьба
    const activeProgram = { id: 'p-start', startedAt: iso(2) }
    const sessions = [
      { workoutId: 'w-morning-yoga', completed: true, startedAt: iso(2) },
    ]
    const st = selectProgramState(activeProgram, sessions)
    expect(st).not.toBeNull()
    expect(st.program.id).toBe('p-start')
    expect(st.dayNumber).toBe(3) // день 3 (прошло два дня)
    expect(st.days[0].done).toBe(true) // йога два дня назад закрыта
    expect(st.days[1].kind).toBe('rest') // день отдыха
    expect(st.todayWorkout.id).toBe('w-cardio-walk') // сегодняшний день
    expect(st.todayDone).toBe(false)
    expect(st.weekGoal).toBe(3)
    expect(st.weekDone).toBe(1)
  })

  test('сегодняшняя тренировка закрыта — todayDone', () => {
    const activeProgram = { id: 'p-start', startedAt: iso(0) }
    const sessions = [
      { workoutId: 'w-morning-yoga', completed: true, startedAt: iso(0) },
    ]
    const st = selectProgramState(activeProgram, sessions)
    expect(st.days[0].done).toBe(true)
    expect(st.todayDone).toBe(true)
    expect(st.weekDone).toBe(1)
  })

  test('незавершённые сессии день не закрывают; чужая тренировка — тоже', () => {
    const activeProgram = { id: 'p-start', startedAt: iso(0) }
    const sessions = [
      { workoutId: 'w-morning-yoga', completed: false, startedAt: iso(0) },
      { workoutId: 'w-hiit-burn', completed: true, startedAt: iso(0) },
    ]
    const st = selectProgramState(activeProgram, sessions)
    expect(st.days[0].done).toBe(false)
    expect(st.todayDone).toBe(false)
  })

  test('без активной программы селектор возвращает null', () => {
    expect(selectProgramState(null, [])).toBeNull()
    expect(selectProgramState({ id: 'нет-такой', startedAt: iso(0) }, [])).toBeNull()
  })
})

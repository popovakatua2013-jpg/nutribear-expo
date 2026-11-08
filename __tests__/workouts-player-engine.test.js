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
} = require('@/features/workouts/player/planBuilder')
const { MOCK_WORKOUTS } = require('@/features/workouts/data/mockWorkouts')

const tick = (s, n = 1) => playerReducer(s, { type: 'tick', n })

describe('движок плеера: фазы', () => {
  test('старт — фаза «Приготовьтесь», 10 сек', () => {
    const s = initPlayerState([{ id: 'a', name: { ru: 'А' }, durationSec: 30, restSec: 0 }])
    expect(s.phase).toBe('prepare')
    expect(s.secondsLeft).toBe(PLAYER_TIMINGS.prepareSec)
    expect(s.activeSec).toBe(0)
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
      // последний подход добавляется целиком, поэтому план может быть
      // чуть длиннее цели — но не короче и не более чем на один подход
      expect(planActiveSec(plan)).toBeGreaterThanOrEqual(w.durationMin * 60)
      expect(planActiveSec(plan)).toBeLessThan(w.durationMin * 60 + 90)
      expect(plan[plan.length - 1].restSec).toBe(0)
      expect(planRestSec(plan)).toBeGreaterThan(0) // между упражнениями отдых есть
      expect(plan.length).toBeGreaterThan(1)
    }
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
})

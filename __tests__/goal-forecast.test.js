// Тесты прогноза цели по весу (lib/data/forecast.js — блок в «Прогрессе»
// на вкладке «План», просьба Кати 10.11): дефицит по дневнику за 2 недели
// → темп кг/нед (7700 ккал ≈ 1 кг) → дата цели; честные отказы, когда
// данных мало, цель не поставлена, вес у цели или рацион уводит от цели.

const goalForecast = require('@/lib/data/forecast').goalForecast

// Фиксированное «сегодня»: 10 ноября 2026, полдень (время не влияет)
const NOW = new Date(2026, 10, 10, 12, 0, 0)

const pad = (n) => String(n).padStart(2, '0')
const keyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

// Записи дневника: дни от сегодня назад (daysAgo 0 = сегодня)
function logDays(daysAgo, kcal) {
  const d = new Date(NOW)
  d.setDate(d.getDate() - daysAgo)
  return { day: keyOf(d), kcal }
}

describe('goalForecast: прогноз цели по весу', () => {
  test('данных мало (0–2 дня с записями) — need-data с needDays', () => {
    const empty = goalForecast({ history: [], kcalGoal: 2000, weightKg: 70, goalWeightKg: 65, now: NOW })
    expect(empty.ok).toBe(false)
    expect(empty.reason).toBe('need-data')
    expect(empty.needDays).toBe(3)

    const two = goalForecast({
      history: [logDays(0, 1500), logDays(1, 1500)],
      kcalGoal: 2000,
      weightKg: 70,
      goalWeightKg: 65,
      now: NOW,
    })
    expect(two.reason).toBe('need-data')
    expect(two.needDays).toBe(1)
  })

  test('окно 14 дней: дни старше окна не считаются, дубли дня суммируются', () => {
    const history = [
      // 4 дня в окне по 1500 ккал (вчера — двумя записями 700+800)
      logDays(0, 1500),
      logDays(1, 700),
      logDays(1, 800),
      logDays(2, 1500),
      logDays(3, 1500),
      // день за окном (15 дней назад) — не влияет на среднее
      logDays(15, 5000),
    ]
    const f = goalForecast({
      history,
      kcalGoal: 2000,
      weightKg: 72,
      goalWeightKg: 67, // надо сбросить 5 кг
      now: NOW,
    })
    expect(f.ok).toBe(true)
    expect(f.loggedDays).toBe(4)
    expect(f.deficitKcal).toBe(500) // 2000 − 1500
    // темп 500 ккал/день × 7 / 7700 = 0,454… → 0,5 кг/нед (round1)
    expect(f.rateKgWeek).toBe(0.5)
    // 5 кг / 0,4545… кг/нед = 11 недель → 77 дней
    expect(f.daysLeft).toBe(77)
    const expected = new Date(NOW)
    expected.setDate(expected.getDate() + 77)
    expect(f.date.getFullYear()).toBe(expected.getFullYear())
    expect(f.date.getMonth()).toBe(expected.getMonth())
    expect(f.date.getDate()).toBe(expected.getDate())
  })

  test('цель по весу не поставлена — no-goal (дефицит всё же посчитан)', () => {
    const f = goalForecast({
      history: [logDays(0, 1500), logDays(1, 1500), logDays(2, 1500)],
      kcalGoal: 2000,
      weightKg: 70,
      goalWeightKg: null,
      now: NOW,
    })
    expect(f.ok).toBe(false)
    expect(f.reason).toBe('no-goal')
    expect(f.deficitKcal).toBe(500)
  })

  test('вес уже у цели (±50 г) — reached', () => {
    const f = goalForecast({
      history: [logDays(0, 1500), logDays(1, 1500), logDays(2, 1500)],
      kcalGoal: 2000,
      weightKg: 65,
      goalWeightKg: 65,
      now: NOW,
    })
    expect(f.reason).toBe('reached')
  })

  test('дефицит при цели набора — wrong-dir; профицит при сбросе — тоже', () => {
    const lose = goalForecast({
      history: [logDays(0, 1200), logDays(1, 1200), logDays(2, 1200)],
      kcalGoal: 2000,
      weightKg: 70,
      goalWeightKg: 75, // цель ВЫШЕ веса, а рацион с дефицитом
      now: NOW,
    })
    expect(lose.reason).toBe('wrong-dir')

    const gain = goalForecast({
      history: [logDays(0, 3000), logDays(1, 3000), logDays(2, 3000)],
      kcalGoal: 2000,
      weightKg: 70,
      goalWeightKg: 65, // цель НИЖЕ веса, а рацион с профицитом
      now: NOW,
    })
    expect(gain.reason).toBe('wrong-dir')
    expect(gain.deficitKcal).toBe(-1000) // профицит — отрицательный
  })

  test('темп меньше 0,05 кг/нед — too-slow (дата будет гулять от шума)', () => {
    const f = goalForecast({
      history: [logDays(0, 1960), logDays(1, 1960), logDays(2, 1960)],
      kcalGoal: 2000,
      weightKg: 70,
      goalWeightKg: 65,
      now: NOW,
    })
    // дефицит 40 ккал/день → 280/7700 = 0,036 кг/нед
    expect(f.reason).toBe('too-slow')
  })

  test('профицит к цели набора — ok с положительной датой', () => {
    const f = goalForecast({
      history: [logDays(0, 3200), logDays(1, 3200), logDays(2, 3200)],
      kcalGoal: 2000,
      weightKg: 60,
      goalWeightKg: 62,
      now: NOW,
    })
    expect(f.ok).toBe(true)
    expect(f.deficitKcal).toBe(-1200) // профицит
    // темп −1200×7/7700 = −1,09 → |rate| 1,1 кг/нед; 2 кг / 1,0909 = 1,83 нед → 13 дней
    expect(f.rateKgWeek).toBe(-1.1)
    expect(f.daysLeft).toBe(13)
  })

  test('среднее считается по дням с записями (пустые дни не размывают)', () => {
    // 3 дня по 1000 ккал в окне 14 дней: среднее по ЗАПОЛНЕННЫМ дням
    const f = goalForecast({
      history: [logDays(0, 1000), logDays(1, 1000), logDays(2, 1000)],
      kcalGoal: 2000,
      weightKg: 70,
      goalWeightKg: 69,
      now: NOW,
    })
    expect(f.ok).toBe(true)
    expect(f.deficitKcal).toBe(1000)
    expect(f.loggedDays).toBe(3)
  })
})

// Тесты восстановления из копии (applyBackup). Аудит нашёл дыры:
// блок exercise пинка о тренировке, тумблеры шагомера/Health Connect
// и замеры тела экспортировались, но при восстановлении терялись —
// «перенос на новый телефон» приходил с дырками, а включение пинка
// падало на отсутствующем времени.

// RN-стабы должны встать до импортов стора
jest.requireActual('./helpers/react-native-stub')
jest.requireActual('./helpers/async-storage-stub')
// Фото пишутся в файловую систему — в тестах не нужны
jest.mock('@/lib/photos', () => ({
  restorePhotos: jest.fn(async () => true),
  collectPhotosForBackup: jest.fn(async (items) => []),
}))

function backup() {
  return {
    app: 'NutriBear',
    exportedAt: '2026-11-06T09:00:00.000Z',
    activity: {
      waterMl: 1200,
      extraSteps: 3000,
      pedometerEnabled: true,
      healthConnectEnabled: true,
      reminder: {
        enabled: true,
        everyMin: 45,
        meals: { enabled: true, breakfast: '08:00', lunch: '13:00', dinner: '19:00', style: 'spicy' },
        weigh: { enabled: true, weekday: 6, time: '09:30' },
        exercise: { enabled: true, time: '07:30' },
      },
    },
    profile: {
      name: 'Катя',
      sex: 'female',
      age: 30,
      heightCm: 170,
      weightKg: 70,
      activityId: 'moderate',
      hasBio: true,
      weights: [{ day: '2026-11-01', kg: 70 }],
      measurements: { waist: [{ date: '2026-11-01', value: 74 }] },
      customMeasurements: [{ name: 'Обхват бедра' }],
      lastBmiCat: 'norm',
    },
    goals: { goals: { kcal: 1800 } },
  }
}

describe('applyBackup: перенос на новый телефон без потерь', () => {
  let applyBackup, useActivityStore, useProfileStore

  beforeAll(() => {
    ;({ applyBackup } = require('@/lib/backup'))
    ;({ useActivityStore } = require('@/store/useActivityStore'))
    ;({ useProfileStore } = require('@/store/useProfileStore'))
  })

  test('пинок о тренировке восстанавливается (раньше терялся)', async () => {
    await applyBackup(backup())
    expect(useActivityStore.getState().reminder.exercise).toEqual({
      enabled: true,
      time: '07:30',
    })
  })

  test('битое время пинка заменяется безопасным значением', async () => {
    const b = backup()
    b.activity.reminder.exercise = { enabled: true, time: 'завтра' }
    await applyBackup(b)
    expect(useActivityStore.getState().reminder.exercise).toEqual({
      enabled: true,
      time: '18:00',
    })
  })

  test('старая копия без блока exercise → пинок выключен, время 18:00', async () => {
    const b = backup()
    delete b.activity.reminder.exercise
    await applyBackup(b)
    expect(useActivityStore.getState().reminder.exercise).toEqual({
      enabled: false,
      time: '18:00',
    })
  })

  test('тумблеры шагомера и Health Connect восстанавливаются', async () => {
    await applyBackup(backup())
    const s = useActivityStore.getState()
    expect(s.pedometerEnabled).toBe(true)
    expect(s.healthConnectEnabled).toBe(true)
  })

  test('замеры тела, свои замеры и категория ИМТ восстанавливаются', async () => {
    await applyBackup(backup())
    const p = useProfileStore.getState()
    expect(p.measurements.waist).toHaveLength(1)
    expect(p.customMeasurements).toEqual([{ name: 'Обхват бедра' }])
    expect(p.lastBmiCat).toBe('norm')
  })

  test('мусорная категория ИМТ не пролезает', async () => {
    const b = backup()
    b.profile.lastBmiCat = 'hacker'
    await applyBackup(b)
    expect(useProfileStore.getState().lastBmiCat).toBeNull()
  })

  test('чужой файл отвергается', async () => {
    await expect(applyBackup({ app: 'Other' })).rejects.toThrow()
  })
})

describe('рецепты: КБЖУ на 100 г при битом выходе', () => {
  test('grams=0 не даёт Infinity (JSON.stringify превратил бы его в null)', () => {
    const { useRecipesStore } = require('@/store/useRecipesStore')
    useRecipesStore.getState().add({ name: 'Суп', grams: 0, totalKcal: 300, servings: 2 })
    const r = useRecipesStore.getState().items[0]
    expect(Number.isFinite(r.kcal100)).toBe(true)
    expect(r.kcal100).toBeGreaterThan(0)
  })
})

// Тесты журнала тренировок при копии (аудит 12.11.2026): Катя
// жаловалась, что копия на новый телефон теряет журнал тренировок.
// Проверяем полный цикл «экспорт → JSON round-trip → applyBackup»:
//   • logs сохраняются с правильной структурой (объект по датам)
//   • custom-тренировки сохраняются
//   • битые ключи дат отфильтровываются (защита от мусорной копии)
//   • аномально длинные логи обрезаются до 210 дней (как в сторе)
//   • мусорные записи в дне не ломают весь день
describe('applyBackup: журнал тренировок переносится без потерь', () => {
  let applyBackup, useExerciseStore

  beforeAll(() => {
    ;({ applyBackup } = require('@/lib/backup'))
    ;({ useExerciseStore } = require('@/store/useExerciseStore'))
  })

  beforeEach(() => {
    useExerciseStore.setState({ logs: {}, custom: [] })
  })

  test('logs и custom восстанавливаются из копии', async () => {
    await applyBackup({
      app: 'NutriBear',
      exercise: {
        logs: {
          '2026-11-10': [
            { id: 'e1', exId: 'walk', name: 'Ходьба', emoji: '🚶', minutes: 30, kcal: 150 },
            { id: 'e2', exId: 'run', name: 'Бег', emoji: '🏃', minutes: 20, kcal: 220 },
          ],
          '2026-11-09': [
            { id: 'e3', exId: 'yoga', name: 'Йога', emoji: '🧘', minutes: 45, kcal: 100 },
          ],
        },
        custom: [
          { id: 'custom-1', name: 'Моя тренировка', emoji: '💪', met: 6 },
        ],
      },
    })
    const s = useExerciseStore.getState()
    expect(s.logs['2026-11-10']).toHaveLength(2)
    expect(s.logs['2026-11-10'][0]).toMatchObject({ name: 'Ходьба', kcal: 150 })
    expect(s.logs['2026-11-09']).toHaveLength(1)
    expect(s.custom).toHaveLength(1)
    expect(s.custom[0]).toMatchObject({ name: 'Моя тренировка', met: 6 })
  })

  test('мусорные ключи дат (не «ГГГГ-ММ-ДД») отфильтровываются', async () => {
    // Битая копия могла подсунуть строковые ключи или объекты — раньше
    // это ломало рендер журнала и не давало загрузить приложение
    await applyBackup({
      app: 'NutriBear',
      exercise: {
        logs: {
          '2026-11-10': [{ id: 'e1', exId: 'walk', name: 'Ходьба', emoji: '🚶', minutes: 30, kcal: 150 }],
          'bad-key': [{ id: 'e2', exId: 'run', name: 'Бег', emoji: '🏃', minutes: 20, kcal: 220 }],
          'не дата': [{ id: 'e3', name: 'Мусор' }],
        },
        custom: [],
      },
    })
    const logs = useExerciseStore.getState().logs
    expect(Object.keys(logs)).toEqual(['2026-11-10'])
    expect(logs['2026-11-10']).toHaveLength(1)
  })

  test('записи-не-объекты в дне не ломают весь день', async () => {
    await applyBackup({
      app: 'NutriBear',
      exercise: {
        logs: {
          '2026-11-10': [
            null,
            'не объект',
            { id: 'e1', exId: 'walk', name: 'Ходьба', emoji: '🚶', minutes: 30, kcal: 150 },
            { name: 'без id' }, // id сгенерируется автоматически
            undefined,
          ],
        },
        custom: [],
      },
    })
    const arr = useExerciseStore.getState().logs['2026-11-10']
    expect(arr).toHaveLength(2)
    expect(arr[0]).toMatchObject({ name: 'Ходьба' })
    expect(arr[1].id).toMatch(/^r/) // сгенерированный id
  })

  test('аномально большие значения kcal/minutes ограничиваются', async () => {
    // Битая копия могла принести kcal=1000000 — это сломало бы графики
    // и нелогично в UI. Ограничиваем до 5000 ккал и 600 минут
    await applyBackup({
      app: 'NutriBear',
      exercise: {
        logs: {
          '2026-11-10': [
            { id: 'e1', exId: 'walk', name: 'Ходьба', emoji: '🚶', minutes: 9999, kcal: 99999 },
          ],
        },
        custom: [],
      },
    })
    const e = useExerciseStore.getState().logs['2026-11-10'][0]
    expect(e.kcal).toBe(5000)
    expect(e.minutes).toBe(600)
  })

  test('история длиннее 210 дней обрезается до 210', async () => {
    // Лимит в сторе MAX_LOG_DAYS=210 — копия с длинной историей не
    // должна распирать AsyncStorage на новом телефоне
    const logs = {}
    for (let i = 0; i < 250; i++) {
      const d = new Date(2026, 0, 1 + i)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      logs[key] = [{ id: `e${i}`, exId: 'walk', name: 'Ходьба', emoji: '🚶', minutes: 30, kcal: 150 }]
    }
    await applyBackup({
      app: 'NutriBear',
      exercise: { logs, custom: [] },
    })
    const saved = useExerciseStore.getState().logs
    expect(Object.keys(saved).length).toBeLessThanOrEqual(210)
  })

  test('custom-тренировки без id отфильтровываются', async () => {
    // id нужен для редактирования и удаления — без него тренировка
    // в каталоге «зависнет» и не даст её изменить
    await applyBackup({
      app: 'NutriBear',
      exercise: {
        logs: {},
        custom: [
          { id: 'c1', name: 'A', emoji: '💪', met: 5 },
          { name: 'без id' }, // отфильтруется
          null,
          { id: 'c2', name: 'B', emoji: '🏋️', met: 7 },
        ],
      },
    })
    const custom = useExerciseStore.getState().custom
    expect(custom).toHaveLength(2)
    expect(custom.map((c) => c.id).sort()).toEqual(['c1', 'c2'])
  })

  test('копия без раздела exercise не трогает текущие тренировки', async () => {
    // Старая копия (до появления раздела exercise) не должна
    // стирать существующие логи пользователя
    useExerciseStore.setState({
      logs: { '2026-11-10': [{ id: 'e1', exId: 'walk', name: 'Старая', emoji: '🚶', minutes: 30, kcal: 150 }] },
      custom: [{ id: 'c1', name: 'Старая', emoji: '💪', met: 5 }],
    })
    await applyBackup({ app: 'NutriBear', profile: {} })
    const s = useExerciseStore.getState()
    expect(s.logs['2026-11-10']).toHaveLength(1)
    expect(s.logs['2026-11-10'][0].name).toBe('Старая')
    expect(s.custom).toHaveLength(1)
  })

  test('полный цикл: getState → JSON.stringify → applyBackup возвращает те же данные', async () => {
    // Эталонный тест: берем реальный стор, экспортируем в JSON
    // (как делает gdpr-export.collectAll), парсим обратно (как
    // DataPortability при выборе файла) и заливаем в чистый стор
    useExerciseStore.setState({ logs: {}, custom: [] })
    useExerciseStore.getState().addLog('2026-11-10', { exId: 'walk', name: 'Ходьба', emoji: '🚶', minutes: 30, kcal: 150 })
    useExerciseStore.getState().addLog('2026-11-10', { exId: 'run', name: 'Бег', emoji: '🏃', minutes: 20, kcal: 220, manual: true })
    useExerciseStore.getState().addCustom({ id: 'custom-1', name: 'Моя', emoji: '💪', met: 6 })

    const exported = JSON.parse(JSON.stringify({
      app: 'NutriBear',
      exercise: useExerciseStore.getState(),
    }))

    useExerciseStore.setState({ logs: {}, custom: [] })
    await applyBackup(exported)

    const s = useExerciseStore.getState()
    expect(s.logs['2026-11-10']).toHaveLength(2)
    expect(s.logs['2026-11-10'][0]).toMatchObject({ name: 'Бег', kcal: 220, manual: true })
    expect(s.logs['2026-11-10'][1]).toMatchObject({ name: 'Ходьба', kcal: 150 })
    expect(s.custom[0]).toMatchObject({ name: 'Моя', met: 6 })
  })
})

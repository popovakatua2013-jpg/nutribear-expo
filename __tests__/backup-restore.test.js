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

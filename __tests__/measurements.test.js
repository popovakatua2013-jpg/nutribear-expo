// Тесты замеров тела в профиле: addMeasurement/update/remove —
// валидация 20–300 см и точность 0,1; свои замеры через «+» —
// обрезка имени, защита от дублей (включая встроенные), лимит 10;
// удаление своего замера каскадом удаляет его записи.

// RN-стабы должны встать до импортов стора
jest.requireActual('./helpers/react-native-stub')
jest.requireActual('./helpers/async-storage-stub')

describe('Замеры тела (useProfileStore)', () => {
  let useProfileStore

  beforeAll(() => {
    ;({ useProfileStore } = require('@/store/useProfileStore'))
  })

  beforeEach(() => {
    useProfileStore.setState({
      measurements: {},
      customMeasurements: [],
    })
  })

  describe('addMeasurement', () => {
    test('сохраняет замер, новые сверху', () => {
      const { addMeasurement } = useProfileStore.getState()
      addMeasurement('waist', 80)
      addMeasurement('waist', 78.5)
      const list = useProfileStore.getState().measurements.waist
      expect(list).toHaveLength(2)
      expect(list[0].cm).toBe(78.5)
      expect(list[1].cm).toBe(80)
      expect(list[0].id).toBeTruthy()
      expect(new Date(list[0].date).getTime()).toBeGreaterThan(0)
    })

    test('округляет до 0,1 см', () => {
      const { addMeasurement } = useProfileStore.getState()
      const entry = addMeasurement('chest', 92.44)
      expect(entry.cm).toBe(92.4)
    })

    test('отклоняет невалидные значения', () => {
      const { addMeasurement } = useProfileStore.getState()
      expect(addMeasurement('waist', NaN)).toBeNull()
      expect(addMeasurement('waist', 19)).toBeNull()
      expect(addMeasurement('waist', 301)).toBeNull()
      expect(addMeasurement('', 80)).toBeNull()
      expect(useProfileStore.getState().measurements.waist).toBeUndefined()
    })
  })

  describe('updateMeasurement / removeMeasurement', () => {
    test('правит значение существующей записи', () => {
      const { addMeasurement, updateMeasurement } = useProfileStore.getState()
      const entry = addMeasurement('hips', 100)
      expect(updateMeasurement('hips', entry.id, 98.55)).toBe(true)
      expect(useProfileStore.getState().measurements.hips[0].cm).toBe(98.6)
    })

    test('невалидное значение или чужой id — false, данные не тронуты', () => {
      const { addMeasurement, updateMeasurement } = useProfileStore.getState()
      const entry = addMeasurement('hips', 100)
      expect(updateMeasurement('hips', entry.id, 500)).toBe(false)
      expect(updateMeasurement('hips', 'nope', 98)).toBe(false)
      expect(useProfileStore.getState().measurements.hips[0].cm).toBe(100)
    })

    test('удаляет запись; пустой ключ исчезает целиком', () => {
      const { addMeasurement, removeMeasurement } = useProfileStore.getState()
      const a = addMeasurement('belly', 95)
      const b = addMeasurement('belly', 93)
      expect(removeMeasurement('belly', a.id)).toBe(true)
      expect(useProfileStore.getState().measurements.belly).toHaveLength(1)
      expect(removeMeasurement('belly', b.id)).toBe(true)
      expect(useProfileStore.getState().measurements.belly).toBeUndefined()
      expect(removeMeasurement('belly', b.id)).toBe(false)
    })
  })

  describe('свои замеры (addCustomMeasurement)', () => {
    test('создаёт свой замер, имя обрезается', () => {
      const { addCustomMeasurement } = useProfileStore.getState()
      const item = addCustomMeasurement('  Бицепс  ')
      expect(item).toMatchObject({ name: 'Бицепс' })
      expect(useProfileStore.getState().customMeasurements).toHaveLength(1)
    })

    test('длинное имя обрезается до 24 символов', () => {
      const { addCustomMeasurement } = useProfileStore.getState()
      const item = addCustomMeasurement('О'.repeat(30))
      expect(item.name).toHaveLength(24)
    })

    test('дубль имени (без учёта регистра) — null', () => {
      const { addCustomMeasurement } = useProfileStore.getState()
      addCustomMeasurement('Шея')
      expect(addCustomMeasurement('шея')).toBeNull()
      expect(useProfileStore.getState().customMeasurements).toHaveLength(1)
    })

    test('дубль встроенного замера — null', () => {
      const { addCustomMeasurement } = useProfileStore.getState()
      expect(addCustomMeasurement('талия')).toBeNull()
      expect(addCustomMeasurement('ГРУДЬ')).toBeNull()
      expect(useProfileStore.getState().customMeasurements).toHaveLength(0)
    })

    test('пустое имя — null', () => {
      const { addCustomMeasurement } = useProfileStore.getState()
      expect(addCustomMeasurement('   ')).toBeNull()
    })

    test('лимит 10 своих замеров', () => {
      const { addCustomMeasurement } = useProfileStore.getState()
      for (let i = 1; i <= 10; i++) {
        expect(addCustomMeasurement(`Замер ${i}`)).not.toBeNull()
      }
      expect(addCustomMeasurement('Замер 11')).toBeNull()
      expect(useProfileStore.getState().customMeasurements).toHaveLength(10)
    })
  })

  describe('removeCustomMeasurement', () => {
    test('удаляет свой замер вместе со всеми записями', () => {
      const { addCustomMeasurement, addMeasurement, removeCustomMeasurement } =
        useProfileStore.getState()
      const item = addCustomMeasurement('Шея')
      addMeasurement(item.id, 35)
      addMeasurement(item.id, 34.5)
      expect(useProfileStore.getState().measurements[item.id]).toHaveLength(2)

      expect(removeCustomMeasurement(item.id)).toBeTruthy()
      const st = useProfileStore.getState()
      expect(st.customMeasurements).toHaveLength(0)
      expect(st.measurements[item.id]).toBeUndefined()
    })

    test('чужой id — данные не тронуты', () => {
      const { addCustomMeasurement, removeCustomMeasurement } =
        useProfileStore.getState()
      addCustomMeasurement('Шея')
      expect(removeCustomMeasurement('nope')).toBeFalsy()
      expect(useProfileStore.getState().customMeasurements).toHaveLength(1)
    })
  })

  test('свой замер живёт в одном пространстве ключей с встроенными', () => {
    const { addCustomMeasurement, addMeasurement } = useProfileStore.getState()
    const neck = addCustomMeasurement('Шея')
    const waistEntry = addMeasurement('waist', 78.5)
    const neckEntry = addMeasurement(neck.id, 35)
    const st = useProfileStore.getState()
    expect(st.measurements.waist[0]).toMatchObject({ cm: waistEntry.cm })
    expect(st.measurements[neck.id][0]).toMatchObject({ cm: neckEntry.cm })
  })
})

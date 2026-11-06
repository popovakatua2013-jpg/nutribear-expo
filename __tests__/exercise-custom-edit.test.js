// Тесты updateCustom: правка своей тренировки (название, иконка,
// интенсивность) — id сохраняется, чужие записи не трогаются.

// RN-стабы должны встать до импортов стора
jest.requireActual('./helpers/react-native-stub')
jest.requireActual('./helpers/async-storage-stub')

describe('updateCustom: правка запомненной тренировки', () => {
  let useExerciseStore

  beforeAll(() => {
    ;({ useExerciseStore } = require('@/store/useExerciseStore'))
  })

  beforeEach(() => {
    useExerciseStore.setState({ logs: {}, custom: [] })
  })

  test('меняет название/иконку/met, сохраняя id', () => {
    useExerciseStore.getState().addCustom({ id: 'custom-1', name: 'ББР', emoji: '🔥', met: 5.5 })
    useExerciseStore
      .getState()
      .updateCustom('custom-1', { name: 'ББР упругое тело', emoji: '🤸', met: 8 })
    const custom = useExerciseStore.getState().custom
    expect(custom).toHaveLength(1)
    expect(custom[0]).toEqual({ id: 'custom-1', name: 'ББР упругое тело', emoji: '🤸', met: 8 })
  })

  test('несуществующий id ничего не меняет', () => {
    useExerciseStore.setState({ custom: [{ id: 'custom-a', name: 'A', emoji: '🔥', met: 3.5 }] })
    useExerciseStore.getState().updateCustom('custom-нет', { name: 'X' })
    const custom = useExerciseStore.getState().custom
    expect(custom).toHaveLength(1)
    expect(custom[0].name).toBe('A')
  })

  test('после правки записи дневника остаются на месте', () => {
    useExerciseStore.getState().addCustom({ id: 'custom-1', name: 'ББР', emoji: '🔥', met: 5.5 })
    useExerciseStore
      .getState()
      .addLog('2026-11-06', { exId: 'custom-1', name: 'ББР', emoji: '🔥', minutes: 30, kcal: 100 })
    useExerciseStore.getState().updateCustom('custom-1', { name: 'ББР новое', emoji: '🤸', met: 8 })
    expect(useExerciseStore.getState().logs['2026-11-06']).toHaveLength(1)
    expect(useExerciseStore.getState().custom).toHaveLength(1)
  })
})

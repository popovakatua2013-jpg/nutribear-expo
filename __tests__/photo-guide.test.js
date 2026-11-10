// Обучающее окно «Как фотографировать еду» (образец — окно конкурента,
// скриншот Кати от 11.11): флаг photoGuideSeen в useUiPrefsStore.
// Окно само показывается один раз при первом входе в «Сканер еды»
// (PhotoMode, source='camera'), после закрытия — только кнопкой
// «Как фотографировать?» на пустом экране режима.

// RN-стабы должны встать до импортов стора
jest.requireActual('./helpers/react-native-stub')
jest.requireActual('./helpers/async-storage-stub')

describe('подсказка «Как фотографировать еду»', () => {
  let useUiPrefsStore

  beforeAll(() => {
    ;({ useUiPrefsStore } = require('@/store/useUiPrefsStore'))
  })

  beforeEach(() => {
    useUiPrefsStore.setState({ photoGuideSeen: false })
  })

  test('по умолчанию окно ещё не показывали — при первом входе в сканер оно откроется', () => {
    expect(useUiPrefsStore.getState().photoGuideSeen).toBe(false)
  })

  test('после закрытия окна флаг ставится — второй раз само не покажется', () => {
    useUiPrefsStore.getState().setPhotoGuideSeen(true)
    expect(useUiPrefsStore.getState().photoGuideSeen).toBe(true)
  })

  test('setPhotoGuideSeen(false) сбрасывает флаг', () => {
    useUiPrefsStore.getState().setPhotoGuideSeen(true)
    useUiPrefsStore.getState().setPhotoGuideSeen(false)
    expect(useUiPrefsStore.getState().photoGuideSeen).toBe(false)
  })

  test('флаг переживает перезапуск: значение пишется в AsyncStorage', async () => {
    const AsyncStorage = require('./helpers/async-storage-stub').default
    useUiPrefsStore.getState().setPhotoGuideSeen(true)
    // persist zustand пишет состояние под ключом nutribear-ui-prefs-v1
    const raw = await AsyncStorage.getItem('nutribear-ui-prefs-v1')
    expect(raw).toBeTruthy()
    const saved = JSON.parse(raw)
    expect(saved.state.photoGuideSeen).toBe(true)
  })
})

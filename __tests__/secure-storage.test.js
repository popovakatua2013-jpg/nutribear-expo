// Тесты адаптера безопасного хранилища (аудит 12.11, блокер 2):
// чувствительные сторы (цикл, профиль) должны переживать отсутствие
// нативного SecureStore — откат на AsyncStorage без потери данных —
// и подхватывать старые данные из AsyncStorage при миграции.

// В jest expo-secure-store без нативной части: либо импорт падает,
// либо методы бросают — адаптер обязан откатиться на AsyncStorage.
// Явно гарантируем это: мокаем пакет как «нативный модуль недоступен»
jest.mock('expo-secure-store', () => {
  throw new Error('native module not available (тестовое окружение)')
})

const AsyncStorage = require('@react-native-async-storage/async-storage').default
const { secureStorage } = require('../src/lib/secure-storage')

describe('secureStorage: откат на AsyncStorage', () => {
  beforeEach(async () => {
    // Чистим стаб между тестами (Map в модуле-стабе один на файл)
    const keys = await AsyncStorage.getAllKeys()
    await AsyncStorage.multiRemove(keys)
  })

  test('setItem/getItem: запись и чтение через откат работают', async () => {
    await secureStorage.setItem('nutribear-cycle-v1', '{"enabled":true}')
    // Читается через адаптер…
    await expect(secureStorage.getItem('nutribear-cycle-v1')).resolves.toBe('{"enabled":true}')
    // …и лежит в AsyncStorage (нативного хранилища нет — откат)
    await expect(AsyncStorage.getItem('nutribear-cycle-v1')).resolves.toBe('{"enabled":true}')
  })

  test('getItem: старые данные из AsyncStorage возвращаются (миграция)', async () => {
    // Имитируем данные, оставшиеся от старой версии приложения
    await AsyncStorage.setItem('nutribear-profile-v1', '{"name":"Катя"}')
    await expect(secureStorage.getItem('nutribear-profile-v1')).resolves.toBe('{"name":"Катя"}')
  })

  test('getItem: пустое хранилище — null', async () => {
    await expect(secureStorage.getItem('nutribear-cycle-v1')).resolves.toBeNull()
  })

  test('removeItem: чистит откатное хранилище и не падает без SecureStore', async () => {
    await secureStorage.setItem('nutribear-cycle-v1', 'x')
    await secureStorage.removeItem('nutribear-cycle-v1')
    await expect(AsyncStorage.getItem('nutribear-cycle-v1')).resolves.toBeNull()
    // Удаление отсутствующего ключа — тоже без ошибок
    await expect(secureStorage.removeItem('nutribear-cycle-v1')).resolves.toBeUndefined()
  })
})

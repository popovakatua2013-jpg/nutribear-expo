// Безопасное хранилище для чувствительных сторов (аудит 12.11, блокер 2):
// данные о здоровье — профиль (рост/вес/история взвешиваний/замеры) и
// трекер цикла (даты месячных — специальная категория по ст. 10 152-ФЗ)
// должны лежать не в открытом AsyncStorage, а в защищённом хранилище
// платформы: Android Keystore / iOS Keychain (expo-secure-store).
//
// Адаптер даёт zustand persist интерфейс AsyncStorage (getItem/setItem/
// removeItem) и внутри сам решает, куда писать. Гарантии:
//  1. Если нативный модуль недоступен (тесты, web, сбой нативной части) —
//     прозрачный откат на AsyncStorage: приложение никогда не теряет
//     данные из-за хранилища.
//  2. Миграция: если в SecureStore пусто, а в AsyncStorage ключ ещё
//     есть (старые версии приложения) — значение возвращается из
//     AsyncStorage и в фоне копируется в SecureStore; со следующих
//     запусков читается уже оттуда.
//  3. removeItem чистит ОБА хранилища — «Стереть все данные» не
//     оставляет следов ни в SecureStore, ни в AsyncStorage.
//
// Почему фото прогресса (useProgressPhotosStore) сюда не перенесены:
// у expo-secure-store маленький практический лимит значения, а сами
// снимки и так лежат файлами в приватной папке приложения (document-
// Directory) — их защищает песочница ОС, а список с путями уже чистится
// «Стереть все данные».

import AsyncStorage from '@react-native-async-storage/async-storage'

// Нативный модуль ищем лениво и в try/catch: в Node-тестах и на web
// пакет либо не имеет нативной части, либо падает при импорте — это
// штатная ситуация для отката, не ошибка
let SecureStore = null
try {
  // eslint-disable-next-line global-require
  SecureStore = require('expo-secure-store')
} catch {}

// null = ещё не проверяли, true/false = результат последней проверки.
// Проверка — пробное чтение: оно дешёвое и создаёт мусорных ключей
let nativeOk = null

async function backend() {
  if (SecureStore && nativeOk !== false) {
    if (nativeOk === null) {
      try {
        await SecureStore.getItemAsync('nutribear-secure-probe')
        nativeOk = true
      } catch {
        nativeOk = false
      }
    }
    if (nativeOk) return SecureStore
  }
  return AsyncStorage
}

export const secureStorage = {
  // Читаем SecureStore; пусто → смотрим AsyncStorage (старые данные)
  // и копируем их в SecureStore в фоне
  async getItem(key) {
    const store = await backend()
    try {
      const value = await store.getItemAsync(key)
      if (value != null) return value
    } catch {
      if (store === SecureStore) nativeOk = false
    }
    // Откат или первая миграция: пробуем AsyncStorage
    const legacy = await AsyncStorage.getItem(key)
    if (legacy != null && SecureStore && nativeOk !== false) {
      // Фоновая миграция в SecureStore: не ждём её — чтение уже готово
      SecureStore.setItemAsync(key, legacy).catch(() => {
        nativeOk = false
      })
    }
    return legacy
  },

  // Пишем в SecureStore; на сбое — откат в AsyncStorage
  async setItem(key, value) {
    const store = await backend()
    try {
      await store.setItemAsync(key, value)
      return
    } catch {
      if (store === SecureStore) nativeOk = false
    }
    await AsyncStorage.setItem(key, value)
  },

  // Чистим оба хранилища: ключ мог остаться в AsyncStorage от старой
  // версии или после отката записи
  async removeItem(key) {
    let failed = false
    if (SecureStore && nativeOk !== false) {
      try {
        await SecureStore.deleteItemAsync(key)
      } catch {
        // Ключа могло не быть — сам сбой метода важнее для флага,
        // но deleting несуществующего в Keychain не падает
        nativeOk = false
        failed = true
      }
    }
    try {
      await AsyncStorage.removeItem(key)
    } catch {}
    if (failed && nativeOk === false) {
      // СecureStore недоступен — не роняем вызов: AsyncStorage уже чист
    }
  },
}

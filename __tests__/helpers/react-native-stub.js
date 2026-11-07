// Стаб react-native для юнит-тестов в Node: чистая логика RN не использует,
// но некоторые пакеты импортируют его на верхнем уровне.
// processColor нужен lucide-react-native (реестр METRICS импортирует иконки
// на верхнем уровне — трекер сна, sleep.test.js): цвет в тестах не парсим,
// возвращаем как есть — иконки в логике не участвуют.
module.exports = {
  NativeModules: {},
  Platform: { OS: 'ios', select: (o) => o.ios || o.default },
  AppState: { addEventListener: () => ({ remove() {} }) },
  Dimensions: { get: () => ({ width: 390, height: 844 }) },
  InteractionManager: { runAfterInteractions: (f) => f() },
  processColor: (c) => c,
  NativeEventEmitter: class {
    addListener() {
      return { remove() {} }
    }
    removeAllListeners() {}
    remove() {}
  },
}


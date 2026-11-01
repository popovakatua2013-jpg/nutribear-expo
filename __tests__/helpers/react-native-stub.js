// Стаб react-native для юнит-тестов в Node: чистая логика RN не использует,
// но некоторые пакеты импортируют его на верхнем уровне.
module.exports = {
  NativeModules: {},
  Platform: { OS: 'ios', select: (o) => o.ios || o.default },
  AppState: { addEventListener: () => ({ remove() {} }) },
  Dimensions: { get: () => ({ width: 390, height: 844 }) },
  InteractionManager: { runAfterInteractions: (f) => f() },
  NativeEventEmitter: class {
    addListener() {
      return { remove() {} }
    }
    removeAllListeners() {}
    remove() {}
  },
}

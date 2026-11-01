// Стаб AsyncStorage для тестов: zustand-persist читает null и пишет в Map.
const store = new Map()
const AsyncStorage = {
  getItem: async (k) => (store.has(k) ? store.get(k) : null),
  setItem: async (k, v) => {
    store.set(k, String(v))
  },
  removeItem: async (k) => {
    store.delete(k)
  },
  getAllKeys: async () => [...store.keys()],
  multiRemove: async (keys) => {
    keys.forEach((k) => store.delete(k))
  },
}
module.exports = { __esModule: true, default: AsyncStorage, useAsyncStorage: () => AsyncStorage }

// Стаб expo-constants для юнит-тестов: настоящий пакет — ESM и не грузится
// в Node-среде Jest. chat.js читает только Constants.expoConfig?.hostUri —
// null достаточно (офлайн-ответы адрес сервера не используют)
module.exports = {
  __esModule: true,
  default: { expoConfig: null },
  expoConfig: null,
}

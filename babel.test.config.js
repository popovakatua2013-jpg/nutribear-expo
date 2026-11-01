// Лёгкий трансформ для юнит-тестов: ESM → CommonJS.
// Отдельно от babel.config.js (expo-пресет с worklets тестам не нужен).
module.exports = {
  presets: [['@babel/preset-env', { targets: { node: 'current' } }]],
}

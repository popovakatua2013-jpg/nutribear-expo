// Jest: юнит-тесты чистой логики (organism, organism-game, bmi) в Node.
// react-native и AsyncStorage подменяются стабами — тестируется только
// математика расчётов, без эмулятора и RN-рантайма.
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    // картинки (require в meals.js и др.) в Node-тестах не нужны
    '\\.(webp|png|jpg|jpeg|gif)$': '<rootDir>/__tests__/helpers/asset-stub.js',
    '^expo-constants$': '<rootDir>/__tests__/helpers/expo-constants-stub.js',
    '^@react-native-async-storage/async-storage$': '<rootDir>/__tests__/helpers/async-storage-stub.js',
    '^react-native$': '<rootDir>/__tests__/helpers/react-native-stub.js',
    '^react-native-svg$': '<rootDir>/__tests__/helpers/react-native-svg-stub.js',
  },
  transform: {
    '^.+\\.(js|jsx)$': ['babel-jest', { configFile: require.resolve('./babel.test.config.js') }],
  },
}

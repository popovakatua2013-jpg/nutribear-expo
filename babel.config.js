// Babel: expo-пресет с NativeWind JSX-трансформом + шимы + reanimated
module.exports = function (api) {
  api.cache(true)
  return {
    presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel'],
    plugins: [
      './babel-plugin-import-meta.js',
      'react-native-worklets/plugin',
    ],
  }
}

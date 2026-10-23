// Семейства шрифтов Inter для текста внутри SVG
// (в RN каждый вес — отдельный файл)
//
// ВАЖНО: это должны быть СТРОКИ с именами шрифтов, а не константы
// из @expo-google-fonts/inter — в версии 0.4.x те константы являются
// объектами ассетов (.ttf), и react-native-svg падает на них с
// «undefined is not a function» в extractText.
// Строки совпадают с ключами useFonts() в app/_layout.jsx,
// поэтому RN корректно находит загруженные шрифты.

export const fontFamilies = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  extrabold: 'Inter_800ExtraBold',
}

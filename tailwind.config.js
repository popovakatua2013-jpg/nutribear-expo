// Tailwind для NativeWind: палитра NutriBear + шрифты Inter
const plugin = require('tailwindcss/plugin')

module.exports = {
  content: ['./app/**/*.{js,jsx}', './src/**/*.{js,jsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        bear: {
          bg: '#0A1020',
          card: '#121B33',
          card2: '#111C38',
          deep: '#0C1327',
          pop: '#131E3A',
          line: 'rgba(255,255,255,0.08)',
          text: '#EEF2FB',
          sub: '#8A94B3',
          sub2: '#7C87A8',
          dim: '#5C668A',
          soft: '#AEB9D9',
          bright: '#C7D2F0',
          link: '#6C8CFF',
        },
      },
      fontFamily: {
        sans: ['Inter_400Regular'],
        medium: ['Inter_500Medium'],
        semibold: ['Inter_600SemiBold'],
        bold: ['Inter_700Bold'],
        extrabold: ['Inter_800ExtraBold'],
      },
    },
  },
  plugins: [
    // В RN каждый вес — отдельный файл шрифта, поэтому классы веса
    // задают и семейство, и вес одновременно
    plugin(({ addUtilities }) => {
      addUtilities({
        '.font-sans': { fontFamily: 'Inter_400Regular', fontWeight: '400' },
        '.font-medium': { fontFamily: 'Inter_500Medium', fontWeight: '500' },
        '.font-semibold': { fontFamily: 'Inter_600SemiBold', fontWeight: '600' },
        '.font-bold': { fontFamily: 'Inter_700Bold', fontWeight: '700' },
        '.font-extrabold': { fontFamily: 'Inter_800ExtraBold', fontWeight: '800' },
      })
    }),
  ],
}

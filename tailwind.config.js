// Tailwind для NativeWind: палитра NutriBear + шрифты Inter.
// Палитра задана CSS-переменными --nb-* (темы оформления, задача Кати
// 23.11): переменные прокидываются на корне приложения
// (src/lib/use-theme.js → NativeWind vars()), значение ПОСЛЕ запятой —
// классическая navy-палитра: страховка для поддеревьев без переменных
// (окно «Мишка споткнулся», оверлеи вне обёртки) — они остаются
// в «Классике», а не становятся прозрачными. Пятёрка тем и их цвета —
// в src/lib/themes.js; значение fallback ДОЛЖНО совпадать с
// THEMES.classic.colors дословно
const bearVar = (name, fallback) => `var(--nb-${name}, ${fallback})`
const plugin = require('tailwindcss/plugin')

module.exports = {
  content: ['./app/**/*.{js,jsx}', './src/**/*.{js,jsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        bear: {
          bg: bearVar('bg', '#0A1020'),
          card: bearVar('card', '#121B33'),
          card2: bearVar('card2', '#111C38'),
          deep: bearVar('deep', '#0C1327'),
          pop: bearVar('pop', '#131E3A'),
          line: bearVar('line', 'rgba(255,255,255,0.08)'),
          // Поверхность и обводка карточек в стиле вкладки «Тело»:
          // полупрозрачный тёмно-фиолетовый + фиолетовая обводка.
          // Применяются на «Главной», «Дневнике» и «Ещё» — вкладка
          // «Организм» остаётся на нейтральной navy-теме (по решению)
          bodyCard: bearVar('bodyCard', 'rgba(29,18,64,0.82)'),
          bodyLine: bearVar('bodyLine', 'rgba(168,85,247,0.30)'),
          text: bearVar('text', '#EEF2FB'),
          // Второстепенные цвета — проверены на контраст по WCAG AA (≥ 4.5:1)
          // на фоне #0A1020/#121B33/#131E3A: app должен хорошо читаться
          // слабовидящими (раньше dim был 2.9–3.4 — «еле заметно»);
          // премиум-темы держат те же уровни яркости (см. themes.js)
          sub: bearVar('sub', '#A5AECB'),
          sub2: bearVar('sub2', '#98A2C2'),
          dim: bearVar('dim', '#8B96B8'),
          soft: bearVar('soft', '#AEB9D9'),
          bright: bearVar('bright', '#C7D2F0'),
          link: bearVar('link', '#6C8CFF'),
        },
      },
      fontFamily: {
        // 3 файла Inter (400/600/800) вместо 5 — минус ~600 КБ бандла;
        // medium -> 400, bold -> 600 (визуальная разница минимальна)
        sans: ['Inter_400Regular'],
        medium: ['Inter_400Regular'],
        semibold: ['Inter_600SemiBold'],
        bold: ['Inter_600SemiBold'],
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
        '.font-medium': { fontFamily: 'Inter_400Regular', fontWeight: '400' },
        '.font-semibold': { fontFamily: 'Inter_600SemiBold', fontWeight: '600' },
        '.font-bold': { fontFamily: 'Inter_600SemiBold', fontWeight: '600' },
        '.font-extrabold': { fontFamily: 'Inter_800ExtraBold', fontWeight: '800' },
      })
    }),
  ],
}

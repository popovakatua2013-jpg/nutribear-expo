// Tailwind для NativeWind: палитра NutriBear + шрифты Inter.
// Палитра задана CSS-переменными --nb-* (темы оформления, задача Кати
// 23.11): переменные прокидываются на корне приложения
// (src/lib/use-theme.js → NativeWind vars()), значение ПОСЛЕ запятой —
// палитра «Классики» (бесплатная чёрно-белая тема): страховка для
// поддеревьев без переменных
// (окно «Мишка споткнулся», оверлеи вне обёртки) — они остаются
// в «Классике», а не становятся прозрачными. Пятёрка тем и их цвета —
// в src/lib/themes.js; значение fallback ДОЛЖНО совпадать с
// THEMES.mono.colors («Классика») дословно
const bearVar = (name, fallback) => `var(--nb-${name}, ${fallback})`
const plugin = require('tailwindcss/plugin')

module.exports = {
  content: ['./app/**/*.{js,jsx}', './src/**/*.{js,jsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        bear: {
          bg: bearVar('bg', '#FFFFFF'),
          card: bearVar('card', '#F5F5F5'),
          card2: bearVar('card2', '#ECECEC'),
          deep: bearVar('deep', '#E4E4E4'),
          pop: bearVar('pop', '#FFFFFF'),
          line: bearVar('line', 'rgba(0,0,0,0.14)'),
          // Поверхность и обводка карточек в стиле вкладки «Тело»:
          // полупрозрачный тёмно-фиолетовый + фиолетовая обводка.
          // Применяются на «Главной», «Дневнике» и «Ещё» — вкладка
          // «Организм» остаётся на нейтральной navy-теме (по решению)
          bodyCard: bearVar('bodyCard', 'rgba(255,255,255,0.94)'),
          bodyLine: bearVar('bodyLine', 'rgba(0,0,0,0.30)'),
          text: bearVar('text', '#111111'),
          // Второстепенные цвета — проверены на контраст по WCAG AA (≥ 4.5:1)
          // на фоне #0A1020/#121B33/#131E3A: app должен хорошо читаться
          // слабовидящими (раньше dim был 2.9–3.4 — «еле заметно»);
          // премиум-темы держат те же уровни яркости (см. themes.js)
          sub: bearVar('sub', '#4D4D4D'),
          sub2: bearVar('sub2', '#565656'),
          dim: bearVar('dim', '#646464'),
          soft: bearVar('soft', '#2E2E2E'),
          bright: bearVar('bright', '#000000'),
          link: bearVar('link', '#1F1F1F'),
          // Акценты (кнопки, тумблеры, активные пилюли, свечения рамок).
          // Значения ниже — «Классика» (фирменный фиолетовый #7B6CF6);
          // у неоновых тем они СВОИ — см. src/lib/themes.js. accentOn —
          // цвет текста/иконки НА акцентной поверхности (у ярких
          // лайма/циана/янтаря он тёмный). Цвета в style-пропсах
          // берутся из useThemeColors (src/lib/use-theme.js)
          accent: bearVar('accent', '#111111'),
          accentBright: bearVar('accentBright', '#111111'),
          accentSoft: bearVar('accentSoft', '#454545'),
          accentOn: bearVar('accentOn', '#FFFFFF'),
          accentFaint: bearVar('accentFaint', 'rgba(0,0,0,0.06)'),
          accentFaint2: bearVar('accentFaint2', 'rgba(0,0,0,0.10)'),
          accentFaint3: bearVar('accentFaint3', 'rgba(0,0,0,0.14)'),
          accentStrong: bearVar('accentStrong', 'rgba(17,17,17,0.85)'),
          accentBorder: bearVar('accentBorder', 'rgba(0,0,0,0.38)'),
          // Семантика состояний («хорошо/предупреждение/плохо»), нутриенты
          // (точки/иконки БЖУ) и метрики «Отчётов» — у каждой темы СВОИ
          // (правка Кати 25.11: «цветные точки — по темам», «всё в одном
          // стиле как и главная страница»). Значения fallback — «Классика»
          // дословно (src/lib/themes.js, MONO_FAMILY)
          good: bearVar('good', '#15803D'),
          warn: bearVar('warn', '#B45309'),
          bad: bearVar('bad', '#C21F1F'),
          nutP: bearVar('nutP', '#7C3AED'),
          nutF: bearVar('nutF', '#C2410C'),
          nutC: bearVar('nutC', '#0369A1'),
          nutFib: bearVar('nutFib', '#4D7C0F'),
          nutSug: bearVar('nutSug', '#BE185D'),
          mSteps: bearVar('mSteps', '#15803D'),
          mKcal: bearVar('mKcal', '#C21F1F'),
          mWater: bearVar('mWater', '#0369A1'),
          mBurned: bearVar('mBurned', '#C2410C'),
          mSleep: bearVar('mSleep', '#6D28D9'),
          mWeight: bearVar('mWeight', '#7C3AED'),
          // Подложки-«поля» (аудит 27.11: bg-white/* невидимы на светлых
          // темах — заменены на токены темы: белые тинты на тёмных,
          // тёмные на светлых; см. themes.js, OVERLAYS_*)
          overlay: bearVar('overlay', 'rgba(0,0,0,0.05)'),
          overlay2: bearVar('overlay2', 'rgba(0,0,0,0.08)'),
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

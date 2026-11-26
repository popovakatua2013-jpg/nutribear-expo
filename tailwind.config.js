// Tailwind для NativeWind: палитра NutriBear + шрифты Inter.
// Палитра задана CSS-переменными --nb-* (темы оформления, задача Кати
// 23.11): переменные прокидываются на корне приложения
// (src/lib/use-theme.js → NativeWind vars()), значение ПОСЛЕ запятой —
// палитра «Классики» (бесплатная navy-тема, правка Кати 28.11:
// «давай бесплатную тему сделаем которая была до премиум темы —
// однотонная без эффектов и свечения»): страховка для
// поддеревьев без переменных
// (окно «Мишка споткнулся», оверлеи вне обёртки) — они остаются
// в «Классике», а не становятся прозрачными. Пятёрка тем и их цвета —
// в src/lib/themes.js; значение fallback ДОЛЖНО совпадать с
// THEMES.classic.colors («Классика») дословно
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
          // Акценты (кнопки, тумблеры, активные пилюли, свечения рамок).
          // Значения ниже — «Классика» (фирменный фиолетовый #7B6CF6);
          // у неоновых тем они СВОИ — см. src/lib/themes.js. accentOn —
          // цвет текста/иконки НА акцентной поверхности (у ярких
          // лайма/циана/янтаря он тёмный). Цвета в style-пропсах
          // берутся из useThemeColors (src/lib/use-theme.js)
          accent: bearVar('accent', '#7B6CF6'),
          // accentBright == accent — прочие градиенты приложения плоские
          // (однотонная «Классика» без эффектов, правка Кати 28.11)
          accentBright: bearVar('accentBright', '#7B6CF6'),
          accentSoft: bearVar('accentSoft', '#C4B5FD'),
          accentOn: bearVar('accentOn', '#FFFFFF'),
          accentFaint: bearVar('accentFaint', 'rgba(123,108,246,0.10)'),
          accentFaint2: bearVar('accentFaint2', 'rgba(123,108,246,0.16)'),
          accentFaint3: bearVar('accentFaint3', 'rgba(123,108,246,0.20)'),
          accentStrong: bearVar('accentStrong', 'rgba(123,108,246,0.80)'),
          accentBorder: bearVar('accentBorder', 'rgba(123,108,246,0.42)'),
          // Семантика состояний («хорошо/предупреждение/плохо»), нутриенты
          // (точки/иконки БЖУ) и метрики «Отчётов» — у каждой темы СВОИ
          // (правка Кати 25.11: «цветные точки — по темам», «всё в одном
          // стиле как и главная страница»). Значения fallback — «Классика»
          // дословно (src/lib/themes.js, CLASSIC_FAMILY)
          good: bearVar('good', '#4ade80'),
          warn: bearVar('warn', '#FBBF24'),
          bad: bearVar('bad', '#FB7185'),
          nutP: bearVar('nutP', '#A78BFA'),
          nutF: bearVar('nutF', '#FB923C'),
          nutC: bearVar('nutC', '#38BDF8'),
          nutFib: bearVar('nutFib', '#34D399'),
          nutSug: bearVar('nutSug', '#F472B6'),
          mSteps: bearVar('mSteps', '#4ade80'),
          mKcal: bearVar('mKcal', '#f87171'),
          mWater: bearVar('mWater', '#38bdf8'),
          mBurned: bearVar('mBurned', '#fb923c'),
          mSleep: bearVar('mSleep', '#c084fc'),
          mWeight: bearVar('mWeight', '#a78bfa'),
          // Подложки-«поля» (аудит 27.11: bg-white/* невидимы на светлых
          // темах — заменены на токены темы: белые тинты на тёмных
          // (как в исходном виде приложения), тёмные на светлых;
          // см. themes.js, OVERLAYS_*)
          overlay: bearVar('overlay', 'rgba(255,255,255,0.05)'),
          overlay2: bearVar('overlay2', 'rgba(255,255,255,0.10)'),
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

// Темы оформления приложения (Premium-фича, задача Кати 23.11:
// «усилить Premium — оформление»). Приложение всегда тёмное: светлую
// тему не делаем (сотни inline-белых rgba в компонентах её сломают),
// темы различаются оттенком фона и поверхностей. Акцентные цвета
// (фиолетовые пилюли, тумблеры, кнопки #7B6CF6) у всех тем общие —
// они заданы константами в компонентах, поэтому любая тема выглядит
// согласованной.
//
// Палитра живёт в tailwind.config.js через CSS-переменные --nb-*:
// класс bg-bear-bg компилируется в var(--nb-bg, <классика>) — поддеревья
// без переменных (окно «Мишка споткнулся», оверлеи без обёртки) остаются
// в «Классике», а не становятся прозрачными. Переменные прокидываются
// в корневом макете (app/_layout.jsx → src/lib/use-theme.js).
//
// Файл чистый (без react-native и nativewind) — тестируется
// в __tests__/themes.test.js.

export const DEFAULT_THEME_ID = 'classic'

export const THEME_ORDER = ['classic', 'graphite', 'forest', 'ocean', 'plum']

// Токены палитры: ровно те же имена, что в tailwind.config.js (bear.*)
export const THEME_TOKENS = [
  'bg', 'card', 'card2', 'deep', 'pop', 'line', 'bodyCard', 'bodyLine',
  'text', 'sub', 'sub2', 'dim', 'soft', 'bright', 'link',
]

export const THEMES = {
  // Классика — текущая navy-палитра приложения, бесплатно.
  // Значения ДОЛЖНЫ совпадать со старым tailwind.config.js дословно:
  // они же служат fallback-значениями var(--nb-*, …) во всём приложении
  classic: {
    id: 'classic',
    title: 'Классика',
    premium: false,
    colors: {
      bg: '#0A1020',
      card: '#121B33',
      card2: '#111C38',
      deep: '#0C1327',
      pop: '#131E3A',
      line: 'rgba(255,255,255,0.08)',
      bodyCard: 'rgba(29,18,64,0.82)',
      bodyLine: 'rgba(168,85,247,0.30)',
      text: '#EEF2FB',
      sub: '#A5AECB',
      sub2: '#98A2C2',
      dim: '#8B96B8',
      soft: '#AEB9D9',
      bright: '#C7D2F0',
      link: '#6C8CFF',
    },
  },

  // Графит — нейтральный тёмно-серый, без синевы (подлюбителям строгого)
  graphite: {
    id: 'graphite',
    title: 'Графит',
    premium: true,
    colors: {
      bg: '#0B0C10',
      card: '#17191F',
      card2: '#16181E',
      deep: '#0F1014',
      pop: '#1A1D24',
      line: 'rgba(255,255,255,0.07)',
      bodyCard: 'rgba(35,37,44,0.82)',
      bodyLine: 'rgba(168,85,247,0.28)',
      text: '#F1F2F5',
      sub: '#A8ACB6',
      sub2: '#9BA0AA',
      dim: '#8E939E',
      soft: '#B5BAC5',
      bright: '#D2D5DC',
      link: '#7C8CF6',
    },
  },

  // Хвоя — глубокий тёмно-зелёный
  forest: {
    id: 'forest',
    title: 'Хвоя',
    premium: true,
    colors: {
      bg: '#0A130F',
      card: '#142119',
      card2: '#132018',
      deep: '#0C1712',
      pop: '#16261F',
      line: 'rgba(220,255,235,0.08)',
      bodyCard: 'rgba(18,54,38,0.72)',
      bodyLine: 'rgba(52,211,153,0.26)',
      text: '#ECF6EF',
      sub: '#A4C4B1',
      sub2: '#98B7A6',
      dim: '#8BAA9B',
      soft: '#B2D3C1',
      bright: '#D0E9DB',
      link: '#5ED0A5',
    },
  },

  // Океан — глубокий сине-бирюзовый
  ocean: {
    id: 'ocean',
    title: 'Океан',
    premium: true,
    colors: {
      bg: '#081018',
      card: '#0F1D2E',
      card2: '#0E1B2B',
      deep: '#0A1420',
      pop: '#12233A',
      line: 'rgba(190,225,255,0.09)',
      bodyCard: 'rgba(13,42,64,0.75)',
      bodyLine: 'rgba(56,189,248,0.28)',
      text: '#EAF3FC',
      sub: '#A2BACC',
      sub2: '#95AEC2',
      dim: '#89A1B5',
      soft: '#B0CBDD',
      bright: '#CFE3F1',
      link: '#38BDF8',
    },
  },

  // Слива — тёмно-фиолетовый (родной для акцентов приложения)
  plum: {
    id: 'plum',
    title: 'Слива',
    premium: true,
    colors: {
      bg: '#110B1B',
      card: '#1B1429',
      card2: '#1A1227',
      deep: '#140D20',
      pop: '#1E1633',
      line: 'rgba(240,225,255,0.09)',
      bodyCard: 'rgba(45,26,74,0.75)',
      bodyLine: 'rgba(192,132,252,0.30)',
      text: '#F3EFFB',
      sub: '#B0A6C9',
      sub2: '#A49BC0',
      dim: '#978DB4',
      soft: '#C4B8DF',
      bright: '#DFD4F5',
      link: '#A78BFA',
    },
  },
}

// Какую тему реально показывать: премиум-тема без подписки → «Классика»,
// неизвестный id (битое хранилище, удалённая тема) → «Классика».
// Данные в сторе не трогаем — после оплаты подписки выбранная тема
// вернётся сама
export function resolveThemeId(themeId, pro) {
  const theme = THEMES[themeId]
  if (!theme) return DEFAULT_THEME_ID
  if (theme.premium && !pro) return DEFAULT_THEME_ID
  return themeId
}

// Карта CSS-переменных для NativeWind vars() (обёртка — src/lib/use-theme.js).
// Имена должны совпадать с теми, что читает tailwind.config.js
export function themeToCssVars(theme) {
  const out = {}
  for (const key of THEME_TOKENS) {
    out[`--nb-${key}`] = theme.colors[key]
  }
  return out
}

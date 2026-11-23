// Темы оформления приложения (Premium-фича, задача Кати 23.11:
// «усилить Premium — оформление»; правка Кати 24.11: «при смене тем
// меняется частично вкладки и часть блоков» — палитра расширена
// акцентными токенами, жёстко зашитые цвета компонентов переведены
// на них). Правка Кати 24.11 («сделай в точности как на скрине»):
// старые блеклые темы («Чёрно-лимонная», «Хвоя», «Океан», «Слива»)
// заменены на ПЯТЬ ЯРКИХ НЕОНОВЫХ тем с макета — у каждой СВОЙ
// акцентный цвет (кнопки, тумблеры, пилюли, ссылки, рамки карточек
// светятся цветом темы), плюс светлая «Кремовая»:
//   «Неон-лайм» — чёрный фон + светящийся лайм;
//   «Неон-синий» — тёмно-синий фон + яркая лазурь;
//   «Неон-фиолетовый» — тёмно-фиолетовый фон + яркая орхидея;
//   «Неон-циан» — чёрно-бирюзовый фон + яркая бирюза;
//   «Кремовая» — светлая бежевая с янтарными акцентами.
//
// Палитра живёт в tailwind.config.js через CSS-переменные --nb-*:
// класс bg-bear-bg компилируется в var(--nb-bg, <классика>) — поддеревья
// без переменных (окно «Мишка споткнулся», оверлеи без обёртки) остаются
// в «Классике», а не становятся прозрачными. Переменные прокидываются
// в корневом макете (app/_layout.jsx → src/lib/use-theme.js). Цвета
// в style-пропсах компонентов берутся из хука useThemeColors (там же) —
// они работают и вне обёртки с переменными.
//
// Файл чистый (без react-native и nativewind) — тестируется
// в __tests__/themes.test.js.

export const DEFAULT_THEME_ID = 'classic'

export const THEME_ORDER = ['classic', 'neonLime', 'neonBlue', 'neonPurple', 'neonCyan', 'cream']

// Токены палитры: ровно те же имена, что в tailwind.config.js (bear.*)
export const THEME_TOKENS = [
  'bg', 'card', 'card2', 'deep', 'pop', 'line', 'bodyCard', 'bodyLine',
  'text', 'sub', 'sub2', 'dim', 'soft', 'bright', 'link',
  // Акценты: кнопки, тумблеры, активные пилюли, ссылки, свечения рамок.
  // accentOn — цвет текста/иконки НА акцентной поверхности: у ярких
  // лайма/циана/янтаря он тёмный (белое на них не читается),
  // у синего и фиолетового — белый
  'accent', 'accentBright', 'accentSoft', 'accentOn',
  'accentFaint', 'accentFaint2', 'accentFaint3', 'accentStrong', 'accentBorder',
]

// Фиолетовый набор акцентов — родной для приложения (#7B6CF6).
// «Классика» — бесплатная тема, её значения ДОЛЖНЫ совпадать со
// старым tailwind.config.js дословно: они же служат fallback-значениями
// var(--nb-*, …) во всём приложении
const PURPLE_ACCENTS = {
  accent: '#7B6CF6',
  accentBright: '#A78BFA',
  accentSoft: '#C4B5FD',
  accentOn: '#FFFFFF',
  accentFaint: 'rgba(123,108,246,0.10)',
  accentFaint2: 'rgba(123,108,246,0.16)',
  accentFaint3: 'rgba(123,108,246,0.20)',
  accentStrong: 'rgba(123,108,246,0.80)',
  accentBorder: 'rgba(123,108,246,0.42)',
}

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
      ...PURPLE_ACCENTS,
    },
  },

  // Неон-лайм — чёрный фон и лаймовое свечение (верхний ряд макета):
  // рамки карточек светятся лаймом (bodyLine 0.45), кнопки/тумблеры/
  // пилюли — лаймовые, текст на них тёмный
  neonLime: {
    id: 'neonLime',
    title: 'Неон-лайм',
    premium: true,
    colors: {
      bg: '#060803',
      card: '#0D1206',
      card2: '#0C1005',
      deep: '#040602',
      pop: '#121808',
      line: 'rgba(201,243,29,0.12)',
      bodyCard: 'rgba(24,32,6,0.88)',
      bodyLine: 'rgba(201,243,29,0.45)',
      text: '#F2FADC',
      sub: '#A9BC8C',
      sub2: '#9CB07F',
      dim: '#8CA06E',
      soft: '#C2D6A2',
      bright: '#E6F7BC',
      link: '#C9F31D',
      accent: '#C9F31D',
      accentBright: '#DCFA55',
      accentSoft: '#EDFBA4',
      accentOn: '#151A02',
      accentFaint: 'rgba(201,243,29,0.12)',
      accentFaint2: 'rgba(201,243,29,0.18)',
      accentFaint3: 'rgba(201,243,29,0.24)',
      accentStrong: 'rgba(201,243,29,0.85)',
      accentBorder: 'rgba(201,243,29,0.55)',
    },
  },

  // Неон-синий — тёмно-синий фон + яркая лазурь
  neonBlue: {
    id: 'neonBlue',
    title: 'Неон-синий',
    premium: true,
    colors: {
      bg: '#040910',
      card: '#0A1521',
      card2: '#09131F',
      deep: '#030710',
      pop: '#0E1B2B',
      line: 'rgba(64,170,255,0.13)',
      bodyCard: 'rgba(12,34,56,0.86)',
      bodyLine: 'rgba(46,158,255,0.46)',
      text: '#EAF4FD',
      sub: '#9FBDD6',
      sub2: '#93B2CB',
      dim: '#85A6C0',
      soft: '#B6D3E9',
      bright: '#D8EDFA',
      link: '#2E9EFF',
      accent: '#2E9EFF',
      accentBright: '#6FC5FF',
      accentSoft: '#ABDCFF',
      accentOn: '#FFFFFF',
      accentFaint: 'rgba(46,158,255,0.12)',
      accentFaint2: 'rgba(46,158,255,0.18)',
      accentFaint3: 'rgba(46,158,255,0.24)',
      accentStrong: 'rgba(46,158,255,0.85)',
      accentBorder: 'rgba(46,158,255,0.55)',
    },
  },

  // Неон-фиолетовый — тёмно-фиолетовый фон + яркая орхидея
  neonPurple: {
    id: 'neonPurple',
    title: 'Неон-фиолетовый',
    premium: true,
    colors: {
      bg: '#0A0512',
      card: '#140B22',
      card2: '#130A1F',
      deep: '#070310',
      pop: '#180F2B',
      line: 'rgba(200,110,255,0.14)',
      bodyCard: 'rgba(44,18,72,0.82)',
      bodyLine: 'rgba(196,75,248,0.46)',
      text: '#F4EBFC',
      sub: '#B7A4CF',
      sub2: '#AA98C3',
      dim: '#9C8AB6',
      soft: '#CDB8E3',
      bright: '#E9D9F8',
      link: '#C44BF8',
      accent: '#C44BF8',
      accentBright: '#DB8CFF',
      accentSoft: '#EEC0FF',
      accentOn: '#FFFFFF',
      accentFaint: 'rgba(196,75,248,0.12)',
      accentFaint2: 'rgba(196,75,248,0.18)',
      accentFaint3: 'rgba(196,75,248,0.24)',
      accentStrong: 'rgba(196,75,248,0.85)',
      accentBorder: 'rgba(196,75,248,0.55)',
    },
  },

  // Неон-циан — чёрно-бирюзовый фон + яркая бирюза
  neonCyan: {
    id: 'neonCyan',
    title: 'Неон-циан',
    premium: true,
    colors: {
      bg: '#030A0A',
      card: '#081615',
      card2: '#071413',
      deep: '#020808',
      pop: '#0B1C1A',
      line: 'rgba(46,232,203,0.13)',
      bodyCard: 'rgba(10,44,40,0.84)',
      bodyLine: 'rgba(35,229,200,0.44)',
      text: '#E9FAF6',
      sub: '#9BC7C0',
      sub2: '#8FBBB4',
      dim: '#82AEA7',
      soft: '#B3DCD5',
      bright: '#D8F2EC',
      link: '#23E5C8',
      accent: '#23E5C8',
      accentBright: '#6FF2DF',
      accentSoft: '#B0F8EC',
      accentOn: '#04241E',
      accentFaint: 'rgba(35,229,200,0.12)',
      accentFaint2: 'rgba(35,229,200,0.18)',
      accentFaint3: 'rgba(35,229,200,0.24)',
      accentStrong: 'rgba(35,229,200,0.85)',
      accentBorder: 'rgba(35,229,200,0.55)',
    },
  },

  // Кремовая — светлая бежевая тема (нижний ряд макета, без креста):
  // тёплый кремовый фон, янтарные акценты. Тексты/вторичные цвета —
  // тёмно-коричневые (проверены на контраст по WCAG AA на card #FAF1DF);
  // «яркие» варианты акцента здесь ТЕМНЕЕ базового — на светлом фоне
  // контраст растёт в тёмную сторону
  cream: {
    id: 'cream',
    title: 'Кремовая',
    premium: true,
    colors: {
      bg: '#F3E8D2',
      card: '#FAF1DF',
      card2: '#F7EDD8',
      deep: '#EFE2C6',
      pop: '#FEF7E9',
      line: 'rgba(122,90,34,0.16)',
      bodyCard: 'rgba(255,250,238,0.92)',
      bodyLine: 'rgba(217,142,26,0.42)',
      text: '#3B2F1A',
      sub: '#6E5C3C',
      sub2: '#675633',
      dim: '#6B5934',
      soft: '#5D4C2C',
      bright: '#241C0C',
      link: '#9A6108',
      accent: '#E29A2E',
      accentBright: '#B97A12',
      accentSoft: '#9A6B10',
      accentOn: '#3A2A08',
      accentFaint: 'rgba(226,154,46,0.14)',
      accentFaint2: 'rgba(226,154,46,0.20)',
      accentFaint3: 'rgba(226,154,46,0.26)',
      accentStrong: 'rgba(226,154,46,0.90)',
      accentBorder: 'rgba(217,142,26,0.50)',
    },
  },
}

// Прошлые выборы из хранилища переезжают на новые темы: блеклые темы
// заменены яркими неонами того же цвета (выбор Кати не сбрасывается),
// «графит» (удалена ещё 24.11) — в «Классику»
export const THEME_ROLL_FORWARD = {
  lemon: 'neonLime',
  ocean: 'neonBlue',
  plum: 'neonPurple',
  forest: 'neonCyan',
  graphite: 'classic',
}

// Какую тему реально показывать: старый id → новая тема того же цвета,
// премиум-тема без подписки → «Классика», неизвестный id (битое
// хранилище) → «Классика». Данные в сторе не трогаем — после оплаты
// подписки выбранная тема вернётся сама
export function resolveThemeId(themeId, pro) {
  const id = THEME_ROLL_FORWARD[themeId] || themeId
  const theme = THEMES[id]
  if (!theme) return DEFAULT_THEME_ID
  if (theme.premium && !pro) return DEFAULT_THEME_ID
  return id
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

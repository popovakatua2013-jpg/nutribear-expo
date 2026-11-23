// Темы оформления (Premium-фича 23.11 «усилить Premium»; правка Кати
// 24.11: «заменить графит тему на черно лимонный» — вместо «Графита»
// появилась «Чёрно-лимонная» с лимонными акцентами): структура палитры,
// гейтинг по подписке (resolveThemeId), карта CSS-переменных
// (themeToCssVars) и СТРАХОВКА соответствия fallback-значений
// tailwind.config.js классической теме — если они разъедутся,
// поддеревья без переменных (окно ошибки, оверлеи) потеряют цвета.

const fs = require('fs')
const path = require('path')

const {
  DEFAULT_THEME_ID,
  THEME_ORDER,
  THEME_TOKENS,
  THEMES,
  resolveThemeId,
  themeToCssVars,
} = require('@/lib/themes')

describe('THEMES: структура палитры', () => {
  test('пять тем, «Классика» — первая и бесплатная', () => {
    expect(THEME_ORDER).toEqual(['classic', 'lemon', 'forest', 'ocean', 'plum'])
    expect(THEMES.classic.premium).toBe(false)
    expect(DEFAULT_THEME_ID).toBe('classic')
    // «Графит» заменена на «Чёрно-лимонную» (просьба Кати 24.11)
    expect(THEMES.graphite).toBeUndefined()
    expect(THEMES.lemon.premium).toBe(true)
    expect(THEMES.lemon.title).toBe('Чёрно-лимонная')
  })

  test('все премиум-темы помечены premium', () => {
    for (const id of THEME_ORDER.slice(1)) {
      expect(THEMES[id].premium).toBe(true)
    }
  })

  test('у каждой темы полный набор токенов (ровно как в tailwind bear.*)', () => {
    for (const id of THEME_ORDER) {
      const theme = THEMES[id]
      expect(theme.id).toBe(id)
      // названия с дефисом («Чёрно-лимонная») тоже валидны
      expect(theme.title).toMatch(/^[А-ЯЁ][а-яёА-ЯЁ-]+$/)
      for (const token of THEME_TOKENS) {
        expect(typeof theme.colors[token]).toBe('string')
        expect(theme.colors[token].length).toBeGreaterThan(0)
      }
    }
  })

  test('названия тем уникальны', () => {
    const titles = THEME_ORDER.map((id) => THEMES[id].title)
    expect(new Set(titles).size).toBe(titles.length)
  })

  test('«Классика» дословно совпадает с прежней navy-палитрой', () => {
    // Эти значения — fallback var(--nb-*, …) во всём приложении;
    // менять их можно только вместе с tailwind.config.js и историей Кати
    expect(THEMES.classic.colors).toEqual({
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
      accent: '#7B6CF6',
      accentBright: '#A78BFA',
      accentSoft: '#C4B5FD',
      accentOn: '#FFFFFF',
      accentFaint: 'rgba(123,108,246,0.10)',
      accentFaint2: 'rgba(123,108,246,0.16)',
      accentFaint3: 'rgba(123,108,246,0.20)',
      accentStrong: 'rgba(123,108,246,0.80)',
      accentBorder: 'rgba(123,108,246,0.42)',
    })
  })

  test('«Чёрно-лимонная»: чёрный фон, лимонные акценты, тёмный текст на акценте', () => {
    const c = THEMES.lemon.colors
    // Чёрный фон и поверхности
    expect(c.bg).toBe('#060606')
    expect(c.card).toBe('#121212')
    expect(c.deep).toBe('#040404')
    // Лимонные кнопки/пилюли/ссылки — светло-жёлто-зелёные
    expect(c.accent).toBe('#E4F93B')
    expect(c.accentBright).toBe('#F0FA6B')
    expect(c.link).toBe('#E4F93B')
    // Текст НА акцентной кнопке — тёмный (белый на лимоне не читается)
    expect(c.accentOn).toBe('#191D05')
    // Подсветки/обводки — те же лимонные оттенки
    expect(c.accentFaint2).toBe('rgba(228,240,70,0.16)')
    expect(c.accentBorder).toBe('rgba(228,240,70,0.42)')
  })

  test('у остальных тем — общий фирменный фиолетовый акцент', () => {
    for (const id of ['classic', 'forest', 'ocean', 'plum']) {
      expect(THEMES[id].colors.accent).toBe('#7B6CF6')
      expect(THEMES[id].colors.accentBright).toBe('#A78BFA')
      expect(THEMES[id].colors.accentOn).toBe('#FFFFFF')
    }
  })
})

describe('resolveThemeId: гейтинг по подписке', () => {
  test('премиум-тема без подписки → «Классика»', () => {
    expect(resolveThemeId('lemon', false)).toBe('classic')
    expect(resolveThemeId('forest', false)).toBe('classic')
    expect(resolveThemeId('plum', false)).toBe('classic')
    expect(resolveThemeId('ocean', false)).toBe('classic')
  })

  test('премиум-тема с подпиской → сама тема', () => {
    expect(resolveThemeId('lemon', true)).toBe('lemon')
    expect(resolveThemeId('forest', true)).toBe('forest')
    expect(resolveThemeId('plum', true)).toBe('plum')
  })

  test('«Классика» всегда доступна, подписка не важна', () => {
    expect(resolveThemeId('classic', false)).toBe('classic')
    expect(resolveThemeId('classic', true)).toBe('classic')
  })

  test('неизвестный/битый id → «Классика» (безопасный дефолт)', () => {
    expect(resolveThemeId('nope', true)).toBe('classic')
    // удалённая тема «графит» тоже откатывается в «Классику»
    expect(resolveThemeId('graphite', true)).toBe('classic')
    expect(resolveThemeId(null, true)).toBe('classic')
    expect(resolveThemeId(undefined, false)).toBe('classic')
  })
})

describe('themeToCssVars: карта CSS-переменных', () => {
  test('ключи --nb-* на все токены, значения — цвета темы', () => {
    const vars = themeToCssVars(THEMES.forest)
    expect(Object.keys(vars)).toHaveLength(THEME_TOKENS.length)
    for (const token of THEME_TOKENS) {
      expect(vars[`--nb-${token}`]).toBe(THEMES.forest.colors[token])
    }
  })
})

describe('страховка: fallback-значения tailwind.config.js = «Классика»', () => {
  // Если кто-то поменяет fallback в конфиге, а «Классику» — нет (или
  // наоборот), поддеревья без CSS-переменных уйдут в чужие цвета
  const config = fs.readFileSync(
    path.join(__dirname, '../tailwind.config.js'),
    'utf8'
  )
  const calls = [...config.matchAll(/bearVar\('([A-Za-z0-9]+)', '([^']+)'\)/g)].map(
    ([, token, fallback]) => ({ token, fallback })
  )

  test('в конфиге заданы все токены темы', () => {
    expect(calls.map((c) => c.token).sort()).toEqual([...THEME_TOKENS].sort())
  })

  test('каждый fallback дословно равен цвету «Классики»', () => {
    for (const { token, fallback } of calls) {
      expect(fallback).toBe(THEMES.classic.colors[token])
    }
  })
})

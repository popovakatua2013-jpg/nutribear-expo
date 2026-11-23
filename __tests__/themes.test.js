// Темы оформления (Premium-фича 23.11 «усилить Premium»): структура
// палитры, гейтинг по подписке (resolveThemeId), карта CSS-переменных
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
    expect(THEME_ORDER).toEqual(['classic', 'graphite', 'forest', 'ocean', 'plum'])
    expect(THEMES.classic.premium).toBe(false)
    expect(DEFAULT_THEME_ID).toBe('classic')
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
      expect(theme.title).toMatch(/^[А-ЯЁ][а-яё]+$/)
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
    })
  })
})

describe('resolveThemeId: гейтинг по подписке', () => {
  test('премиум-тема без подписки → «Классика»', () => {
    expect(resolveThemeId('forest', false)).toBe('classic')
    expect(resolveThemeId('plum', false)).toBe('classic')
    expect(resolveThemeId('graphite', false)).toBe('classic')
    expect(resolveThemeId('ocean', false)).toBe('classic')
  })

  test('премиум-тема с подпиской → сама тема', () => {
    expect(resolveThemeId('forest', true)).toBe('forest')
    expect(resolveThemeId('plum', true)).toBe('plum')
  })

  test('«Классика» всегда доступна, подписка не важна', () => {
    expect(resolveThemeId('classic', false)).toBe('classic')
    expect(resolveThemeId('classic', true)).toBe('classic')
  })

  test('неизвестный/битый id → «Классика» (безопасный дефолт)', () => {
    expect(resolveThemeId('nope', true)).toBe('classic')
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
  const calls = [...config.matchAll(/bearVar\('([A-Za-z2]+)', '([^']+)'\)/g)].map(
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

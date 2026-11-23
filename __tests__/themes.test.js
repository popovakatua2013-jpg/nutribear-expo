// Темы оформления (Premium-фича 23.11 «усилить Premium»; правка Кати
// 24.11: «заменить графит тему на черно лимонный»; правка Кати 24.11
// «сделай в точности как на скрине» — блеклые темы заменены на ПЯТЬ
// ярких неоновых с макета + светлая «Кремовая»): структура палитры,
// гейтинг по подписке (resolveThemeId) с переездом старых выборов
// (THEME_ROLL_FORWARD), карта CSS-переменных (themeToCssVars) и
// СТРАХОВКА соответствия fallback-значений tailwind.config.js
// классической теме — если они разъедутся, поддеревья без переменных
// (окно ошибки, оверлеи) потеряют цвета.

const fs = require('fs')
const path = require('path')

const {
  DEFAULT_THEME_ID,
  THEME_ORDER,
  THEME_TOKENS,
  THEMES,
  THEME_ROLL_FORWARD,
  resolveThemeId,
  themeToCssVars,
} = require('@/lib/themes')

// Относительная яркость цвета (WCAG) — для проверки контраста светлой темы
function luminance(hex) {
  const m = hex.match(/^#([0-9A-Fa-f]{6})$/)
  if (!m) throw new Error(`не hex-цвет: ${hex}`)
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16) / 255)
  const lin = (v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}
function contrast(a, b) {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (l1 + 0.05) / (l2 + 0.05)
}

describe('THEMES: структура палитры', () => {
  test('шесть тем: «Классика» + пять ярких с макета, «Классика» бесплатная', () => {
    expect(THEME_ORDER).toEqual([
      'classic',
      'neonLime',
      'neonBlue',
      'neonPurple',
      'neonCyan',
      'cream',
    ])
    expect(THEMES.classic.premium).toBe(false)
    expect(DEFAULT_THEME_ID).toBe('classic')
    // Блеклые темы сняты с макета — их больше нет
    expect(THEMES.lemon).toBeUndefined()
    expect(THEMES.graphite).toBeUndefined()
    expect(THEMES.forest).toBeUndefined()
    expect(THEMES.ocean).toBeUndefined()
    expect(THEMES.plum).toBeUndefined()
    // Новые темы с макета — премиум
    for (const id of ['neonLime', 'neonBlue', 'neonPurple', 'neonCyan', 'cream']) {
      expect(THEMES[id].premium).toBe(true)
    }
  })

  test('названия новых тем — как на макете', () => {
    expect(THEMES.neonLime.title).toBe('Неон-лайм')
    expect(THEMES.neonBlue.title).toBe('Неон-синий')
    expect(THEMES.neonPurple.title).toBe('Неон-фиолетовый')
    expect(THEMES.neonCyan.title).toBe('Неон-циан')
    expect(THEMES.cream.title).toBe('Кремовая')
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
      // названия с дефисом («Неон-фиолетовый») тоже валидны
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

  test('неоновые тёмные темы: свой яркий акцент у каждой, «свечение» рамок', () => {
    const accents = {
      neonLime: '#C9F31D',
      neonBlue: '#2E9EFF',
      neonPurple: '#C44BF8',
      neonCyan: '#23E5C8',
    }
    for (const [id, accent] of Object.entries(accents)) {
      const c = THEMES[id].colors
      // Кнопки/тумблеры/пилюли и ссылки — цвет темы
      expect(c.accent).toBe(accent)
      expect(c.link).toBe(accent)
      // Рамки главных карточек («свечение») — яркие: альфа ≥ 0.4
      const m = c.bodyLine.match(/rgba\((\d+),(\d+),(\d+),([\d.]+)\)/)
      expect(m).not.toBeNull()
      expect(Number(m[4])).toBeGreaterThanOrEqual(0.4)
      // Подсветки — того же цвета, что акцент
      expect(c.accentFaint).toContain(m.slice(1, 4).join(','))
    }
  })

  test('текст НА акценте: тёмный у ярких лайма/циана/янтаря, белый у синего/фиолетового', () => {
    expect(THEMES.neonLime.colors.accentOn).toMatch(/^#[0-9A-Fa-f]{6}$/)
    expect(luminance(THEMES.neonLime.colors.accentOn)).toBeLessThan(0.1)
    expect(luminance(THEMES.neonCyan.colors.accentOn)).toBeLessThan(0.1)
    expect(THEMES.cream.colors.accentOn).toMatch(/^#[0-9A-Fa-f]{6}$/)
    expect(luminance(THEMES.cream.colors.accentOn)).toBeLessThan(0.1)
    expect(THEMES.neonBlue.colors.accentOn).toBe('#FFFFFF')
    expect(THEMES.neonPurple.colors.accentOn).toBe('#FFFFFF')
  })

  test('«Кремовая» — светлая тема: тёмные тексты читаются по WCAG AA', () => {
    const c = THEMES.cream.colors
    // Светлый фон и поверхности
    expect(contrast(c.bg, '#000000')).toBeGreaterThan(6)
    expect(contrast(c.card, c.text)).toBeGreaterThan(9)
    // Вторичные тексты — не хуже 4.5:1 (как заявлено в tailwind.config.js)
    expect(contrast(c.card, c.sub)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(c.card, c.sub2)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(c.card, c.dim)).toBeGreaterThanOrEqual(4.5)
    // Ссылка — читаемый янтарный
    expect(contrast(c.card, c.link)).toBeGreaterThanOrEqual(4.5)
  })

  test('тёмные неоновые темы: вторичные тексты читаются по WCAG AA', () => {
    for (const id of ['neonLime', 'neonBlue', 'neonPurple', 'neonCyan']) {
      const c = THEMES[id].colors
      // Фон реально тёмный
      expect(luminance(c.bg)).toBeLessThan(0.03)
      expect(contrast(c.card, c.text)).toBeGreaterThan(9)
      expect(contrast(c.card, c.sub)).toBeGreaterThanOrEqual(4.5)
      expect(contrast(c.card, c.sub2)).toBeGreaterThanOrEqual(4.5)
      expect(contrast(c.card, c.dim)).toBeGreaterThanOrEqual(4.5)
    }
  })
})

describe('resolveThemeId: гейтинг по подписке и переезд старых выборов', () => {
  test('премиум-тема без подписки → «Классика»', () => {
    for (const id of ['neonLime', 'neonBlue', 'neonPurple', 'neonCyan', 'cream']) {
      expect(resolveThemeId(id, false)).toBe('classic')
    }
  })

  test('премиум-тема с подпиской → сама тема', () => {
    for (const id of ['neonLime', 'neonBlue', 'neonPurple', 'neonCyan', 'cream']) {
      expect(resolveThemeId(id, true)).toBe(id)
    }
  })

  test('«Классика» всегда доступна, подписка не важна', () => {
    expect(resolveThemeId('classic', false)).toBe('classic')
    expect(resolveThemeId('classic', true)).toBe('classic')
  })

  test('старые выборы переезжают на яркие темы того же цвета (выбор Кати сохраняется)', () => {
    // Даже без подписки переезд валиден: «Классика» бесплатна,
    // а после оплаты вернётся яркая тема
    expect(THEME_ROLL_FORWARD).toEqual({
      lemon: 'neonLime',
      ocean: 'neonBlue',
      plum: 'neonPurple',
      forest: 'neonCyan',
      graphite: 'classic',
    })
    expect(resolveThemeId('lemon', true)).toBe('neonLime')
    expect(resolveThemeId('ocean', true)).toBe('neonBlue')
    expect(resolveThemeId('plum', true)).toBe('neonPurple')
    expect(resolveThemeId('forest', true)).toBe('neonCyan')
    // удалённая «графит» — в «Классику»
    expect(resolveThemeId('graphite', true)).toBe('classic')
    // без подписки переезд сначала уводит в «Классику» (гейтинг)
    expect(resolveThemeId('lemon', false)).toBe('classic')
  })

  test('неизвестный/битый id → «Классика» (безопасный дефолт)', () => {
    expect(resolveThemeId('nope', true)).toBe('classic')
    expect(resolveThemeId(null, true)).toBe('classic')
    expect(resolveThemeId(undefined, false)).toBe('classic')
  })
})

describe('themeToCssVars: карта CSS-переменных', () => {
  test('ключи --nb-* на все токены, значения — цвета темы', () => {
    const vars = themeToCssVars(THEMES.neonCyan)
    expect(Object.keys(vars)).toHaveLength(THEME_TOKENS.length)
    for (const token of THEME_TOKENS) {
      expect(vars[`--nb-${token}`]).toBe(THEMES.neonCyan.colors[token])
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

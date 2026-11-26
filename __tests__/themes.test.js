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
  withAlpha,
  blendHex,
  bmiTones,
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
  test('восемь тем: «Классика» + бесплатная «Чёрно-белая» + шесть Premium', () => {
    expect(THEME_ORDER).toEqual([
      'classic',
      'mono',
      'neonLime',
      'neonBlue',
      'neonPurple',
      'neonCyan',
      'muted',
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
    // Новые темы — премиум
    for (const id of ['neonLime', 'neonBlue', 'neonPurple', 'neonCyan', 'muted', 'cream']) {
      expect(THEMES[id].premium).toBe(true)
    }
  })

  test('«Чёрно-белая» — бесплатная, светлая (белый фон/чёрный текст), без эффектов, значки цветные (правка Кати 26.11)', () => {
    const mono = THEMES.mono
    expect(mono.title).toBe('Чёрно-белая')
    expect(mono.premium).toBe(false)
    // Флаг plain: только у монохромной темы — компоненты эффектов
    // рисуют плоские поверхности
    expect(mono.plain).toBe(true)
    for (const id of THEME_ORDER.filter((x) => x !== 'mono')) {
      expect(THEMES[id].plain).toBeFalsy()
    }
    // accent == accentBright — все прочие градиенты приложения
    // становятся плоской заливкой
    expect(mono.colors.accent).toBe(mono.colors.accentBright)
    const lum = (hex) => {
      const m = hex.match(/^#([0-9A-Fa-f]{6})$/)
      const [r, g, b] = [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16) / 255)
      const lin = (v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
      return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
    }
    // «НАОБОРОТ: фон белый, а надписи и цифры черные» (второй круг
    // Кати 26.11): белый фон, чёрный текст, чёрная кнопка с белым текстом
    expect(lum(mono.colors.bg)).toBeGreaterThan(0.9)
    expect(lum(mono.colors.text)).toBeLessThan(0.1)
    expect(lum(mono.colors.accent)).toBeLessThan(0.1)
    expect(lum(mono.colors.accentOn)).toBeGreaterThan(0.9)
    // Слои разведены по светлоте (урок «Кремовой» — «не видно поля»):
    // фон самый светлый, карточки чуть темнее, поля темнее карточек
    expect(lum(mono.colors.bg)).toBeGreaterThan(lum(mono.colors.card))
    expect(lum(mono.colors.card)).toBeGreaterThan(lum(mono.colors.card2))
    expect(lum(mono.colors.card2)).toBeGreaterThan(lum(mono.colors.deep))
    // База — строго чёрно-белая: все небазовые/несемейные токены —
    // оттенки серого (R == G == B)
    const gray = (v) => {
      const hx = /^#([0-9A-Fa-f]{6})$/.exec(v)
      if (hx) {
        const r = parseInt(hx[1].slice(0, 2), 16)
        const g = parseInt(hx[1].slice(2, 4), 16)
        const b = parseInt(hx[1].slice(4, 6), 16)
        return r === g && g === b
      }
      const m = /rgba?\((\d+),(\d+),(\d+)/.exec(v.replace(/\s/g, ''))
      return !!m && m[1] === m[2] && m[2] === m[3]
    }
    for (const token of ['bg', 'card', 'card2', 'deep', 'pop', 'line', 'bodyCard', 'bodyLine', 'text', 'sub', 'sub2', 'dim', 'soft', 'bright', 'link', 'accent', 'accentBright', 'accentSoft', 'accentOn', 'accentFaint', 'accentFaint2', 'accentFaint3', 'accentStrong', 'accentBorder']) {
      expect(gray(mono.colors[token])).toBe(true)
    }
    // «СДЕЛАТЬ ЗНАЧКИ ЦВЕТНЫЕ»: семейство значков — ЦВЕТНОЕ на ч/б фоне
    for (const token of ['good', 'warn', 'bad', 'nutP', 'nutF', 'nutC', 'nutFib', 'nutSug', 'mSteps', 'mKcal', 'mWater', 'mBurned', 'mSleep', 'mWeight']) {
      expect(gray(mono.colors[token])).toBe(false)
    }
  })

  test('семья «Чёрно-белой» читается на светлой card по WCAG AA', () => {
    const c = THEMES.mono.colors
    const lum = (hex) => {
      const m = hex.match(/^#([0-9A-Fa-f]{6})$/)
      const [r, g, b] = [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16) / 255)
      const lin = (v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
      return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
    }
    const contrast = (a, b) => {
      const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x)
      return (l1 + 0.05) / (l2 + 0.05)
    }
    for (const token of ['good', 'warn', 'bad', 'nutP', 'nutF', 'nutC', 'nutFib', 'nutSug', 'mSteps', 'mKcal', 'mWater', 'mBurned', 'mSleep', 'mWeight']) {
      expect(contrast(c.card, c[token])).toBeGreaterThanOrEqual(4.5)
    }
  })

  test('названия новых тем — как на макете', () => {
    expect(THEMES.neonLime.title).toBe('Неон-лайм')
    expect(THEMES.neonBlue.title).toBe('Неон-синий')
    expect(THEMES.neonPurple.title).toBe('Неон-фиолетовый')
    expect(THEMES.neonCyan.title).toBe('Неон-циан')
    expect(THEMES.muted.title).toBe('Приглушённая')
    expect(THEMES.cream.title).toBe('Кремовая')
    expect(THEMES.mono.title).toBe('Чёрно-белая')
  })

  test('все неоновые и «Кремовая» помечены premium, бесплатные — «Классика» и «Чёрно-белая»', () => {
    for (const id of ['neonLime', 'neonBlue', 'neonPurple', 'neonCyan', 'muted', 'cream']) {
      expect(THEMES[id].premium).toBe(true)
    }
    expect(THEMES.classic.premium).toBe(false)
    expect(THEMES.mono.premium).toBe(false)
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
      // Семейство CLASSIC_FAMILY: прежние цвета точек БЖУ/метрик/семантики
      good: '#4ade80',
      warn: '#FBBF24',
      bad: '#FB7185',
      nutP: '#A78BFA',
      nutF: '#FB923C',
      nutC: '#38BDF8',
      nutFib: '#34D399',
      nutSug: '#F472B6',
      mSteps: '#4ade80',
      mKcal: '#f87171',
      mWater: '#38bdf8',
      mBurned: '#fb923c',
      mSleep: '#c084fc',
      mWeight: '#a78bfa',
    })
  })

  test('семейства темы: нутриенты/метрики — оттенки неона, точки БЖУ по темам (правка Кати 25.11)', () => {
    // У неона нутриенты и метрики — оттенки ТОГО ЖЕ неона (монохромное
    // свечение, как на макете); у «Классики» — прежние фирменные цвета
    const lime = THEMES.neonLime.colors
    expect(lime.nutP).toBe(lime.accentBright)
    expect(lime.nutF).toBe(lime.accent)
    expect(lime.nutC).toBe(lime.accentSoft)
    expect(lime.mWeight).toBe(lime.accent)
    expect(lime.good).toBe(lime.accent)
    // bad/warn — семантика чужого оттенка намеренно: сигнал читается
    // и в монохромной теме
    expect(lime.bad).toBe('#FB7185')
    expect(lime.warn).toBe('#FBBF24')
    // у неонов nutP/метрики не равны между темами (каждая — своего цвета)
    expect(THEMES.neonCyan.colors.nutP).toBe(THEMES.neonCyan.colors.accentBright)
    expect(THEMES.neonCyan.colors.nutP).not.toBe(lime.nutP)
  })

  test('цвета семейств «Кремовой» читаются на бежевом по WCAG AA', () => {
    const c = THEMES.cream.colors
    for (const token of ['good', 'warn', 'bad', 'nutP', 'nutF', 'nutC', 'nutFib', 'nutSug', 'mSteps', 'mKcal', 'mWater', 'mBurned', 'mSleep', 'mWeight']) {
      expect(contrast(c.card, c[token])).toBeGreaterThanOrEqual(4.5)
    }
  })

  test('«Кремовая» — тёплая семья и разведённые слои (правка Кати 25.11: «должен быть кремовый в кремовой теме», «не видно поля — сплошной белый фон»)', () => {
    const c = THEMES.cream.colors
    // Семья ТЁПЛАЯ: никакого чужого зелёного good, синих нутриентов и
    // чисто-голубой воды — оттенки янтаря/терракоты/оливы/какао
    expect(c.good).not.toBe('#166534')
    expect(c.nutC).not.toBe('#0369A1')
    expect(c.mWater).not.toBe('#38bdf8')
    expect(c.mWeight).not.toBe('#4F46E5')
    // Слои РАЗВЕДЕНЫ по светлоте: фон темнее карточек, поля (card2)
    // темнее карточек, pop — самая светлая поверхность. Раньше bg/card/
    // card2 почти совпадали — экран выглядел «сплошным белым полотном»
    const L = (hex) => luminance(hex)
    expect(L(c.bg)).toBeLessThan(L(c.card))
    expect(L(c.card2)).toBeLessThan(L(c.card))
    expect(L(c.deep)).toBeLessThan(L(c.card2))
    expect(L(c.pop)).toBeGreaterThan(L(c.card))
    // Поля заметны на карточке не только светлотой, но и рамкой:
    // линия плотнее, чем была (альфа ≥ 0.2)
    const lm = c.line.match(/rgba\((\d+),(\d+),(\d+),([\d.]+)\)/)
    expect(Number(lm[4])).toBeGreaterThanOrEqual(0.2)
  })

  test('неоновые тёмные темы: свой яркий акцент у каждой, «свечение» рамок', () => {
    const accents = {
      neonLime: '#C9F31D',
      neonBlue: '#2E9EFF',
      neonPurple: '#C44BF8',
      neonCyan: '#23E5C8',
      muted: '#A3C2A0',
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
    expect(luminance(THEMES.muted.colors.accentOn)).toBeLessThan(0.1)
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
    for (const id of ['neonLime', 'neonBlue', 'neonPurple', 'neonCyan', 'muted']) {
      const c = THEMES[id].colors
      // Фон реально тёмный
      expect(luminance(c.bg)).toBeLessThan(0.03)
      expect(contrast(c.card, c.text)).toBeGreaterThan(9)
      expect(contrast(c.card, c.sub)).toBeGreaterThanOrEqual(4.5)
      expect(contrast(c.card, c.sub2)).toBeGreaterThanOrEqual(4.5)
      expect(contrast(c.card, c.dim)).toBeGreaterThanOrEqual(4.5)
    }
  })

  test('«Чёрно-белая» — светлая тема: вторичные тексты читаются по WCAG AA', () => {
    const c = THEMES.mono.colors
    // Белый фон и чёрные тексты
    expect(contrast(c.bg, '#000000')).toBeGreaterThan(6)
    expect(contrast(c.card, c.text)).toBeGreaterThan(9)
    // Вторичные тексты — не хуже 4.5:1
    expect(contrast(c.card, c.sub)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(c.card, c.sub2)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(c.card, c.dim)).toBeGreaterThanOrEqual(4.5)
    // Ссылка — читаемая
    expect(contrast(c.card, c.link)).toBeGreaterThanOrEqual(4.5)
    // Белый текст на чёрной кнопке
    expect(contrast(c.accent, c.accentOn)).toBeGreaterThan(12)
  })
})

describe('resolveThemeId: гейтинг по подписке и переезд старых выборов', () => {
  test('премиум-тема без подписки → «Классика»; бесплатные доступны всем', () => {
    for (const id of ['neonLime', 'neonBlue', 'neonPurple', 'neonCyan', 'muted', 'cream']) {
      expect(resolveThemeId(id, false)).toBe('classic')
    }
    // «Чёрно-белая» — бесплатная (просьба Кати 26.11): работает и без
    // подписки, и с ней
    expect(resolveThemeId('mono', false)).toBe('mono')
    expect(resolveThemeId('mono', true)).toBe('mono')
  })

  test('премиум-тема с подпиской → сама тема', () => {
    for (const id of ['neonLime', 'neonBlue', 'neonPurple', 'neonCyan', 'muted', 'cream']) {
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

describe('помощники цвета: withAlpha / blendHex / bmiTones (правка Кати 25.11: «больше свечения», «обозначения подогнать по цвету с кольцом»)', () => {
  test('withAlpha: hex → rgba с нужной альфой (ореолы свечения NeonCard)', () => {
    expect(withAlpha('#C9F31D', 0.5)).toBe('rgba(201, 243, 29, 0.5)')
    expect(withAlpha('#0A1020', 0.16)).toBe('rgba(10, 16, 32, 0.16)')
  })

  test('withAlpha: не-hex (rgba/undefined) возвращается как есть', () => {
    const rgba = 'rgba(255,255,255,0.08)'
    expect(withAlpha(rgba, 0.5)).toBe(rgba)
    expect(withAlpha(undefined, 0.5)).toBeUndefined()
    expect(withAlpha('#F3F', 0.5)).toBe('#F3F')
  })

  test('blendHex: края и середина', () => {
    expect(blendHex('#000000', '#FFFFFF', 0)).toBe('#000000')
    expect(blendHex('#000000', '#FFFFFF', 1)).toBe('#ffffff')
    expect(blendHex('#000000', '#FFFFFF', 0.5)).toBe('#808080')
    expect(blendHex('#FBBF24', '#FB7185', 0.5)).toBe('#fb9855')
    // Не-hex — безопасный фолбэк (возвращает ближайший край)
    expect(blendHex('rgba(1,2,3,1)', '#FFFFFF', 0.2)).toBe('rgba(1,2,3,1)')
  })

  test('bmiTones: все категории ИМТ имеют тон из семьи темы', () => {
    for (const id of THEME_ORDER) {
      const tones = bmiTones(THEMES[id].colors)
      for (const cat of ['low', 'norm', 'over', 'obese1', 'obese2']) {
        expect(typeof tones[cat]).toBe('string')
        expect(tones[cat].length).toBeGreaterThan(0)
      }
      // Шкала различима: норма ≠ лишний вес ≠ ожирение
      expect(tones.norm).not.toBe(tones.over)
      expect(tones.over).not.toBe(tones.obese1)
    }
  })

  test('bmiTones: тона привязаны к семантике темы (норма — good, ожирение — bad)', () => {
    const classic = THEMES.classic.colors
    const tClassic = bmiTones(classic)
    expect(tClassic.norm).toBe(classic.good)
    expect(tClassic.obese1).toBe(classic.bad)
    expect(tClassic.low).toBe(classic.warn)
    // «Лишний вес» — переходная зона: смесь warn и bad (оранжевый)
    expect(tClassic.over).toBe(blendHex(classic.warn, classic.bad, 0.5))
    // В кремовой тема остаётся тёплой: норма — янтарь, не зелёный
    const cream = THEMES.cream.colors
    expect(bmiTones(cream).norm).toBe(cream.good)
    expect(bmiTones(cream).norm).toBe('#A16207')
    expect(bmiTones(cream).over).toBe('#9a431d')
  })
})

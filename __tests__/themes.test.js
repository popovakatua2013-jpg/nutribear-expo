// Темы оформления (Premium-фича 23.11 «усилить Premium»; неоны с макета
// 24.11; «Приглушённая» 25.11; правка Кати 26.11: «одну бесплатную
// черно-белую без каких либо эффектов», «фон белый, а надписи и цифры
// черные», «сделать значки цветные»; правка Кати 27.11: «Классика будет
// бело-черная тема» — прежняя navy-«Классика» удалена, «Классика» —
// бесплатная чёрно-белая тема, остальные шесть — Premium): структура
// палитры (включая подложки overlay/overlay2 вместо жёстких bg-white/*),
// гейтинг по подписке (resolveThemeId) с переездом старых выборов
// (THEME_ROLL_FORWARD: classic → mono), карта CSS-переменных
// (themeToCssVars) и СТРАХОВКА соответствия fallback-значений
// tailwind.config.js палитре «Классики» — если они разъедутся,
// поддеревья без переменных (окно ошибки, оверлеи) потеряют цвета.

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

// Относительная яркость цвета (WCAG) — для проверки контраста светлых тем
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
  test('семь тем: бесплатная «Классика» (чёрно-белая) + шесть Premium', () => {
    expect(THEME_ORDER).toEqual([
      'mono',
      'neonLime',
      'neonBlue',
      'neonPurple',
      'neonCyan',
      'muted',
      'cream',
    ])
    expect(THEMES.classic).toBeUndefined()
    expect(DEFAULT_THEME_ID).toBe('mono')
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

  test('«Классика» — чёрно-белая, светлая, без эффектов, значки цветные (правки Кати 26–27.11)', () => {
    const mono = THEMES.mono
    expect(mono.title).toBe('Классика')
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
    const lum = (hex) => luminance(hex)
    // «НАОБОРОТ: фон белый, а надписи и цифры черные»: белый фон,
    // чёрный текст, чёрная кнопка с белым текстом
    expect(lum(mono.colors.bg)).toBeGreaterThan(0.9)
    expect(lum(mono.colors.text)).toBeLessThan(0.1)
    expect(lum(mono.colors.accent)).toBeLessThan(0.1)
    expect(lum(mono.colors.accentOn)).toBeGreaterThan(0.9)
    // Слои разведены по светлоте (урок «Кремовой» — «не видно поля»):
    // фон самый светлый, карточки чуть темнее, поля темнее карточек
    expect(lum(mono.colors.bg)).toBeGreaterThan(lum(mono.colors.card))
    expect(lum(mono.colors.card)).toBeGreaterThan(lum(mono.colors.card2))
    expect(lum(mono.colors.card2)).toBeGreaterThan(lum(mono.colors.deep))
    // База — строго чёрно-белая: небазовые/несемейные токены — оттенки
    // серого (R == G == B)
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
    for (const token of ['bg', 'card', 'card2', 'deep', 'pop', 'line', 'bodyCard', 'bodyLine', 'text', 'sub', 'sub2', 'dim', 'soft', 'bright', 'link', 'accent', 'accentBright', 'accentSoft', 'accentOn', 'accentFaint', 'accentFaint2', 'accentFaint3', 'accentStrong', 'accentBorder', 'overlay', 'overlay2']) {
      expect(gray(mono.colors[token])).toBe(true)
    }
    // «СДЕЛАТЬ ЗНАЧКИ ЦВЕТНЫЕ»: семейство значков — ЦВЕТНОЕ на ч/б фоне
    for (const token of ['good', 'warn', 'bad', 'nutP', 'nutF', 'nutC', 'nutFib', 'nutSug', 'mSteps', 'mKcal', 'mWater', 'mBurned', 'mSleep', 'mWeight']) {
      expect(gray(mono.colors[token])).toBe(false)
    }
    // Подложки: у светлой темы — тёмные тинты (белые были невидимы)
    expect(gray(mono.colors.overlay)).toBe(true)
  })

  test('подложки overlay/overlay2 у всех тем, у светлых — тёмные тинты (аудит 27.11)', () => {
    for (const id of THEME_ORDER) {
      const c = THEMES[id].colors
      expect(typeof c.overlay).toBe('string')
      expect(typeof c.overlay2).toBe('string')
    }
    // Тёмные темы: белые тинты (сохраняют прежний вид bg-white/*)
    for (const id of ['neonLime', 'neonBlue', 'neonPurple', 'neonCyan', 'muted']) {
      expect(THEMES[id].colors.overlay).toContain('255,255,255')
      expect(THEMES[id].colors.overlay2).toContain('255,255,255')
    }
    // Светлые темы: тёмные тинты — поля видны
    expect(THEMES.mono.colors.overlay).toContain('0,0,0')
    expect(THEMES.cream.colors.overlay).not.toContain('255,255,255')
  })

  test('семья «Классики» читается на светлой card по WCAG AA', () => {
    const c = THEMES.mono.colors
    for (const token of ['good', 'warn', 'bad', 'nutP', 'nutF', 'nutC', 'nutFib', 'nutSug', 'mSteps', 'mKcal', 'mWater', 'mBurned', 'mSleep', 'mWeight']) {
      expect(contrast(c.card, c[token])).toBeGreaterThanOrEqual(4.5)
    }
  })

  test('названия тем', () => {
    expect(THEMES.mono.title).toBe('Классика')
    expect(THEMES.neonLime.title).toBe('Неон-лайм')
    expect(THEMES.neonBlue.title).toBe('Неон-синий')
    expect(THEMES.neonPurple.title).toBe('Неон-фиолетовый')
    expect(THEMES.neonCyan.title).toBe('Неон-циан')
    expect(THEMES.muted.title).toBe('Приглушённая')
    expect(THEMES.cream.title).toBe('Кремовая')
  })

  test('шесть Premium-тем помечены premium, бесплатная одна — «Классика»', () => {
    expect(THEMES.mono.premium).toBe(false)
    for (const id of ['neonLime', 'neonBlue', 'neonPurple', 'neonCyan', 'muted', 'cream']) {
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

  test('семейства темы: нутриенты/метрики — оттенки неона, точки БЖУ по темам (правка Кати 25.11)', () => {
    // У неона нутриенты и метрики — оттенки ТОГО ЖЕ неона (монохромное
    // свечение, как на макете)
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

  test('«Кремовая» — тёплая семья и разведённые слои (правка Кати 25.11)', () => {
    const c = THEMES.cream.colors
    expect(c.good).not.toBe('#166534')
    expect(c.nutC).not.toBe('#0369A1')
    expect(c.mWater).not.toBe('#38bdf8')
    expect(c.mWeight).not.toBe('#4F46E5')
    const L = (hex) => luminance(hex)
    expect(L(c.bg)).toBeLessThan(L(c.card))
    expect(L(c.card2)).toBeLessThan(L(c.card))
    expect(L(c.deep)).toBeLessThan(L(c.card2))
    expect(L(c.pop)).toBeGreaterThan(L(c.card))
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
      expect(c.accent).toBe(accent)
      expect(c.link).toBe(accent)
      const m = c.bodyLine.match(/rgba\((\d+),(\d+),(\d+),([\d.]+)\)/)
      expect(m).not.toBeNull()
      expect(Number(m[4])).toBeGreaterThanOrEqual(0.4)
      expect(c.accentFaint).toContain(m.slice(1, 4).join(','))
    }
  })

  test('текст НА акценте: тёмный у ярких лайма/циана/шалфея/янтаря, белый у остальных', () => {
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
    expect(contrast(c.bg, '#000000')).toBeGreaterThan(6)
    expect(contrast(c.card, c.text)).toBeGreaterThan(9)
    expect(contrast(c.card, c.sub)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(c.card, c.sub2)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(c.card, c.dim)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(c.card, c.link)).toBeGreaterThanOrEqual(4.5)
  })

  test('«Классика» — светлая тема: вторичные тексты читаются по WCAG AA', () => {
    const c = THEMES.mono.colors
    expect(contrast(c.bg, '#000000')).toBeGreaterThan(6)
    expect(contrast(c.card, c.text)).toBeGreaterThan(9)
    expect(contrast(c.card, c.sub)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(c.card, c.sub2)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(c.card, c.dim)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(c.card, c.link)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(c.accent, c.accentOn)).toBeGreaterThan(12)
  })

  test('тёмные неоновые темы: вторичные тексты читаются по WCAG AA', () => {
    for (const id of ['neonLime', 'neonBlue', 'neonPurple', 'neonCyan', 'muted']) {
      const c = THEMES[id].colors
      expect(luminance(c.bg)).toBeLessThan(0.03)
      expect(contrast(c.card, c.text)).toBeGreaterThan(9)
      expect(contrast(c.card, c.sub)).toBeGreaterThanOrEqual(4.5)
      expect(contrast(c.card, c.sub2)).toBeGreaterThanOrEqual(4.5)
      expect(contrast(c.card, c.dim)).toBeGreaterThanOrEqual(4.5)
    }
  })
})

describe('resolveThemeId: гейтинг по подписке и переезд старых выборов', () => {
  test('премиум-тема без подписки → «Классика»; бесплатные доступны всем', () => {
    for (const id of ['neonLime', 'neonBlue', 'neonPurple', 'neonCyan', 'muted', 'cream']) {
      expect(resolveThemeId(id, false)).toBe('mono')
    }
    // «Классика» — бесплатная: работает и без подписки, и с ней
    expect(resolveThemeId('mono', false)).toBe('mono')
    expect(resolveThemeId('mono', true)).toBe('mono')
  })

  test('премиум-тема с подпиской → сама тема', () => {
    for (const id of ['neonLime', 'neonBlue', 'neonPurple', 'neonCyan', 'muted', 'cream']) {
      expect(resolveThemeId(id, true)).toBe(id)
    }
  })

  test('старые выборы переезжают: navy-«Классика» и «графит» → новая «Классика» (правка Кати 27.11)', () => {
    expect(THEME_ROLL_FORWARD).toEqual({
      lemon: 'neonLime',
      ocean: 'neonBlue',
      plum: 'neonPurple',
      forest: 'neonCyan',
      graphite: 'mono',
      classic: 'mono',
    })
    expect(resolveThemeId('lemon', true)).toBe('neonLime')
    expect(resolveThemeId('ocean', true)).toBe('neonBlue')
    expect(resolveThemeId('plum', true)).toBe('neonPurple')
    expect(resolveThemeId('forest', true)).toBe('neonCyan')
    // Прежняя navy-«Классика» удалена — её выбор переезжает на новую
    expect(resolveThemeId('classic', true)).toBe('mono')
    expect(resolveThemeId('classic', false)).toBe('mono')
    expect(resolveThemeId('graphite', true)).toBe('mono')
    // без подписки переезд неонов сначала уводит в «Классику» (гейтинг)
    expect(resolveThemeId('lemon', false)).toBe('mono')
  })

  test('неизвестный/битый id → «Классика» (безопасный дефолт)', () => {
    expect(resolveThemeId('nope', true)).toBe('mono')
    expect(resolveThemeId(null, true)).toBe('mono')
    expect(resolveThemeId(undefined, false)).toBe('mono')
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

  test('каждый fallback дословно равен цвету «Классики» (темы по умолчанию)', () => {
    const def = THEMES[DEFAULT_THEME_ID].colors
    for (const { token, fallback } of calls) {
      expect(fallback).toBe(def[token])
    }
  })
})

describe('помощники цвета: withAlpha / blendHex / bmiTones (правка Кати 25.11)', () => {
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
    const mono = THEMES.mono.colors
    const tMono = bmiTones(mono)
    expect(tMono.norm).toBe(mono.good)
    expect(tMono.obese1).toBe(mono.bad)
    expect(tMono.low).toBe(mono.warn)
    expect(tMono.over).toBe(blendHex(mono.warn, mono.bad, 0.5))
    // В кремовой тема остаётся тёплой: норма — янтарь, не зелёный
    const cream = THEMES.cream.colors
    expect(bmiTones(cream).norm).toBe(cream.good)
    expect(bmiTones(cream).norm).toBe('#A16207')
    expect(bmiTones(cream).over).toBe('#9a431d')
  })
})

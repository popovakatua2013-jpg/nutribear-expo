// Темы оформления (Premium-фича 23.11 «усилить Premium»; неоны с макета
// 24.11; правка Кати 28.11: «мне не нравится как
// выглядит бело-черная тема. Давай бесплатную тему сделаем которая была
// до премиум темы — однотонная без эффектов и свечения» — «Классика»
// снова прежняя navy-палитра (дословно из истории), чёрно-белая
// (26–27.11, id mono) удалена; ПРАВКА 27.11 (вечер): «Приглушённая»
// удалена по просьбе Кати («удалить тему приглушенная») — остальные
// пять тем — Premium): структура
// палитры (включая подложки overlay/overlay2 вместо жёстких bg-white/*),
// гейтинг по подписке (resolveThemeId) с переездом старых выборов
// (THEME_ROLL_FORWARD: graphite/mono → classic), карта CSS-переменных
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
  test('шесть тем: бесплатная navy-«Классика» + пять Premium (правка 27.11: «Приглушённая» удалена)', () => {
    expect(THEME_ORDER).toEqual([
      'classic',
      'neonLime',
      'neonBlue',
      'neonPurple',
      'neonCyan',
      'cream',
    ])
    expect(THEMES.classic).toBeDefined()
    // Чёрно-белая (26–27.11) удалена — её выборы переезжают на «Классику»
    expect(THEMES.mono).toBeUndefined()
    // «Приглушённая» удалена (27.11, просьба Кати) — выбор переезжает на дефолт
    expect(THEMES.muted).toBeUndefined()
    expect(DEFAULT_THEME_ID).toBe('classic')
    // Блеклые темы сняты с макета — их больше нет
    expect(THEMES.lemon).toBeUndefined()
    expect(THEMES.graphite).toBeUndefined()
    expect(THEMES.forest).toBeUndefined()
    expect(THEMES.ocean).toBeUndefined()
    expect(THEMES.plum).toBeUndefined()
    // Новые темы — премиум
    for (const id of ['neonLime', 'neonBlue', 'neonPurple', 'neonCyan', 'cream']) {
      expect(THEMES[id].premium).toBe(true)
    }
  })

  test('«Классика» — прежняя navy, ОДНОТОННАЯ: plain без эффектов и свечения (правка Кати 28.11)', () => {
    const classic = THEMES.classic
    expect(classic.title).toBe('Классика')
    expect(classic.premium).toBe(false)
    // Флаг plain: только у «Классики» — компоненты эффектов
    // рисуют плоские поверхности, SoftGlow не рисуется
    expect(classic.plain).toBe(true)
    for (const id of THEME_ORDER.filter((x) => x !== 'classic')) {
      expect(THEMES[id].plain).toBeFalsy()
    }
    // accent == accentBright — все прочие градиенты приложения
    // становятся плоской фирменной заливкой
    expect(classic.colors.accent).toBe(classic.colors.accentBright)
    const lum = (hex) => luminance(hex)
    // Прежняя navy-палитра дословно (как до премиум-тем):
    // тёмно-синий фон, карточки, фиолетовый акцент #7B6CF6
    expect(classic.colors.bg).toBe('#0A1020')
    expect(classic.colors.card).toBe('#121B33')
    expect(classic.colors.accent).toBe('#7B6CF6')
    expect(classic.colors.text).toBe('#EEF2FB')
    expect(lum(classic.colors.bg)).toBeLessThan(0.03)
    // Слои читаются: фон самый тёмный, deep темнее карточки,
    // pop — самый светлый из поверхностей
    expect(lum(classic.colors.bg)).toBeLessThan(lum(classic.colors.deep))
    expect(lum(classic.colors.deep)).toBeLessThan(lum(classic.colors.card))
    expect(lum(classic.colors.card)).toBeLessThan(lum(classic.colors.pop))
    // Значки — прежние ФИРМЕННЫЕ цвета (семья не серая)
    const CLASSIC_FAMILY = {
      good: '#4ade80', warn: '#FBBF24', bad: '#FB7185',
      nutP: '#A78BFA', nutF: '#FB923C', nutC: '#38BDF8',
      nutFib: '#34D399', nutSug: '#F472B6',
      mSteps: '#4ade80', mKcal: '#f87171', mWater: '#38bdf8',
      mBurned: '#fb923c', mSleep: '#c084fc', mWeight: '#a78bfa',
    }
    for (const [token, color] of Object.entries(CLASSIC_FAMILY)) {
      expect(classic.colors[token]).toBe(color)
    }
    // Подложки: у тёмной темы — белые тинты (как были bg-white/*)
    expect(classic.colors.overlay).toContain('255,255,255')
    expect(classic.colors.overlay2).toContain('255,255,255')
  })

  test('подложки overlay/overlay2 у всех тем, у светлых — тёмные тинты (аудит 27.11)', () => {
    for (const id of THEME_ORDER) {
      const c = THEMES[id].colors
      expect(typeof c.overlay).toBe('string')
      expect(typeof c.overlay2).toBe('string')
    }
    // Тёмные темы: белые тинты (сохраняют прежний вид bg-white/*)
    for (const id of ['classic', 'neonLime', 'neonBlue', 'neonPurple', 'neonCyan']) {
      expect(THEMES[id].colors.overlay).toContain('255,255,255')
      expect(THEMES[id].colors.overlay2).toContain('255,255,255')
    }
    // Светлые темы: тёмные тинты — поля видны
    expect(THEMES.cream.colors.overlay).not.toContain('255,255,255')
  })

  test('семья «Классики» — прежние фирменные цвета — читаются на тёмной card по WCAG AA', () => {
    const c = THEMES.classic.colors
    for (const token of ['good', 'warn', 'bad', 'nutP', 'nutF', 'nutC', 'nutFib', 'nutSug', 'mSteps', 'mKcal', 'mWater', 'mBurned', 'mSleep', 'mWeight']) {
      expect(contrast(c.card, c[token])).toBeGreaterThanOrEqual(4.5)
    }
  })

  test('названия тем (правка 27.11: «менее кричащими» — без «Неон-» в названиях)', () => {
    expect(THEMES.classic.title).toBe('Классика')
    expect(THEMES.neonLime.title).toBe('Лайм')
    expect(THEMES.neonBlue.title).toBe('Лазурь')
    expect(THEMES.neonPurple.title).toBe('Орхидея')
    expect(THEMES.neonCyan.title).toBe('Бирюза')
    // «Приглушённая» удалена (27.11) — названия оставшихся тем без неё
    expect(THEMES.muted).toBeUndefined()
    expect(THEMES.cream.title).toBe('Кремовая')
  })

  test('пять Premium-тем помечены premium, бесплатная одна — «Классика» (правка 27.11)', () => {
    expect(THEMES.classic.premium).toBe(false)
    for (const id of ['neonLime', 'neonBlue', 'neonPurple', 'neonCyan', 'cream']) {
      expect(THEMES[id].premium).toBe(true)
    }
  })

  test('у каждой темы полный набор токенов (ровно как в tailwind bear.*)', () => {
    for (const id of THEME_ORDER) {
      const theme = THEMES[id]
      expect(theme.id).toBe(id)
      // названия с дефисом тоже валидны (раньше были «Неон-…»)
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

  test('тёмные цветные темы: мягкий акцент референса 28.11 у каждой (правка 28.11: «глазам больно» — фон приглушён, акцент смягчён)', () => {
    // Правка 28.11: чёрные фоны и кислотные акценты (#C9F31D/#2E9EFF/
    // #C44BF8/#23E5C8) заменены по референсу Кати (тёмно-оливковый фон,
    // мягкий лайм #D0F071) — фон с оттенком темы, акцент s=62% с тем же
    // hue; у каждой темы СВОЙ тон, линк и рамки того же цвета, кайма
    // читается (alpha ≥ 0.4)
    const accents = {
      neonLime: '#BEDA62',
      neonBlue: '#62A2DA',
      neonPurple: '#BC62DA',
      neonCyan: '#62DACA',
    }
    for (const [id, accent] of Object.entries(accents)) {
      const c = THEMES[id].colors
      expect(c.accent).toBe(accent)
      expect(c.link).toBe(accent)
      const m = c.bodyLine.match(/rgba\((\d+),(\d+),(\d+),([\d.]+)\)/)
      expect(m).not.toBeNull()
      expect(Number(m[4])).toBeGreaterThanOrEqual(0.4)
      expect(c.accentFaint).toContain(m.slice(1, 4).join(','))
      // фон НЕ чёрный: светлее старых почти чёрных поверхностей
      expect(luminance(c.bg)).toBeGreaterThan(luminance('#040602'))
    }
  })

  test('правка 28.11 «глазам больно»: акценты смягчены до s≈62%, оттенок сохранён (урок 27.11: hue не трогаем)', () => {
    // История: 27.11 приглушение до бледных #B3C48C было отклонено
    // («цвет не лайм»), яркие неоны вернулись; 28.11 Катя снова просит
    // мягкости («аж глазам больно») и даёт РЕФЕРЕНС с мягким лаймом —
    // теперь смягчаем насыщенность (s≈62%), но НЕ трогаем оттенок:
    // лайм остаётся лаймом, лазурь — лазурью
    const sat = (hex) => {
      const h = hex.replace('#', '')
      const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
      const max = Math.max(r, g, b)
      const min = Math.min(r, g, b)
      return (max - min) / (1 - Math.abs(2 * (max + min) / 2 - 1) || 1) / 1
    }
    const hueOf = (hex) => {
      const h = hex.replace('#', '')
      const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
      const max = Math.max(r, g, b)
      const min = Math.min(r, g, b)
      const d = max - min
      if (d === 0) return 0
      if (max === r) return ((60 * (g - b)) / d + 360) % 360
      if (max === g) return (60 * (b - r)) / d + 120
      return (60 * (r - g)) / d + 240
    }
    const macroHue = {
      neonLime: 72,
      neonBlue: 208,
      neonPurple: 282,
      neonCyan: 171,
    }
    for (const [id, oldHue] of Object.entries(macroHue)) {
      const accent = THEMES[id].colors.accent
      // мягкий, но ЦВЕТНОЙ: не блеклый (27.11), не кислотный (до 28.11)
      expect(sat(accent)).toBeGreaterThanOrEqual(0.5)
      expect(sat(accent)).toBeLessThanOrEqual(0.72)
      // и это ТОТ ЖЕ оттенок, что у исходного неона (тема «своего цвета»)
      expect(Math.abs(hueOf(accent) - oldHue)).toBeLessThanOrEqual(3)
    }
    expect(THEMES.muted).toBeUndefined()
  })

  test('текст НА акценте: тёмный у всех неонов (акценты смягчены 28.11 — стали светлыми) и «Кремовой», белый у «Классики»', () => {
    // Правка 28.11: акценты всех четырёх неонов смягчены до светлых
    // (#BEDA62/#62A2DA/#BC62DA/#62DACA) — белый текст на них больше не
    // читается, на кнопках тёмная «чернила» цвета фона темы
    const darkInk = ['neonLime', 'neonBlue', 'neonPurple', 'neonCyan', 'cream']
    for (const id of darkInk) {
      const on = THEMES[id].colors.accentOn
      expect(on).toMatch(/^#[0-9A-Fa-f]{6}$/)
      expect(luminance(on)).toBeLessThan(0.1)
      // читается на акценте (минимум для крупного UI-текста)
      expect(contrast(THEMES[id].colors.accent, on)).toBeGreaterThanOrEqual(3)
    }
    // «Классика» — фирменный фиолетовый #7B6CF6 остался средне-тёмным:
    // белый текст, как было до премиум-тем
    expect(THEMES.classic.colors.accentOn).toBe('#FFFFFF')
    expect(contrast(THEMES.classic.colors.accent, '#FFFFFF')).toBeGreaterThan(3)
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

  test('«Классика» — тёмная navy: тексты читаются по WCAG AA', () => {
    const c = THEMES.classic.colors
    expect(contrast(c.bg, c.text)).toBeGreaterThan(12)
    expect(contrast(c.card, c.text)).toBeGreaterThan(9)
    expect(contrast(c.card, c.sub)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(c.card, c.sub2)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(c.card, c.dim)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(c.card, c.link)).toBeGreaterThanOrEqual(4.5)
    // Белый текст НА фирменном фиолетовом — как было до премиум-тем
    expect(contrast(c.accent, c.accentOn)).toBeGreaterThan(3)
  })

  test('тёмные неоновые темы: вторичные тексты читаются по WCAG AA', () => {
    for (const id of ['neonLime', 'neonBlue', 'neonPurple', 'neonCyan']) {
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
  test('премиум-тема без подписки → «Классика»; бесплатная доступна всем (удалённая «Приглушённая» — тоже дефолт)', () => {
    for (const id of ['neonLime', 'neonBlue', 'neonPurple', 'neonCyan', 'cream']) {
      expect(resolveThemeId(id, false)).toBe('classic')
    }
    // «Классика» — бесплатная: работает и без подписки, и с ней
    expect(resolveThemeId('classic', false)).toBe('classic')
    expect(resolveThemeId('classic', true)).toBe('classic')
    // Удалённая «Приглушённая»: id неизвестен → безопасный дефолт
    expect(resolveThemeId('muted', true)).toBe('classic')
    expect(resolveThemeId('muted', false)).toBe('classic')
  })

  test('премиум-тема с подпиской → сама тема', () => {
    for (const id of ['neonLime', 'neonBlue', 'neonPurple', 'neonCyan', 'cream']) {
      expect(resolveThemeId(id, true)).toBe(id)
    }
  })

  test('старые выборы переезжают: чёрно-белая (mono) и «графит» → «Классика» (правка Кати 28.11)', () => {
    expect(THEME_ROLL_FORWARD).toEqual({
      lemon: 'neonLime',
      ocean: 'neonBlue',
      plum: 'neonPurple',
      forest: 'neonCyan',
      graphite: 'classic',
      mono: 'classic',
    })
    expect(resolveThemeId('lemon', true)).toBe('neonLime')
    expect(resolveThemeId('ocean', true)).toBe('neonBlue')
    expect(resolveThemeId('plum', true)).toBe('neonPurple')
    expect(resolveThemeId('forest', true)).toBe('neonCyan')
    // Чёрно-белая удалена — её выбор переезжает на «Классику»
    expect(resolveThemeId('mono', true)).toBe('classic')
    expect(resolveThemeId('mono', false)).toBe('classic')
    expect(resolveThemeId('graphite', true)).toBe('classic')
    // без подписки переезд неонов сначала уводит в «Классику» (гейтинг)
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

  test('bmiTones: тона привязаны к теме (правка Кати 27.11: «кольцо по цветам темы»)', () => {
    const classic = THEMES.classic.colors
    const tClassic = bmiTones(classic)
    expect(tClassic.norm).toBe(classic.good)
    expect(tClassic.obese1).toBe(classic.bad)
    expect(tClassic.low).toBe(classic.dim)
    expect(tClassic.over).toBe(classic.sub)
    // В кремовой тема остаётся тёплой: норма — янтарь, не зелёный
    const cream = THEMES.cream.colors
    expect(bmiTones(cream).norm).toBe(cream.good)
    expect(bmiTones(cream).norm).toBe('#A16207')
    // В неонах норма — сам акцент темы (good == accent), ожирение — bad семьи
    const lime = THEMES.neonLime.colors
    expect(bmiTones(lime).norm).toBe(lime.accent)
    expect(bmiTones(lime).obese1).toBe(lime.bad)
    // Чужого янтаря warn в шкале больше нет (был «не в теме»)
    const azure = THEMES.neonBlue.colors
    expect(bmiTones(azure).low).not.toBe(azure.warn)
  })
})

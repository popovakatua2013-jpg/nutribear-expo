// Тесты стрелок-траекторий (buildGuides в demoPatterns.js): дуги строятся
// только для движущихся паттернов, конечны, в границах сцены, цвет —
// 'accent' (кисть) или 'cyan' (стопа); у дыхательного паттерна и при
// guide:false стрелок нет. Модуль чистый — без React Native.

jest.requireActual('./helpers/react-native-stub')

const { DEMO_PATTERNS, buildGuides } = require('@/features/workouts/player/demoPatterns')

const PATTERN_NAMES = Object.keys(DEMO_PATTERNS)

describe('buildGuides — стрелки-траектории', () => {
  test('дыхание и отключение через guide:false — пустой список', () => {
    expect(buildGuides(DEMO_PATTERNS.breath)).toEqual([])
    expect(buildGuides(null)).toEqual([])
    expect(buildGuides({ ...DEMO_PATTERNS.squat, guide: false })).toEqual([])
  })

  test.each(PATTERN_NAMES)('паттерн %s: дуги конечны и в границах сцены', (name) => {
    const arcs = buildGuides(DEMO_PATTERNS[name])
    expect(Array.isArray(arcs)).toBe(true)
    expect(arcs.length).toBeLessThanOrEqual(2)
    for (const g of arcs) {
      for (const v of [g.x1, g.y1, g.x2, g.y2, g.cx, g.cy]) {
        expect(Number.isFinite(v)).toBe(true)
      }
      // Точки дуги не должны улетать далеко за холст 160×120
      for (const [x, y] of [[g.x1, g.y1], [g.x2, g.y2], [g.cx, g.cy]]) {
        expect(x).toBeGreaterThan(-40)
        expect(x).toBeLessThan(200)
        expect(y).toBeGreaterThan(-30)
        expect(y).toBeLessThan(170)
      }
      expect(['accent', 'cyan']).toContain(g.color)
    }
  })

  test('движущиеся паттерны получили стрелки, статичные — нет', () => {
    // Явные движения
    for (const name of ['squat', 'jack', 'squatJump', 'run', 'burpee', 'legraise', 'fold']) {
      expect(buildGuides(DEMO_PATTERNS[name]).length).toBeGreaterThan(0)
    }
    // Статичные удержания и зеркальные паттерны — без стрелок
    for (const name of ['plank', 'tree', 'warrior', 'catcow', 'cobra', 'downdog', 'child', 'skater', 'lunge']) {
      expect(buildGuides(DEMO_PATTERNS[name])).toEqual([])
    }
  })

  test('цвет кодирует конечность: кисть — accent, стопа — cyan', () => {
    // У приседания двигаются и руки, и стопы
    const colors = buildGuides(DEMO_PATTERNS.squat).map((g) => g.color).sort()
    expect(colors).toEqual(['accent', 'cyan'])
    // У отжимания двигается только рука
    expect(buildGuides(DEMO_PATTERNS.pushup).map((g) => g.color)).toEqual(['accent'])
    // У подъёма ног — только стопа
    expect(buildGuides(DEMO_PATTERNS.legraise).map((g) => g.color)).toEqual(['cyan'])
  })

  test('дуги детерминированы (чистая функция)', () => {
    expect(buildGuides(DEMO_PATTERNS.squat)).toEqual(buildGuides(DEMO_PATTERNS.squat))
  })
})

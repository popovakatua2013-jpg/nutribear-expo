// Тесты системного промпта ИИ-чата: buildCompanionSystem(ctx) собирает
// характер выбранного медведя + личный контекст дневника в один промпт,
// который приложение шлёт воркеру в поле system. Воркер подставляет его
// в запрос к ИИ как role: 'system' (перед массивом messages).
//
// Требования:
//  • характер медведя — из COMPANIONS, по умолчанию Кедр
//  • имя пользователя — только первое слово (без фамилии, как в отзыве)
//  • пол — «мужчина» / «женщина»
//  • цифры дня — «1200 из 1800 ккал» (только если они есть)
//  • без NaN, undefined, мусора при пустых полях
//  • лимит 2000 символов (воркер всё равно обрезает, но промпт не должен
//    быть чудовищно большим — иначе баланс ключа утекает)

jest.requireActual('./helpers/react-native-stub')
jest.requireActual('./helpers/async-storage-stub')
jest.mock('../src/assets/companions/kedr.webp', () => 'kedr-img', { virtual: true })
jest.mock('../src/assets/companions/kira.webp', () => 'kira-img', { virtual: true })
jest.mock('../src/assets/companions/topaz.webp', () => 'topaz-img', { virtual: true })
jest.mock('../src/assets/companions/businka.webp', () => 'businka-img', { virtual: true })
jest.mock('../src/assets/companions/fit.webp', () => 'fit-img', { virtual: true })

const { buildCompanionSystem } = require('@/lib/chat')
const { COMPANIONS, useCompanionStore } = require('@/store/useCompanionStore')

// Реалистичный контекст дневника (как app/ai-chat.jsx собирает из сторов)
const CTX = {
  name: 'Екатерина Попова',
  sex: 'female',
  eaten: 1200,
  goal: 1800,
  waterMl: 1500,
  waterGoal: 2000,
  steps: 6000,
  stepsGoal: 10000,
  weightKg: 70,
  heightCm: 165,
  bmi: 25.7,
}

describe('buildCompanionSystem: характер медведя + личный контекст', () => {
  beforeEach(() => {
    useCompanionStore.setState({ companionId: 'kedr' })
  })

  test('у всех пяти медведей есть своё приветствие', () => {
    expect(COMPANIONS).toHaveLength(5)
    for (const c of COMPANIONS) {
      expect(typeof c.greeting).toBe('string')
      expect(c.greeting.length).toBeGreaterThan(10)
      expect(c.greeting).toContain(c.name)
    }
  })

  test('без контекста — только характер (Кедр по умолчанию)', () => {
    const sys = buildCompanionSystem(null)
    expect(sys).toContain('Кедр')
    expect(sys).not.toContain('ккал')
    expect(sys).not.toContain('NaN')
  })

  test('контекст дневника попадает в промпт: имя без фамилии, пол, цифры дня', () => {
    const sys = buildCompanionSystem(CTX)
    expect(sys).toContain('Кедр') // характер не потерялся
    expect(sys).toContain('Екатерина') // первое слово имени
    expect(sys).not.toContain('Попова') // фамилия отрезана
    // цифры дня
    expect(sys).toContain('1200')
    expect(sys).toContain('1800')
    expect(sys).toContain('женщина')
  })

  test('промпт укладывается в лимит воркера — 2000 символов', () => {
    const sys = buildCompanionSystem(CTX)
    expect(sys.length).toBeLessThanOrEqual(2000)
    expect(sys.length).toBeGreaterThan(100)
  })

  test('смена помощника меняет характер промпта: Фит', () => {
    useCompanionStore.getState().select('fit')
    const sys = buildCompanionSystem(null)
    expect(sys).toContain('Фит')
    expect(sys).not.toContain('Кедр')
  })

  test('пустой контекст без имени — без NaN, undefined и мусорных строк', () => {
    const sys = buildCompanionSystem({ sex: 'male' })
    expect(sys).toContain('Кедр')
    expect(sys).toContain('мужчина')
    expect(sys).not.toContain('NaN')
    expect(sys).not.toContain('undefined')
    expect(sys).not.toContain('[object')
  })

  test('нулевой вес/рост без ИМТ — строка веса не попадает в промпт', () => {
    const sys = buildCompanionSystem({ goal: 1800, eaten: 0, weightKg: 0, heightCm: 0 })
    expect(sys).toContain('0 из 1800')
    expect(sys).not.toContain('ИМТ')
    expect(sys).not.toContain('Вес 0')
  })

  // ── Правило по выполненным нормам (правка Кати 28.11: «Норма по жирам
  // выполнена, при этом медведь советует ещё масло») ───────────────────
  test('нутриенты дня попадают в промпт, выполненные нормы — в правило', () => {
    const sys = buildCompanionSystem({
      ...CTX,
      bju: { p: 79, f: 59, c: 129, fib: 5 },
      norms: { p: 113, f: 50, c: 151, fib: 25 },
    })
    // строки нутриентов с нормами
    expect(sys).toContain('Белки: 79 из 113 г.')
    expect(sys).toContain('Жиры: 59 из 50 г.')
    expect(sys).toContain('Углеводы: 129 из 151 г.')
    expect(sys).toContain('Клетчатка: 5 из 25 г.')
    // правило на месте, жиры (59 ≥ 50) в списке выполненных
    expect(sys).toContain('ПРАВИЛО ПО НУТРИЕНТАМ')
    expect(sys).toMatch(/выполнены по: [^.]*жиры/)
    // масла и другой жирной еды в такой день не предлагать
    expect(sys).toContain('никакого масла')
    // белки/углеводы/клетчатка не выполнены — их в списке быть не должно
    expect(sys).not.toMatch(/выполнены по: [^.]*белки/)
    expect(sys).not.toMatch(/выполнены по: [^.]*углеводы/)
    // калории не выполнены (1200 < 1800)
    expect(sys).not.toMatch(/выполнены по: [^.]*калории/)
  })

  test('калории закрыты — попадают в список выполненных', () => {
    const sys = buildCompanionSystem({
      ...CTX,
      eaten: 1850,
      goal: 1800,
      bju: { p: 120, f: 55, c: 160, fib: 26 },
      norms: { p: 113, f: 50, c: 151, fib: 25 },
    })
    // всё закрыто — и приёмы пищи в такой день не предлагаются вовсе
    expect(sys).toMatch(/выполнены по: [^.]*белки[^.]*жиры[^.]*углеводы[^.]*клетчатка[^.]*калории/)
    expect(sys).toContain('дневные нормы закрыты')
  })

  test('нормы не закрыты — список выполненных пуст, правило всё равно на месте', () => {
    const sys = buildCompanionSystem({
      ...CTX,
      bju: { p: 10, f: 5, c: 20, fib: 1 },
      norms: { p: 113, f: 50, c: 151, fib: 25 },
    })
    expect(sys).toContain('ПРАВИЛО ПО НУТРИЕНТАМ')
    expect(sys).not.toContain('выполнены по:')
    // строки нутриентов с нормами всё равно переданы — ИИ видит остатки
    expect(sys).toContain('Белки: 10 из 113 г.')
    expect(sys).toContain('Жиры: 5 из 50 г.')
  })

  test('без bju/norms в контексте — ни строк нутриентов, ни правила (без мусора)', () => {
    const sys = buildCompanionSystem(CTX)
    expect(sys).not.toContain('ПРАВИЛО ПО НУТРИЕНТАМ')
    expect(sys).not.toContain('Белки:')
    expect(sys).not.toContain('NaN')
    expect(sys).not.toContain('undefined')
  })

  test('лимит 2000 символов соблюдается и с макросами + правилом', () => {
    const sys = buildCompanionSystem({
      ...CTX,
      bju: { p: 79, f: 59, c: 129, fib: 5 },
      norms: { p: 113, f: 50, c: 151, fib: 25 },
    })
    expect(sys.length).toBeLessThanOrEqual(2000)
  })
})

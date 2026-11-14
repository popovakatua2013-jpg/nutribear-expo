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
})

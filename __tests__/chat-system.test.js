// Системный промпт ИИ-чата: характер выбранного медведя + личный
// контекст дневника (имя, пол, цифры дня). Воркер режет system до
// 2000 символов — промпт обязан укладываться в лимит целиком.

import { buildCompanionSystem } from '@/lib/chat'
import { useCompanionStore, COMPANIONS } from '@/store/useCompanionStore'

const CTX = {
  name: 'Екатерина Попова',
  sex: 'female',
  eaten: 1250,
  goal: 1900,
  waterMl: 750,
  waterGoal: 2000,
  steps: 4200,
  stepsGoal: 8000,
  weightKg: 68,
  heightCm: 165,
  bmi: 25,
}

describe('buildCompanionSystem: характер медведя + личный контекст', () => {
  afterEach(() => {
    useCompanionStore.getState().select('kedr')
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
    expect(sys).not.toContain('undefined')
  })

  test('контекст дневника попадает в промпт: имя без фамилии, пол, цифры дня', () => {
    const sys = buildCompanionSystem(CTX)
    expect(sys).toContain('Кедр') // характер не потерялся
    expect(sys).toContain('Екатерина') // первое слово имени
    expect(sys).not.toContain('Попова') // фамилия отрезана
    expect(sys).toContain('девушка')
    expect(sys).toContain('1250 из 1900')
    expect(sys).toContain('осталось 650')
    expect(sys).toContain('750 из 2000')
    expect(sys).toContain('4200 из 8000')
    expect(sys).toContain('ИМТ 25')
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
  })

  test('нулевой вес/рост без ИМТ — строка веса не попадает в промпт', () => {
    const sys = buildCompanionSystem({ goal: 1800, eaten: 0, weightKg: 0, heightCm: 0 })
    expect(sys).toContain('0 из 1800')
    expect(sys).not.toContain('ИМТ')
    expect(sys).not.toContain('Вес 0')
  })
})

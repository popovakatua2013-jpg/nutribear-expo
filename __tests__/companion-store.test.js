// Тесты стора помощника NutriBear. Помощник определяет тон пинков
// (bear/spicy), системный промпт ИИ-чата и аватар в UI. 5 медведей:
// Кедр и Кира (free), Топаз и Бусинка (premium), Фит (pro, доступен
// с триала). Выбор сохраняется в AsyncStorage между сессиями.

jest.requireActual('./helpers/react-native-stub')
jest.requireActual('./helpers/async-storage-stub')
// Картинки webp в Node-тестах возвращают строку-стаб (как asset-stub)
// Путь должен совпадать с require в src/store/useCompanionStore.js
jest.mock('../src/assets/companions/kedr.webp', () => 'kedr-img', { virtual: true })
jest.mock('../src/assets/companions/kira.webp', () => 'kira-img', { virtual: true })
jest.mock('../src/assets/companions/topaz.webp', () => 'topaz-img', { virtual: true })
jest.mock('../src/assets/companions/businka.webp', () => 'businka-img', { virtual: true })
jest.mock('../src/assets/companions/fit.webp', () => 'fit-img', { virtual: true })

describe('useCompanionStore: выбор помощника', () => {
  let useCompanionStore, COMPANIONS, isCompanionAvailable, companionSystemPrompt

  beforeAll(() => {
    ;({ useCompanionStore, COMPANIONS, isCompanionAvailable, companionSystemPrompt } =
      require('@/store/useCompanionStore'))
  })

  beforeEach(() => {
    useCompanionStore.setState({ companionId: 'kedr' })
  })

  describe('каталог COMPANIONS', () => {
    test('5 помощников в каталоге', () => {
      expect(COMPANIONS).toHaveLength(5)
    })

    test('правильные id и имена', () => {
      const ids = COMPANIONS.map((c) => c.id)
      expect(ids).toEqual(['kedr', 'kira', 'topaz', 'businka', 'fit'])
      const names = COMPANIONS.map((c) => c.name)
      expect(names).toEqual(['Кедр', 'Кира', 'Топаз', 'Бусинка', 'Фит'])
    })

    test('правильные tier: 2 free, 2 premium, 1 pro', () => {
      const tiers = COMPANIONS.map((c) => c.tier)
      expect(tiers.filter((t) => t === 'free')).toHaveLength(2)
      expect(tiers.filter((t) => t === 'premium')).toHaveLength(2)
      expect(tiers.filter((t) => t === 'pro')).toHaveLength(1)
    })

    test('у каждого есть аватар и цвет', () => {
      for (const c of COMPANIONS) {
        expect(c.image).toBeDefined()
        expect(c.color).toMatch(/^#[0-9A-F]{6}$/i)
      }
    })

    test('пол: Кедр/Топаз/Фит — мужской, Кира/Бусинка — женский', () => {
      const byId = Object.fromEntries(COMPANIONS.map((c) => [c.id, c]))
      expect(byId.kedr.gender).toBe('m')
      expect(byId.kira.gender).toBe('f')
      expect(byId.topaz.gender).toBe('m')
      expect(byId.businka.gender).toBe('f')
      expect(byId.fit.gender).toBe('m')
    })

    test('только Фит имеет tier=pro', () => {
      const fit = COMPANIONS.find((c) => c.id === 'fit')
      expect(fit.tier).toBe('pro')
    })
  })

  describe('isCompanionAvailable', () => {
    test('free помощники доступны всегда (без Pro, без триала)', () => {
      expect(isCompanionAvailable(COMPANIONS[0], false, false)).toBe(true) // Кедр
      expect(isCompanionAvailable(COMPANIONS[1], false, false)).toBe(true) // Кира
    })

    test('premium помощники недоступны без Pro/триала', () => {
      expect(isCompanionAvailable(COMPANIONS[2], false, false)).toBe(false) // Топаз
      expect(isCompanionAvailable(COMPANIONS[3], false, false)).toBe(false) // Бусинка
    })

    test('premium помощники доступны с Pro (без триала)', () => {
      expect(isCompanionAvailable(COMPANIONS[2], true, false)).toBe(true) // Топаз
      expect(isCompanionAvailable(COMPANIONS[3], true, false)).toBe(true) // Бусинка
    })

    test('pro помощник (Фит) доступен только с Pro или в триале', () => {
      expect(isCompanionAvailable(COMPANIONS[4], false, false)).toBe(false) // Фит без всего
      expect(isCompanionAvailable(COMPANIONS[4], true, false)).toBe(true) // Фит с Pro
      expect(isCompanionAvailable(COMPANIONS[4], false, true)).toBe(true) // Фит в триале
    })

    test('null/мусорный companion → false', () => {
      expect(isCompanionAvailable(null, true, true)).toBe(false)
      expect(isCompanionAvailable(undefined, true, true)).toBe(false)
    })
  })

  describe('useCompanionStore: выбор и чтение', () => {
    test('дефолт — Кедр', () => {
      useCompanionStore.setState({ companionId: 'kedr' })
      expect(useCompanionStore.getState().companionId).toBe('kedr')
      expect(useCompanionStore.getState().getCurrent().id).toBe('kedr')
    })

    test('select сохраняет выбор', () => {
      useCompanionStore.getState().select('kira')
      expect(useCompanionStore.getState().companionId).toBe('kira')
      expect(useCompanionStore.getState().getCurrent().name).toBe('Кира')
    })

    test('select с неизвестным id — игнор (остаётся прежний)', () => {
      useCompanionStore.setState({ companionId: 'kedr' })
      useCompanionStore.getState().select('unknown')
      expect(useCompanionStore.getState().companionId).toBe('kedr')
    })

    test('select с null/undefined — игнор', () => {
      useCompanionStore.getState().select(null)
      useCompanionStore.getState().select(undefined)
      expect(useCompanionStore.getState().companionId).toBe('kedr')
    })

    test('currentStyle: Pro (Фит) → spicy, остальные → bear', () => {
      useCompanionStore.setState({ companionId: 'fit' })
      expect(useCompanionStore.getState().getCurrentStyle()).toBe('spicy')

      useCompanionStore.setState({ companionId: 'kedr' })
      expect(useCompanionStore.getState().getCurrentStyle()).toBe('bear')

      useCompanionStore.setState({ companionId: 'topaz' })
      expect(useCompanionStore.getState().getCurrentStyle()).toBe('bear')

      useCompanionStore.setState({ companionId: 'kira' })
      expect(useCompanionStore.getState().getCurrentStyle()).toBe('bear')
    })

    test('current возвращает объект с правильными полями', () => {
      useCompanionStore.setState({ companionId: 'fit' })
      const c = useCompanionStore.getState().getCurrent()
      expect(c).toMatchObject({
        id: 'fit',
        name: 'Фит',
        tier: 'pro',
        gender: 'm',
      })
      expect(typeof c.description).toBe('string')
      expect(c.description.length).toBeGreaterThan(0)
    })
  })

  describe('companionSystemPrompt: системный промпт ИИ', () => {
    test('Кедр — тёплый тон', () => {
      const p = companionSystemPrompt('kedr')
      expect(p).toContain('Кедр')
      expect(p).toMatch(/дружелюбн|тёпл|поддерживающ/i)
    })

    test('Кира — заботливый тон', () => {
      const p = companionSystemPrompt('kira')
      expect(p).toContain('Кира')
      expect(p).toMatch(/забот|мягк/i)
    })

    test('Топаз — расширенные советы', () => {
      const p = companionSystemPrompt('topaz')
      expect(p).toContain('Топаз')
      expect(p).toMatch(/Premium|расширен|больше/i)
    })

    test('Бусинка — расширенные советы, женский', () => {
      const p = companionSystemPrompt('businka')
      expect(p).toContain('Бусинка')
      expect(p).toMatch(/Premium|расширен/i)
    })

    test('Фит — дерзкий тон', () => {
      const p = companionSystemPrompt('fit')
      expect(p).toContain('Фит')
      expect(p).toMatch(/дерзк|прям|без жеман/i)
    })

    test('неизвестный id → null (нет такого помощника)', () => {
      expect(companionSystemPrompt('unknown')).toBeNull()
      expect(companionSystemPrompt(null)).toBeNull()
      expect(companionSystemPrompt(undefined)).toBeNull()
    })

    test('все промпты содержат инструкцию «по-русски, кратко»', () => {
      for (const c of COMPANIONS) {
        const p = companionSystemPrompt(c.id)
        expect(p).toMatch(/по-русски/i)
        expect(p).toMatch(/кратко/i)
      }
    })

    test('все промпты содержат медицинский дисклеймер', () => {
      for (const c of COMPANIONS) {
        const p = companionSystemPrompt(c.id)
        // Фит — «не назначай лечение», другие — то же самое или похожее
        expect(p).toMatch(/не назначай лечение|медицинск|врач/i)
      }
    })

    test('длина промптов < 1000 символов (экономия токенов ИИ)', () => {
      for (const c of COMPANIONS) {
        const p = companionSystemPrompt(c.id)
        expect(p.length).toBeLessThan(1000)
      }
    })
  })
})

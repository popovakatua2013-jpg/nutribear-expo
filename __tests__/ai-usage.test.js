// Тесты лимитов бесплатного тарифа (этап 1 монетизации, матрица 14.11):
// счётчики ИИ-запросов (чат 15/день, фото 3/день, голос 10/день) с
// честным списанием — только успешные запросы, сброс с локальным днём.
// Premium снимает лимиты; неизвестные виды запросов не лимитируются;
// офлайн-помощник и бесплатный ввод в дневник лимитами не затронуты.

jest.requireActual('./helpers/react-native-stub')
jest.requireActual('./helpers/async-storage-stub')

describe('useAiUsageStore: лимиты бесплатного тарифа', () => {
  let useAiUsageStore, aiRemaining, todayKey, FREE_LIMITS, PREMIUM_PERKS

  beforeAll(() => {
    ;({ useAiUsageStore, aiRemaining, todayKey } = require('@/store/useAiUsageStore'))
    ;({ FREE_LIMITS, PREMIUM_PERKS } = require('@/lib/entitlements'))
  })

  beforeEach(() => {
    useAiUsageStore.setState({ day: todayKey(), chat: 0, photo: 0, voice: 0 })
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('entitlements: константы', () => {
    test('лимиты положительны', () => {
      expect(FREE_LIMITS.chat).toBeGreaterThan(0)
      expect(FREE_LIMITS.photo).toBeGreaterThan(0)
      expect(FREE_LIMITS.voice).toBeGreaterThan(0)
    })

    test('подписи выгод согласованы с лимитами (15 / 3 / 10)', () => {
      const joined = PREMIUM_PERKS.map((p) => p.sub).join(' ')
      expect(joined).toContain('15 сообщений')
      expect(joined).toContain('3 распознавания')
      expect(joined).toContain('10 записей')
    })

    test('каждая выгода имеет иконку, заголовок и пояснение', () => {
      for (const p of PREMIUM_PERKS) {
        expect(p.icon).toBeTruthy()
        expect(p.text).toBeTruthy()
        expect(p.sub).toBeTruthy()
      }
    })
  })

  describe('todayKey', () => {
    test('формат «дд.мм.гггг» — как у дневника', () => {
      jest.useFakeTimers().setSystemTime(new Date(2026, 10, 14, 12, 0, 0))
      expect(todayKey()).toBe('14.11.2026')
    })

    test('однозначные части дополняются нулём', () => {
      jest.useFakeTimers().setSystemTime(new Date(2026, 2, 5, 12, 0, 0))
      expect(todayKey()).toBe('05.03.2026')
    })
  })

  describe('aiRemaining: чистый расчёт остатка', () => {
    test('premium — безлимит даже при израсходованных счётчиках', () => {
      const s = { day: todayKey(), chat: 999, photo: 999, voice: 999 }
      expect(aiRemaining(s, 'chat', true)).toBe(Infinity)
      expect(aiRemaining(s, 'photo', true)).toBe(Infinity)
      expect(aiRemaining(s, 'voice', true)).toBe(Infinity)
    })

    test('free — полный остаток при пустых счётчиках', () => {
      const s = { day: todayKey(), chat: 0, photo: 0, voice: 0 }
      expect(aiRemaining(s, 'chat', false)).toBe(15)
      expect(aiRemaining(s, 'photo', false)).toBe(3)
      expect(aiRemaining(s, 'voice', false)).toBe(10)
    })

    test('free — остаток уменьшается ровно на использованное', () => {
      const s = { day: todayKey(), chat: 4, photo: 1, voice: 2 }
      expect(aiRemaining(s, 'chat', false)).toBe(11)
      expect(aiRemaining(s, 'photo', false)).toBe(2)
      expect(aiRemaining(s, 'voice', false)).toBe(8)
    })

    test('счётчики чужого дня не считаются — остаток полный', () => {
      const s = { day: '01.01.2020', chat: 999, photo: 999, voice: 999 }
      expect(aiRemaining(s, 'chat', false)).toBe(15)
      expect(aiRemaining(s, 'photo', false)).toBe(3)
      expect(aiRemaining(s, 'voice', false)).toBe(10)
    })

    test('неизвестный вид запроса не лимитируется', () => {
      const s = { day: todayKey(), chat: 0 }
      expect(aiRemaining(s, 'magic', false)).toBe(Infinity)
    })
  })

  describe('canUse / record: сгорание лимита', () => {
    test('record списывает по одному запросу за вызов', () => {
      useAiUsageStore.getState().record('chat')
      useAiUsageStore.getState().record('chat')
      useAiUsageStore.getState().record('photo')
      const s = useAiUsageStore.getState()
      expect(s.chat).toBe(2)
      expect(s.photo).toBe(1)
      expect(s.voice).toBe(0)
    })

    test('canUse: false при исчерпании у free, true у premium', () => {
      useAiUsageStore.setState({ photo: 3 })
      expect(useAiUsageStore.getState().canUse('photo', false)).toBe(false)
      expect(useAiUsageStore.getState().canUse('photo', true)).toBe(true)
    })

    test('record при смене дня сбрасывает прошлые счётчики', () => {
      jest.useFakeTimers().setSystemTime(new Date(2026, 10, 13, 12, 0, 0))
      useAiUsageStore.getState().record('chat')
      useAiUsageStore.getState().record('photo')
      // наступил следующий день
      jest.useFakeTimers().setSystemTime(new Date(2026, 10, 14, 12, 0, 0))
      useAiUsageStore.getState().record('voice')
      const s = useAiUsageStore.getState()
      expect(s.day).toBe('14.11.2026')
      expect(s.chat).toBe(0)
      expect(s.photo).toBe(0)
      expect(s.voice).toBe(1)
    })

    test('rollIfNeeded обнуляет счётчики вчерашнего дня', () => {
      useAiUsageStore.setState({ day: '01.01.2020', chat: 15, photo: 3, voice: 10 })
      useAiUsageStore.getState().rollIfNeeded()
      const s = useAiUsageStore.getState()
      expect(s.chat).toBe(0)
      expect(s.photo).toBe(0)
      expect(s.voice).toBe(0)
      expect(s.day).toBe(todayKey())
    })

    test('после исчерпания чата остаток восстанавливается на другой день', () => {
      useAiUsageStore.setState({ chat: 15 })
      expect(useAiUsageStore.getState().canUse('chat', false)).toBe(false)
      // «вчерашний» счётчик: чистый расчёт видит другой день — лимит полный
      expect(aiRemaining({ day: '01.01.2020', chat: 15 }, 'chat', false)).toBe(15)
    })
  })
})

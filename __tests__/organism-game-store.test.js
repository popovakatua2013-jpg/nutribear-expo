// Тесты стора игровых систем организма (useOrganismGameStore):
// гены за расцвет, стрик → капсула, гигиена хранилища (prune),
// эволюция, дубликаты капсул и экспедиции.

// RN-стабы должны встать до импортов стора
jest.requireActual('./helpers/react-native-stub')
jest.requireActual('./helpers/async-storage-stub')

const HOUR = 3600000
const DAY = 24 * HOUR
const { mondayKeyOf } = require('@/lib/data/organism-game')

// Ключ дня со сдвигом от сегодняшнего: keyAt(0) = сегодня, keyAt(-1) = вчера
function keyAt(offsetDays) {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

describe('useOrganismGameStore', () => {
  let useOrganismGameStore

  beforeAll(() => {
    ;({ useOrganismGameStore } = require('@/store/useOrganismGameStore'))
  })

  beforeEach(() => {
    useOrganismGameStore.getState().resetAll()
  })

  test('resetAll возвращает стартовые значения', () => {
    const s = useOrganismGameStore.getState()
    expect(s.genes).toBe(12)
    expect(s.capsules).toBe(1)
    expect(s.evoStage).toBe(0)
    expect(s.expedition).toBeNull()
  })

  test('расцвет: +3 гена, один раз за день', () => {
    const store = useOrganismGameStore
    const dayKey = keyAt(0)
    store.getState().syncDay({ dayKey, combo: 50, state: 'bloom' })
    expect(store.getState().genes).toBe(15) // 12 + 3
    expect(store.getState().goodDays[dayKey]).toBe(true)

    // второй вызов в тот же день — генов больше не даёт
    store.getState().syncDay({ dayKey, combo: 90, state: 'bloom' })
    expect(store.getState().genes).toBe(15)
  })

  test('комбо дня хранит лучшее значение за день', () => {
    const store = useOrganismGameStore
    const dayKey = keyAt(0)
    store.getState().syncDay({ dayKey, combo: 40, state: 'normal' })
    store.getState().syncDay({ dayKey, combo: 88, state: 'normal' })
    store.getState().syncDay({ dayKey, combo: 72, state: 'normal' })
    expect(store.getState().comboDays[dayKey]).toBe(88)
  })

  test('стрик 7 дней подряд → генная капсула, счётчик обнуляется', () => {
    const store = useOrganismGameStore
    for (let i = -6; i <= 0; i++) {
      store.getState().syncDay({ dayKey: keyAt(i), combo: 100, state: 'normal' })
    }
    const s = store.getState()
    expect(s.capsules).toBe(2) // стартовая + наградная
    expect(s.streak).toBe(0)
    // в те же 7 дней попутно открывается мутация — её запись сверху,
    // но запись о капсуле обязана быть в журнале
    expect(s.log.some((e) => e.text.includes('Серия 7 дней'))).toBe(true)
  })

  test('пропущенный день рвёт стрик', () => {
    const store = useOrganismGameStore
    store.getState().syncDay({ dayKey: keyAt(-3), combo: 100, state: 'normal' })
    store.getState().syncDay({ dayKey: keyAt(-2), combo: 100, state: 'normal' })
    // день -1 пропущен
    store.getState().syncDay({ dayKey: keyAt(0), combo: 100, state: 'normal' })
    expect(store.getState().streak).toBe(1)
  })

  test('гигиена: старые недели рейда, дни и хвост лога подрезаются', () => {
    const store = useOrganismGameStore
    const oldDay = keyAt(-20)
    useOrganismGameStore.setState({
      raidDays: {
        [oldDay]: { weekKey: '2001-01-01', dmg: 99, shield: 0, crit: 0 },
        [keyAt(0)]: { weekKey: mondayKeyOf(), dmg: 30, shield: 4, crit: 1 },
      },
      comboDays: { [oldDay]: 100, [keyAt(0)]: 50 },
      goodDays: { [oldDay]: true },
      log: Array.from({ length: 35 }, (_, i) => ({ id: `x${i}`, ts: 0, text: `e${i}` })),
    })
    store.getState().syncDay({ dayKey: keyAt(0), combo: 0, state: 'normal' })
    const s = store.getState()
    expect(Object.keys(s.raidDays)).toEqual([keyAt(0)])
    expect(Object.keys(s.comboDays)).toEqual([keyAt(0)])
    expect(Object.keys(s.goodDays)).toEqual([])
    expect(s.log.length).toBe(30)
    expect(s.log[0].text).toBe('e0') // новые сверху — первые 30 и остались
    expect(s.log[29].text).toBe('e29')
  })

  test('эволюция: без генов отказ, с генами — стадия и списание', () => {
    const store = useOrganismGameStore
    expect(store.getState().evolve({ cost: 25, fromName: 'Протоплазма', toName: 'Силач I' })).toBe(false)
    useOrganismGameStore.setState({ genes: 30 })
    expect(store.getState().evolve({ cost: 25, fromName: 'Протоплазма', toName: 'Силач I' })).toBe(true)
    const s = store.getState()
    expect(s.genes).toBe(5)
    expect(s.evoStage).toBe(1)
    expect(s.evoBranch).toBe('Силач')
  })

  test('эволюция заблокирована на Титане', () => {
    useOrganismGameStore.setState({ evoStage: 4, genes: 999 })
    expect(useOrganismGameStore.getState().evolve({ cost: 25, fromName: 'Титан', toName: 'Титан' })).toBe(false)
  })

  test('капсула: дубликат коллекции превращается в мутаген (rand 0.95 → аура №3)', () => {
    const store = useOrganismGameStore
    const spy = jest.spyOn(Math, 'random').mockReturnValue(0.95)
    useOrganismGameStore.setState({ items: ['Аура: Уголь и мята'], mutagen: 0 })
    const res = store.getState().openCapsule()
    spy.mockRestore()
    expect(res.dup).toBe(true)
    const s = store.getState()
    expect(s.capsules).toBe(0) // стартовая вскрыта
    expect(s.mutagen).toBe(3)
    expect(s.items).toEqual(['Аура: Уголь и мята']) // дубликат не дублируется
  })

  test('экспедиция: в поход, рано забрать нельзя, по таймеру — добыча', () => {
    const store = useOrganismGameStore
    expect(store.getState().startExpedition('nope')).toBe(false)
    expect(store.getState().startExpedition('walk')).toBe(true)
    // повторный старт занят
    expect(store.getState().startExpedition('hike')).toBe(false)
    // время ещё не вышло
    expect(store.getState().collectExpedition()).toBeNull()
    expect(store.getState().expedition).not.toBeNull()

    // перематываем время на 5 часов назад (walk = 4 ч)
    const startedAt = Date.now() - 5 * HOUR
    useOrganismGameStore.setState({ expedition: { key: 'walk', startedAt } })
    const loot = store.getState().collectExpedition()
    expect(loot).toEqual({ name: 'Прогулка к холмам', genes: 2, crystals: 3, tale: expect.any(String) })
    const s = store.getState()
    expect(s.expedition).toBeNull()
    expect(s.genes).toBe(14) // 12 + 2
    expect(s.crystals).toBe(3)
  })

  test('syncRaid не создаёт дублей и обновляет вклад дня', () => {
    const store = useOrganismGameStore
    const dayKey = keyAt(0)
    store.getState().syncRaid({ dayKey, dmg: 30, shield: 4, crit: 1 })
    store.getState().syncRaid({ dayKey, dmg: 30, shield: 4, crit: 1 }) // без изменений — тихо
    const s = store.getState()
    expect(Object.keys(s.raidDays).length).toBe(1)
    expect(s.raidDays[dayKey]).toEqual({ weekKey: s.raidWeekStart, dmg: 30, shield: 4, crit: 1 })
  })

  test('неделя рейда сменяется — флаги победы сбрасываются', () => {
    useOrganismGameStore.setState({ raidWeekStart: '2001-01-01', raidKilled: true, raidRewarded: true })
    useOrganismGameStore.getState().syncDay({ dayKey: keyAt(0), combo: 0, state: 'normal' })
    const s = useOrganismGameStore.getState()
    expect(s.raidKilled).toBe(false)
    expect(s.raidRewarded).toBe(false)
    expect(s.raidWeekStart).not.toBe('2001-01-01')
  })

  test('settleRaid платит награду только один раз', () => {
    const store = useOrganismGameStore
    expect(store.getState().settleRaid({ bossName: 'Диван-Пожиратель' })).toBe(true)
    expect(store.getState().settleRaid({ bossName: 'Диван-Пожиратель' })).toBe(false)
    const s = store.getState()
    expect(s.genes).toBe(27) // 12 + 15
    expect(s.crystals).toBe(5)
    expect(s.log[0].text).toContain('Диван-Пожиратель')
  })
})

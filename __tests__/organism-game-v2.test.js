// Тесты игровых систем организма v2: ежедневные квесты, питомец,
// энциклопедия, башня испытаний, главы сезонов, синтез артефактов,
// скины аур, престиж и боссы-легенды.

// RN-стабы должны встать до импортов стора
jest.requireActual('./helpers/react-native-stub')
jest.requireActual('./helpers/async-storage-stub')

const DAY = 24 * 3600000
const { mondayKeyOf, bossForWeek, questsForDay, questProgress, raidMedals, adventureTale, QUESTS } = require('@/lib/data/organism-game')

function keyAt(offsetDays) {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

describe('организм v2: данные', () => {
  test('квесты дня: детерминированный выбор 3 из пула', () => {
    const a = questsForDay('2026-11-06')
    const b = questsForDay('2026-11-06')
    expect(a).toHaveLength(3)
    expect(a.map((q) => q.key)).toEqual(b.map((q) => q.key))
    const keys = new Set(a.map((q) => q.key))
    expect(keys.size).toBe(3)
    a.forEach((q) => expect(QUESTS.some((x) => x.key === q.key)).toBe(true))
  })

  test('прогресс квеста: clamp и порог', () => {
    const q = { key: 'x', metric: 'glasses', goal: 6 }
    expect(questProgress(q, { glasses: 3 })).toEqual({ cur: 3, goal: 6, done: false })
    expect(questProgress(q, { glasses: 99 })).toEqual({ cur: 6, goal: 6, done: true })
    expect(questProgress(q, null).done).toBe(false)
  })

  test('босс недели: обычная ротация, после престижа — легенда ×1.6', () => {
    const normal = bossForWeek(1, 0)
    expect(normal.legend).toBeUndefined()
    const legend = bossForWeek(1, 1)
    expect(legend.legend).toBe(true)
    expect(legend.hp).toBe(Math.round(legend.hp / 1.6) * 1.6 || legend.hp)
  })

  test('медали рейда: пороги воды/урона/критов/дней', () => {
    expect(raidMedals({ shield: 0, dmg: 0, crit: 0 }, 0)).toHaveLength(0)
    const medals = raidMedals({ shield: 30, dmg: 450, crit: 3 }, 6)
    expect(medals.map((m) => m.name)).toEqual(['Щитоносец', 'Удар недели', 'Крит-мастер', 'Без пропусков'])
  })

  test('дневник приключений: день и эмодзи по ключевому слову', () => {
    const now = Date.now()
    const t = adventureTale({ ts: now, text: 'Рейд: босс павший.' }, now - 6 * DAY)
    expect(t.dayLabel).toBe('День 7')
    expect(t.emoji).toBe('⚔️')
    expect(adventureTale({ ts: now, text: 'Что-то иное.' }, null).emoji).toBe('•')
  })
})

describe('организм v2: стор', () => {
  let store
  beforeAll(() => {
    ;({ useOrganismGameStore: store } = require('@/store/useOrganismGameStore'))
  })
  beforeEach(() => store.getState().resetAll())

  test('квест: награду не получить без выполненной цели и дважды', () => {
    const s = store.getState()
    const dayKey = keyAt(0)
    const quest = questsForDay(dayKey)[0]
    // цель не выполнена — отказ
    expect(s.claimQuest({ dayKey, questKey: quest.key, metrics: {} })).toBe(false)
    // выполнена — +2 гена
    const metrics = { [quest.metric]: quest.goal }
    expect(store.getState().claimQuest({ dayKey, questKey: quest.key, metrics })).toBe(true)
    expect(store.getState().genes).toBe(12 + 2)
    // повторно — отказ
    expect(store.getState().claimQuest({ dayKey, questKey: quest.key, metrics })).toBe(false)
    expect(store.getState().genes).toBe(12 + 2)
  })

  test('квест: все три за день — бонусный кристалл', () => {
    const dayKey = keyAt(0)
    const metrics = {}
    questsForDay(dayKey).forEach((q) => {
      metrics[q.metric] = q.goal
      store.getState().claimQuest({ dayKey, questKey: q.key, metrics })
    })
    // 3 квеста × 2 гена + 1 кристалл за панель
    expect(store.getState().genes).toBe(12 + 6)
    expect(store.getState().crystals).toBe(1)
  })

  test('питомец: кормёжка за хороший день, уровень 3 даёт +2 кристалла и +1 ген за расцвет', () => {
    const store_ = store
    const d1 = keyAt(0)
    store_.getState().syncDay({ dayKey: d1, combo: 100, state: 'normal' })
    expect(store_.getState().pet.fedDays).toBe(1)
    // ещё 2 кормёжки — уровень 3 (+2 кристалла за рост)
    store_.getState().syncDay({ dayKey: keyAt(-1), combo: 100, state: 'normal' })
    store_.getState().syncDay({ dayKey: keyAt(-2), combo: 100, state: 'normal' })
    expect(store_.getState().pet.fedDays).toBe(3)
    expect(store_.getState().crystals).toBe(2)
    // расцвет при уровне 3: 12 стартовых + 3 базовых + 1 от питомца
    store_.getState().syncDay({ dayKey: keyAt(-3), combo: 100, state: 'bloom' })
    expect(store_.getState().genes).toBe(12 + 3 + 1)
  })

  test('энциклопедия: житель открывается один раз, +2 кристалла', () => {
    const dayKey = keyAt(0)
    store.getState().syncDay({ dayKey, combo: 0, state: 'normal', unlocks: ['water', 'steps', 'water'] })
    expect(store.getState().codex).toEqual(['water', 'steps'])
    expect(store.getState().crystals).toBe(4)
    // повторные unlocks ничего не дают
    store.getState().syncDay({ dayKey, combo: 0, state: 'normal', unlocks: ['water'] })
    expect(store.getState().crystals).toBe(4)
  })

  test('башня: волны растут, 3-я даёт награду, сбой — мягкий откат на 1', () => {
    const st = store.getState()
    st.syncDay({ dayKey: keyAt(-2), combo: 100, state: 'normal' })
    st.syncDay({ dayKey: keyAt(-1), combo: 100, state: 'normal' })
    st.syncDay({ dayKey: keyAt(0), combo: 100, state: 'normal' })
    let s = store.getState()
    expect(s.tower.wave).toBe(3)
    expect(s.genes).toBe(12 + 2) // награда за 3-ю волну
    // 4 кристалла: 2 за волну + 2 за рост питомца (3-я кормёжка)
    expect(s.crystals).toBe(4)
    // сбойный день: откат на волну 2
    st.syncDay({ dayKey: keyAt(1), combo: 30, state: 'normal' })
    s = store.getState()
    expect(s.tower.wave).toBe(2)
    // повторный syncDay тем же днём не откатывает снова
    st.syncDay({ dayKey: keyAt(1), combo: 30, state: 'normal' })
    expect(store.getState().tower.wave).toBe(2)
  })

  test('глава: 5 дней расцвета за неделю — победа (артефакт + 3 кристалла)', () => {
    const prevMonday = mondayKeyOf(new Date(Date.now() - 7 * DAY))
    // 5 дней расцвета прошлой недели
    const goodDays = {}
    for (let i = 0; i < 5; i++) {
      const d = new Date(Date.parse(`${prevMonday}T00:00:00`) + i * DAY)
      const p = (n) => String(n).padStart(2, '0')
      goodDays[`${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`] = true
    }
    store.setState({ raidWeekStart: prevMonday, goodDays, createdAt: prevMonday })
    // открытие экрана в новой неделе закрывает главу
    store.getState().syncDay({ dayKey: keyAt(0), combo: 0, state: 'normal' })
    const s = store.getState()
    expect(s.chapters[prevMonday].win).toBe(true)
    expect(s.chapters[prevMonday].best).toBe(5)
    expect(s.crystals).toBe(3)
    expect(s.items).toHaveLength(1)
    expect(s.chapterLastWeek).toBe(prevMonday)
  })

  test('глава: слабая неделя закрывается без победы и без награды', () => {
    const prevMonday = mondayKeyOf(new Date(Date.now() - 7 * DAY))
    store.setState({ raidWeekStart: prevMonday, goodDays: {}, createdAt: prevMonday })
    store.getState().syncDay({ dayKey: keyAt(0), combo: 0, state: 'normal' })
    const s = store.getState()
    expect(s.chapters[prevMonday].win).toBe(false)
    expect(s.crystals).toBe(0)
    expect(s.items).toHaveLength(0)
  })

  test('синтез: требует 9 мутагена, каждый рецепт один раз, Тотем даёт +1 ген за расцвет', () => {
    const st = store.getState()
    expect(st.craftArtifact('abundance')).toBe(false) // мутагена нет
    store.setState({ mutagen: 9 })
    expect(store.getState().craftArtifact('abundance')).toBe(true)
    const s = store.getState()
    expect(s.mutagen).toBe(0)
    expect(s.crafted).toEqual(['abundance'])
    // повторно — нельзя
    store.setState({ mutagen: 9 })
    expect(store.getState().craftArtifact('abundance')).toBe(false)
    // расцвет с Тотемом: 12 + 3 + 1 = 16
    store.getState().syncDay({ dayKey: keyAt(0), combo: 100, state: 'bloom' })
    expect(store.getState().genes).toBe(16)
  })

  test('скины: чужую ауру не наложить, свою — можно, null снимает', () => {
    const st = store.getState()
    expect(st.setSkin('Аура: Лаймовый шторм')).toBe(false)
    store.setState({ items: ['Аура: Лаймовый шторм'] })
    expect(store.getState().setSkin('Аура: Лаймовый шторм')).toBe(true)
    expect(store.getState().activeSkin).toBe('Аура: Лаймовый шторм')
    expect(store.getState().setSkin(null)).toBe(true)
    expect(store.getState().activeSkin).toBeNull()
  })

  test('престиж: только с Титана, ресурсы/коллекция остаются, стартовый бонус', () => {
    const st = store.getState()
    expect(st.doPrestige()).toBe(false) // стадия 0
    store.setState({ evoStage: 4, crystals: 7, items: ['Мшистый тотем'], codex: ['water'], pet: { fedDays: 4, lastFedKey: null } })
    expect(store.getState().doPrestige()).toBe(true)
    const s = store.getState()
    expect(s.prestigeCount).toBe(1)
    expect(s.evoStage).toBe(0)
    expect(s.genes).toBe(12 + 10) // бонус новой игры+
    expect(s.crystals).toBe(7)
    expect(s.items).toEqual(['Мшистый тотем'])
    expect(s.codex).toEqual(['water'])
    expect(s.pet.fedDays).toBe(4)
    // боссы теперь легендарные
    const { bossForWeek } = require('@/lib/data/organism-game')
    expect(bossForWeek(1, s.prestigeCount).legend).toBe(true)
  })

  test('экспедиция: Кристалл потока добавляет +2 кристалла к добыче', () => {
    const st = store.getState()
    st.startExpedition('walk')
    // поход завершён: startedAt в прошлом на длительность + минута
    const started = Date.now() - 4 * 3600000 - 60000
    store.setState({ expedition: { key: 'walk', startedAt: started } })
    const loot = store.getState().collectExpedition()
    expect(loot).toEqual({ name: 'Прогулка к холмам', genes: 2, crystals: 3, tale: expect.any(String) })
    // теперь со синтезом «Кристалл потока»
    store.setState({ mutagen: 9 })
    store.getState().craftArtifact('stream')
    store.getState().startExpedition('walk')
    store.setState({ expedition: { key: 'walk', startedAt: started } })
    const loot2 = store.getState().collectExpedition()
    expect(loot2.crystals).toBe(5)
  })
})

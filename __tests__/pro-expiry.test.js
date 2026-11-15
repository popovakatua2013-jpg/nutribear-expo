// Тесты сроков Premium-планов (аудит 12.11: месяц/год не имели срока).
// Триал — 3 дня, месяц — 31 день, год — 366 дней от activatedAt;
// refresh() гасит истёкший план, действующий не трогает.

const { useProStore } = require('../src/store/useProStore')

const DAY = 24 * 60 * 60 * 1000
const now = Date.now()

function setPlan(plan, activatedAt) {
  useProStore.setState({ pro: true, plan, activatedAt })
}

describe('useProStore.refresh: сроки планов', () => {
  beforeEach(() => {
    useProStore.setState({ pro: false, plan: null, activatedAt: null })
  })

  test('триал жив, пока не прошло 3 дня', () => {
    setPlan('trial', now - 2 * DAY)
    useProStore.getState().refresh()
    expect(useProStore.getState().pro).toBe(true)
    expect(useProStore.getState().plan).toBe('trial')
  })

  test('триал гаснет после 3 дней', () => {
    setPlan('trial', now - 4 * DAY)
    useProStore.getState().refresh()
    expect(useProStore.getState().pro).toBe(false)
    expect(useProStore.getState().plan).toBeNull()
    expect(useProStore.getState().activatedAt).toBeNull()
  })

  test('месяц жив до 31 дня, гаснет после', () => {
    setPlan('month', now - 30 * DAY)
    useProStore.getState().refresh()
    expect(useProStore.getState().pro).toBe(true)

    setPlan('month', now - 32 * DAY)
    useProStore.getState().refresh()
    expect(useProStore.getState().pro).toBe(false)
  })

  test('год жив до 366 дней (запас на високосный), гаснет после', () => {
    setPlan('year', now - 365 * DAY)
    useProStore.getState().refresh()
    expect(useProStore.getState().pro).toBe(true)

    setPlan('year', now - 367 * DAY)
    useProStore.getState().refresh()
    expect(useProStore.getState().pro).toBe(false)
  })

  // Промо-план первых пользователей (релизный режим оплаты): срок как
  // у годовой подписки — Premium по промокоду не становится вечным
  test('промо жив до 366 дней, гаснет после', () => {
    setPlan('promo', now - 365 * DAY)
    useProStore.getState().refresh()
    expect(useProStore.getState().pro).toBe(true)
    expect(useProStore.getState().plan).toBe('promo')

    setPlan('promo', now - 367 * DAY)
    useProStore.getState().refresh()
    expect(useProStore.getState().pro).toBe(false)
    expect(useProStore.getState().plan).toBeNull()
  })

  test('activate() сохраняет промо-план как есть', () => {
    useProStore.getState().activate('promo')
    expect(useProStore.getState().pro).toBe(true)
    expect(useProStore.getState().plan).toBe('promo')
    expect(useProStore.getState().activatedAt).toBeGreaterThan(0)
    useProStore.setState({ pro: false, plan: null, activatedAt: null })
  })

  test('без активации refresh ничего не меняет', () => {
    useProStore.setState({ pro: false, plan: null, activatedAt: null })
    useProStore.getState().refresh()
    expect(useProStore.getState().pro).toBe(false)

    // Покупка без activatedAt (битые данные) — не падаем, не гасим
    setPlan('year', null)
    useProStore.getState().refresh()
    expect(useProStore.getState().pro).toBe(true)
  })
})

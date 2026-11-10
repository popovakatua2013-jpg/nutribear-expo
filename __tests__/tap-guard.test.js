// tapGuard — защита от двойного тапа на кнопках добавления
// (урок из отзывов конкурента: «сохраняются сразу три дублирующиеся
// записи»). Первое нажатие выполняет действие, повторные в пределах
// окна игнорируются, после окна действие снова работает.

const { tapGuard } = require('@/lib/tap-guard')

// Базовое «сейчас» — не 0: у guard начальное last = 0, и при
// Date.now() < окна первый вызов считался бы «повтором» (в реальном
// приложении время миллисекундное и огромное, но тест проверяет честно)
const T0 = 1000000

describe('tapGuard: защита от двойного тапа', () => {
  let spy

  beforeEach(() => {
    spy = jest.spyOn(Date, 'now')
    spy.mockImplementation(() => T0)
  })

  afterEach(() => {
    spy.mockRestore()
  })

  test('первое нажатие выполняет действие', () => {
    const g = tapGuard(1200)
    const fn = jest.fn()
    expect(g(fn)).toBe(true)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  test('повторное нажатие в пределах окна игнорируется — дубля нет', () => {
    const g = tapGuard(1200)
    const fn = jest.fn()
    g(fn)
    spy.mockImplementation(() => T0 + 300) // второй тап через 300 мс
    expect(g(fn)).toBe(false)
    expect(fn).toHaveBeenCalledTimes(1)
    spy.mockImplementation(() => T0 + 1000) // даже через секунду — ещё окно
    expect(g(fn)).toBe(false)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  test('после окна действие снова выполняется (намеренный повтор возможен)', () => {
    const g = tapGuard(1200)
    const fn = jest.fn()
    g(fn)
    spy.mockImplementation(() => T0 + 1300) // окно истекло
    expect(g(fn)).toBe(true)
    expect(fn).toHaveBeenCalledTimes(2)
  })

  test('окно настраивается (по умолчанию 1200 мс)', () => {
    const g = tapGuard(800)
    const fn = jest.fn()
    g(fn)
    spy.mockImplementation(() => T0 + 900)
    expect(g(fn)).toBe(true) // уже за пределами окна 800 мс
  })
})

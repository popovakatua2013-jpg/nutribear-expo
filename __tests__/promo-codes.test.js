// Промо-коды Premium (релизный режим оплаты, решение Кати 15.11).
// Проверяем SHA-256 векторами (реализация чистым JS), нормализацию,
// работу валидатора против хэшей из репозитория и режим оплаты.
// Плюс страховка исходника PremiumCard: в релизном режиме демо-активация
// не вызывается, место занято промокодом.

const fs = require('fs')
const path = require('path')
const {
  getPaymentsMode,
  normalizePromoCode,
  sha256Hex,
  isValidPromoCode,
} = require('../src/lib/promo-codes')
const { PRO_PLANS } = require('../src/store/useProStore')

describe('sha256Hex: корректная реализация (векторы)', () => {
  test('пустая строка', () => {
    expect(sha256Hex('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')
  })

  test('"abc" — классический вектор', () => {
    expect(sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
  })

  test('длинная строка через границу блока 64 байта', () => {
    // Длина 100 байт — два блока после паддинга
    expect(sha256Hex('a'.repeat(100))).toHaveLength(64)
    expect(sha256Hex('a'.repeat(100))).toBe(sha256Hex('a'.repeat(100)))
    expect(sha256Hex('a'.repeat(100))).not.toBe(sha256Hex('a'.repeat(99)))
  })

  test('кириллица не ломает UTF-8', () => {
    // python: hashlib.sha256('медведь'.encode()).hexdigest()
    expect(sha256Hex('медведь')).toBe('4e8901e1591cc7a64bff379e53af467ee51f0c07a4ff7ceaa9b9936623ea42ac')
  })
})

describe('normalizePromoCode', () => {
  test('регистр, пробелы и дефисы срезаются', () => {
    expect(normalizePromoCode('  kedr-2026 ')).toBe('KEDR2026')
    expect(normalizePromoCode('Kedr 2026')).toBe('KEDR2026')
    expect(normalizePromoCode('kedr–2026')).toBe('KEDR2026')
    expect(normalizePromoCode('KEDR-2026')).toBe('KEDR2026')
  })

  test('пустые и мусорные входы', () => {
    expect(normalizePromoCode('')).toBe('')
    expect(normalizePromoCode('   ')).toBe('')
    expect(normalizePromoCode(null)).toBe('')
    expect(normalizePromoCode(undefined)).toBe('')
  })
})

describe('isValidPromoCode', () => {
  test('настоящие коды проходят в любом написании', () => {
    expect(isValidPromoCode('KEDR-2026')).toBe(true)
    expect(isValidPromoCode('kedr 2026')).toBe(true)
    expect(isValidPromoCode('NUTRI-START')).toBe(true)
    expect(isValidPromoCode('nutri start')).toBe(true)
    expect(isValidPromoCode('BEAR-GIFT')).toBe(true)
  })

  test('чужие коды не проходят', () => {
    expect(isValidPromoCode('KEDR-2025')).toBe(false)
    expect(isValidPromoCode('PREMIUM')).toBe(false)
    expect(isValidPromoCode('KEDR20267')).toBe(false)
    expect(isValidPromoCode('')).toBe(false)
    expect(isValidPromoCode(null)).toBe(false)
  })

  test('код KEDR-2026 сходится с независимым хэшем (python hashlib)', () => {
    // Хэш посчитан вне JS-реализации — взаимная проверка
    expect(sha256Hex('KEDR2026')).toBe('4e2cd8df2ccca820bf6b439eb79784826ef57403977ffdfb3a5386088a25a8fb')
    expect(sha256Hex('NUTRISTART')).toBe('6f54257318d403780698c59e9369853840e48b5f8286d862cf4c562632ff6902')
    expect(sha256Hex('BEARGIFT')).toBe('97ec228da8b029a10e402df8e5e0aec8b612d124cf65c5f0ee64369811250d4a')
  })
})

describe('getPaymentsMode', () => {
  const KEY = 'EXPO_PUBLIC_PAYMENTS_MODE'

  test('по умолчанию — demo (локальная разработка)', () => {
    expect(getPaymentsMode({})).toBe('demo')
    expect(getPaymentsMode({ [KEY]: undefined })).toBe('demo')
    expect(getPaymentsMode({ [KEY]: 'demo' })).toBe('demo')
  })

  test('release включается только точным значением (регистр не важен)', () => {
    expect(getPaymentsMode({ [KEY]: 'release' })).toBe('release')
    expect(getPaymentsMode({ [KEY]: 'RELEASE' })).toBe('release')
    expect(getPaymentsMode({ [KEY]: 'Release ' })).toBe('release')
    expect(getPaymentsMode({ [KEY]: 'release-demo' })).toBe('demo')
  })
})

describe('структура: промо не попадает в покупные планы', () => {
  test('в PRO_PLANS три покупаемых плана, промокод — не покупка', () => {
    expect(PRO_PLANS.map((p) => p.id)).toEqual(['trial', 'month', 'year'])
  })
})

describe('страховка исходника PremiumCard', () => {
  const src = fs.readFileSync(path.join(__dirname, '../src/components/more/PremiumCard.jsx'), 'utf8')

  test('релизный режим подключён через getPaymentsMode', () => {
    expect(src).toContain("getPaymentsMode() === 'release'")
    expect(src).toContain('EXPO_PUBLIC_PAYMENTS_MODE')
  })

  test('демо-активация в release перекрыта, промокод активирует promo-план', () => {
    // ранний return до activate(id) в релизном режиме
    const pickIdx = src.indexOf('function pickPlan(id)')
    const guardIdx = src.indexOf("if (release)", pickIdx)
    const actIdx = src.indexOf('activate(id)', pickIdx)
    expect(guardIdx).toBeGreaterThan(-1)
    expect(guardIdx).toBeLessThan(actIdx)
    expect(src).toContain("activate('promo')")
  })

  test('поле промокода и его доступность для скринридера есть', () => {
    expect(src).toContain('Ввод промокода Premium')
    expect(src).toContain('Активировать промокод')
  })

  test('в демо-режиме честная подпись сохранена', () => {
    expect(src).toContain('Демо-режим оплаты: активация работает без денег — для теста')
  })
})

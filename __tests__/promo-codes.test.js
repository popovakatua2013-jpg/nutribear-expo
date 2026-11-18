// Коды активации Premium (решение Кати 19.11: поле ввода кода вместо
// демо-кнопки). Проверяем SHA-256 векторами (реализация чистым JS),
// нормализацию, работу валидатора против хэшей из репозитория, целостность
// партии кодов для продажи и ссылку на страницу оплаты.
// Плюс страховка исходника PremiumCard: активация без денег из карточки
// убрана, месяц/год открывают страницу оплаты, код активирует promo-план.

const fs = require('fs')
const path = require('path')
const {
  PAY_PAGE_URL,
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

  test('код активации NB-XXXXX-XXXXX сводится к NB+10 символов', () => {
    expect(normalizePromoCode('nb-abcde-fghjk')).toBe('NBABCDEFGHJK')
    expect(normalizePromoCode('NB ABCDE FGHIK')).toBe('NBABCDEFGHIK')
    expect(normalizePromoCode('NB—ABCDE—FGHIK')).toBe('NBABCDEFGHIK')
  })

  test('пустые и мусорные входы', () => {
    expect(normalizePromoCode('')).toBe('')
    expect(normalizePromoCode('   ')).toBe('')
    expect(normalizePromoCode(null)).toBe('')
    expect(normalizePromoCode(undefined)).toBe('')
  })
})

describe('isValidPromoCode', () => {
  test('старые промо-коды проходят в любом написании', () => {
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
    expect(isValidPromoCode('NB-AAAAA-BBBBB')).toBe(false)
    expect(isValidPromoCode('')).toBe(false)
    expect(isValidPromoCode(null)).toBe(false)
  })

  test('старые коды сходятся с независимым хэшем (python hashlib)', () => {
    // Хэш посчитан вне JS-реализации — взаимная проверка
    expect(sha256Hex('KEDR2026')).toBe('4e2cd8df2ccca820bf6b439eb79784826ef57403977ffdfb3a5386088a25a8fb')
    expect(sha256Hex('NUTRISTART')).toBe('6f54257318d403780698c59e9369853840e48b5f8286d862cf4c562632ff6902')
    expect(sha256Hex('BEARGIFT')).toBe('97ec228da8b029a10e402df8e5e0aec8b612d124cf65c5f0ee64369811250d4a')
  })
})

describe('партия кодов для продажи (NB-XXXXX-XXXXX)', () => {
  // Сами коды в репозитории не хранятся (только хэши, список у Кати) —
  // поэтому здесь проверяется только целостность набора хэшей
  const src = fs.readFileSync(path.join(__dirname, '../src/lib/promo-codes.js'), 'utf8')
  const match = src.match(/const PROMO_CODE_HASHES = \[([\s\S]*?)\]/)
  const hashes = match ? [...match[1].matchAll(/'([0-9a-f]{64})'/g)].map((m) => m[1]) : []

  test('хэшей достаточно: 3 старых промо + партия 1 (40 шт)', () => {
    expect(match).toBeTruthy()
    expect(hashes.length).toBeGreaterThanOrEqual(43)
  })

  test('все хэши уникальны (один код — один хэш)', () => {
    expect(new Set(hashes).size).toBe(hashes.length)
  })
})

describe('PAY_PAGE_URL — страница оплаты', () => {
  test('https-ссылка на GitHub Pages этого репозитория', () => {
    expect(PAY_PAGE_URL).toMatch(/^https:\/\/popovakatua2013-jpg\.github\.io\/nutribear-expo\/?$/)
  })

  test('страница оплаты лежит в репозитории (docs/pay.html)', () => {
    expect(fs.existsSync(path.join(__dirname, '../docs/pay.html'))).toBe(true)
  })
})

describe('структура: промо не попадает в покупные планы', () => {
  test('в PRO_PLANS три покупаемых плана, промокод — не покупка', () => {
    expect(PRO_PLANS.map((p) => p.id)).toEqual(['trial', 'month', 'year'])
  })
})

describe('страховка исходника PremiumCard', () => {
  const src = fs.readFileSync(path.join(__dirname, '../src/components/more/PremiumCard.jsx'), 'utf8')

  test('демо-активация и режимы demo/release убраны', () => {
    expect(src).not.toContain('getPaymentsMode')
    expect(src).not.toContain('Демо-режим оплаты')
    expect(src).not.toContain('активировать без оплаты')
  })

  test('месяц/год открывают страницу оплаты, триал активируется сразу', () => {
    expect(src).toContain('Linking.openURL(PAY_PAGE_URL)')
    expect(src).toContain("activate('trial')")
    expect(src).toContain("activate('promo')")
  })

  test('поле кода активации и его доступность для скринридера есть', () => {
    expect(src).toContain('Ввод кода активации Premium')
    expect(src).toContain('Активировать код')
    expect(src).toContain('placeholder="Код активации"')
  })

  test('в подписи под планами указан порядок: оплата → код на почту', () => {
    expect(src).toContain('страницу оплаты')
    expect(src).toContain('код активации придёт на почту')
  })
})

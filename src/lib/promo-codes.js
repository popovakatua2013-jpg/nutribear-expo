// Промо-коды Premium для первых пользователей (релизный режим оплаты,
// решение Кати 15.11: демо-кнопка «активировать без оплаты» из сборок
// для магазина убирается — модерация может придраться, а первые
// пользователи Premium получают промокод).
//
// Сами коды в репозитории не хранятся — только SHA-256 хэши нормализованного
// кода: чтобы нельзя было вытащить рабочий код из APK. Код вводится в
// карточке «Премиум», нормализуется (регистр, пробелы, дефисы) и сравнивается
// хэшем. Активация — план 'promo' (Premium на год, см. useProStore).
//
// Режим оплаты: EXPO_PUBLIC_PAYMENTS_MODE=release ставится в сборке APK
// (workflow build-apk.yml). Без переменной (локальная разработка, тесты) —
// прежний демо-режим.

const PROMO_CODE_HASHES = [
  '4e2cd8df2ccca820bf6b439eb79784826ef57403977ffdfb3a5386088a25a8fb', // KEDR-2026
  '6f54257318d403780698c59e9369853840e48b5f8286d862cf4c562632ff6902', // NUTRI-START
  '97ec228da8b029a10e402df8e5e0aec8b612d124cf65c5f0ee64369811250d4a', // BEAR-GIFT
]

// 'release' только при точном значении переменной (пробелы/регистр не важны),
// всё остальное — demo
export function getPaymentsMode(env = process.env) {
  return String(env.EXPO_PUBLIC_PAYMENTS_MODE || '').trim().toLowerCase() === 'release'
    ? 'release'
    : 'demo'
}

// « kedr-2026 », «Kedr 2026», «KEDR—2026» → KEDR2026
export function normalizePromoCode(code) {
  return String(code || '')
    .trim()
    .toUpperCase()
    .replace(/[\s\u00A0\-\u2013\u2014]/g, '')
}

// SHA-256 чистым JS (без expo-crypto: нужен и в unit-тестах, и синхронно
// в UI-обработчике). Вход — строка (UTF-8), выход — hex-строка на 64 символа.
const K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4,
  0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe,
  0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f,
  0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7,
  0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc,
  0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
  0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116,
  0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7,
  0xc67178f2,
]

function utf8Bytes(str) {
  const out = []
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i)
    if (c < 0x80) {
      out.push(c)
    } else if (c < 0x800) {
      out.push(0xc0 | (c >> 6), 0x80 | (c & 63))
    } else if (c >= 0xd800 && c < 0xdc00 && i + 1 < str.length) {
      const c2 = str.charCodeAt(++i)
      const cp = 0x10000 + ((c - 0xd800) << 10) + (c2 - 0xdc00)
      out.push(0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 63), 0x80 | ((cp >> 6) & 63), 0x80 | (cp & 63))
    } else {
      out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63))
    }
  }
  return out
}

export function sha256Hex(input) {
  const bytes = utf8Bytes(String(input))
  const bitLen = bytes.length * 8
  bytes.push(0x80)
  while (bytes.length % 64 !== 56) bytes.push(0)
  const hi = Math.floor(bitLen / 0x100000000)
  const lo = bitLen >>> 0
  bytes.push(
    (hi >>> 24) & 255,
    (hi >>> 16) & 255,
    (hi >>> 8) & 255,
    hi & 255,
    (lo >>> 24) & 255,
    (lo >>> 16) & 255,
    (lo >>> 8) & 255,
    lo & 255
  )

  const H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]
  const w = new Array(64)
  const rotr = (x, n) => (x >>> n) | (x << (32 - n))

  for (let off = 0; off < bytes.length; off += 64) {
    for (let i = 0; i < 16; i++) {
      const j = off + 4 * i
      w[i] = (bytes[j] << 24) | (bytes[j + 1] << 16) | (bytes[j + 2] << 8) | bytes[j + 3]
    }
    for (let i = 16; i < 64; i++) {
      const a0 = w[i - 15]
      const s0 = rotr(a0, 7) ^ rotr(a0, 18) ^ (a0 >>> 3)
      const a1 = w[i - 2]
      const s1 = rotr(a1, 17) ^ rotr(a1, 19) ^ (a1 >>> 10)
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0
    }

    let a = H[0]
    let b = H[1]
    let c = H[2]
    let d = H[3]
    let e = H[4]
    let f = H[5]
    let g = H[6]
    let h = H[7]

    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)
      const ch = (e & f) ^ (~e & g)
      const t1 = (h + S1 + ch + K[i] + w[i]) | 0
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)
      const maj = (a & b) ^ (a & c) ^ (b & c)
      const t2 = (S0 + maj) | 0
      h = g
      g = f
      f = e
      e = (d + t1) | 0
      d = c
      c = b
      b = a
      a = (t1 + t2) | 0
    }

    H[0] = (H[0] + a) | 0
    H[1] = (H[1] + b) | 0
    H[2] = (H[2] + c) | 0
    H[3] = (H[3] + d) | 0
    H[4] = (H[4] + e) | 0
    H[5] = (H[5] + f) | 0
    H[6] = (H[6] + g) | 0
    H[7] = (H[7] + h) | 0
  }

  return H.map((x) => (x >>> 0).toString(16).padStart(8, '0')).join('')
}

export function isValidPromoCode(code) {
  const norm = normalizePromoCode(code)
  if (!norm) return false
  return PROMO_CODE_HASHES.includes(sha256Hex(norm))
}

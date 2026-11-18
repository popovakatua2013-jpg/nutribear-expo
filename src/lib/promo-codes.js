// Коды активации Premium (решение Кати 19.11: поле ввода кода вместо
// демо-кнопки «активировать без оплаты»). Оплата проходит на странице
// оплаты (PAY_PAGE_URL ниже, GitHub Pages) — карта/СБП через Ю-Kassa;
// после оплаты Катя высылает покупателю код активации, код вводится в
// карточке «Премиум». Первые 3 кода (KEDR-2026, NUTRI-START, BEAR-GIFT)
// — старые промо-коды первых пользователей, работают как прежде.
//
// Сами коды в репозитории не хранятся — только SHA-256 хэши нормализованного
// кода: чтобы нельзя было вытащить рабочий код из APK. Код нормализуется
// (регистр, пробелы, дефисы) и сравнивается хэшем. Активация — план 'promo'
// (Premium на год, см. useProStore).

const PROMO_CODE_HASHES = [
  '4e2cd8df2ccca820bf6b439eb79784826ef57403977ffdfb3a5386088a25a8fb', // KEDR-2026
  '6f54257318d403780698c59e9369853840e48b5f8286d862cf4c562632ff6902', // NUTRI-START
  '97ec228da8b029a10e402df8e5e0aec8b612d124cf65c5f0ee64369811250d4a', // BEAR-GIFT

  // Партия 1 — 40 кодов для продажи, NB-XXXXX-XXXXX (алфавит без
  // I/O/0/1 — не путаются при вводе). Сгенерирована 19.11.2026
  // (scripts/gen-activation-codes.js). Сами коды в репозитории не
  // хранятся — только хэши; список у Кати (файл txt).
  '050dea5237f203ec0067af626a7868dd002e5febac8434ce9592856b62e3d2dc',
  '097aa3648b03b23a3095f0bf9501f91a32be14eabbfe95b3cfcfb108ea2b5829',
  '0b1342da27d5467eab7ff9c1505aa7870ee52b52af62e6910d44dbf5f6c5bf5d',
  '10a04aa8dc512cfa44e43eb356f808533507a3795cdced83a852be118f433071',
  '1516481e83466767b2becf971930c6a2633b2fb7fb634bbbb73013bf3b37e395',
  '184795c69180d03bad491eb209a3acd36d8dd693bc6843bb8f759d03b8cc63c8',
  '2bbfc92aa02f585f92e55ddc8f93af0669621054448a63e1692f00a896db9578',
  '3070b5dc2bcf38fea4bff4e6775a1d6428f43e581acd117fd64f65abf7235f90',
  '3c2a194d94473839efa56ec784010cd6cd1ba4fb77edea1038d50ebe6f0641fa',
  '3e8a285b129944cef118ba440f1da93eabcbb43ef561483ebe057d27788d67b5',
  '404facfe09ffeb2e473009ae8bad45ee3509d1a64673005f929ec709e263a994',
  '451d4fcdd34bee28c8d51571ed555e283b73b7a40a9fb3d55cbfb388dc00badd',
  '47bed6f4c69601c2083128a46721443b779de413dc5746bd572fc169ade29f5d',
  '4aa373cad6dd974ce350f50fa83ce2ed434db10043ce984b730173b1024f5bdf',
  '4b178000cfbccb7a08e31555148dc5bf9493c085771abc54922699b3f4e88895',
  '4f80801b19b970bbacb2df51ae9fcacd66953e1b84a1adbb738645d2c07eae6c',
  '50d364ceb4f84f48399f63cbacd4119bf6a49aa6db69ab8a8528482fdc0a41ed',
  '5171bbc5b2db607ca6be2776eeb79db6aede9b7e9d04036beaf04eef3e90da52',
  '523946543fc9baad7dbb8d443ea9408491387be46397ce3de5db673da1813b06',
  '5b460f44d820c5c2fbde5a7570040647fab060e9ce1d3605492f4d4c0de87657',
  '5def03edd826602d4e526df1853d1f1721f6627419ae95bd997fc4790329c565',
  '5e7b2c900d47592e894d3ebc03bd78a4826db532e437f6aebfc582f323ee2f39',
  '5f0d61ea60a48a43e0825f56b27f9295dad87aa0e0dab9bf4b46f6f819f39c42',
  '6071aad2185dd4889289f2e8989c2a9fbf7a30ebd27fac67ccdcad08820b2864',
  '613bf293d4f80eba7cdd713b1d6ef82d25d54ff5d32b4949c1cae3082ec59e54',
  '7786777f3f893246ac6160ddc1b2bec822ec43114c4b0e18c901e296bf9f46ca',
  '7dedca14cb38a39fb68542f509184c1c6f58203942b28072f6620eaa8748cb9f',
  '82d8e896bfddfe444b1fc4521d8737fb67871f2d1de7954286bfc682a3aa4635',
  '889ddb79ecd1306b70297bd314ffe9c6c615e977aad3309fc0d4acc4b3735e62',
  '8928ee2069cf39568fdefd0160ec621f7312738d97a2989704a156a9b70eb67d',
  '8bc04a2b8c7f05c3b3aa80c1eab61bd9c3570ac7f65ed736dee754a84d55c579',
  '938b935f0617e68530e663cc85069f48d698744ebb0b12e6b1bac5a2d75daa16',
  '9f95de0ac7d9924d06e207c18a9e827fa1d33fa63ccf17c20c496808dbe9be62',
  'bbc27def2cae3544ec21f15b2b059ecf70650c4c3a959dbee200debdd4be0f5a',
  'bea97c5bebb87ad4cd79a809880d4c7ea72b6371f7d0420eee1ac21423d964bd',
  'bf581f481b4d4513b50e518b9a6ee0bf838d4f9b9cce12cba7d466ad8fe03565',
  'd2d3ca19949383f13832811d4b333f2054229b9cbc9b62a17231338b1cdf6d49',
  'ea119590f1391822215f7e8ba7fa21b0b5cff3ac58e9830ae868f46019639943',
  'edb0abf0fd6e86fe6d05a56218e09e490b166782bbad62b43b4c88511a2fc341',
  'fc3ccf58ec6cff9ab72590a6e71fbbd9d006964c086693412e63fc63d091a2b1',
]

// Страница оплаты Premium (статичная docs/pay.html из этого репозитория,
// публикуется GitHub Pages; корень Pages — docs/index.html с правовыми
// документами). Открывается по тапу на план «Месяц»/«Год» в карточке
// «Премиум». Триал активируется прямо в приложении — он бесплатный.
export const PAY_PAGE_URL = 'https://popovakatua2013-jpg.github.io/nutribear-expo/pay.html'

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

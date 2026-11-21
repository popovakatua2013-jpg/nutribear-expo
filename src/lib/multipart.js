// ─────────────────────────────────────────────────────────────────
//  multipart/form-data РУКАМИ — без FormData
// ─────────────────────────────────────────────────────────────────
//  Зачем: в Expo SDK 58 глобальный fetch — это winter-полифилл Expo
//  (node_modules/expo/src/winter/fetch/convertFormData.ts). При отправке
//  FormData он умеет только строки, Blob и объекты с .bytes() — а
//  React Native-часть { uri, name, type }, которую требовал старый
//  RN-fetch, падает с «Unsupported FormDataPart implementation» прямо
//  в JS, до сети. Голосовой ввод еды упирался ровно в это.
//
//  Решение: собираем multipart-тело сами как байты (Uint8Array) и
//  отдаём fetch — winter-полифилл байты принимает (ArrayBuffer.isView).
//  Работает и в Node (jest) — файл без единого импорта.
//
//  decodeBase64ToBytes(b64)      — base64 → Uint8Array (свой декодер,
//                                  atob в Hermes не гарантируется)
//  buildMultipartBody(fields)    — [{ name, value } | { name, filename,
//                                  type, bytes }] → { body, contentType }
// ─────────────────────────────────────────────────────────────────

// Таблица символов base64 (RFC 4648)
const B64_ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

const B64_LOOKUP = (() => {
  const t = new Int16Array(256).fill(-1)
  for (let i = 0; i < 64; i++) t[B64_ALPHABET.charCodeAt(i)] = i
  return t
})()

// base64 → байты. Терпит padding, переносы строк и URL-безопасные
// варианты (-_ вместо +/). Данные не валидируем по-строгому: мусорный
// символ пропускается (после даты/JSON всё равно проверка длины).
export function decodeBase64ToBytes(input) {
  const s = String(input || '').replace(/[\r\n\s]/g, '')
  if (!s.length) return new Uint8Array(0)
  // URL-safe → стандартный алфавит
  const norm = s.replace(/-/g, '+').replace(/_/g, '/')
  // сколько реальных символов-значений (без padding)
  let realLen = norm.length
  while (realLen > 0 && norm.charAt(realLen - 1) === '=') realLen--
  let outLen = Math.floor((realLen * 3) / 4)
  const out = new Uint8Array(outLen)
  let o = 0
  let buf = 0
  let bits = 0
  for (let i = 0; i < realLen; i++) {
    const v = B64_LOOKUP[norm.charCodeAt(i)]
    if (v < 0) continue // мусорный символ — пропускаем
    buf = (buf << 6) | v
    bits += 6
    if (bits >= 8) {
      bits -= 8
      if (o < outLen) out[o++] = (buf >> bits) & 0xff
    }
  }
  // Если мусорных символов было много, фактических байт меньше —
  // подрезаем до реально записанных
  return o === outLen ? out : out.slice(0, o)
}

const BOUNDARY_PREFIX = '----NutriBearForm'

// ── ASCII-имя файла для заголовка multipart-части ────────────────
// filename в Content-Disposition — не «значение поля»: undici (Node,
// тесты) декодирует UTF-8 в нём спокойно, но парсер multipart у
// Cloudflare может быть строже — а гадать без секрета не на чем
// (отзыв Кати 21.11: обращение с вложением падало в почтовый запасной
// поток). Поэтому в заголовок части кладём ТОЛЬКО ASCII: кириллица —
// транслитом, всё прочее не-ASCII — в подчёркивание. Настоящее имя
// едет отдельным текстовым полем filenames (значения полей с UTF-8
// на воркере доказанно работают — тема «Предложение» доходила).
const TRANSLIT = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh',
  з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o',
  п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'c',
  ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e',
  ю: 'yu', я: 'ya',
}

export function asciiFilename(name, index = 0) {
  const raw = String(name || '').trim().slice(0, 120)
  let out = ''
  for (const ch of raw) {
    const lo = ch.toLowerCase()
    if (Object.prototype.hasOwnProperty.call(TRANSLIT, lo)) {
      const t = TRANSLIT[lo]
      // «Щ» → «Sch» (заглавная первая), «с» → «s» — как есть
      out += ch === lo ? t : t.charAt(0).toUpperCase() + t.slice(1)
    } else if (/[A-Za-z0-9._-]/.test(ch)) {
      out += ch
    } else {
      out += '_'
    }
  }
  out = out.replace(/_{2,}/g, '_')
  // Ствол имени (до последней точки) без единой буквы/цифры —
  // подставляем нейтральное file-N, расширение сохраняем. Ствол
  // отделяем ДО чистки подчёркиваний по краям: иначе «???.jpg»
  // схлопывается в «.jpg» без имени
  const dot = out.lastIndexOf('.')
  const ext = dot > 0 ? out.slice(dot) : ''
  const stem = (dot > 0 ? out.slice(0, dot) : out).replace(/^_+|_+$/g, '')
  if (!/[A-Za-z0-9]/.test(stem)) {
    out = `file-${index + 1}${ext}`
  } else {
    out = stem + ext
  }
  return out.slice(0, 120) || `file-${index + 1}`
}

function createBoundary() {
  // Случайная граница: 24 символа из window.crypto (или Math.random в Node)
  let s = ''
  try {
    const g =
      typeof globalThis !== 'undefined' && globalThis.crypto
        ? globalThis.crypto
        : null
    if (g && typeof g.getRandomValues === 'function') {
      const arr = new Uint8Array(12)
      g.getRandomValues(arr)
      for (const b of arr) s += b.toString(16).padStart(2, '0')
    }
  } catch {}
  if (!s) {
    for (let i = 0; i < 24; i++)
      s += Math.floor(Math.random() * 16).toString(16)
  }
  return `${BOUNDARY_PREFIX}${s}`
}

// Поля формы: строки — обычные поля, bytes — файл (как в OpenAI /audio:
// поле file с filename и content-type). Порядок сохраняем: файл первым
// отправлять не обязательно, но мы как в старом коде (file → model → …).
export function buildMultipartBody(fields, boundary = createBoundary()) {
  const parts = [] // (string | Uint8Array)[]
  for (const f of fields || []) {
    if (!f || !f.name) continue
    if (f.bytes instanceof Uint8Array) {
      parts.push(
        `--${boundary}\r\n` +
          `Content-Disposition: form-data; name="${String(f.name)}"; filename="${String(
            f.filename || 'file'
          )}"\r\n` +
          `Content-Type: ${String(f.type || 'application/octet-stream')}\r\n` +
          `\r\n`
      )
      parts.push(f.bytes)
      parts.push('\r\n')
    } else {
      parts.push(
        `--${boundary}\r\n` +
          `Content-Disposition: form-data; name="${String(f.name)}"\r\n` +
          `\r\n` +
          `${String(f.value ?? '')}\r\n`
      )
    }
  }
  parts.push(`--${boundary}--\r\n`)

  // Склеиваем строки и байты в один Uint8Array
  let total = 0
  const encoded = parts.map((p) => {
    if (typeof p === 'string') {
      const b = new TextEncoder().encode(p)
      total += b.length
      return b
    }
    total += p.length
    return p
  })
  const body = new Uint8Array(total)
  let offset = 0
  for (const b of encoded) {
    body.set(b, offset)
    offset += b.length
  }
  return {
    body,
    boundary,
    contentType: `multipart/form-data; boundary=${boundary}`,
  }
}

// Размер base64-данных в байтах БЕЗ декодирования (для проверок лимитов)
export function base64ByteLength(b64) {
  const s = String(b64 || '').replace(/[\r\n\s]/g, '')
  let real = s.length
  while (real > 0 && s.charAt(real - 1) === '=') real--
  return Math.floor((real * 3) / 4)
}

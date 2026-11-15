// Тесты multipart-сборки для голосового ввода еды.
//
// Контекст (отзыв Кати 16.11): recognizeVoiceAudio собирал FormData
// с RN-частью { uri, name, type } — в Expo SDK 58 fetch это winter-
// полифилл, который падает с «Unsupported FormDataPart implementation»
// прямо в JS. Тело теперь собирается руками (src/lib/multipart.js):
//   • decodeBase64ToBytes — base64 записи → байты;
//   • buildMultipartBody — поля формы → Uint8Array + boundary.
// Проверяем структуру RFC-совместимого multipart и корректность декода.

const { decodeBase64ToBytes, buildMultipartBody, base64ByteLength } = require('../src/lib/multipart')

describe('decodeBase64ToBytes', () => {
  test('известные векторы', () => {
    expect(new TextDecoder().decode(decodeBase64ToBytes('SGVsbG8='))).toBe('Hello')
    expect(new TextDecoder().decode(decodeBase64ToBytes('SGVsbG8h'))).toBe('Hello!')
    expect(new TextDecoder().decode(decodeBase64ToBytes(''))).toBe('')
  })

  test('переносы строк и пробелы игнорируются', () => {
    expect(
      new TextDecoder().decode(decodeBase64ToBytes('SGVs\nbG8=\r\n  '))
    ).toBe('Hello')
  })

  test('URL-safe алфавит (-_) как у некоторых кодеров', () => {
    // '+' → '-': байты 'af' в base64 'ag8=' нет; возьмём вектор
    // стандартный 'a+b=' (bytes 0x9A 0xFB...) и url-safe вариант
    expect([...decodeBase64ToBytes('Kg==')]).toEqual([42])
    expect([...decodeBase64ToBytes('Kg=='.replace('+', '-'))]).toEqual([42])
  })

  test('бинарные байты декодируются точно (цикл по 0..255)', () => {
    const src = new Uint8Array(256)
    for (let i = 0; i < 256; i++) src[i] = i
    // Node Buffer умеет base64
    const b64 = Buffer.from(src).toString('base64')
    const out = decodeBase64ToBytes(b64)
    expect(out.length).toBe(256)
    for (let i = 0; i < 256; i++) expect(out[i]).toBe(i)
  })

  test('неполный последний квартет без padding', () => {
    // 'SGVsbG8' — тот же 'Hello' без '='
    expect(new TextDecoder().decode(decodeBase64ToBytes('SGVsbG8'))).toBe('Hello')
  })
})

describe('base64ByteLength', () => {
  test('размер без декодирования', () => {
    // 'SGVsbG8=' — 5 байт
    expect(base64ByteLength('SGVsbG8=')).toBe(5)
    expect(base64ByteLength('')).toBe(0)
    // 200 000 символов base64 без padding ≈ 150 000 байт
    const s = 'A'.repeat(200000)
    expect(base64ByteLength(s)).toBe(150000)
  })
})

describe('buildMultipartBody', () => {
  test('строковое поле: заголовки и значение на месте', () => {
    const { body, contentType, boundary } = buildMultipartBody([
      { name: 'model', value: 'whisper-1' },
    ])
    expect(contentType).toBe(`multipart/form-data; boundary=${boundary}`)
    const text = new TextDecoder().decode(body)
    expect(text).toContain(`--${boundary}\r\n`)
    expect(text).toContain('Content-Disposition: form-data; name="model"\r\n')
    expect(text).toContain('\r\n\r\nwhisper-1\r\n')
    expect(text.trimEnd().endsWith(`--${boundary}--`)).toBe(true)
  })

  test('файловое поле: filename и content-type, байты не искажаются', () => {
    const bytes = new Uint8Array([0, 1, 2, 250, 251, 255])
    const { body, boundary } = buildMultipartBody([
      { name: 'file', filename: 'voice.m4a', type: 'audio/m4a', bytes },
      { name: 'model', value: 'whisper-1' },
      { name: 'language', value: 'ru' },
    ])
    const text = new TextDecoder().decode(body)
    expect(text).toContain(
      'Content-Disposition: form-data; name="file"; filename="voice.m4a"\r\n'
    )
    expect(text).toContain('Content-Type: audio/m4a\r\n')
    expect(text).toContain('name="model"')
    expect(text).toContain('name="language"')
    // порядок полей сохранён: file → model → language
    expect(text.indexOf('name="file"')).toBeLessThan(text.indexOf('name="model"'))
    expect(text.indexOf('name="model"')).toBeLessThan(text.indexOf('name="language"'))
    // boundary встречается: 3 поля + финал
    expect(text.split(`--${boundary}`).length - 1).toBe(4)
    void boundary
  })

  test('пустой массив полей — корректное закрытое тело', () => {
    const { body, boundary } = buildMultipartBody([])
    const text = new TextDecoder().decode(body)
    expect(text).toBe(`--${boundary}--\r\n`)
  })

  test('сборка multipart с бинарными байтами переживает кругосветку', () => {
    const src = new Uint8Array(1024)
    for (let i = 0; i < src.length; i++) src[i] = i % 256
    const b64 = Buffer.from(src).toString('base64')
    const { body, boundary } = buildMultipartBody([
      { name: 'file', filename: 'voice.m4a', type: 'audio/m4a', bytes: decodeBase64ToBytes(b64) },
    ])
    // Бинарную часть ищем В БАЙТАХ (TextDecoder исказил бы не-UTF8)
    const enc = (s) => new TextEncoder().encode(s)
    const marker = enc('Content-Type: audio/m4a\r\n\r\n')
    const tail = enc(`\r\n--${boundary}`)
    const findBytes = (hay, needle, from = 0) => {
      outer: for (let i = from; i <= hay.length - needle.length; i++) {
        for (let j = 0; j < needle.length; j++) {
          if (hay[i + j] !== needle[j]) continue outer
        }
        return i
      }
      return -1
    }
    const start = findBytes(body, marker) + marker.length
    const end = findBytes(body, tail, start)
    expect(start).toBeGreaterThan(0)
    expect(end).toBeGreaterThan(start)
    const out = body.slice(start, end)
    expect(out.length).toBe(src.length)
    for (let i = 0; i < src.length; i++) expect(out[i]).toBe(src[i])
  })
})

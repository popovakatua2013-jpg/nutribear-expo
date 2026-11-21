// Тесты прямой отправки обращений из окна «Написать нам» (без почты).
// Отзыв Кати 21.11: «сейчас тап поддержка - написать нам - отправить -
// переходит на электронную почту и уже оттуда создает обращение. А я
// хочу чтобы прямо из приложения пользователь отправлял обращение».
//
// Проверяем три слоя:
//  • воркер (server/cloudflare-worker.js): sanitizeSupportFields —
//    обрезка длин, пустое сообщение → null (400), дефолт темы;
//    buildSupportMessage — все поля попадают в текст для Telegram,
//    контакт и версия не теряются;
//  • лимиты (src/lib/supportLimits.js — чистый модуль без expo);
//  • СИНХРОНИЗАЦИЯ лимитов приложения и воркера: если числа разъедутся,
//    приложение молча потеряет вложения на 413 — это нужно ловить.

const {
  sanitizeSupportFields,
  buildSupportMessage,
  SUPPORT_LIMITS,
} = require('../server/cloudflare-worker')

const {
  SUPPORT_LIMITS: APP_LIMITS,
  guessMimeFromName,
} = require('@/lib/supportLimits')

describe('sanitizeSupportFields: очистка полей обращения', () => {
  test('полный набор полей проходит и обрезается по краям', () => {
    const out = sanitizeSupportFields({
      topic: '  Баг или ошибка  ',
      message: '  Клавиатура закрывает кнопку  ',
      contact: '  user@mail.ru  ',
      version: ' 1.1.7 ',
      platform: ' Android ',
    })
    expect(out).toEqual({
      topic: 'Баг или ошибка',
      message: 'Клавиатура закрывает кнопку',
      contact: 'user@mail.ru',
      version: '1.1.7',
      platform: 'Android',
    })
  })

  test('пустое сообщение → null (воркер ответит 400) — спам-пинг не дойдёт до Telegram', () => {
    expect(sanitizeSupportFields({ message: '   ' })).toBeNull()
    expect(sanitizeSupportFields({})).toBeNull()
    expect(sanitizeSupportFields(null)).toBeNull()
    expect(sanitizeSupportFields({ message: 42 })).toBeNull()
  })

  test('не-строки в необязательных полях дают пустую строку, тема — дефолт', () => {
    const out = sanitizeSupportFields({
      message: 'текст',
      topic: null,
      contact: 123,
      version: undefined,
      platform: {},
    })
    expect(out.topic).toBe('Другое')
    expect(out.contact).toBe('')
    expect(out.version).toBe('')
    expect(out.platform).toBe('')
  })

  test('длинные поля обрезаются по лимитам воркера', () => {
    const out = sanitizeSupportFields({
      topic: 'т'.repeat(500),
      message: 'м'.repeat(5000),
      contact: 'к'.repeat(1000),
      version: 'в'.repeat(500),
      platform: 'п'.repeat(500),
    })
    expect(out.message).toHaveLength(SUPPORT_LIMITS.MAX_SUPPORT_MESSAGE_LEN)
    expect(out.topic).toHaveLength(SUPPORT_LIMITS.MAX_SUPPORT_TOPIC_LEN)
    expect(out.contact).toHaveLength(SUPPORT_LIMITS.MAX_SUPPORT_CONTACT_LEN)
    expect(out.version).toHaveLength(SUPPORT_LIMITS.MAX_SUPPORT_META_LEN)
    expect(out.platform).toHaveLength(SUPPORT_LIMITS.MAX_SUPPORT_META_LEN)
  })

  test('юзерский текст с разметкой Telegram проходит как есть (sendMessage без parse_mode)', () => {
    const out = sanitizeSupportFields({
      message: 'не работают <b>тэги</b> и _подчёркивания_ #хэштег @ник',
    })
    expect(out.message).toContain('<b>тэги</b>')
    expect(out.message).toContain('_подчёркивания_')
  })
})

describe('buildSupportMessage: текст для Telegram', () => {
  test('тема, сообщение, версия/платформа и контакт все попадают в текст', () => {
    const text = buildSupportMessage({
      topic: 'Баг или ошибка',
      message: 'Кнопка уехала под клавиатуру',
      contact: 'katya@nutribear.ru',
      version: '1.1.7',
      platform: 'Android',
    })
    expect(text).toContain('Обращение из NutriBear')
    expect(text).toContain('Тема: Баг или ошибка')
    expect(text).toContain('Кнопка уехала под клавиатуру')
    expect(text).toContain('Приложение: 1.1.7 · Android')
    expect(text).toContain('Ответить: katya@nutribear.ru')
  })

  test('без контакта строка «Ответить» не появляется, без версии нет «Приложение»', () => {
    const text = buildSupportMessage({ topic: 'Другое', message: 'привет' })
    expect(text).not.toContain('Ответить')
    expect(text).not.toContain('Приложение')
    expect(text).toContain('Тема: Другое')
    expect(text).toContain('привет')
  })

  test('переводы строк юзера сохраняются (читать в Telegram удобно)', () => {
    const text = buildSupportMessage({
      topic: 'Другое',
      message: 'шаг 1\nшаг 2\nшаг 3',
    })
    expect(text).toContain('шаг 1\nшаг 2\nшаг 3')
  })
})

describe('лимиты поддержки: приложение и воркер говорят одно и то же', () => {
  test('числа совпадают (разъедутся — приложение молча потеряет вложения на 413)', () => {
    expect(APP_LIMITS.MESSAGE_MAX).toBe(SUPPORT_LIMITS.MAX_SUPPORT_MESSAGE_LEN)
    expect(APP_LIMITS.CONTACT_MAX).toBe(SUPPORT_LIMITS.MAX_SUPPORT_CONTACT_LEN)
    expect(APP_LIMITS.FILES_MAX).toBe(SUPPORT_LIMITS.MAX_SUPPORT_FILES)
    expect(APP_LIMITS.FILE_MAX_BYTES).toBe(SUPPORT_LIMITS.MAX_SUPPORT_FILE_BYTES)
    expect(APP_LIMITS.TOTAL_MAX_BYTES).toBe(SUPPORT_LIMITS.MAX_SUPPORT_TOTAL_BYTES)
  })

  test('лимиты разумны: до 5 файлов по 10 МБ, суммарно до 16 МБ', () => {
    expect(SUPPORT_LIMITS.MAX_SUPPORT_FILES).toBe(5)
    expect(SUPPORT_LIMITS.MAX_SUPPORT_FILE_BYTES).toBe(10 * 1024 * 1024)
    expect(SUPPORT_LIMITS.MAX_SUPPORT_TOTAL_BYTES).toBe(16 * 1024 * 1024)
    // суммарный лимит не меньше лимита одного файла
    expect(SUPPORT_LIMITS.MAX_SUPPORT_TOTAL_BYTES).toBeGreaterThanOrEqual(
      SUPPORT_LIMITS.MAX_SUPPORT_FILE_BYTES
    )
  })
})

describe('guessMimeFromName: MIME по расширению', () => {
  test('картинки и видео получают корректный тип', () => {
    expect(guessMimeFromName('скрин.png')).toBe('image/png')
    expect(guessMimeFromName('фото.JPG')).toBe('image/jpeg')
    expect(guessMimeFromName('видео.mp4')).toBe('video/mp4')
    expect(guessMimeFromName('лог-приложения.log')).toBe('text/plain')
  })

  test('неизвестное расширение и пустое имя — нейтральный octet-stream', () => {
    expect(guessMimeFromName('файл.xyz123')).toBe('application/octet-stream')
    expect(guessMimeFromName('')).toBe('application/octet-stream')
    expect(guessMimeFromName(null)).toBe('application/octet-stream')
    // без расширения — тоже нейтральный
    expect(guessMimeFromName('без-расширения')).toBe('application/octet-stream')
  })
})

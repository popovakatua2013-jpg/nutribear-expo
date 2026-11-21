// Тесты сборки mailto-ссылки окна «Написать нам» (lib/supportMailto).
// Отзыв Кати 21.11: сообщение должно открывать почту пользователя с
// готовым письмом («переводит открыть свою почту и уже оттуда создать
// обращение»). Проверяем чистую логику URL: кириллица, переносы строк,
// «&» и «?» без кодирования ломают параметры — всё должно ездить
// через encodeURIComponent и читаться обратно без потерь.
import { supportMailtoUrl } from '@/lib/supportMailto'

const EMAIL = 'whitelinepay@yandex.ru'

describe('supportMailtoUrl', () => {
  test('схема mailto и получатель на месте', () => {
    const url = supportMailtoUrl({ email: EMAIL, subject: 'Тема', body: 'Текст' })
    expect(url.startsWith(`mailto:${EMAIL}?subject=`)).toBe(true)
    expect(url).toContain('&body=')
  })

  test('кириллица и спецсимволы темы кодируются и читаются обратно', () => {
    const subject = '[NutriBear] Баг или ошибка №3 (100%)'
    const url = supportMailtoUrl({ email: EMAIL, subject, body: 'ok' })
    const params = new URL(url).searchParams
    // searchParams возвращает уже раскодированное значение
    expect(params.get('subject')).toBe(subject)
  })

  test('переносы строк и «&» в тексте не ломают параметры', () => {
    const body = 'Шаг 1\nПроверила & отправила? да/нет\n—\nNutriBear 1.1.7 · Android'
    const url = supportMailtoUrl({ email: EMAIL, subject: 's', body })
    const params = new URL(url).searchParams
    expect(params.get('body')).toBe(body)
    expect(params.get('subject')).toBe('s')
    // в самой ссылке не остаётся сырых переводов строки — она безопасна
    // для Linking.openURL
    expect(url).not.toMatch(/\n/)
  })

  test('знак & в теме не съедает параметр body', () => {
    const url = supportMailtoUrl({ email: EMAIL, subject: 'Оплата и чеки & возврат', body: 'body-text' })
    const params = new URL(url).searchParams
    expect(params.get('subject')).toBe('Оплата и чеки & возврат')
    expect(params.get('body')).toBe('body-text')
  })

  test('пустые тема и текст дают пустые параметры, не мусор', () => {
    const url = supportMailtoUrl({ email: EMAIL, subject: '', body: '' })
    expect(url).toBe(`mailto:${EMAIL}?subject=&body=`)
  })
})

// ─────────────────────────────────────────────────────────────────
//  Лимиты прямой отправки обращений (окно «Написать нам»)
// ─────────────────────────────────────────────────────────────────
//  Чистый модуль без зависимостей — его можно проверить в jest без
//  эмулятора и RN-рантайма. Числа повторяют SUPPORT_LIMITS воркера
//  (server/cloudflare-worker.js): сервер проверяет то же самое, но
//  приложение отсеивает перебор ЗАРАНЕЕ — до чтения файлов в память
//  (base64 гигантского вложения раздуло бы RAM телефона).
//
//  Отправка «прямо из приложения»: обращение уходит на наш Cloudflare
//  Worker (EXPO_PUBLIC_AI_PROXY_URL + /support), воркер пересылает
//  владельцу в Telegram. Почтовый клиент пользователю не открывается.
export const SUPPORT_LIMITS = {
  MESSAGE_MAX: 2000, // символы — как maxLength поля в SupportModal
  CONTACT_MAX: 200, // почта или @телеграм для ответа
  FILES_MAX: 5, // вложений на одно обращение
  FILE_MAX_BYTES: 10 * 1024 * 1024, // один файл — до 10 МБ
  TOTAL_MAX_BYTES: 16 * 1024 * 1024, // все вложения вместе — до 16 МБ
  TIMEOUT_MS: 30000, // потолок ожидания ответа сервера
}

// MIME по расширению: Telegram принимает файл как есть, но корректный
// content-type помогает ему показать картинку/видео красиво. Неизвестное
// расширение — нейтральный application/octet-stream (файл всё равно
// доставится, просто без превью)
const MIME_BY_EXT = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  pdf: 'application/pdf',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  m4a: 'audio/mp4',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  txt: 'text/plain',
  log: 'text/plain',
  json: 'application/json',
  zip: 'application/zip',
}

export function guessMimeFromName(name) {
  const m = String(name || '').toLowerCase().match(/\.([a-z0-9]+)$/)
  return (m && MIME_BY_EXT[m[1]]) || 'application/octet-stream'
}

// ─────────────────────────────────────────────────────────────────
//  ПРЯМАЯ ОТПРАВКА ОБРАЩЕНИЙ — мимо почтового клиента
// ─────────────────────────────────────────────────────────────────
//  Отзыв Кати 21.11: раньше «Отправить» открывало почту пользователя
//  (mailto/composer) и обращение создавалось уже оттуда. Теперь запрос
//  уходит НАПРЯМУЮ из приложения на наш Cloudflare Worker
//  (EXPO_PUBLIC_AI_PROXY_URL из .env → POST {адрес}/support), воркер
//  пересылает обращение владельцу в Telegram. Пользователь жмёт
//  «Отправить» — и всё, никакого почтового приложения.
//
//  Что здесь важно:
//  • Токен бота и chat_id живут в секретах Cloudflare — в бандл APK
//    они НЕ попадают (приложение знает только адрес воркера и общий
//    секрет X-NB-Secret, как у остальных ИИ-запросов).
//  • Вложения едут тем же запросом: файлы читаются в base64 (новый
//    файловый API expo-file-system, как в food-ai.js), собираются
//    руками через multipart.js — FormData из Expo SDK 58 не умеет
//    RN-части { uri, name, type } (см. шапку multipart.js).
//  • Размеры проверяем ДО чтения в память (supportLimits.js) — иначе
//    base64 большого файла раздувает RAM телефона.
//  • Имя файла в заголовке multipart-части — ASCII-транслит
//    (asciiFilename из multipart.js): парсер у Cloudflare может быть
//    строже undici к UTF-8 в Content-Disposition. Настоящее имя —
//    отдельным текстовым полем filenames, из него воркер берёт подпись
//    вложения в Telegram.
//  • Файлы читает НОВЫЙ файловый API, при сбое — старый
//    expo-file-system/legacy (умеет и file://, и content://).
//  • Если воркер ответил 503 support_not_configured — канал ещё не
//    настроен (секреты TG_* не залиты): вернём { notConfigured: true },
//    и окно поддержки молча откатится на прежний mailto-поток.
//  • Любой сетевой сбой — исключение: вызывающий код (SupportModal)
//    откроет почту пользователя, сообщение не потеряется.
// ─────────────────────────────────────────────────────────────────

import { File } from 'expo-file-system'
import * as LegacyFileSystem from 'expo-file-system/legacy'
import Constants from 'expo-constants'
import { Platform } from 'react-native'
import { AI_CONFIG } from './ai-config'
import { asciiFilename, buildMultipartBody, decodeBase64ToBytes } from './multipart'
import { SUPPORT_LIMITS, guessMimeFromName } from './supportLimits'

// Прямая отправка доступна, только если приложение знает адрес воркера
// (в Expo Go — из .env, в APK — из env сборки; см. build-apk.yml)
export function isDirectSupportAvailable() {
  return Boolean(AI_CONFIG.proxyUrl)
}

// Размер файла без чтения содержимого. Файловый API SDK 58: у File
// есть синхронное свойство size; на сбой отвечаем 0 — сервер всё равно
// перепроверит свои лимиты и вернёт внятную ошибку
function fileSizeOf(uri) {
  try {
    return new File(uri).size || 0
  } catch {
    return 0
  }
}

// Ошибка «виноват пользователь и может сам исправить» (вложение
// велико, их слишком много, сервер ответил 400/413): окно поддержки
// показывает её тостом и НЕ откатывается на почту — пользователь
// уберёт лишний файл и нажмёт «Отправить» ещё раз. Сетевые и серверные
// (5xx) ошибки не метятся — туда откатываемся, чтобы сообщение не пропало
function localError(message) {
  const e = new Error(message)
  e.local = true
  return e
}

// Читаем файл в байты через base64 (как фото еды в food-ai.js).
// Основной путь — новый файловый API; если он не смог (content:// от
// некоторых проводников, экзотика Samsung) — запасной старый API
// expo-file-system/legacy: он читает и file://, и content://. Не
// прочитался и он — исключение летит дальше: SupportModal молча
// откроет почту с вложением (там файл отдаётся нативно, по uri),
// сообщение не потеряется.
async function fileBytesOf(uri) {
  try {
    const b64 = await new File(uri).base64()
    return decodeBase64ToBytes(b64)
  } catch {
    const b64 = await LegacyFileSystem.readAsStringAsync(uri, {
      encoding: 'base64',
    })
    return decodeBase64ToBytes(b64)
  }
}

// Отправка обращения. Возвращает:
//   { ok: true, filesSent, filesFailed } — доставлено на воркер
//     (filesFailed > 0 — текст дошёл, часть вложений не ушла)
//   { notConfigured: true } — канал поддержки на воркере ещё не настроен
// Бросает исключение при сетевом сбое/таймауте/отказе сервера.
export async function sendSupportDirect({ topicLabel, message, contact = '', files = [] }) {
  const base = String(AI_CONFIG.proxyUrl || '').replace(/\/+$/, '')
  const url = `${base}/support`

  // Предварительная отбраковка вложений: лимиты — до чтения в память.
  // Тексты для ошибок — человеческие, их увидит пользователь в тосте
  if (files.length > SUPPORT_LIMITS.FILES_MAX) {
    throw localError(`Вложений слишком много (макс. ${SUPPORT_LIMITS.FILES_MAX})`)
  }
  let total = 0
  for (const f of files) {
    const size = fileSizeOf(f.uri)
    if (size > SUPPORT_LIMITS.FILE_MAX_BYTES) {
      throw localError(`Файл «${f.name}» больше 10 МБ — уберите его или пришлите по почте`)
    }
    total += size
    if (total > SUPPORT_LIMITS.TOTAL_MAX_BYTES) {
      throw localError('Вложения слишком большие — суммарно до 16 МБ')
    }
  }

  const fields = [
    { name: 'topic', value: String(topicLabel || 'Другое') },
    { name: 'message', value: String(message || '') },
    { name: 'contact', value: String(contact || '') },
    { name: 'version', value: Constants?.expoConfig?.version || '' },
    { name: 'platform', value: Platform.OS === 'ios' ? 'iOS' : 'Android' },
  ]

  // Файлы читаем по одному: часть multipart = { name, filename, type, bytes }.
  // filename в заголовке — ASCII-транслит (см. шапку), настоящее имя —
  // в поле filenames (JSON-массив), воркер использует его для подписи
  // вложений в Telegram
  const parts = []
  const realNames = []
  for (let i = 0; i < files.length; i++) {
    const f = files[i]
    const bytes = await fileBytesOf(f.uri)
    realNames.push(String(f.name || '').slice(0, 120))
    parts.push({
      name: 'file',
      filename: asciiFilename(f.name, i),
      type: guessMimeFromName(f.name),
      bytes,
    })
  }
  if (realNames.length > 0) {
    fields.push({ name: 'filenames', value: JSON.stringify(realNames) })
  }

  // multipart-тело собираем руками — winter-fetch в Expo SDK 58 не
  // принимает RN-вариант FormData с файлами (см. шапку multipart.js)
  const { body, contentType } = buildMultipartBody([...fields, ...parts])
  const headers = { 'Content-Type': contentType }
  if (AI_CONFIG.proxyUrl && AI_CONFIG.proxySecret) {
    headers['X-NB-Secret'] = AI_CONFIG.proxySecret // тот же секрет, что у ИИ-запросов
  }

  // Таймаут 60 с (как у ИИ-запросов): обращения с вложениями до 16 МБ
  // на медленной сети грузятся дольше текстовых — 30 с не хватало
  // (отзыв Кати 21.11: обращение с картинкой падало в почту)
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), SUPPORT_LIMITS.TIMEOUT_MS)
  let res
  try {
    res = await fetch(url, { method: 'POST', headers, body, signal: ctrl.signal })
  } catch (e) {
    const err = new Error('Сервер не отвечает — проверьте интернет')
    err.network = true
    throw err
  } finally {
    clearTimeout(timer)
  }

  const data = await res.json().catch(() => null)
  if (res.ok && data?.ok) {
    return {
      ok: true,
      filesSent: data.files_sent || 0,
      filesFailed: data.files_failed || 0,
    }
  }
  // Канал доставки ещё не настроен (секреты TG_* не залиты на воркер) —
  // вызывающий код молча вернётся к почте, пользователь ничего не заметит
  if (res.status === 503 && data?.error === 'support_not_configured') {
    return { notConfigured: true }
  }
  // 400/413 — проблема в самом запросе (пустой текст, перебор вложений):
  // она воспроизводится и после повторного тапа, откат на почту её не
  // лечит — показываем текст и оставляем окно открытым
  if (res.status === 400 || res.status === 413) {
    throw localError(data?.error || `Сервер отклонил обращение (${res.status})`)
  }
  throw new Error(data?.error || `Сервер ответил ошибкой ${res.status}`)
}

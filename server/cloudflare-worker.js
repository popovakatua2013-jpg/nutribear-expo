// ═══════════════════════════════════════════════════════════════
//  NutriBear AI Proxy — Cloudflare Worker ОДНИМ ФАЙЛОМ
// ═══════════════════════════════════════════════════════════════
//  Зачем: ключ от ИИ не должен зашиваться в приложение (EXPO_PUBLIC_*
//  читаются из бандла). Воркер хранит ключ у себя (секрет Cloudflare)
//  и подставляет его в запросы. Приложение знает только адрес воркера.
//
//  Что умеет:
//   POST /v1/chat              — чат NutriBear: { messages } → { reply }
//   POST /v1/chat/completions  — OpenAI-протокол (фото еды, фразы), с капом
//   max_tokens и вырезкой stream/n (аудит 13.11)
//   POST /v1/audio/transcriptions — голосовой ввод (multipart, ≤ 5 МБ)
//   GET  /                     — проверка «жив ли воркер» из браузера
//
//  Настройка (после деплоя):
//   npx wrangler secret put AI_KEY      — ключ ИИ (sk-…)
//   npx wrangler secret put NB_SECRET   — общий секрет приложения
//     (необязательно, но НАСТОЯТЕЛЬНО: без него POST может слать кто угодно,
//      нашедший адрес воркера; в .env приложения — EXPO_PUBLIC_AI_PROXY_SECRET.
//      Важно (аудит 12.11): секрет с префиксом EXPO_PUBLIC_ зашивается в бандл
//      APK и извлекается реверс-инжинирингом — он затрудняет использование
//      воркера в обход приложения, но не делает его невозможным. Реальные
//      границы расходов — белый список моделей, лимиты тела/rate-limit)
//   [vars] в wrangler.toml              — AI_UPSTREAM, AI_MODEL
//                                         AI_ALLOWED_MODELS — белый список
//                                         моделей через запятую (по умолчанию
//                                         gpt-4o-mini, whisper-1, gpt-4o)
//
//  Деплой одной командой: npx wrangler deploy  (инструкция — README.md)
// ═══════════════════════════════════════════════════════════════

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-NB-Secret',
  'Access-Control-Max-Age': '86400',
}

// CORS только для своих клиентов (аудит 12.11): родное приложение
// (React Native) вообще не шлёт Origin, а в браузере воркер открывается
// только с localhost (отладка) и с самой страницы workers.dev. Любой
// другой сайт получает ответ БЕЗ CORS-заголовков и код 403 — чужая
// веб-страница больше не может гонять POST-запросы на воркер
function isOriginAllowed(origin) {
  if (!origin || origin === 'null') return true // нативное приложение, webview
  return /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(origin)
    || /https:\/\/[\w.-]+\.workers\.dev(\/|$)/.test(origin)
}

// Белый список моделей для passthrough: клиент больше не выбирает
// произвольную модель (раньше мог уйти в дорогую и слить баланс).
// Расширяется переменной AI_ALLOWED_MODELS («model1,model2»)
const DEFAULT_ALLOWED_MODELS = ['gpt-4o-mini', 'whisper-1', 'gpt-4o']

// Лимиты на вход /chat: без них любой, кто нашёл адрес воркера, мог
// прислать огромный массив messages (1000+ записей по 100 КБ) —
// баланс ключа утекал бы одним запросом. Реальные клиенты NutriBear
// присылают 1–12 коротких сообщений; лимит оставляет запас.
const MAX_CHAT_MESSAGES = 20
const MAX_MESSAGE_LEN = 4000          // символы в content
const MAX_BODY_BYTES = 256 * 1024     // жёсткий потолок JSON-тела
// Аудио (/audio/transcriptions) тяжелее JSON: минута MP3 ~480 КБ,
// прежний общий лимит 256 КБ не пускал записи длиннее ~25 секунд
// (аудит 13.11 №5). 5 МБ покрывают запись на несколько минут
const MAX_AUDIO_BYTES = 5 * 1024 * 1024
// Аудит 13.11 №4: кап max_tokens в passthrough — в 256 КБ JSON помещается
// max_tokens: 128000, один такой запрос стоил бы ~$0.50. Реальные запросы
// NutriBear шлют 200–250 токенов, 1000 — с запасом
const MAX_TOKENS_CAP = 1000
// Аудит 12.11: role 'system' убран из пользовательских сообщений —
// через него возможен prompt injection в обход системного промпта
// «Не назначай лечение». Системный промпт передаётся отдельным полем
// system и накладывается воркером сверху (см. маршрут /chat)
const ALLOWED_ROLES = new Set(['user', 'assistant'])

// Простейший rate limit в памяти изолята: 30 POST-запросов в минуту
// на IP. Изоляты перезапускаются, лимит не идеален — но наивный
// дренаж баланса ключа останавливает
const hits = new Map()
const RATE_LIMIT = 30
function rateLimited(ip) {
  const now = Date.now()
  const win = (hits.get(ip) || []).filter((t) => now - t < 60000)
  win.push(now)
  hits.set(ip, win)
  // Страховка от роста карты (аудит 13.11 iOS-15): прежний hits.clear()
  // при 5000 уникальных IP обнулял лимит и для честных пользователей —
  // атакующий с ботнетом сбрасывал его одним заходом. Теперь выкидываем
  // только устаревшие записи; полный сброс — крайний случай
  if (hits.size > 5000) {
    for (const [k, arr] of hits) {
      if (!arr.some((t) => now - t < 60000)) hits.delete(k)
    }
    if (hits.size > 5000) hits.clear()
  }
  return win.length > RATE_LIMIT
}

// Очистить и валидировать массив messages для /chat: пропускаем
// только записи с разрешённой ролью (user/assistant) и непустым
// строковым content. Длина каждой content ограничена MAX_MESSAGE_LEN.
// Возвращает безопасный массив (м.б. пустой) — пустой означает
// «ничего не спрашивать», воркер ответит ошибкой 400 ниже
export function sanitizeMessages(raw) {
  if (!Array.isArray(raw)) return []
  const out = []
  for (const m of raw.slice(0, MAX_CHAT_MESSAGES)) {
    if (!m || typeof m !== 'object' || Array.isArray(m)) continue
    const role = typeof m.role === 'string' ? m.role : 'user'
    if (!ALLOWED_ROLES.has(role)) continue
    const content = typeof m.content === 'string' ? m.content : String(m.content ?? '')
    if (!content) continue
    out.push({ role, content: content.slice(0, MAX_MESSAGE_LEN) })
  }
  return out
}

// Аудит 13.11 №4: passthrough /chat/completions больше не пересылает
// клиентские параметры расхода баланса как есть. Вырезаем stream
// (стрим держит соединение открытым и обходил бы rate limit), n
// (несколько ответов за один запрос), логи вероятностей и tools;
// max_tokens капаем потолком; temperature прижимаем к допустимым
// границам OpenAI (0–2). Остальное тело проходит без изменений
export function sanitizeChatParams(parsed) {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
  const out = { ...parsed }
  const mt = Number(out.max_tokens)
  out.max_tokens = Math.min(
    Number.isFinite(mt) && mt > 0 ? Math.floor(mt) : 600,
    MAX_TOKENS_CAP
  )
  for (const k of [
    'stream', 'n', 'logprobs', 'top_logprobs', 'best_of', 'echo',
    'logit_bias', 'tools', 'tool_choice', 'functions',
  ]) {
    delete out[k]
  }
  const t = Number(out.temperature)
  if (Number.isFinite(t)) out.temperature = Math.min(Math.max(t, 0), 2)
  else delete out.temperature
  return out
}

// Аудит 13.11 №5: аудио принимаем только multipart/form-data —
// произвольный бинарник не должен доходить до Whisper (баланс
// списывается за транскрипцию ошибки)
export function isAudioRequest(contentType) {
  return String(contentType || '')
    .toLowerCase()
    .startsWith('multipart/form-data')
}

// Аудит 13.11 №9: сравнение секрета в постоянном времени — хэшируем
// обе строки и сравниваем дайджесты XOR-ом без раннего выхода.
// Для статического секрета атака по времени незначима, но это
// бесплатная best practice
export async function secretMatch(provided, secret) {
  if (!provided || !secret) return false
  try {
    const enc = new TextEncoder()
    const [a, b] = await Promise.all([
      crypto.subtle.digest('SHA-256', enc.encode(String(provided))),
      crypto.subtle.digest('SHA-256', enc.encode(String(secret))),
    ])
    const va = new Uint8Array(a)
    const vb = new Uint8Array(b)
    let diff = 0
    for (let i = 0; i < va.length; i++) diff |= va[i] ^ vb[i]
    return diff === 0
  } catch {
    return false
  }
}

// Системный промпт чата NutriBear (можно заменить переменной AI_SYSTEM)
const DEFAULT_SYSTEM =
  'Ты — дружелюбный ИИ-нутрициолог приложения NutriBear (маскот — медвежонок). ' +
  'Отвечай кратко, по-русски, с конкретными советами про питание, воду, шаги и привычки. ' +
  'Не назначай лечение; при медицинских вопросах советуй врача.'

// Доступ к воркеру только своим клиентам (см. isOriginAllowed выше).
// Экспортируем для тестов
export { isOriginAllowed }

// Лимиты — экспорт для тестов
export const LIMITS = {
  MAX_CHAT_MESSAGES,
  MAX_MESSAGE_LEN,
  MAX_BODY_BYTES,
  MAX_AUDIO_BYTES,
  MAX_TOKENS_CAP,
  RATE_LIMIT,
}

// ── ответы ──────────────────────────────────────────────────────
const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS },
  })

// Ответ без CORS-заголовков: чужой сайт его не прочитает
const plain = (obj, status) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  })

// ── маршрутизация ───────────────────────────────────────────────
export default {
  async fetch(request, env) {
    const origin = request.headers.get('origin')
    if (request.method === 'OPTIONS') {
      // Preflight отвечаем только своим клиентам: чужой сайт не
      // получит CORS-заголовков и браузер сам не пошлёт POST
      return new Response(null, {
        status: 204,
        headers: isOriginAllowed(origin) ? CORS : {},
      })
    }

    const url = new URL(request.url)
    // нормализуем путь: отрезаем /v1, если приложению так удобнее
    let path = url.pathname.replace(/\/+$/, '')
    if (path === '/v1' || path.startsWith('/v1/')) path = path.slice(3) || '/'
    const upstream = (env.AI_UPSTREAM || 'https://api.proxyapi.ru/v1').replace(/\/+$/, '')
    const model = env.AI_MODEL || 'gpt-4o-mini'

    // Живая проверка из браузера: https://…workers.dev/ → { ok: true }
    if (request.method === 'GET') return json({ ok: true, service: 'nutribear-ai' })

    if (request.method !== 'POST') return json({ error: 'Метод не поддерживается' }, 405)

    // Чужие сайты под запретом (см. isOriginAllowed) — без CORS-заголовков
    if (!isOriginAllowed(origin)) {
      return plain({ error: 'Запросы из браузеров не поддерживаются' }, 403)
    }

    // Ранний отсев по Content-Length (аудит 12.11 + 13.11): для аудио
    // потолок 5 МБ, для JSON — 256 КБ. Заголовку клиент не верит — он
    // подделывается, поэтому фактический размер проверяем после чтения
    // тела (см. /chat, /chat/completions и аудио-ветку ниже)
    const cl = Number(request.headers.get('content-length') || 0)
    const earlyLimit = path === '/audio/transcriptions' ? MAX_AUDIO_BYTES : MAX_BODY_BYTES
    if (cl && cl > earlyLimit) {
      return json({ error: 'Тело запроса слишком большое' }, 413)
    }

    const key = env.AI_KEY
    if (!key) {
      return json(
        { error: 'Ключ не задан. Выполните: npx wrangler secret put AI_KEY' },
        500
      )
    }

    // Общий секрет приложения: если задан, POST без заголовка
    // x-nb-secret отклоняется. Секрет живёт в бандле приложения
    // (EXPO_PUBLIC_*), поэтому это заслон от случайного использования,
    // а не абсолютная защита от реверс-инжиниринга (аудит 12.11)
    if (env.NB_SECRET && !(await secretMatch(request.headers.get('x-nb-secret'), env.NB_SECRET))) {
      return json({ error: 'Требуется секрет приложения' }, 401)
    }

    // Rate limit на IP (см. RATE_LIMIT выше)
    const ip = request.headers.get('cf-connecting-ip') || 'unknown'
    if (rateLimited(ip)) {
      return json({ error: 'Слишком много запросов, попробуйте позже' }, 429)
    }

    // ── 1. Чат NutriBear: { messages, system? } → { reply } ────────
    if (path === '/chat') {
      try {
        // Честный лимит тела (аудит 12.11): читаем текстом и меряем
        // сами, а не верим Content-Length
        const text = await request.text()
        if (text.length > MAX_BODY_BYTES) {
          return json({ error: 'Тело запроса слишком большое' }, 413)
        }
        let raw = {}
        try {
          raw = JSON.parse(text || '{}')
        } catch {}
        // Валидация messages: только массив объектов с разрешённой
        // ролью (user/assistant) и непустым content, лимит на длину
        // и количество — иначе один прокси-запрос мог слить баланс
        // огромным промптом. Пустой массив после очистки — ошибка 400
        const messages = sanitizeMessages(raw?.messages)
        if (!messages.length) {
          return json(
            { error: 'Поле messages пустое или не содержит валидных записей' },
            400
          )
        }
        // Системный промпт: приложение присылает свой — по выбранному
        // помощнику (Кедр/Кира/Топаз/Бусинка/Фит). Если не передан —
        // используем дефолтный. Лимит 2000 символов — защита от сливания
        // баланса гигантским промптом
        let system = typeof raw?.system === 'string' ? raw.system.slice(0, 2000) : ''
        if (!system.trim()) system = env.AI_SYSTEM || DEFAULT_SYSTEM
        const res = await fetch(`${upstream}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${key}`,
          },
          body: JSON.stringify({
            model,
            messages: [{ role: 'system', content: system }, ...messages],
            temperature: 0.7,
            max_tokens: 600,
          }),
        })
        const data = await res.json().catch(() => null)
        const reply = data?.choices?.[0]?.message?.content
        if (reply) return json({ reply })
        return json(
          { error: data?.error?.message || `ИИ вернул пустой ответ (HTTP ${res.status})` },
          502
        )
      } catch (e) {
        return json({ error: `Сбой запроса к ИИ: ${e.message}` }, 502)
      }
    }

    // ── 2/3. OpenAI-протокол (фото еды, голос) — с проверками ─────
    if (path === '/chat/completions' || path === '/audio/transcriptions') {
      // Заголовки собираем ЯВНО: клиентские больше не пересылаются
      // as-is (раньше проходили любые — включая чужую Authorization)
      const fwd = new Headers({
        'Content-Type': request.headers.get('content-type') || 'application/json',
        Authorization: `Bearer ${key}`,
      })

      let body = request.body
      if (path === '/audio/transcriptions') {
        // Аудит 13.11 №5: только multipart, реальный размер после чтения
        // (Content-Length подделывается) и потолок 5 МБ вместо общих
        // 256 КБ, на которых минутная голосовая запись не помещалась
        if (!isAudioRequest(request.headers.get('content-type'))) {
          return json({ error: 'Ожидается multipart/form-data с аудиофайлом' }, 415)
        }
        const buf = await request.arrayBuffer()
        if (buf.byteLength > MAX_AUDIO_BYTES) {
          return json({ error: 'Аудио слишком большое (лимит 5 МБ)' }, 413)
        }
        body = buf
      }
      if (path === '/chat/completions') {
        // Белый список моделей: модель приходит в JSON-теле
        const text = await request.text()
        // Честный лимит тела (аудит 12.11): Content-Length подделывается,
        // проверяем фактический размер после чтения
        if (text.length > MAX_BODY_BYTES) {
          return json({ error: 'Тело запроса слишком большое' }, 413)
        }
        let parsed = {}
        try {
          parsed = JSON.parse(text || '{}')
        } catch {}
        const allowed = String(env.AI_ALLOWED_MODELS || DEFAULT_ALLOWED_MODELS.join(','))
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
        if (model && !allowed.includes(model)) allowed.push(model)
        if (!allowed.includes(String(parsed.model || ''))) {
          return json(
            { error: `Модель «${parsed.model}» не разрешена. Разрешены: ${allowed.join(', ')}` },
            400
          )
        }
        // Аудит 13.11 №4: кап max_tokens, вырезка stream/n/logprobs/tools —
        // клиент больше не управляет расходом баланса этими полями
        body = JSON.stringify(sanitizeChatParams(parsed)) // буферизованное тело
      }

      const res = await fetch(`${upstream}${path}`, {
        method: 'POST',
        headers: fwd,
        body, // json-текст или multipart-поток
      })
      const out = new Headers(res.headers)
      Object.entries(CORS).forEach(([k, v]) => out.set(k, v))
      return new Response(res.body, { status: res.status, headers: out })
    }

    return json({ error: `Неизвестный путь: ${url.pathname}` }, 404)
  },
}

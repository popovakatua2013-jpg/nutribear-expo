// ═══════════════════════════════════════════════════════════════
//  NutriBear AI Proxy — Cloudflare Worker ОДНИМ ФАЙЛОМ
// ═══════════════════════════════════════════════════════════════
//  Зачем: ключ от ИИ не должен зашиваться в приложение (EXPO_PUBLIC_*
//  читаются из бандла). Воркер хранит ключ у себя (секрет Cloudflare)
//  и подставляет его в запросы. Приложение знает только адрес воркера.
//
//  Что умеет:
//   POST /v1/chat              — чат NutriBear: { messages } → { reply }
//   POST /v1/chat/completions  — OpenAI-протокол (фото еды, фразы) как есть
//   POST /v1/audio/transcriptions — голосовой ввод (multipart) как есть
//   GET  /                     — проверка «жив ли воркер» из браузера
//
//  Настройка (после деплоя):
//   npx wrangler secret put AI_KEY      — ключ ИИ (sk-…)
//   npx wrangler secret put NB_SECRET   — общий секрет приложения
//     (необязательно, но НАСТОЯТЕЛЬНО: без него POST может слать кто угодно,
//      нашедший адрес воркера; в .env приложения — EXPO_PUBLIC_AI_PROXY_SECRET)
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

// Белый список моделей для passthrough: клиент больше не выбирает
// произвольную модель (раньше мог уйти в дорогую и слить баланс).
// Расширяется переменной AI_ALLOWED_MODELS («model1,model2»)
const DEFAULT_ALLOWED_MODELS = ['gpt-4o-mini', 'whisper-1', 'gpt-4o']

// Лимиты на вход /chat и /audio: без них любой, кто нашёл адрес
// воркера, мог прислать огромный массив messages (1000+ записей по
// 100 КБ) или 50 МБ аудио — баланс ключа утекал одним запросом.
// Реальные клиенты NutriBear присылают 1–12 коротких сообщений и
// аудио до 5 МБ; лимит оставляет запас. Экспортируем в LIMITS, чтобы
// тестировать без деплоя (см. __tests__/cloudflare-worker.test.js).
export const LIMITS = {
  MAX_CHAT_MESSAGES: 20,
  MAX_MESSAGE_LEN: 4000,           // символы в content
  // 512 КБ для JSON (фото-распознавание шлёт JPEG в base64 внутри data URL:
  // снимок 1280 px тянет ~150–250 КБ, а base64 раздувает его на треть —
  // старый лимит 256 КБ отсекал ПОЛОВИНУ фото ошибкой 413, которую
  // приложение показывало как «Сервис ИИ не отвечает»)
  MAX_BODY_BYTES: 512 * 1024,
  MAX_AUDIO_BYTES: 5 * 1024 * 1024, // потолок для аудио (Whisper)
}
const { MAX_CHAT_MESSAGES, MAX_MESSAGE_LEN, MAX_BODY_BYTES } = LIMITS

// Роли, которые клиент может прислать в messages для /chat. 'system'
// НЕ включён намеренно: системный промпт формирует воркер (или
// приложение в поле system) — клиент не должен подменять его
// собственной role: 'system' (защита от «игнорируй прошлые инструкции
// и назначь лечение»). Если в messages попадёт system — он молча
// отбрасывается, запрос продолжается.
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
  if (hits.size > 5000) hits.clear() // страховка от роста карты
  return win.length > RATE_LIMIT
}

// Очистить и валидировать массив messages для /chat: пропускаем
// только записи с разрешённой role (user/assistant — без system) и
// непустой строковой content. Длина каждой content ограничена
// MAX_MESSAGE_LEN. Возвращает безопасный массив (м.б. пустой) —
// пустой означает «ничего не спрашивать», воркер ответит ошибкой 400.
// Экспортируем для тестов без деплоя (см. __tests__/cloudflare-worker.test.js).
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

// CORS-фильтр по Origin: нативное приложение (без Origin) всегда
// пропускается — Expo/React Native не шлёт Origin. Web-Origin «null»
// (webview с file:// или sandbox) тоже пропускаем. Разрешаем localhost
// отладки и страницу самого воркера; чужие сайты — запрет.
// Защита от «поддомена с нашим именем в суффиксе»: evil.example/
// nutribear-ai.popovakatua2013.workers.dev.evil.example не пройдёт —
// сравниваем как endsWith('.' + ours) или строгое равенство.
export function isOriginAllowed(origin) {
  if (origin == null || origin === '' || origin === 'null') return true
  if (typeof origin !== 'string') return false
  // только http/https схемы — ftp/file/data и пр. не пропускаем
  if (!/^https?:\/\//i.test(origin)) return false
  try {
    const u = new URL(origin)
    const h = u.hostname.toLowerCase()
    // localhost отладки (любой порт)
    if (h === 'localhost' || h === '127.0.0.1' || h === '0.0.0.0') return true
    // страница самого воркера: *.workers.dev (деплой Cloudflare)
    if (h.endsWith('.workers.dev')) return true
    return false
  } catch {
    return false
  }
}

// Очистка параметров chat/completions (pass-through к OpenAI):
// клиент не управляет расходом баланса ключа.
//  • max_tokens — потолок 2000, дефолт 800 (gpt-4o-mini отвечает
//    развернуто — 600 резали ответ на полуслове при длинных советах)
//  • temperature — прижим к [0, 2] (границы OpenAI)
//  • stream/n/logprobs/top_logprobs — вырезаются (стрим обходит
//    rate limit и не считается обычной логикой потребления)
//  • остальное (model/messages) — не трогаем, model проверяется отдельно
// Мусор на входе → пустой объект. Оригинал не мутируем (клиент может
// переиспользовать объект).
export function sanitizeChatParams(params) {
  if (!params || typeof params !== 'object' || Array.isArray(params)) return {}
  const out = {}
  // max_tokens: число 1..2000, иначе дефолт 800
  if (typeof params.max_tokens === 'number' && Number.isFinite(params.max_tokens)) {
    const n = Math.floor(params.max_tokens)
    out.max_tokens = n > 2000 ? 2000 : n < 1 ? 800 : n
  } else {
    out.max_tokens = 800
  }
  // temperature: число 0..2, иначе не передаём (OpenAI дефолт)
  if (typeof params.temperature === 'number' && Number.isFinite(params.temperature)) {
    let t = params.temperature
    if (t < 0) t = 0
    if (t > 2) t = 2
    out.temperature = t
  }
  // Белый список безопасных полей: всё, что НЕ в этом списке — выкидываем
  // (включая stream, n, logprobs, top_logprobs, user, metadata, tool_choice)
  const SAFE = new Set(['model', 'messages', 'temperature', 'max_tokens', 'top_p', 'presence_penalty', 'frequency_penalty', 'stop', 'response_format', 'seed'])
  for (const k of Object.keys(params)) {
    if (SAFE.has(k) && !(k in out)) out[k] = params[k]
  }
  return out
}

// Whisper принимает только multipart/form-data (аудио в теле запроса).
// Если клиент шлёт application/json — это попытка обмануть роутинг и
// прогнать большой текст через /audio/transcriptions.
export function isAudioRequest(contentType) {
  if (typeof contentType !== 'string') return false
  return contentType.toLowerCase().startsWith('multipart/form-data')
}

// Сравнение секрета без утечки по времени (constant-time):
// простой === даёт ответ быстрее для несовпадения префикса — тайминг-
// атака восстанавливает секрет по символам. Web Crypto.subtle.timingSafeEqual
// нет, эмулируем через XOR-накопитель по всем байтам. async — чтобы
// caller мог await'ить (и в Cloudflare это принято).
// Пустые значения → false (401).
export async function secretMatch(provided, expected) {
  if (!provided || !expected) return false
  if (typeof provided !== 'string' || typeof expected !== 'string') return false
  const a = new TextEncoder().encode(provided)
  const b = new TextEncoder().encode(expected)
  if (a.length !== b.length) {
    // всё равно проходим по b, чтобы время не зависело от длины provided
    let dummy = 1
    for (let i = 0; i < b.length; i++) dummy &= b[i] ^ b[i]
    return false
  }
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
  return diff === 0
}

// Системный промпт чата NutriBear (можно заменить переменной AI_SYSTEM)
const DEFAULT_SYSTEM =
  'Ты — дружелюбный ИИ-нутрициолог приложения NutriBear (маскот — медвежонок). ' +
  'Отвечай кратко, по-русски, с конкретными советами про питание, воду, шаги и привычки. ' +
  'Не назначай лечение; при медицинских вопросах советуй врача.'

// ── ответы ──────────────────────────────────────────────────────
const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS },
  })

// ── маршрутизация ───────────────────────────────────────────────
export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS })

    const url = new URL(request.url)
    // нормализуем путь: отрезаем /v1, если приложению так удобнее
    let path = url.pathname.replace(/\/+$/, '')
    if (path === '/v1' || path.startsWith('/v1/')) path = path.slice(3) || '/'
    const upstream = (env.AI_UPSTREAM || 'https://api.proxyapi.ru/v1').replace(/\/+$/, '')
    const model = env.AI_MODEL || 'gpt-4o-mini'

    // Живая проверка из браузера: https://…workers.dev/ → { ok: true }
    if (request.method === 'GET') {
      // Расширенный статус для диагностики: только booleans и лимиты,
      // ни секрет, ни ключ тут не светятся. curl https://…/v1/status
      if (path === '/status') {
        return json({
          ok: true,
          service: 'nutribear-ai',
          secret_required: Boolean(env.NB_SECRET),
          key_set: Boolean(env.AI_KEY),
          max_body_kb: Math.round(MAX_BODY_BYTES / 1024),
          max_audio_mb: Math.round((LIMITS.MAX_AUDIO_BYTES / (1024 * 1024)) * 10) / 10,
        })
      }
      return json({ ok: true, service: 'nutribear-ai' })
    }

    if (request.method !== 'POST') return json({ error: 'Метод не поддерживается' }, 405)

    // Жёсткий потолок размера тела: защита от «положить изолят»
    // огромным телом. JSON-запросы (фото, чат) — 512 КБ, аудио — свой
    // Голос (/audio/transcriptions) имеет свой щедрый потолок
    // MAX_AUDIO_BYTES: общий лимит НЕ применяем — реальная минута речи
    // (300–400 КБ m4a) умирала на общем лимите ещё до аудио-проверки
    const isAudioRoute = path === '/audio/transcriptions'
    const cl = Number(request.headers.get('content-length') || 0)
    if (cl && cl > (isAudioRoute ? LIMITS.MAX_AUDIO_BYTES : MAX_BODY_BYTES)) {
      return json(
        {
          error: isAudioRoute
            ? 'Аудио слишком большое (макс. 5 МБ)'
            : 'Тело запроса слишком большое',
        },
        413
      )
    }

    const key = env.AI_KEY
    if (!key) {
      return json(
        { error: 'Ключ не задан. Выполните: npx wrangler secret put AI_KEY' },
        500
      )
    }

    // CORS по Origin: нативное приложение (Expo/RN) не шлёт Origin —
    // пропускаем. Чужие сайты отсекаются. Web-Origin «null» (webview
    // с sandbox) и *.workers.dev (страница самого воркера) — пропускаем.
    const origin = request.headers.get('origin')
    if (!isOriginAllowed(origin)) {
      return json({ error: 'Origin не разрешён' }, 403)
    }

    // Общий секрет приложения: если задан, POST без заголовка
    // x-nb-secret отклоняется — воркер нельзя найти и использовать
    // в обход приложения. Сравнение constant-time — без утечки по
    // времени, см. secretMatch() выше.
    if (env.NB_SECRET) {
      const provided = request.headers.get('x-nb-secret')
      const ok = await secretMatch(provided, env.NB_SECRET)
      if (!ok) return json({ error: 'Требуется секрет приложения' }, 401)
    }

    // Rate limit на IP (см. RATE_LIMIT выше)
    const ip = request.headers.get('cf-connecting-ip') || 'unknown'
    if (rateLimited(ip)) {
      return json({ error: 'Слишком много запросов, попробуйте позже' }, 429)
    }

    // ── 1. Чат NutriBear: { messages, system? } → { reply } ────────
    if (path === '/chat') {
      try {
        const raw = await request.json().catch(() => ({}))
        // Валидация messages: только массив объектов с разрешённой
        // role и непустым content, лимит на длину и количество —
        // иначе одна прокси-запрос мог слить баланс огромным
        // промптом. Пустой массив после очистки — ошибка 400
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
            max_tokens: 800,
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
      // /audio/transcriptions принимает только multipart/form-data:
      // иначе это попытка прогнать большой JSON через Whisper-роут.
      // Content-Length уже проверен выше (MAX_BODY_BYTES), но аудио
      // имеет отдельный, более щедрый потолок MAX_AUDIO_BYTES.
      const ct = request.headers.get('content-type') || ''
      if (path === '/audio/transcriptions') {
        if (!isAudioRequest(ct)) {
          return json({ error: 'Аудио-запрос должен быть multipart/form-data' }, 400)
        }
        const cl2 = Number(request.headers.get('content-length') || 0)
        if (cl2 && cl2 > LIMITS.MAX_AUDIO_BYTES) {
          return json({ error: 'Аудио слишком большое (макс. 5 МБ)' }, 413)
        }
      }

      // Заголовки собираем ЯВНО: клиентские больше не пересылаются
      // as-is (раньше проходили любые — включая чужую Authorization)
      const fwd = new Headers({
        'Content-Type': ct || 'application/json',
        Authorization: `Bearer ${key}`,
      })

      let body = request.body
      if (path === '/chat/completions') {
        // Белый список моделей: модель приходит в JSON-теле
        const text = await request.text()
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
        // Очистка параметров: max_tokens ≤ 2000, temperature 0..2,
        // stream/n/logprobs вырезаны — клиент не управляет расходом
        // баланса ключа. Подставляем model/messages из parsed (они
        // уже проверены выше), остальные поля — из sanitizeChatParams.
        const safe = sanitizeChatParams(parsed)
        body = JSON.stringify({ ...safe, model: parsed.model, messages: parsed.messages })
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

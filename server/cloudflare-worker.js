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

// Лимиты на вход /chat: без них любой, кто нашёл адрес воркера, мог
// прислать огромный массив messages (1000+ записей по 100 КБ) —
// баланс ключа утекал бы одним запросом. Реальные клиенты NutriBear
// присылают 1–12 коротких сообщений; лимит оставляет запас.
const MAX_CHAT_MESSAGES = 20
const MAX_MESSAGE_LEN = 4000          // символы в content
const MAX_BODY_BYTES = 256 * 1024     // жёсткий потолок тела запроса
const ALLOWED_ROLES = new Set(['system', 'user', 'assistant'])

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
// только записи с разрешённой role и непустой строковой content.
// Длина каждой content ограничена MAX_MESSAGE_LEN. Возвращает
// безопасный массив (м.б. пустой) — пустой означает «ничего не
// спрашивать», воркер ответит ошибкой 400 ниже
function sanitizeMessages(raw) {
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
    if (request.method === 'GET') return json({ ok: true, service: 'nutribear-ai' })

    if (request.method !== 'POST') return json({ error: 'Метод не поддерживается' }, 405)

    // Жёсткий потолок размера тела: раньше любой, кто нашёл адрес
    // воркера, мог прислать тело в десятки мегабайт и положить
    // изолят (или хотя бы потратить процесс). Реальные запросы
    // NutriBear — это 1–20 КБ JSON или <1 МБ аудио
    const cl = Number(request.headers.get('content-length') || 0)
    if (cl && cl > MAX_BODY_BYTES) {
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
    // x-nb-secret отклоняется — воркер нельзя найти и использовать
    // в обход приложения
    if (env.NB_SECRET && request.headers.get('x-nb-secret') !== env.NB_SECRET) {
      return json({ error: 'Требуется секрет приложения' }, 401)
    }

    // Rate limit на IP (см. RATE_LIMIT выше)
    const ip = request.headers.get('cf-connecting-ip') || 'unknown'
    if (rateLimited(ip)) {
      return json({ error: 'Слишком много запросов, попробуйте позже' }, 429)
    }

    // ── 1. Чат NutriBear: { messages } → { reply } ────────────────
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
        const res = await fetch(`${upstream}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${key}`,
          },
          body: JSON.stringify({
            model,
            messages: [{ role: 'system', content: env.AI_SYSTEM || DEFAULT_SYSTEM }, ...messages],
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
        body = text // буферизованное тело — поток уже прочитан
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

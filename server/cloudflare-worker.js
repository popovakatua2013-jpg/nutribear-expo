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
//   [vars] в wrangler.toml              — AI_UPSTREAM, AI_MODEL
//
//  Деплой одной командой: npx wrangler deploy  (инструкция — README.md)
// ═══════════════════════════════════════════════════════════════

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
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

    const key = env.AI_KEY
    if (!key) {
      return json(
        { error: 'Ключ не задан. Выполните: npx wrangler secret put AI_KEY' },
        500
      )
    }

    // ── 1. Чат NutriBear: { messages } → { reply } ────────────────
    if (path === '/chat') {
      try {
        const { messages = [] } = await request.json()
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

    // ── 2/3. OpenAI-протокол как есть (фото еды, голос) ───────────
    if (path === '/chat/completions' || path === '/audio/transcriptions') {
      const headers = new Headers(request.headers)
      headers.delete('host')
      headers.set('Authorization', `Bearer ${key}`)
      const res = await fetch(`${upstream}${path}`, {
        method: 'POST',
        headers,
        body: request.body, // поток: json или multipart — без разницы
      })
      const out = new Headers(res.headers)
      Object.entries(CORS).forEach(([k, v]) => out.set(k, v))
      return new Response(res.body, { status: res.status, headers: out })
    }

    return json({ error: `Неизвестный путь: ${url.pathname}` }, 404)
  },
}

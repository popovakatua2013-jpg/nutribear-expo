// ═══════════════════════════════════════════════════════════════
//  НАСТРОЙКИ ИИ NUTRIBEAR — ключ теперь хранится в файле .env
// ═══════════════════════════════════════════════════════════════
//  СЕКРЕТНЫЙ КЛЮЧ здесь НЕ пишем — он лежит в файле .env в корне
//  проекта (nutribear-expo\.env) и НЕ публикуется на GitHub.
//
//  Этот файл менять дальше не нужно.

export const AI_CONFIG = {
  // Адрес прокси: по умолчанию ProxyAPI (https://api.proxyapi.ru/v1)
  baseUrl: process.env.EXPO_PUBLIC_AI_BASE_URL || 'https://api.proxyapi.ru/v1',
  // Ключ — только из .env, в коде его нет
  apiKey: process.env.EXPO_PUBLIC_AI_KEY || '',
  model: process.env.EXPO_PUBLIC_AI_MODEL || 'gpt-4o-mini',
  voiceModel: process.env.EXPO_PUBLIC_AI_VOICE_MODEL || '',
}
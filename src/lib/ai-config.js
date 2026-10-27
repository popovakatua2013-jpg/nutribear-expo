// ═══════════════════════════════════════════════════════════════
//  НАСТРОЙКИ ИИ NUTRIBEAR — ключ теперь хранится в файле .env
// ═══════════════════════════════════════════════════════════════
//  СЕКРЕТНЫЙ КЛЮЧ здесь НЕ пишем — он лежит в файле .env в корне
//  проекта (nutribear-expo\.env) и НЕ публикуется на GitHub.
//
//  Как настроить:
//  1. Откройте папку проекта → создайте там файл .env (Блокнотом).
//  2. Впишите строку (пример для ProxyAPI):
//       EXPO_PUBLIC_AI_KEY=sk-ваш-ключ
//     При необходимости можно задать и остальное (иначе — значения ниже):
//       EXPO_PUBLIC_AI_BASE_URL=https://api.proxyapi.ru/v1
//       EXPO_PUBLIC_AI_MODEL=gpt-4o-mini
//       EXPO_PUBLIC_AI_VOICE_MODEL=whisper-1
//  3. Сохраните и перезапустите Expo: npx expo start --clear
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

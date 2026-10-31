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
//  ── ПЕРЕД ВЫПУСКОМ В МАГАЗИН ────────────────────────────────────
//  Всё, что начинается с EXPO_PUBLIC_, зашивается в бандл — включая
//  ключ из .env: пользователь APK/IPA сможет его достать. Для релиза:
//  1. Поднимите бесплатный сервер-прокси ОДНОЙ КОМАНДОЙ — готовый
//     воркер лежит в папке server/ (cloudflare-worker.js + wrangler.toml),
//     пошаговая инструкция с тремя командами — server/README.md:
//       npx wrangler login → npx wrangler secret put AI_KEY → npx wrangler deploy
//  2. В .env впишите ТОЛЬКО адрес прокси (ключ в приложение не грузится):
//       EXPO_PUBLIC_AI_PROXY_URL=https://nutribear-ai.ваш-аккаунт.workers.dev/v1
//  3. Приложение само поймёт режим: запросы пойдут на прокси без
//     Authorization — ключ навсегда останется на сервере.
//  Пока EXPO_PUBLIC_AI_PROXY_URL не задан, работает прямой режим
//  с ключом из .env (удобно для разработки на своём ПК).
//
//  Этот файл менять дальше не нужно.

export const AI_CONFIG = {
  // Адрес прокси: по умолчанию ProxyAPI (https://api.proxyapi.ru/v1)
  baseUrl: process.env.EXPO_PUBLIC_AI_BASE_URL || 'https://api.proxyapi.ru/v1',
  // Ключ — только из .env, в коде его нет
  apiKey: process.env.EXPO_PUBLIC_AI_KEY || '',
  model: process.env.EXPO_PUBLIC_AI_MODEL || 'gpt-4o-mini',
  voiceModel: process.env.EXPO_PUBLIC_AI_VOICE_MODEL || '',
  // Сервер-прокси для релиза: если задан — запросы идут сюда без ключа,
  // ключ хранится только на сервере. См. «ПЕРЕД ВЫПУСКОМ В МАГАЗИН» выше.
  proxyUrl: process.env.EXPO_PUBLIC_AI_PROXY_URL || '',
}

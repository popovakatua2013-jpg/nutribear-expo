// ИИ-помощник NutriBear: HTTP-запрос к серверу + офлайн-режим.
//
// Два режима адреса (первый выигрывает, если задан):
//  1. СЕРВЕР-ПРОКСИ (релиз): EXPO_PUBLIC_AI_PROXY_URL в .env — запросы
//     идут на свой Cloudflare Worker, ключ ИИ хранится на сервере и не
//     попадает в бандл. Готовый воркер одним файлом — server/
//     cloudflare-worker.js, деплой одной командой — server/README.md.
//  2. ВЕБ-ВЕРСИЯ НА ПК (разработка): Next.js сервер на ПК с роутом
//     POST /api/chat. В Expo Go адрес ПК доступен из
//     Constants.expoConfig.hostUri («192.168.x.x:8081») — меняем порт
//     на 3000 и получаем адрес веб-версии.
// Если сервера нет — отвечает встроенный офлайн-помощник по реальным
// данным дневника (калории, вода, шаги, вес, ИМТ).

import Constants from 'expo-constants'
import { AI_CONFIG } from './ai-config'
import { useCompanionStore, companionSystemPrompt } from '@/store/useCompanionStore'

export function getChatApiUrl() {
  // Режим прокси: { messages } → { reply } на /chat воркера.
  // Аудит 13.11 №8: адрес прокси обязан быть https:// — конфиг с
  // http:// отправлял бы переписку и фото в открытом виде. Некорректное
  // значение игнорируем: приложение откатится на dev-режим или
  // офлайн-помощника, а не станет слать данные в небезопасный канал
  const proxy = (AI_CONFIG.proxyUrl || '').replace(/\/+$/, '')
  if (proxy && !/^https:\/\//i.test(proxy)) {
    console.warn(
      '[chat] EXPO_PUBLIC_AI_PROXY_URL должен начинаться с https:// — значение игнорируется'
    )
  } else if (proxy) {
    return `${proxy}/chat`
  }

  // Режим разработки: веб-версия на том же ПК, где запущен Expo
  const hostUri = Constants.expoConfig?.hostUri
  if (!hostUri || typeof hostUri !== 'string') return null
  const host = hostUri.split(':')[0]
  if (!host) return null
  return `http://${host}:3000/api/chat`
}

// Переносы строк в ответе ИИ: приводим \r\n и «залитые» литеральные \n
// (случается при двойном кодировании на сервере) к настоящим переводам
// строк — иначе ответ приходит сплошной кашей без абзацев
function normalizeReply(s) {
  return String(s).replace(/\r\n/g, '\n').replace(/\\n/g, '\n').trim()
}

// Системный промпт по текущему помощнику: Pro (Фит) — дерзкий,
// Premium (Топаз/Бусинка) — расширенный, Free (Кедр/Кира) — базовый.
// Если помощник не выбран — null, воркер использует свой DEFAULT_SYSTEM
function currentCompanionSystemPrompt() {
  try {
    const companionId = useCompanionStore.getState().companionId
    return companionSystemPrompt(companionId)
  } catch {
    return null
  }
}

// Системный промпт запроса с личным контекстом дневника: характер
// медведя (по выбранному помощнику) + имя, пол и цифры дня (калории,
// вода, шаги, вес/ИМТ) — иначе онлайн-ИИ отвечает абстрактно, хотя
// офлайн-помощник знает дневник. Воркер режет system до 2000 символов
// (аудит 13.11) — держим промпт компактным и режем сами с запасом
export function buildCompanionSystem(ctx = null) {
  const base = currentCompanionSystemPrompt() || ''
  if (!ctx) return base || null
  const lines = []
  const who = String(ctx.name || '').trim().split(/\s+/)[0].slice(0, 24)
  if (who) lines.push(`Пользователя зовут ${who}.`)
  if (ctx.sex === 'female') lines.push('Пользователь — девушка (обращайся в женском роде).')
  else if (ctx.sex) lines.push('Пользователь — мужчина.')
  if (Number.isFinite(ctx.goal) && ctx.goal > 0) {
    const eaten = Number.isFinite(ctx.eaten) ? Math.max(0, ctx.eaten) : 0
    lines.push(`Сегодня съедено ${eaten} из ${ctx.goal} ккал, осталось ${Math.max(0, Math.round(ctx.goal - eaten))}.`)
  }
  if (Number.isFinite(ctx.waterGoal) && ctx.waterGoal > 0) {
    lines.push(`Вода: ${Number.isFinite(ctx.waterMl) ? ctx.waterMl : 0} из ${ctx.waterGoal} мл.`)
  }
  if (Number.isFinite(ctx.stepsGoal) && ctx.stepsGoal > 0) {
    lines.push(`Шаги: ${Number.isFinite(ctx.steps) ? ctx.steps : 0} из ${ctx.stepsGoal}.`)
  }
  if (ctx.bmi) lines.push(`Вес ${ctx.weightKg} кг, рост ${ctx.heightCm} см, ИМТ ${ctx.bmi}.`)
  else if (Number.isFinite(ctx.weightKg) && ctx.weightKg > 0) lines.push(`Вес ${ctx.weightKg} кг.`)
  if (!lines.length) return base || null
  const sys =
    base +
    '\n\nДанные дневника пользователя на сегодня (используй, когда уместно, не пересылай дальше):\n' +
    lines.map((l) => '- ' + l).join('\n')
  return sys.slice(0, 2000)
}

// Реальный ИИ: POST { messages, system? } → { reply } (как в веб-версии).
// system — системный промпт помощника; если не передан, берём из стора.
// Таймаут 25 с: модель на мобильной сети часто отвечает дольше 8 с —
// прежний таймаут молчно отправлял пользователя к офлайн-ответам
// (у фото и голоса свой потолок — 45 с в food-ai.js)
export async function askNutritionist(messages, timeoutMs = 25000, systemOverride = null) {
  const url = getChatApiUrl()
  if (!url) throw new Error('no-server')

  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const headers = { 'Content-Type': 'application/json' }
    // Общий секрет прокси (если настроен на воркере — NB_SECRET)
    if (AI_CONFIG.proxySecret) headers['X-NB-Secret'] = AI_CONFIG.proxySecret
    // Системный промпт: приоритет у явного параметра, иначе — помощник
    const system = systemOverride ?? currentCompanionSystemPrompt()
    const body = system ? { messages, system } : { messages }
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: ctrl.signal,
    })
    const data = await res.json()
    if (data && data.reply) return normalizeReply(data.reply)
    throw new Error((data && data.error) || 'empty')
  } finally {
    clearTimeout(timer)
  }
}

// Офлайн-помощник: ответы по ключевым словам с данными пользователя
// и его целью — явные цели (похудеть / набрать / поддержать) спрашиваем
// раньше ветки «вес/ИМТ», чтобы «набрать вес» не уходил в ответ про ИМТ
export function offlineReply(text, ctx) {
  const q = (text || '').toLowerCase()
  const has = (...words) => words.some((w) => q.includes(w))

  if (has('привет', 'здравств', 'добрый', 'хай')) {
    return 'Привет! 🐻 Я помощник NutriBear. Могу рассказать, сколько калорий вы съели, как дела с водой и шагами, помочь с весом и ИМТ. Спросите!'
  }

  if (has('съел', 'съела', 'калор', 'ккал', 'остал', 'дневник', 'еда')) {
    const left = ctx.goal - ctx.eaten
    const done = Math.min(100, Math.round((ctx.eaten / Math.max(1, ctx.goal)) * 100))
    return `Сегодня вы съели ${ctx.eaten} из ${ctx.goal} ккал (${done}% нормы). ` +
      (left > 0
        ? `Осталось ${left} ккал — это примерно ${Math.max(1, Math.round(left / 550))} полноценных приёма пищи. 🍽`
        : 'Норма на сегодня уже выбрана — если голодно, лучше лёгкий перекус: овощи, кефир или яйцо.')
  }

  if (has('вода', 'пить', 'пью', 'пьё', 'жажд')) {
    const pct = Math.min(100, Math.round((ctx.waterMl / Math.max(1, ctx.waterGoal)) * 100))
    const left = Math.max(0, ctx.waterGoal - ctx.waterMl)
    return `Вода: ${ctx.waterMl} из ${ctx.waterGoal} мл (${pct}%). ` +
      (left > 0
        ? `Осталось примерно ${Math.ceil(left / 250)} стаканов. Держите бутылку на виду — так пьётся само. 💧`
        : 'Норма выполнена — отличная работа! 💧')
  }

  if (has('шаг', 'ходьб', 'прогул', 'актив')) {
    const pct = Math.min(100, Math.round((ctx.steps / Math.max(1, ctx.stepsGoal)) * 100))
    return `Шаги: ${ctx.steps} из ${ctx.stepsGoal} (${pct}%). ` +
      (pct >= 100
        ? 'Цель дня закрыта — можно и отдохнуть! 🎉'
        : `До цели ${ctx.stepsGoal - ctx.steps} шагов — это минут 15–20 спокойной прогулки. 🚶`)
  }

  if (has('похуд', 'худе', 'снизить вес', 'сброс', 'скинуть')) {
    return 'Главное — небольшой, но стабильный дефицит калорий и больше движения в быту. ' +
      `Ваш ориентир на сегодня — ${ctx.goal} ккал. Не падайте ниже 1200 ккал и худейте не быстрее 0,5–1 кг в неделю. 🐻`
  }

  if (has('набрать', 'набор', 'потолстет')) {
    return 'Для набора веса нужен небольшой профицит и достаточно белка в каждом приёме пищи. ' +
      `Ваш ориентир на сегодня — ${ctx.goal} ккал. ` +
      'Силовые тренировки помогут расти в мышцах, а не в жире. 🐻'
  }

  if (has('поддержать', 'поддержива', 'удержать', 'удержива')) {
    return 'Поддерживать вес — это про стабильные привычки: та же норма калорий, вода и движение каждый день. ' +
      `Ваш ориентир — ${ctx.goal} ккал. Удерживать форму — уже победа. ⚖️`
  }

  if (has('вес', 'имт', 'взвес', 'фигур')) {
    if (!ctx.bmi) return 'Запишите свой вес и рост в разделе «Тело» — и я подскажу, как дела.'
    const cat =
      ctx.bmi < 18.5 ? 'ниже нормы' :
      ctx.bmi < 25 ? 'в норме' :
      ctx.bmi < 30 ? 'избыточный вес' : 'ожирение'
    return `Ваш ИМТ — ${ctx.bmi} (${cat}) при весе ${ctx.weightKg} кг и росте ${ctx.heightCm} см. ` +
      (ctx.bmi < 18.5
        ? 'Вес ниже нормы — аккуратный профицит 300–500 ккал и силовые дадут набор без вреда. 💪'
        : ctx.bmi < 25
          ? 'Держать такой режим — уже победа. 👏'
          : 'Мягкий дефицит 300–500 ккал и ежедневные прогулки дают устойчивый результат без стресса.')
  }

  if (has('белок', 'бжу', 'протеин', 'мышц')) {
    return 'Белок — база любой цели: на дефиците бережёт мышцы и даёт сытость, на наборе — строительный материал. ' +
      'Ориентир — 1,2–2 г на кг веса: творог, яйца, рыба, курица, бобовые. Раскладывайте белок по всем приёмам пищи.'
  }

  if (has('спасиб', 'благодар')) {
    return 'Всегда рад помочь! 🐻💚 Маленькие шаги каждый день — и результат придёт.'
  }

  if (has('что делать', 'совет', 'как начать', 'помоги')) {
    return 'Три простых шага: 1) держите норму калорий по дневнику, 2) закрывайте норму воды, 3) проходите 7–10 тысяч шагов. ' +
      'Начните с чего-то одного сегодня — остальное подтянется.'
  }

  return 'Я офлайн-помощник и подскажу по дневнику: калории, вода, шаги, вес и ИМТ. ' +
    'А полный ИИ-нутрициолог включится, как только появится сеть. Спросите, например: «Сколько калорий я съел?»'
}

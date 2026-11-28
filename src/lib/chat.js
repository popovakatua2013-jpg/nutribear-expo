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
  // Режим прокси: { messages } → { reply } на /chat воркера
  const proxy = (AI_CONFIG.proxyUrl || '').replace(/\/+$/, '')
  if (proxy) return `${proxy}/chat`

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

// Сборка системного промпта для ИИ-чата: характер выбранного медведя +
// личный контекст дневника пользователя. app/ai-chat.jsx вызывает её
// с данными сторов и передаёт результат в askNutritionist(next, t, sys).
//
// Контекст добавляется безопасно — никаких NaN/undefined/мусора при
// пустых полях (профиль ещё не заполнен, цель не задана и т.д.):
//  • name — только первое слово (без фамилии, как Катя просила:
//    отзыв «Иришки» — «не нужно показывать мои данные направо-налево»)
//  • sex → «мужчина» / «женщина» (медведь обращается правильно)
//  • eaten/goal — «съедено 1200 из 1800 ккал» (только если оба числа
//    валидны и goal > 0; иначе не упоминаем, чтобы не было «NaN из 0»)
//  • water/steps — то же правило
//  • вес/ИМТ — только если вес И рост > 0 (нули означают «не заполнено»)
//
// Без ctx (null/undefined) — только характер медведя, без цифр дня:
// так подсказка остаётся личной, но не светит чужому ИИ дневник при
// первом запуске. Лимит 2000 символов — воркер и так обрезает, но мы
// подстраховываемся, чтобы промпт не раздувался (баланс ключа ИИ).
export function buildCompanionSystem(ctx) {
  let companionId = 'kedr'
  try {
    companionId = useCompanionStore.getState().companionId || 'kedr'
  } catch {
    // стор недоступен (тест безpersist) — остаётся Кедр по умолчанию
  }
  const base = companionSystemPrompt(companionId) || companionSystemPrompt('kedr')

  // Без контекста — только характер. Так первый промпт при холодном
  // старте не светит цифры дня (на случай, если пользователь ещё не
  // заполнил профиль — не делаем из ИИ «следователя»)
  if (!ctx || typeof ctx !== 'object') return base

  const lines = [base]

  // Имя: только первое слово (без фамилии)
  if (typeof ctx.name === 'string' && ctx.name.trim()) {
    const firstName = ctx.name.trim().split(/\s+/)[0]
    if (firstName) lines.push(`Имя пользователя: ${firstName}.`)
  }

  // Пол: мужской/женский — медведь обращается правильно («Куда пропал?» /
  // «Куда пропала?», «Катя, булочки?»)
  if (ctx.sex === 'male' || ctx.sex === 'm') {
    lines.push('Пол: мужчина.')
  } else if (ctx.sex === 'female' || ctx.sex === 'f') {
    lines.push('Пол: женщина.')
  }

  // Калории дня: «съедено 1200 из 1800 ккал». Если goal ≤ 0 — пропускаем,
  // чтобы не получилось «NaN из 0» или «1200 из 0». eaten=0 валиден
  // (пользователь ничего не ел сегодня) — это нужно ИИ знать.
  if (Number.isFinite(ctx.eaten) && Number.isFinite(ctx.goal) && ctx.goal > 0) {
    lines.push(`Сегодня съедено ${ctx.eaten} из ${ctx.goal} ккал.`)
  }

  // Вода: «1500 из 2000 мл» — только если цель задана
  if (Number.isFinite(ctx.waterMl) && Number.isFinite(ctx.waterGoal) && ctx.waterGoal > 0) {
    lines.push(`Вода: ${ctx.waterMl} из ${ctx.waterGoal} мл.`)
  }

  // Шаги: «6000 из 10000» — только если цель задана
  if (Number.isFinite(ctx.steps) && Number.isFinite(ctx.stepsGoal) && ctx.stepsGoal > 0) {
    lines.push(`Шаги: ${ctx.steps} из ${ctx.stepsGoal}.`)
  }

  // Нутриенты дня + ПРАВИЛО по выполненным нормам (правка Кати 28.11:
  // «Норма по жирам выполнена, при этом медведь советует ещё масло.
  // Так не должно быть… То же самое проверь с остальными продуктами»):
  // ИИ видит Б/Ж/У/клетчатку с нормами и обязан НЕ предлагать продукты,
  // богатые тем нутриентом, чья норма уже закрыта (жиры закрыты —
  // никакого масла/орехов/авокадо/жареного; углеводы — без каш, хлеба,
  // фруктов и сладкого; белки — без крупных порций мяса/рыбы/творога/яиц).
  // Калории закрыты — приёмы пищи не предлагать вовсе. Строки только при
  // валидных нормах (norm > 0) — без «NaN из undefined»
  const b = ctx.bju || null
  const n = ctx.norms || null
  if (b && n) {
    const doneList = []
    if (Number.isFinite(n.p) && n.p > 0) {
      lines.push(`Белки: ${b.p || 0} из ${n.p} г.`)
      if ((b.p || 0) >= n.p) doneList.push('белки')
    }
    if (Number.isFinite(n.f) && n.f > 0) {
      lines.push(`Жиры: ${b.f || 0} из ${n.f} г.`)
      if ((b.f || 0) >= n.f) doneList.push('жиры')
    }
    if (Number.isFinite(n.c) && n.c > 0) {
      lines.push(`Углеводы: ${b.c || 0} из ${n.c} г.`)
      if ((b.c || 0) >= n.c) doneList.push('углеводы')
    }
    if (Number.isFinite(n.fib) && n.fib > 0) {
      lines.push(`Клетчатка: ${b.fib || 0} из ${n.fib} г.`)
      if ((b.fib || 0) >= n.fib) doneList.push('клетчатка')
    }
    if (
      Number.isFinite(ctx.eaten) &&
      Number.isFinite(ctx.goal) &&
      ctx.goal > 0 &&
      ctx.eaten >= ctx.goal
    ) {
      doneList.push('калории')
    }
    lines.push(
      'ПРАВИЛО ПО НУТРИЕНТАМ: советы и продукты подбирай по тому, что уже съедено за день. ' +
      (doneList.length
        ? `Сегодня нормы уже выполнены по: ${doneList.join(', ')} — по ним ничего жирного/богатого не предлагай. `
        : '') +
      'Выполнены жиры — никакого масла, орехов, авокадо, жирной молочки, жирного мяса и жареного; ' +
      'выполнены углеводы — без каш, хлеба, макарон, фруктов и сладкого; ' +
      'выполнены белки — без крупных порций мяса, рыбы, творога, яиц и бобовых. ' +
      'Предлагай только то, чего реально не хватает, лёгкие варианты (овощи, зелень, чай, вода) ' +
      'или скажи прямо, что дневные нормы закрыты.'
    )
  }

  // Вес/рост/ИМТ — только если оба > 0 (нули означают «не заполнено»).
  // Иначе в промпт попадало бы «Вес 0 кг, рост 0 см, ИМТ NaN».
  if (ctx.weightKg > 0 && ctx.heightCm > 0) {
    lines.push(`Вес ${ctx.weightKg} кг, рост ${ctx.heightCm} см.`)
    if (Number.isFinite(ctx.bmi) && ctx.bmi > 0) {
      lines.push(`ИМТ ${ctx.bmi}.`)
    }
  }

  const result = lines.join(' ')
  // Подстраховка от раздувания (воркер режет system до 2000 в любом
  // случае, но мы не хотим слать гигантский промпт — это тратит токены)
  return result.length > 2000 ? result.slice(0, 2000) : result
}

// Реальный ИИ: POST { messages, system? } → { reply } (как в веб-версии).
// system — системный промпт помощника; если не передан, берём из стора
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
    return 'Три простых шага: 1) держите норму калорий по питанию, 2) закрывайте норму воды, 3) проходите 7–10 тысяч шагов. ' +
      'Начните с чего-то одного сегодня — остальное подтянется.'
  }

  return 'Я офлайн-помощник и подскажу по вашим данным: калории, вода, шаги, вес и ИМТ. ' +
    'А полный ИИ-нутрициолог включится, как только появится сеть. Спросите, например: «Сколько калорий я съел?»'
}

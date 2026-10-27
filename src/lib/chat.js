// ИИ-помощник NutriBear: HTTP-запрос к веб-версии (/api/chat) + офлайн-режим.
//
// Веб-версия приложения — это Next.js сервер на ПК с роутом POST /api/chat
// (z-ai-web-dev-sdk). В Expo Go адрес ПК доступен из Constants.expoConfig.hostUri
// («192.168.x.x:8081») — меняем порт на 3000 и получаем адрес веб-версии.
// Если сервер недоступен — отвечает встроенный офлайн-помощник по реальным
// данным дневника (калории, вода, шаги, вес, ИМТ).

import Constants from 'expo-constants'

// Адрес веб-версии на том же ПК, где запущен Expo (тот же Wi-Fi)
export function getChatApiUrl() {
  const hostUri = Constants.expoConfig?.hostUri
  if (!hostUri || typeof hostUri !== 'string') return null
  const host = hostUri.split(':')[0]
  if (!host) return null
  return `http://${host}:3000/api/chat`
}

// Реальный ИИ: POST { messages } → { reply } (как в веб-версии)
export async function askNutritionist(messages, timeoutMs = 8000) {
  const url = getChatApiUrl()
  if (!url) throw new Error('no-server')

  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
      signal: ctrl.signal,
    })
    const data = await res.json()
    if (data && data.reply) return data.reply
    throw new Error((data && data.error) || 'empty')
  } finally {
    clearTimeout(timer)
  }
}

// Офлайн-помощник: ответы по ключевым словам с данными пользователя
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

  if (has('вес', 'имт', 'взвес', 'фигур')) {
    if (!ctx.bmi) return 'Запишите свой вес и рост в разделе «ИМТ» — и я подскажу, как дела.'
    const cat =
      ctx.bmi < 18.5 ? 'ниже нормы' :
      ctx.bmi < 25 ? 'в норме' :
      ctx.bmi < 30 ? 'избыточный вес' : 'ожирение'
    return `Ваш ИМТ — ${ctx.bmi} (${cat}) при весе ${ctx.weightKg} кг и росте ${ctx.heightCm} см. ` +
      (ctx.bmi >= 18.5 && ctx.bmi < 25
        ? 'Держать такой режим — уже победа. 👏'
        : 'Мягкий дефицит 300–500 ккал и ежедневные прогулки дают устойчивый результат без стресса.')
  }

  if (has('похуд', 'снизить вес', 'худе', 'сброс')) {
    return 'Главное — небольшой, но стабильный дефицит калорий и больше движения в быту. ' +
      `Ваш ориентир на сегодня — ${ctx.goal} ккал. Не падайте ниже 1200 ккал и худейте не быстрее 0,5–1 кг в неделю. 🐻`
  }

  if (has('белок', 'бжу', 'протеин', 'мышц')) {
    return 'Белок — лучший друг при снижении веса: сохраняет мышцы и даёт сытость. ' +
      'Ориентир — 1,2–1,6 г на кг веса: творог, яйца, рыба, курица, бобовые. Раскладывайте белок по всем приёмам пищи.'
  }

  if (has('спасиб', 'благодар')) {
    return 'Всегда рад помочь! 🐻💚 Маленькие шаги каждый день — и результат придёт.'
  }

  if (has('что делать', 'совет', 'как начать', 'помоги')) {
    return 'Три простых шага: 1) держите норму калорий по дневнику, 2) закрывайте норму воды, 3) проходите 7–10 тысяч шагов. ' +
      'Начните с чего-то одного сегодня — остальное подтянется.'
  }

  return 'Я офлайн-помощник и подскажу по дневнику: калории, вода, шаги, вес и ИМТ. ' +
    'А полный ИИ-нутрициолог включается, когда на компьютере запущена веб-версия NutriBear (npm run dev). Спросите, например: «Сколько калорий я съел?»'
}

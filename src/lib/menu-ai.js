// ИИ-меню на неделю (Premium, этап 2 монетизации) — генерация и разбор ответа.
//
// Канал тот же, что у фото и голоса: POST /chat/completions через
// food-ai.postJson — прокси-воркер режет max_tokens до 1000, поэтому
// ответ модели держим КОМПАКТНЫМ: блюдо — строка «Название|граммы|ккал»,
// неделя — {"w":[[завтрак, обед, ужин, перекус] × 7]} (примерно 500 токенов).
//
// Честность: сеть недоступна, таймаут или невалидный JSON → меню всё
// равно собирается — офлайн-сборкой из встроенной базы блюд (food-ai
// LOCAL_DISHES), вызывающий код видит source: 'offline' и подписывает
// тост «собрано без ИИ». generateWeekMenu не бросает исключений
// (кроме программных ошибок) — модалке не нужно разбирать ошибки сети.
//
// Все функции чистые, кроме generateWeekMenu — тестируются без сети.

import { AI_CONFIG } from './ai-config'
import { LOCAL_DISHES, postJson, parseAiJson } from './food-ai'

// Генерация недели дольше фото/голоса (45 с): модель пишет весь план
export const MENU_TIMEOUT_MS = 60000

const MENU_SYSTEM =
  'Ты — нутрициолог приложения NutriBear. Составляешь сбалансированное меню на неделю ' +
  'из простых домашних блюд и обычных продуктов. Отвечай ТОЛЬКО валидным JSON, ' +
  'без пояснений и без markdown.'

// ── Промпт: компактный запрос + пример формата ─────────────────────
export function buildMenuMessages({ kcal, prefs = '', goal = '' }) {
  const target = Math.round(Number(kcal) || 0)
  const prefsText = String(prefs || '').trim()
  const lines = [
    `Составь меню ровно на 7 дней (Пн–Вс) на ${target} ккал в день.`,
    'Приёмы по калорийности: завтрак ~25%, обед ~35%, ужин ~30%, перекус ~10%.',
    goal ? `Цель пользователя: ${goal}.` : '',
    prefsText ? `Пожелания пользователя: ${prefsText}.` : '',
    'Обычные продукты из российского магазина, простые домашние блюда.',
    'Одно и то же блюдо не повторяй в меню чаще одного раза за неделю.',
    'Порции реалистичные: каша 200–300 г, мясо или рыба 120–180 г, суп 250–350 г, овощи 100–200 г, фрукт 100–200 г, йогурт 150–250 г.',
    'Ответ — только JSON вида {"w":[[завтрак,обед,ужин,перекус], ...]} — 7 дней, каждый приём — массив из 1–2 блюд, блюдо — строка "Название|граммы|ккал порции".',
    'Пример одного дня: [["Овсянка на молоке|250|255"],["Борщ|300|147","Куриная грудка отварная|150|206"],["Гречка отварная|180|198","Салат овощной|150|45"],["Яблоко|150|71"]]',
  ]
  return [
    { role: 'system', content: MENU_SYSTEM },
    { role: 'user', content: lines.filter(Boolean).join('\n') },
  ]
}

// ── Эмодзи блюда по ключевым словам (локальная эвристика) ──────────
const EMOJI_RULES = [
  [/борщ|суп|щи|уха|солянк|рассольн|окрошк|бульон/, '🍲'],
  [/паста|макарон|спагетти|болоньезе/, '🍝'],
  [/пицц/, '🍕'],
  [/бургер|гамбургер|чизбургер/, '🍔'],
  [/ролл|суши/, '🍣'],
  [/пельмен|вареник/, '🥟'],
  [/куриц|грудк|индейк|утк|гусь/, '🍗'],
  [/говядин|свинин|телятин|баранин|котлет|тефтел|шашлык|гуляш|плов|стейк/, '🍖'],
  [/рыб|лосос|сёмг|треск|минтай|горбуша|скумбр|сельд|тунец|креветк|кальмар/, '🐟'],
  [/салат|овощ|винегрет|капуст|кабачк|брокколи|огурц|помидор/, '🥗'],
  [/гречк|рис|перловк|булгур|кускус|квиноа|плов/, '🍚'],
  [/каш|овсян|пшён|манн|ячнев|геркулес/, '🥣'],
  [/омлет|яичниц|яйцо|яйца/, '🍳'],
  [/сырник|блин|оладь/, '🥞'],
  [/творог|запеканк|пудинг/, '🍮'],
  [/йогурт|кефир|молок|ряженк|снежок|айран/, '🥛'],
  [/сыр/, '🧀'],
  [/хлеб|бутерброд|тост|батон|лаваш|лепёшк/, '🍞'],
  [/банан/, '🍌'],
  [/яблок/, '🍎'],
  [/апельсин|мандарин|грейпфрут|лимон/, '🍊'],
  [/груш/, '🍐'],
  [/виноград/, '🍇'],
  [/ягод|клубник|малин|черник|вишн|черешн/, '🍓'],
  [/орех|миндал|кешью|фисташк/, '🥜'],
  [/кофе/, '☕'],
  [/чай/, '🍵'],
  [/сок|морс|компот|смузи|напиток/, '🥤'],
  [/шоколад/, '🍫'],
  [/пирож|пирог|кекс|маффин/, '🧁'],
  [/сосиск|колбас|ветчин/, '🌭'],
  [/бобов|фасол|нут|чечевиц|горох/, '🫘'],
  [/гриб/, '🍄'],
  [/авокадо/, '🥑'],
  [/хачапури|чебурек|беляш|самса/, '🥯'],
]

export function guessEmoji(name) {
  const s = String(name || '').toLowerCase()
  for (const [re, emoji] of EMOJI_RULES) {
    if (re.test(s)) return emoji
  }
  return '🍽️'
}

// ── Разбор ответа модели → 7 дней плана ────────────────────────────
const MEAL_ORDER = ['breakfast', 'lunch', 'dinner', 'snack']
const clamp = (n, min, max) => Math.max(min, Math.min(max, n))
const numFrom = (s) => Number(String(s ?? '').replace(',', '.').replace(/[^\d.]/g, '')) || 0

function parseDish(str) {
  const parts = String(str ?? '').split('|').map((p) => p.trim())
  const name = (parts[0] || '').replace(/\s+/g, ' ').trim().slice(0, 60)
  const rawGrams = numFrom(parts[1])
  const rawKcal = numFrom(parts[2])
  // Отсутствующие или нулевые значения — мусорный ответ, а не повод
  // клампить к границам: такое блюдо в план не попадает
  if (!name || rawGrams < 1 || rawKcal < 1) throw new Error('bad-dish')
  const grams = Math.round(clamp(rawGrams, 20, 800))
  const kcal = Math.round(clamp(rawKcal, 5, 2000))
  return {
    name,
    emoji: guessEmoji(name),
    grams,
    kcal,
    // калорийность на 100 г — по ней пересчитывается порция в планере
    kcal100: Math.round((kcal / grams) * 1000) / 10,
    source: 'ai',
  }
}

function parseMenuDay(day) {
  if (!Array.isArray(day) || day.length !== MEAL_ORDER.length) throw new Error('bad-day')
  return MEAL_ORDER.reduce((acc, mealId, i) => {
    const meal = day[i]
    if (!Array.isArray(meal) || meal.length === 0 || meal.length > 2) throw new Error('bad-meal')
    acc[mealId] = meal.map(parseDish)
    return acc
  }, {})
}

/** Ответ модели → 7 дней меню. Бросает, если форма не недельная. */
export function parseMenuReply(content) {
  const data = parseAiJson(content)
  const week = data?.w
  if (!Array.isArray(week) || week.length !== 7) throw new Error('bad-week')
  return week.map(parseMenuDay)
}

// ── Офлайн-сборка недели из встроенной базы блюд ───────────────────
// Пулы названий строго из LOCAL_DISHES (n) — при правке базы сверяться.
// Выбор по дню детерминированный (день = индекс со сдвигами), без
// Math.random — чистая функция, одинаковый результат для одинаковых данных.
const POOL = {
  breakfast: ['Овсянка на молоке', 'Омлет', 'Сырники', 'Творог 5%', 'Яичница', 'Творожная запеканка', 'Каша пшённая', 'Блинчики', 'Бутерброд с сыром', 'Каша манная на молоке'],
  soup: ['Борщ', 'Суп куриный', 'Щи', 'Рассольник', 'Суп овощной', 'Гороховый суп', 'Уха', 'Суп с фрикадельками', 'Окрошка', 'Солянка мясная'],
  main: ['Куриная грудка отварная', 'Котлета мясная', 'Говядина отварная', 'Плов', 'Гуляш из говядины', 'Котлета куриная', 'Треска отварная', 'Горбуша запечённая', 'Лосось запечённый', 'Курица отварная', 'Тефтели', 'Пельмени варёные'],
  garnish: ['Гречка отварная', 'Рис отварной', 'Макароны отварные', 'Картофельное пюре', 'Перловка отварная', 'Картофель отварной'],
  salad: ['Салат овощной', 'Винегрет', 'Цезарь с курицей'],
  snack: ['Яблоко', 'Банан', 'Кефир 1%', 'Йогурт питьевой', 'Апельсин', 'Ряженка', 'Мандарин', 'Груша', 'Виноград'],
}

// name → запись базы (точное совпадение; при расхождении строка отпадает)
const DISH_BY_NAME = new Map(LOCAL_DISHES.map((d) => [d.n, d]))

function poolDishes(names) {
  return names.map((n) => DISH_BY_NAME.get(n)).filter(Boolean)
}

function dishItem(dish, grams) {
  const g = Math.round(clamp(grams, 20, 700))
  return {
    name: dish.n,
    emoji: dish.e || guessEmoji(dish.n),
    grams: g,
    kcal: Math.round((dish.kcal100 * g) / 100),
    kcal100: dish.kcal100,
    source: 'local',
  }
}

/** Меню недели без сети: 7 дней × 4 приёма, порции масштабируются под
 * целевую калорийность (коэффициент 0,5–1,6 — честные порции). */
export function fallbackWeekMenu(kcal) {
  const target = clamp(Math.round(Number(kcal) || 1800), 1200, 4500)
  const pools = {
    breakfast: poolDishes(POOL.breakfast),
    soup: poolDishes(POOL.soup),
    main: poolDishes(POOL.main),
    garnish: poolDishes(POOL.garnish),
    salad: poolDishes(POOL.salad),
    snack: poolDishes(POOL.snack),
  }
  const days = []
  for (let d = 0; d < 7; d++) {
    // Индексы подобраны так, чтобы за неделю как можно меньше повторов:
    // завтрак и суп — без единого повтора, гарнир/перекус повторяются
    // естественно (гречка дважды за неделю — это норма)
    const side = d % 2 === 0 ? pools.garnish : pools.salad
    const breakfast = [pools.breakfast[(d * 3 + 0) % pools.breakfast.length]]
    const lunch = [
      pools.soup[(d * 3 + 1) % pools.soup.length],
      pools.main[d % pools.main.length],
    ]
    const dinner = [
      pools.main[(pools.main.length / 2 + d) % pools.main.length],
      side[(d * 2 + 3) % side.length],
    ]
    const snack = [pools.snack[(d * 2 + 5) % pools.snack.length]]
    const natural = [...breakfast, ...lunch, ...dinner, ...snack]
      .reduce((n, dish) => n + (dish.kcal100 * dish.dg) / 100, 0)
    const scale = clamp(target / Math.max(1, natural), 0.5, 1.6)
    days.push({
      breakfast: breakfast.map((x) => dishItem(x, x.dg * scale)),
      lunch: lunch.map((x) => dishItem(x, x.dg * scale)),
      dinner: dinner.map((x) => dishItem(x, x.dg * scale)),
      snack: snack.map((x) => dishItem(x, x.dg * scale)),
    })
  }
  return days
}

// ── Главная функция: ИИ с честным офлайн-фолбэком ───────────────────
/** Возвращает { days: [7 дней], source: 'ai' | 'offline' }.
 * days[i] = { breakfast, lunch, dinner, snack } — элементы в формате
 * addItem плана меню (name/emoji/grams/kcal/kcal100/source). */
export async function generateWeekMenu(opts = {}) {
  try {
    const data = await postJson(
      '/chat/completions',
      {
        model: AI_CONFIG.model,
        messages: buildMenuMessages(opts),
        temperature: 0.7,
        max_tokens: 1000,
      },
      MENU_TIMEOUT_MS,
    )
    const content = data?.choices?.[0]?.message?.content
    if (!content) throw new Error('empty')
    return { days: parseMenuReply(content), source: 'ai' }
  } catch (e) {
    // Сеть, таймаут, кап токенов или невалидный JSON — не пугаем
    // пользователя красной ошибкой, собираем честное меню из базы
    console.warn('[menu-ai] ИИ недоступен, собираю меню из встроенной базы:', e?.message || e)
    return { days: fallbackWeekMenu(opts.kcal), source: 'offline' }
  }
}

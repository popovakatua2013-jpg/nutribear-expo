// ═══════════════════════════════════════════════════════════════
//  Open Food Facts: внешний поиск продуктов
// ═══════════════════════════════════════════════════════════════
//  Наша встроенная база — 827 продуктов (foods.js + foods-big + foods-
//  extra + foods-more + foods-requests + три XL-набора + брендовые
//  «по поставщикам» foods-brands/-2/-3 + фастфуд сетей foods-fastfood). Конкуренты
//  (MFP) хвастаются «миллионами», потому что у них своя серверная БД.
//  Мы подключаем Open Food Facts (https://world.openfoodfacts.org) —
//  бесплатную открытую базу на ~2.5 млн продуктов со всего мира.
//
//  Два способа найти:
//   1. По имени (search.pl) — для запроса «хачапури», «тофу», «кокосовое молоко»
//   2. По штрих-коду (api/v0/product/[code]) — для сканера (камера → EAN-13)
//
//  Результаты парсятся в наш формат {id, name, kcal, p, f, c, fib, sug,
//  defaultGrams, tags, source:'off', barcode?} — совместимый с FOODS,
//  чтобы AddFoodModal добавлял их в дневник как обычный продукт.
//
//  Кеш в useOffCacheStore — найденные продукты сохраняются локально
//  (AsyncStorage), повторный поиск по тому же запросу не ходит в сеть.

import Constants from 'expo-constants'

const OFF_SEARCH_URL = 'https://world.openfoodfacts.org/cgi/search.pl'
const OFF_BARCODE_URL = 'https://world.openfoodfacts.org/api/v0/product'
const OFF_V2_SEARCH_URL = 'https://world.openfoodfacts.org/api/v2/search'
const PAGE_SIZE = 20

// User-Agent: OFF просит указывать приложение + версия (для статистики
// и чтобы нас не забанили как бота). Expo даёт userAgent, но OFF хочет
// явную строку.
function ua() {
  const v = Constants.expoConfig?.version || '1.0.0'
  return `NutriBear/${v} (Android; nutrition tracker)`
}

// Распознать приём пищи по имени продукта (для tags). Эвристика:
// «хачапури» → lunch, «молоко» → breakfast, «вино» → snack и т.д.
// Не идеально, но лучше, чем пустой tags (пользователь не найдёт
// продукт в обеденной категории).
function guessTags(name = '') {
  const n = name.toLowerCase()
  const tags = []
  // Завтрак: каши, йогурты, молоко, сырники, яйца, хлеб, кофе
  if (/каша|йогурт|молоко|кефир|творог|сырник|яйц|омлет|хлеб|кофе|мюсл|гранол|блин|сироп/.test(n)) {
    tags.push('breakfast')
  }
  // Обед: суп, плов, паста, борщ, котлета, рис, гречка
  if (/суп|плов|паста|борщ|котлет|рис|гречк|плов|лагман|харчо|пельмен|вареник/.test(n)) {
    tags.push('lunch')
  }
  // Ужин: рыба, курица, мясо, индейка, овощи
  if (/рыб|куриц|мясо|индейк|овощ|стейк|гуляш|рагу|запекан/.test(n)) {
    tags.push('dinner')
  }
  // Перекус: шоколад, конфета, печенье, орехи, фрукт, ягоды
  if (/шоколад|конфет|печенье|орех|фрукт|ягод|чипс|сухофрукт|мармелад|зефир/.test(n)) {
    tags.push('snack')
  }
  // Если ничего не подошло — показываем во всех (пусть пользователь сам решит)
  if (tags.length === 0) tags.push('breakfast', 'lunch', 'dinner', 'snack')
  return tags
}

// Дефолтная порция: если OFF не дал serving_size, ставим 100 г.
// Если есть «30 г» или «1 шт (45 г)» — берём число перед «г/g/гр/gr».
// \b в JS regex ASCII-only (не работает с кириллицей), поэтому
// используем lookahead на пробел/конец строки/не-букву.
function parseDefaultGrams(serving) {
  if (!serving || typeof serving !== 'string') return 100
  // Ищем «NN г» / «NN g» / «NN гр» / «NN gr» — кириллица и латиница
  const m = serving.match(/(\d+(?:[.,]\d+)?)\s*(?:гр|gr|г|g)(?=\s|$|[^\wа-яёa-z])/i)
  if (m) {
    const n = parseFloat(m[1].replace(',', '.'))
    if (n > 0 && n < 1000) return Math.round(n)
  }
  return 100
}

// Распарсить один продукт OFF в наш формат. Пропускаем продукты без
// названия или без kcal (они бесполезны для дневника).
export function parseOFFProduct(p) {
  if (!p || typeof p !== 'object') return null
  const name = p.product_name || p.product_name_ru || p.generic_name || ''
  if (!name || name.length < 2) return null
  const nm = p.nutriments || {}
  // ККАЛ (правка Кати 26.11: «штрихкоды российской молочки»): у многих
  // записей энергия живёт только в кДж (energy_100g), а поле
  // energy-kcal_100g равно 0 или отсутствует — раньше «0 ккал» проходил
  // как валидный и продукт показывался с нулевой калорийностью.
  // Теперь: положительные energy-kcal_100g берём как есть, иначе
  // переводим кДж в ккал; нулевая/отсутствующая энергия по обоим полям
  // — запись неполная, для дневника не годится (не показываем)
  let kcalVal = null
  const kcalDirect = Number(nm['energy-kcal_100g'])
  if (Number.isFinite(kcalDirect) && kcalDirect > 0) {
    kcalVal = kcalDirect
  } else if (nm.energy_100g != null) {
    const e = Number(nm.energy_100g)
    if (Number.isFinite(e) && e > 0) {
      // По спеке OFF energy_100g хранится в кДж (молоко 60 ккал =
      // 250 кДж, масло 900 ккал = 3700 кДж) — переводим ВСЕГДА:
      // эвристика «> 1500 — кДж» ошибалась на средней калорийности
      // (кефир 167 кДж = 40 ккал раньше проходил как «167 ккал»)
      kcalVal = Math.round(e / 4.184)
    }
  }
  if (kcalVal == null || !Number.isFinite(kcalVal) || kcalVal <= 0) return null

  const num = (v) => {
    if (v == null) return 0
    const n = Number(v)
    return Number.isFinite(n) && n >= 0 ? n : 0
  }

  return {
    // id с префиксом off- + barcode (если есть) или хэш имени —
    // чтобы не пересекался с встроенной базой (oatmeal, big-mackerel…)
    id: p.code ? `off-${p.code}` : `off-${name.slice(0, 20).replace(/\s+/g, '-')}`,
    name: name.slice(0, 80), // защита от длинных имён
    emoji: '📦', // OFF не даёт картинку-иконку, ставим нейтральную
    kcal: Math.round(kcalVal),
    p: num(nm.proteins_100g),
    f: num(nm.fat_100g),
    c: num(nm.carbohydrates_100g),
    fib: num(nm.fiber_100g),
    sug: num(nm.sugars_100g),
    defaultGrams: parseDefaultGrams(p.serving_size),
    tags: guessTags(name),
    source: 'off',
    barcode: p.code || null,
    brand: p.brands || null,
  }
}

// Поиск по имени: возвращает до PAGE_SIZE продуктов.
// cache — опционально: объект кеша (key → items), чтобы caller мог
// проверить кеш ДО сетевого запроса (см. useOffCacheStore).
export async function searchOpenFoodFacts(query, opts = {}) {
  const q = (query || '').trim()
  if (q.length < 2) return []
  const timeoutMs = opts.timeoutMs || 6000
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const url =
      `${OFF_SEARCH_URL}?search_terms=${encodeURIComponent(q)}` +
      `&search_simple=1&action=process&json=1&page_size=${PAGE_SIZE}` +
      `&fields=code,product_name,product_name_ru,generic_name,brands,serving_size,nutriments`
    const res = await fetch(url, {
      headers: { 'User-Agent': ua() },
      signal: ctrl.signal,
    })
    if (!res.ok) return []
    const data = await res.json().catch(() => null)
    const products = data?.products || []
    const out = []
    for (const p of products) {
      const parsed = parseOFFProduct(p)
      if (parsed) out.push(parsed)
    }
    return out
  } catch {
    // Сеть упала / таймаут / OFF недоступен — возвращаем пусто,
    // caller покажет «ничего не найдено» или предложит ИИ-оценку
    return []
  } finally {
    clearTimeout(timer)
  }
}

// Поиск по штрих-коду (EAN-13). Для сканера камерой — пользователь
// навёл на штрих-код, мы получили 13 цифр, ищем в OFF.
// Резервный источник — поиск v2 по коду (правка Кати 26.11: «штрихкоды
// российской молочки»): записи российской молочки часто есть в базе,
// но одиночный эндпойнт v0 возвращает status=0 (запись не «завершена»);
// поиск v2 по точному коду находит и незавершённые записи — если у них
// есть название и калорийность, продукт распознаётся
async function barcodeV2Fallback(code, timeoutMs) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const url =
      `${OFF_V2_SEARCH_URL}?code=${code}` +
      '&fields=code,product_name,product_name_ru,generic_name,brands,serving_size,nutriments'
    const res = await fetch(url, { headers: { 'User-Agent': ua() }, signal: ctrl.signal })
    if (!res.ok) return null
    const data = await res.json().catch(() => null)
    const products = data?.products || []
    for (const p of products) {
      // Строгий парс: запись должна иметь настоящее название и ккал
      const parsed = parseOFFProduct(p)
      if (parsed) return parsed
    }
    return null
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

export async function getFoodByBarcode(code, opts = {}) {
  const c = String(code || '').replace(/\D/g, '')
  if (c.length < 8) return null // EAN-8/EAN-13/UPC-A — минимум 8 цифр
  const timeoutMs = opts.timeoutMs || 6000
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const url = `${OFF_BARCODE_URL}/${c}.json?fields=code,product_name,product_name_ru,generic_name,brands,serving_size,nutriments`
    const res = await fetch(url, {
      headers: { 'User-Agent': ua() },
      signal: ctrl.signal,
    })
    if (res.ok) {
      const data = await res.json().catch(() => null)
      if (data?.status === 1) {
        const parsed = parseOFFProduct(data.product)
        if (parsed) return parsed
      }
    }
    // v0 не нашёл завершённую запись или она без названия/ккал —
    // пробуем поиск v2 по точному коду (незавершённые записи)
    return await barcodeV2Fallback(c, timeoutMs)
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

// Проверка, является ли id продуктом из OFF (для UI: показывать «📦 из
// Open Food Facts» в карточке продукта)
export function isOFFProduct(food) {
  return Boolean(food && food.source === 'off')
}

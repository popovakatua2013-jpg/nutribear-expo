// РЕАЛЬНОЕ распознавание еды — напрямую через OpenAI-совместимый API
// (ключ хранится в файле .env в корне проекта, на GitHub не попадает).
//
// ЭКОНОМИЯ ДЕНЕГ (запросы к ИИ стоят денег!):
//   1. Встроенная база ~85 популярных блюд — КБЖУ берётся отсюда бесплатно.
//   2. Кэш на телефоне — один раз оценили блюдо, дальше бесплатно навсегда.
//   3. Простые фразы («борщ 300 грамм») разбираются БЕЗ ИИ — бесплатно.
//   4. Укороченные ответы ИИ + защита от двойных запросов.
// Платный запрос остаётся только там, где без ИИ никак: фото и сложные фразы.
//
// scanFoodImage(uri)       — фото → [{ name, emoji, kcal100, p, f, c, defaultGrams }]
// recognizeVoiceText(text) — фраза → { text, grams, items: [...] }
// recognizeVoiceAudio(b64) — запись → speech-to-text → recognizeVoiceText
// estimateByName(name)     — название → { kcal100, p, f, c, source }
// estimateFromDescription(text) — состав с граммовками → { kcal100, p, f, c }

import { File, Paths } from 'expo-file-system'
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator'
import { AI_CONFIG } from './ai-config'

const TIMEOUT_MS = 45000

const VISION_SYSTEM =
  'Ты — нутрициолог приложения NutriBear. Определяешь блюдо по фотографии. ' +
  'Отвечай ТОЛЬКО валидным JSON, без пояснений и без markdown.'

const VOICE_SYSTEM =
  'Ты — помощник дневника питания NutriBear. Из русской фразы о еде извлекаешь ' +
  'название блюда и вес порции. Отвечай ТОЛЬКО валидным JSON, без пояснений.'

// ═══════════════════════════════════════════════════════════════
//  ВСТРОЕННАЯ БАЗА ПОПУЛЯРНЫХ БЛЮД — на 100 грамм (бесплатно!)
//  n — название, e — эмодзи, dg — обычная порция (г), al — синонимы
// ═══════════════════════════════════════════════════════════════
const LOCAL_DISHES = [
  // Супы
  { n: 'Борщ', e: '🍲', kcal100: 49, p: 2.6, f: 2.9, c: 5.5, dg: 300, al: ['борщ украинский'] },
  { n: 'Борщ со свининой', e: '🍲', kcal100: 55, p: 2.8, f: 3.2, c: 5.8, dg: 300 },
  { n: 'Суп овощной', e: '🥣', kcal100: 38, p: 1.5, f: 1.2, c: 6.0, dg: 300, al: ['овощной суп'] },
  { n: 'Суп куриный', e: '🥣', kcal100: 36, p: 2.5, f: 1.8, c: 2.5, dg: 300, al: ['куриный суп'] },
  { n: 'Суп с фрикадельками', e: '🥣', kcal100: 55, p: 3.0, f: 3.0, c: 4.5, dg: 300 },
  { n: 'Щи', e: '🥣', kcal100: 38, p: 1.8, f: 2.0, c: 4.0, dg: 300 },
  { n: 'Рассольник', e: '🥣', kcal100: 42, p: 1.8, f: 1.8, c: 5.5, dg: 300 },
  { n: 'Солянка мясная', e: '🥣', kcal100: 68, p: 4.0, f: 4.5, c: 4.0, dg: 300, al: ['солянка'] },
  { n: 'Уха', e: '🥣', kcal100: 30, p: 3.0, f: 1.0, c: 2.0, dg: 300 },
  { n: 'Гороховый суп', e: '🥣', kcal100: 66, p: 4.5, f: 2.0, c: 8.5, dg: 300 },
  { n: 'Окрошка', e: '🥣', kcal100: 60, p: 2.0, f: 2.5, c: 7.0, dg: 300 },
  { n: 'Куриный бульон', e: '🥣', kcal100: 15, p: 2.0, f: 0.5, c: 0, dg: 300, al: ['бульон'] },
  // Каши и гарниры
  { n: 'Овсянка на воде', e: '🥣', kcal100: 88, p: 3.0, f: 1.7, c: 15.0, dg: 250, al: ['овсянка', 'овсяная каша', 'каша овсяная'] },
  { n: 'Овсянка на молоке', e: '🥣', kcal100: 102, p: 3.5, f: 3.0, c: 16.0, dg: 250, al: ['овсяная каша на молоке', 'каша овсяная на молоке'] },
  { n: 'Гречка отварная', e: '🍚', kcal100: 110, p: 4.2, f: 1.1, c: 21.3, dg: 200, al: ['гречка', 'гречневая каша', 'варёная гречка'] },
  { n: 'Рис отварной', e: '🍚', kcal100: 120, p: 2.4, f: 0.5, c: 25.0, dg: 200, al: ['рис', 'варёный рис', 'белый рис'] },
  { n: 'Макароны отварные', e: '🍝', kcal100: 140, p: 4.5, f: 1.0, c: 27.5, dg: 200, al: ['макароны', 'паста', 'спагетти'] },
  { n: 'Картофельное пюре', e: '🥔', kcal100: 90, p: 2.0, f: 3.0, c: 14.0, dg: 200, al: ['пюре'] },
  { n: 'Картофель отварной', e: '🥔', kcal100: 80, p: 2.0, f: 0.4, c: 16.5, dg: 200, al: ['варёный картофель', 'варёная картошка'] },
  { n: 'Картошка жареная', e: '🥔', kcal100: 190, p: 2.8, f: 9.5, c: 23.0, dg: 200, al: ['жареная картошка', 'жареный картофель'] },
  { n: 'Картофель фри', e: '🍟', kcal100: 312, p: 3.4, f: 15.0, c: 41.0, dg: 150, al: ['фри'] },
  { n: 'Каша пшённая', e: '🥣', kcal100: 90, p: 3.0, f: 0.8, c: 17.0, dg: 250, al: ['пшёнка'] },
  { n: 'Каша манная на молоке', e: '🥣', kcal100: 98, p: 3.0, f: 3.0, c: 15.5, dg: 250, al: ['манная каша', 'манка'] },
  { n: 'Перловка отварная', e: '🥣', kcal100: 109, p: 3.1, f: 0.4, c: 22.0, dg: 200, al: ['перловка', 'перловая каша'] },
  // Мясо и птица
  { n: 'Куриная грудка отварная', e: '🍗', kcal100: 137, p: 29.6, f: 1.8, c: 0.4, dg: 150, al: ['куриная грудка', 'грудка отварная'] },
  { n: 'Курица отварная', e: '🍗', kcal100: 150, p: 25.0, f: 5.0, c: 0, dg: 150, al: ['варёная курица', 'отварная курица'] },
  { n: 'Курица жареная', e: '🍗', kcal100: 210, p: 26.0, f: 12.0, c: 0, dg: 150, al: ['жареная курица'] },
  { n: 'Котлета куриная', e: '🍗', kcal100: 200, p: 15.0, f: 13.0, c: 10.0, dg: 150, al: ['куриная котлета'] },
  { n: 'Котлета мясная', e: '🍖', kcal100: 260, p: 13.0, f: 20.0, c: 8.0, dg: 150, al: ['котлета', 'котлеты', 'котлета свиная'] },
  { n: 'Говядина отварная', e: '🥩', kcal100: 220, p: 27.0, f: 12.0, c: 0, dg: 150, al: ['варёная говядина'] },
  { n: 'Свинина жареная', e: '🥩', kcal100: 290, p: 22.0, f: 22.0, c: 0, dg: 150, al: ['жареная свинина'] },
  { n: 'Тефтели', e: '🍖', kcal100: 210, p: 12.0, f: 14.0, c: 8.0, dg: 150 },
  { n: 'Плов', e: '🍚', kcal100: 200, p: 8.0, f: 9.0, c: 23.0, dg: 250, al: ['плов с курицей', 'плов с мясом'] },
  { n: 'Гуляш из говядины', e: '🥩', kcal100: 180, p: 14.0, f: 12.0, c: 3.0, dg: 150, al: ['гуляш'] },
  { n: 'Пельмени варёные', e: '🥟', kcal100: 250, p: 11.0, f: 10.0, c: 28.0, dg: 250, al: ['пельмени'] },
  { n: 'Сосиски', e: '🌭', kcal100: 260, p: 12.0, f: 23.0, c: 2.0, dg: 140, al: ['сосиски отварные', 'варёные сосиски'] },
  { n: 'Колбаса варёная', e: '🌭', kcal100: 300, p: 13.0, f: 27.0, c: 2.0, dg: 50, al: ['варёная колбаса', 'докторская'] },
  { n: 'Шашлык из свинины', e: '🍖', kcal100: 300, p: 22.0, f: 22.0, c: 0, dg: 200, al: ['шашлык'] },
  // Рыба и морепродукты
  { n: 'Треска отварная', e: '🐟', kcal100: 78, p: 17.8, f: 0.7, c: 0, dg: 150, al: ['треска'] },
  { n: 'Минтай отварной', e: '🐟', kcal100: 79, p: 17.5, f: 1.0, c: 0, dg: 150, al: ['минтай'] },
  { n: 'Горбуша запечённая', e: '🐟', kcal100: 160, p: 22.0, f: 7.0, c: 0, dg: 150, al: ['горбуша'] },
  { n: 'Лосось запечённый', e: '🐟', kcal100: 200, p: 22.0, f: 12.0, c: 0, dg: 150, al: ['лосось', 'сёмга', 'семга'] },
  { n: 'Сельдь солёная', e: '🐟', kcal100: 220, p: 18.0, f: 16.0, c: 0, dg: 100, al: ['селёдка', 'сельдь'] },
  { n: 'Креветки отварные', e: '🦐', kcal100: 95, p: 20.0, f: 1.5, c: 0, dg: 150, al: ['креветки'] },
  { n: 'Котлета рыбная', e: '🐟', kcal100: 160, p: 14.0, f: 8.0, c: 10.0, dg: 150, al: ['рыбная котлета'] },
  { n: 'Рыба жареная', e: '🐟', kcal100: 180, p: 18.0, f: 11.0, c: 2.0, dg: 150, al: ['жареная рыба'] },
  // Салаты
  { n: 'Салат овощной', e: '🥗', kcal100: 30, p: 1.0, f: 1.5, c: 3.5, dg: 150, al: ['овощной салат'] },
  { n: 'Оливье', e: '🥗', kcal100: 240, p: 4.5, f: 19.0, c: 9.5, dg: 200, al: ['салат оливье'] },
  { n: 'Винегрет', e: '🥗', kcal100: 95, p: 1.7, f: 4.5, c: 12.0, dg: 150 },
  { n: 'Цезарь с курицей', e: '🥗', kcal100: 180, p: 12.0, f: 11.0, c: 6.0, dg: 200, al: ['цезарь'] },
  { n: 'Крабовый салат', e: '🥗', kcal100: 190, p: 8.0, f: 14.0, c: 8.0, dg: 150 },
  // Яйца и завтраки
  { n: 'Яйцо варёное', e: '🥚', kcal100: 157, p: 12.7, f: 11.5, c: 0.7, dg: 55, al: ['яйцо', 'яйца', 'варёное яйцо', 'варёные яйца'] },
  { n: 'Омлет', e: '🍳', kcal100: 184, p: 11.0, f: 15.0, c: 2.0, dg: 150 },
  { n: 'Яичница', e: '🍳', kcal100: 175, p: 12.0, f: 14.0, c: 1.0, dg: 150 },
  { n: 'Творог 5%', e: '🥛', kcal100: 121, p: 17.0, f: 5.0, c: 1.8, dg: 150, al: ['творог'] },
  { n: 'Творожная запеканка', e: '🍮', kcal100: 220, p: 16.0, f: 10.0, c: 17.0, dg: 150, al: ['запеканка творожная'] },
  { n: 'Сырники', e: '🥞', kcal100: 225, p: 15.0, f: 12.0, c: 14.0, dg: 150 },
  { n: 'Блинчики', e: '🥞', kcal100: 190, p: 6.0, f: 8.0, c: 24.0, dg: 150, al: ['блины', 'блин'] },
  // Хлеб, выпечка, фастфуд
  { n: 'Хлеб белый', e: '🍞', kcal100: 260, p: 8.1, f: 3.2, c: 49.0, dg: 30, al: ['белый хлеб', 'батон'] },
  { n: 'Хлеб чёрный', e: '🍞', kcal100: 215, p: 6.6, f: 1.2, c: 44.0, dg: 30, al: ['чёрный хлеб', 'ржаной хлеб', 'бородинский'] },
  { n: 'Сыр твёрдый', e: '🧀', kcal100: 360, p: 25.0, f: 30.0, c: 0, dg: 30, al: ['сыр'] },
  { n: 'Бутерброд с сыром', e: '🥪', kcal100: 270, p: 10.0, f: 13.0, c: 28.0, dg: 100 },
  { n: 'Пицца', e: '🍕', kcal100: 265, p: 11.0, f: 10.0, c: 32.0, dg: 200 },
  { n: 'Шаурма', e: '🌯', kcal100: 220, p: 10.0, f: 10.0, c: 23.0, dg: 300 },
  { n: 'Бургер', e: '🍔', kcal100: 295, p: 13.0, f: 15.0, c: 27.0, dg: 220, al: ['гамбургер'] },
  { n: 'Роллы', e: '🍣', kcal100: 180, p: 6.0, f: 5.0, c: 26.0, dg: 200, al: ['суши'] },
  { n: 'Хачапури', e: '🥯', kcal100: 280, p: 12.0, f: 15.0, c: 25.0, dg: 250 },
  // Напитки
  { n: 'Кофе с молоком и сахаром', e: '☕', kcal100: 50, p: 1.5, f: 1.5, c: 8.0, dg: 200, al: ['кофе с молоком'] },
  { n: 'Кофе без сахара', e: '☕', kcal100: 2, p: 0.1, f: 0, c: 0, dg: 200, al: ['кофе', 'американо', 'эспрессо'] },
  { n: 'Чай с сахаром', e: '🍵', kcal100: 25, p: 0, f: 0, c: 6.0, dg: 200 },
  { n: 'Чай без сахара', e: '🍵', kcal100: 1, p: 0, f: 0, c: 0, dg: 200, al: ['чай', 'чёрный чай', 'зелёный чай'] },
  { n: 'Компот', e: '🥤', kcal100: 85, p: 0.1, f: 0, c: 21.0, dg: 250 },
  { n: 'Сок', e: '🧃', kcal100: 45, p: 0.7, f: 0.2, c: 10.0, dg: 200, al: ['сок апельсиновый', 'апельсиновый сок', 'яблочный сок'] },
  { n: 'Кефир 1%', e: '🥛', kcal100: 40, p: 3.0, f: 1.0, c: 4.0, dg: 250, al: ['кефир'] },
  { n: 'Молоко 2.5%', e: '🥛', kcal100: 52, p: 2.8, f: 2.5, c: 4.7, dg: 200, al: ['молоко'] },
  { n: 'Ряженка', e: '🥛', kcal100: 55, p: 2.9, f: 2.5, c: 4.2, dg: 250 },
  { n: 'Йогурт питьевой', e: '🥛', kcal100: 70, p: 2.8, f: 2.0, c: 11.0, dg: 290, al: ['йогурт'] },
  // Фрукты и десерты
  { n: 'Банан', e: '🍌', kcal100: 90, p: 1.1, f: 0.3, c: 22.8, dg: 120 },
  { n: 'Яблоко', e: '🍎', kcal100: 47, p: 0.4, f: 0.4, c: 10.0, dg: 180 },
  { n: 'Апельсин', e: '🍊', kcal100: 43, p: 0.9, f: 0.2, c: 9.0, dg: 200 },
  { n: 'Груша', e: '🍐', kcal100: 47, p: 0.4, f: 0.3, c: 10.0, dg: 180 },
  { n: 'Виноград', e: '🍇', kcal100: 70, p: 0.6, f: 0.2, c: 16.0, dg: 150 },
  { n: 'Мандарин', e: '🍊', kcal100: 53, p: 0.8, f: 0.3, c: 11.5, dg: 150 },
  { n: 'Арбуз', e: '🍉', kcal100: 30, p: 0.6, f: 0.2, c: 7.5, dg: 300 },
  { n: 'Шоколад', e: '🍫', kcal100: 550, p: 7.0, f: 32.0, c: 58.0, dg: 30, al: ['шоколадка', 'молочный шоколад'] },
  { n: 'Печенье', e: '🍪', kcal100: 430, p: 6.0, f: 14.0, c: 70.0, dg: 30 },
  { n: 'Торт', e: '🍰', kcal100: 350, p: 5.0, f: 15.0, c: 50.0, dg: 100, al: ['тортик'] },
  { n: 'Мороженое', e: '🍦', kcal100: 210, p: 3.5, f: 12.0, c: 22.0, dg: 100, al: ['пломбир', 'эскимо'] },
  { n: 'Мёд', e: '🍯', kcal100: 320, p: 0.8, f: 0, c: 80.0, dg: 20 },
]

// Приводим текст к одному виду: нижний регистр, ё→е, только буквы и цифры
function normName(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^a-zа-я0-9\s-]/g, ' ')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Урезаем слово до основы: «борща/борщу/борщ» → «борщ», «яйца/яйцо» → «яйц»
function dishStem(w) {
  let s = String(w || '')
  while (s.length > 3 && 'аеиоуыэюяьй'.includes(s[s.length - 1])) s = s.slice(0, -1)
  return s
}

function stemsOf(t) {
  return normName(t)
    .split(' ')
    .filter((w) => w && !/^\d/.test(w)) // цифры («5%») не участвуют в поиске
    .map(dishStem)
}

const DISH_INDEX = LOCAL_DISHES.map((d) => ({
  d,
  key: normName(d.n),
  len: normName(d.n).length,
  stems: stemsOf(d.n),
  aliases: (d.al || []).map(stemsOf),
}))

// Поиск блюда во фразе: все слова блюда должны встретиться.
// Побеждает самое длинное название («борщ со свининой» точнее, чем «борщ»).
function findLocalDish(query) {
  const q = normName(query)
  if (!q) return null
  const qStems = new Set(q.split(' ').filter(Boolean).map(dishStem))
  let best = null
  for (const e of DISH_INDEX) {
    const hit =
      e.stems.every((w) => qStems.has(w)) ||
      e.aliases.some((al) => al.every((w) => qStems.has(w)))
    if (hit && (!best || e.len > best.len)) best = e
  }
  return best ? best.d : null
}

// ── Локальный разбор фразы без ИИ («тарелка борща 300 граммов») ─
const GRAMS_RE = /(\d{1,4})\s*(граммов|грамма|грамм|миллилитров|миллилитра|миллилитр|гр|г|мл)(?![а-я])/

function localParsePhrase(raw) {
  const text0 = String(raw || '').trim()
  const text = normName(text0)
  if (!text) return null
  const gm = text.match(GRAMS_RE)
  const grams = gm ? Math.max(1, Math.min(2000, parseInt(gm[1], 10))) : null
  const dish = findLocalDish(text.replace(GRAMS_RE, ' '))
  if (!dish) return null
  const item = {
    name: dish.n,
    emoji: dish.e,
    kcal100: dish.kcal100,
    p: dish.p,
    f: dish.f,
    c: dish.c,
    source: 'base',
  }
  if (dish.dg) item.defaultGrams = dish.dg
  return { text: text0, grams, items: [item] }
}

// ── Подсчёт КБЖУ ПО СОСТАВУ («свинина 300 грамм, картошка 500 грамм») ──
// Отдельный словарь ингредиентов: усреднённые значения варёных/тушёных
// продуктов — то, что попадает в готовое блюдо. Работает БЕСПЛАТНО, без ИИ.
const INGREDIENTS = [
  { n: 'Свинина', w: ['свинина', 'свининки', 'свинки'], kcal100: 250, p: 20.0, f: 18.5, c: 0 },
  { n: 'Говядина', w: ['говядина', 'говяжье'], kcal100: 220, p: 27.0, f: 12.0, c: 0 },
  { n: 'Курица', w: ['курица', 'курицу', 'курицей'], kcal100: 150, p: 25.0, f: 5.0, c: 0 },
  { n: 'Куриное филе', w: ['филе', 'грудка'], kcal100: 137, p: 29.6, f: 1.8, c: 0.4 },
  { n: 'Индейка', w: ['индейка'], kcal100: 160, p: 25.0, f: 6.0, c: 0 },
  { n: 'Фарш', w: ['фарш', 'фарша'], kcal100: 250, p: 17.0, f: 20.0, c: 0 },
  { n: 'Картошка', w: ['картошка', 'картофель', 'картошку'], kcal100: 80, p: 2.0, f: 0.4, c: 16.5 },
  { n: 'Морковь', w: ['морковь', 'морковка', 'морковью'], kcal100: 32, p: 1.3, f: 0.1, c: 6.9 },
  { n: 'Свёкла', w: ['свекла', 'бурак'], kcal100: 44, p: 1.7, f: 0, c: 10.0 },
  { n: 'Капуста', w: ['капуста', 'капусту'], kcal100: 28, p: 1.8, f: 0.1, c: 4.7 },
  { n: 'Лук', w: ['лук', 'луковица'], kcal100: 41, p: 1.1, f: 0.1, c: 8.4 },
  { n: 'Помидор', w: ['помидор', 'томат'], kcal100: 20, p: 1.1, f: 0.2, c: 3.7 },
  { n: 'Огурец', w: ['огурец'], kcal100: 15, p: 0.8, f: 0.1, c: 2.8 },
  { n: 'Перец', w: ['перец'], kcal100: 27, p: 1.3, f: 0.1, c: 5.3 },
  { n: 'Чеснок', w: ['чеснок'], kcal100: 143, p: 6.4, f: 0.5, c: 33.0 },
  { n: 'Зелень', w: ['зелень', 'укроп', 'петрушка'], kcal100: 36, p: 3.0, f: 0.4, c: 6.0 },
  { n: 'Грибы', w: ['грибы', 'грибов', 'шампиньоны'], kcal100: 30, p: 3.1, f: 0.3, c: 3.3 },
  { n: 'Фасоль', w: ['фасоль'], kcal100: 123, p: 7.8, f: 0.5, c: 21.0 },
  { n: 'Зелёный горошек', w: ['горошек'], kcal100: 70, p: 5.0, f: 0.5, c: 10.0 },
  { n: 'Рис', w: ['рис', 'риса'], kcal100: 120, p: 2.4, f: 0.5, c: 25.0 },
  { n: 'Гречка', w: ['гречка', 'гречи'], kcal100: 110, p: 4.2, f: 1.1, c: 21.3 },
  { n: 'Макароны', w: ['макароны', 'макарон', 'паста', 'спагетти'], kcal100: 140, p: 4.5, f: 1.0, c: 27.5 },
  { n: 'Масло сливочное', w2: ['сливочное масло', 'масло сливочное'], kcal100: 750, p: 0.5, f: 82.5, c: 0.8 },
  { n: 'Масло растительное', w2: ['растительное масло', 'масло растительное', 'подсолнечное масло', 'оливковое масло'], w: ['масло'], kcal100: 900, p: 0, f: 99.9, c: 0 },
  { n: 'Сметана', w: ['сметана', 'сметаны'], kcal100: 200, p: 2.6, f: 20.0, c: 3.4 },
  { n: 'Молоко', w: ['молоко', 'молока'], kcal100: 52, p: 2.8, f: 2.5, c: 4.7 },
  { n: 'Яйцо', w: ['яйцо', 'яйца'], kcal100: 157, p: 12.7, f: 11.5, c: 0.7 },
  { n: 'Сыр', w: ['сыр', 'сыра'], kcal100: 360, p: 25.0, f: 30.0, c: 0 },
  { n: 'Творог', w: ['творог', 'творога'], kcal100: 121, p: 17.0, f: 5.0, c: 1.8 },
  { n: 'Мука', w: ['мука', 'муки'], kcal100: 334, p: 10.3, f: 1.1, c: 68.9 },
  { n: 'Колбаса', w: ['колбаса', 'колбасы'], kcal100: 300, p: 13.0, f: 27.0, c: 2.0 },
  { n: 'Колбаса копчёная', w2: ['колбаса копченая', 'копченая колбаса', 'колбаса сырокопченая', 'сырокопченая колбаса'], kcal100: 425, p: 16.0, f: 40.0, c: 0 },
  { n: 'Сосиски', w: ['сосиски', 'сосиска'], kcal100: 260, p: 12.0, f: 23.0, c: 2.0 },
  { n: 'Тыква', w: ['тыква'], kcal100: 26, p: 1.0, f: 0.1, c: 6.0 },
  { n: 'Кабачок', w: ['кабачок'], kcal100: 24, p: 0.6, f: 0.3, c: 4.6 },
  { n: 'Бульон', w: ['бульон', 'бульона'], kcal100: 15, p: 2.0, f: 0.5, c: 0 },
  { n: 'Вода', w: ['вода', 'воды'], kcal100: 0, p: 0, f: 0, c: 0 },
  { n: 'Сахар', w: ['сахар'], kcal100: 387, p: 0, f: 0, c: 99.8 },
  { n: 'Соль', w: ['соль'], kcal100: 0, p: 0, f: 0, c: 0 },
]

const ING_INDEX_1 = new Map() // основа одного слова → ингредиент
const ING_INDEX_2 = new Map() // «два слова подряд» → ингредиент
for (const ing of INGREDIENTS) {
  for (const w of ing.w || []) ING_INDEX_1.set(dishStem(normName(w)), ing)
  for (const w2 of ing.w2 || []) ING_INDEX_2.set(normName(w2), ing)
}

// Расстояние Левенштейна — чтобы понимать опечатки («кариошка» → картошка)
function lev(a, b) {
  const m = a.length
  const n = b.length
  if (Math.abs(m - n) > 2) return 3
  let prev = Array.from({ length: n + 1 }, (_, i) => i)
  for (let i = 1; i <= m; i++) {
    const cur = [i]
    for (let j = 1; j <= n; j++)
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    prev = cur
  }
  return prev[n]
}

// Ищем ингредиент в списке слов: двухсловные фразы → точные основы →
// основы с одной опечаткой. Возвращаем { ing, ... } или null.
function lookupIngredient(words) {
  for (let i = 0; i < words.length - 1; i++) {
    const hit = ING_INDEX_2.get(words[i] + ' ' + words[i + 1])
    if (hit) return hit
  }
  for (let i = 0; i < words.length; i++) {
    const hit = ING_INDEX_1.get(dishStem(words[i]))
    if (hit) return hit
  }
  for (let i = 0; i < words.length; i++) {
    const st = dishStem(words[i])
    if (st.length < 4) continue
    for (const [key, ing] of ING_INDEX_1) if (lev(st, key) === 1) return ing
  }
  return null
}

// Состав → КБЖУ на 100 г готового блюда. Понимает оба порядка («свинина
// 300 грамм» и «300 грамм свинины»), запятые необязательны, «литр» = вес воды.
export function estimateFromDescription(raw) {
  // Свой нормализатор: сохраняем точку, чтобы «1,5 литра» не разваливалось
  const text = String(raw || '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/(\d),(\d)/g, '$1.$2') // «1,5» → «1.5»
    .replace(/[^а-я0-9\s.]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!text) return null
  const tokens = text.split(' ').filter(Boolean)
  const UNIT_WORDS = new Set([
    'граммов', 'грамма', 'грамм', 'миллилитров', 'миллилитра', 'миллилитр', 'гр', 'г', 'мл',
  ])
  const LITER_RE = /^(литров|литра|литр|л)$/
  const NUM_RE = /^\d{1,4}(\.\d{1,2})?$/
  const items = []
  let liters = 0
  let pending = [] // слова ДО граммовки («свинина 300 грамм»)
  let afterBuf = [] // слова ПОСЛЕ граммовки («300 грамм свинины»)
  let awaitGrams = 0 // граммовка, чьё название ещё не встретилось
  let expectName = false // после граммовки слова копим в afterBuf

  const takeItem = (ing, grams) => {
    if (ing && items.length < 20)
      items.push({ ...ing, grams: Math.max(1, Math.min(5000, grams)) })
  }
  // Название так и не пришло? Ищем его в накопленных словах
  const resolveAwait = () => {
    if (!awaitGrams) return
    const ing = lookupIngredient(afterBuf) || findLocalDish(afterBuf.join(' '))
    takeItem(ing, awaitGrams)
    awaitGrams = 0
    afterBuf = []
  }

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]
    if (!NUM_RE.test(t)) {
      if (expectName) afterBuf.push(t)
      else pending.push(t)
      continue
    }
    const next = tokens[i + 1] || ''
    if (UNIT_WORDS.has(next)) {
      resolveAwait()
      const grams = parseFloat(t)
      const ing =
        lookupIngredient(pending) || findLocalDish(pending.join(' '))
      takeItem(ing, grams)
      pending = []
      // имя могло быть до граммовки — если нет, ждём его после
      awaitGrams = ing ? 0 : grams
      expectName = !ing
      i++ // съели слово-единицу
    } else if (LITER_RE.test(next)) {
      resolveAwait()
      liters += parseFloat(t)
      pending = []
      expectName = false
      i++
    }
    // число без единицы — игнорируем
  }
  resolveAwait()

  if (!items.length) return null
  let kcal = 0
  let p = 0
  let f = 0
  let c = 0
  let weight = 0
  for (const it of items) {
    kcal += (it.kcal100 * it.grams) / 100
    p += (it.p * it.grams) / 100
    f += (it.f * it.grams) / 100
    c += (it.c * it.grams) / 100
    weight += it.grams
  }
  // «1 литр» в супе — это в основном вода: если воды по граммам не было,
  // считаем вес готового блюда по литрам (1 л ≈ 1000 г)
  if (liters > 0) weight = Math.max(weight, Math.round(liters * 1000))
  if (weight < 10 || kcal <= 0) return null
  return {
    kcal100: Math.round((kcal / weight) * 100),
    p: Math.round((p / weight) * 1000) / 10,
    f: Math.round((f / weight) * 1000) / 10,
    c: Math.round((c / weight) * 1000) / 10,
    weight: Math.round(weight),
    items: items.map((it) => ({ name: it.n, grams: it.grams })),
  }
}

// ═══════════════════════════════════════════════════════════════
//  КЭШ ОТВЕТОВ ИИ — файл на телефоне (nutribear-ai-cache.json).
//  Один раз спросили у ИИ — запомнили; повторно блюдо оценивается
//  бесплатно, даже после перезапуска приложения.
// ═══════════════════════════════════════════════════════════════
const CACHE_FILE = new File(Paths.document, 'nutribear-ai-cache.json')
const CACHE_MAX = 400

let cacheMem = null

function cacheLoad() {
  if (cacheMem) return cacheMem
  try {
    if (CACHE_FILE.exists) cacheMem = JSON.parse(CACHE_FILE.text())
  } catch {}
  if (!cacheMem || typeof cacheMem !== 'object') cacheMem = {}
  return cacheMem
}

function cacheGet(key) {
  const c = cacheLoad()
  if (!(key in c)) return null
  const v = c[key]
  delete c[key]
  c[key] = v // недавно использованное — в конец файла (не удаляется первым)
  return v
}

function cachePut(key, value) {
  try {
    const c = cacheLoad()
    delete c[key]
    c[key] = value
    const keys = Object.keys(c)
    if (keys.length > CACHE_MAX)
      for (const k of keys.slice(0, keys.length - CACHE_MAX)) delete c[k]
    CACHE_FILE.write(JSON.stringify(c))
  } catch {}
}

// Простая защита от двойных запросов: пока один и тот же запрос идёт,
// повторный вызов дождётся его результата, а не пошлёт второй раз
const inflight = new Map()
function once(key, run) {
  if (inflight.has(key)) return inflight.get(key)
  const p = Promise.resolve()
    .then(run)
    .finally(() => inflight.delete(key))
  inflight.set(key, p)
  return p
}

// Короткий хеш строки (для кэша фото — одинаковое фото = один запрос)
function strHash(s) {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0
  return String(h) + '_' + s.length
}

function withTimeout(timeoutMs = TIMEOUT_MS) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  return { signal: ctrl.signal, done: () => clearTimeout(timer) }
}

function assertConfigured() {
  const { apiKey } = AI_CONFIG
  if (!apiKey) {
    throw new Error(
      'ИИ не настроен: создайте файл .env в корне проекта (рядом с package.json) со строкой EXPO_PUBLIC_AI_KEY=ваш-ключ и перезапустите Expo: npx expo start --clear'
    )
  }
}

function httpError(status, extra = '') {
  let msg
  if (status === 401 || status === 403)
    msg = 'Ключ отклонён (ошибка 401) — проверьте EXPO_PUBLIC_AI_KEY в файле .env и перезапустите Expo с --clear'
  else if (status === 404)
    msg = 'Не найдено (404) — проверьте EXPO_PUBLIC_AI_BASE_URL и EXPO_PUBLIC_AI_MODEL в файле .env'
  else if (status === 429)
    msg = 'Превышен лимит запросов (429) — подождите минуту и повторите'
  else if (status >= 500)
    msg = 'Сервер ИИ временно недоступен — попробуйте позже'
  else
    msg = `Ошибка ИИ-сервера (${status})`
  return new Error(extra ? `${msg}. Сервер объяснил: ${extra}` : msg)
}

// Читаем тело ответа сервера — при ошибках 400 там точная причина
async function apiError(res) {
  let extra = ''
  try {
    const j = await res.json()
    extra = String(j?.error?.message || j?.message || '').slice(0, 300)
  } catch {}
  return httpError(res.status, extra)
}

function apiUrl(path) {
  return `${String(AI_CONFIG.baseUrl).replace(/\/+$/, '')}${path}`
}

// POST JSON к OpenAI-совместимому API → распарсенный ответ
async function postJson(path, body, timeoutMs = TIMEOUT_MS) {
  assertConfigured()
  const { signal, done } = withTimeout(timeoutMs)
  try {
    let res
    try {
      res = await fetch(apiUrl(path), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${AI_CONFIG.apiKey}`,
        },
        body: JSON.stringify(body),
        signal,
      })
      if (!res.ok) throw await apiError(res)
      return await res.json()
    } catch (e) {
      if (e?.name === 'AbortError')
        throw new Error(`ИИ не ответил за ${Math.round(timeoutMs / 1000)} секунд — попробуйте ещё раз`)
      throw e
    }
  } finally {
    done()
  }
}

// Достаём JSON из ответа модели (терпит ```-обёртки и болтовню вокруг JSON)
function parseAiJson(content) {
  const raw = String(content || '').replace(/```(?:json)?/gi, '').trim()
  try {
    return JSON.parse(raw)
  } catch {}
  const opens = [raw.indexOf('{'), raw.indexOf('[')].filter((i) => i >= 0)
  const closes = [raw.lastIndexOf('}'), raw.lastIndexOf(']')].filter((i) => i >= 0)
  if (opens.length && closes.length) {
    const first = Math.min(...opens)
    const last = Math.max(...closes)
    if (last > first) return JSON.parse(raw.slice(first, last + 1))
  }
  throw new Error('ИИ вернул неожиданный ответ — попробуйте ещё раз')
}

const num = (v, max) => {
  const n = Number(String(v ?? '').replace(',', '.'))
  return Number.isFinite(n) ? Math.max(0, Math.min(max, Math.round(n * 10) / 10)) : 0
}

// Приводим ответ модели к формату приложения (kcal100/p/f/c — на 100 г)
function normalizeItem(it) {
  if (!it || typeof it !== 'object') return null
  const name = String(it.name || '').trim()
  if (!name) return null
  const grams = num(it.defaultGrams, 1500)
  return {
    name,
    emoji: String(it.emoji || '🍽️').slice(0, 4),
    kcal100: num(it.kcal100 ?? it.kcal, 950),
    p: num(it.p ?? it.protein, 100),
    f: num(it.f ?? it.fat, 100),
    c: num(it.c ?? it.carbs, 100),
    defaultGrams: grams > 0 ? Math.round(grams) : undefined,
    source: 'ai',
  }
}

// ── Сканер и галерея: фото → блюдо ─────────────────────────────
// Галерея может отдать HEIC/HEIF (новые Android-телефоны), а сервер
// принимает только png/jpeg/gif/webp — конвертируем в JPEG и прижимаем
// до 1280 px по большой стороне (быстрее и дешевле отправка).
async function photoToJpegBase64(uri) {
  const first = await ImageManipulator.manipulate(uri).renderAsync()
  const big = Math.max(first.width, first.height)
  const ref =
    big > 1280
      ? await ImageManipulator.manipulate(uri)
          .resize({
            width: Math.round((first.width * 1280) / big),
            height: Math.round((first.height * 1280) / big),
          })
          .renderAsync()
      : first
  const saved = await ref.saveAsync({ format: SaveFormat.JPEG, quality: 0.8 })
  return new File(saved.uri).base64()
}

export async function scanFoodImage(imageUri, timeoutMs = TIMEOUT_MS) {
  const base64 = await photoToJpegBase64(imageUri)
  const key = 'vis:' + strHash(base64)

  // То же самое фото уже распознаывали? Берем ответ из кэша — бесплатно
  const cached = cacheGet(key)
  if (cached) return cached

  return once(key, async () => {
    const dataUrl = `data:image/jpeg;base64,${base64}`

    const data = await postJson(
      '/chat/completions',
      {
        model: AI_CONFIG.model,
        temperature: 0.2,
        max_tokens: 250,
        messages: [
          { role: 'system', content: VISION_SYSTEM },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text:
                  'Определи основное блюдо на фотографии. Пищевую ценность укажи НА 100 ГРАММ готового продукта. ' +
                  'Ответь строго JSON-массивом из одного объекта:\n' +
                  '[{"name":"название по-русски","emoji":"один эмодзи","kcal100":число,"p":число,"f":число,"c":число,"defaultGrams":число}]\n' +
                  'defaultGrams — примерный вес порции на фото в граммах (100–600). ' +
                  'Если на фото нет еды — верни [].',
              },
              { type: 'image_url', image_url: { url: dataUrl, detail: 'low' } },
            ],
          },
        ],
      },
      timeoutMs
    )

    const content = data?.choices?.[0]?.message?.content
    const parsed = parseAiJson(content)
    const list = Array.isArray(parsed) ? parsed : []
    const items = list.map(normalizeItem).filter(Boolean)
    if (!items.length)
      throw new Error('Еда на фото не распознана — попробуйте снять блюдо ближе и при хорошем свете')
    cachePut(key, items)
    return items
  })
}

// ── Голос/текст: фраза → блюдо и граммы ────────────────────────
export async function recognizeVoiceText(text, timeoutMs = 20000) {
  const t = String(text || '').trim()
  if (!t)
    throw new Error('Введите фразу — например: «Тарелка овсянки 250 граммов»')

  // 1) Локальный разбор — мгновенно и БЕСПЛАТНО (блюда из встроенной базы)
  const local = localParsePhrase(t)
  if (local) return local

  // 2) Кэш прошлых ответов — БЕСПЛАТНО
  const key = 'voice:' + normName(t)
  const cached = cacheGet(key)
  if (cached) return cached

  // 3) ИИ — платный запрос (только для сложных фраз)
  return once(key, async () => {
    const data = await postJson(
      '/chat/completions',
      {
        model: AI_CONFIG.model,
        temperature: 0.2,
        max_tokens: 250,
        messages: [
          { role: 'system', content: VOICE_SYSTEM },
          {
            role: 'user',
            content:
              `Фраза: «${t}»\n` +
              'Извлеки блюдо и вес порции. Ответь строго JSON-объектом:\n' +
              '{"text":"исправленная фраза","grams":число_или_null,"items":[{"name":"название по-русски","emoji":"эмодзи","kcal100":число,"p":число,"f":число,"c":число}]}\n' +
              'kcal100, p, f, c — пищевая ценность НА 100 ГРАММ. Если вес не указан — grams: null. ' +
              'Если во фразе нет еды — items: [].',
          },
        ],
      },
      timeoutMs
    )

    const content = data?.choices?.[0]?.message?.content
    const parsed = parseAiJson(content)
    const items = (Array.isArray(parsed?.items) ? parsed.items : [])
      .map(normalizeItem)
      .filter(Boolean)
    if (!items.length)
      throw new Error('Не понял фразу — попробуйте иначе, например: «Тарелка овсянки 250 граммов»')

    const grams = Number(parsed?.grams)
    const result = {
      text: String(parsed?.text || t),
      grams: Number.isFinite(grams) && grams > 0 ? Math.round(grams) : null,
      items,
    }
    cachePut(key, result)
    return result
  })
}

// ── Оценка блюда по названию (для окна исправления) ────────────
// Порядок: встроенная база (бесплатно) → кэш (бесплатно) → ИИ (платно,
// но результат запоминается навсегда). source: 'base' | 'cache' | 'ai'
export async function estimateByName(name, timeoutMs = 25000) {
  const q = normName(name)
  if (!q) throw new Error('Сначала впишите название блюда')

  // 1) Встроенная база популярных блюд — БЕСПЛАТНО
  const dish = findLocalDish(q)
  if (dish)
    return { kcal100: dish.kcal100, p: dish.p, f: dish.f, c: dish.c, source: 'base' }

  // 2) Кэш прошлых оценок — БЕСПЛАТНО
  const key = 'est:' + q
  const cached = cacheGet(key)
  if (cached) return { ...cached, source: 'cache' }

  // 3) ИИ — платный запрос
  return once(key, async () => {
    const data = await postJson(
      '/chat/completions',
      {
        model: AI_CONFIG.model,
        temperature: 0.2,
        max_tokens: 120,
        messages: [
          {
            role: 'system',
            content: 'Ты — нутрициолог NutriBear. Отвечай ТОЛЬКО валидным JSON, без пояснений.',
          },
          {
            role: 'user',
            content:
              `Блюдо: «${name}»\n` +
              'Оцени пищевую ценность НА 100 ГРАММ готового блюда (среднее по классическому рецепту). ' +
              'Ответь строго JSON-объектом:\n' +
              '{"kcal100":число,"p":число,"f":число,"c":число}\n' +
              'kcal100 — килокалории, p — белки (г), f — жиры (г), c — углеводы (г), все на 100 г.',
          },
        ],
      },
      timeoutMs
    )

    const content = data?.choices?.[0]?.message?.content
    const parsed = parseAiJson(content)
    const out = {
      kcal100: num(parsed?.kcal100 ?? parsed?.kcal, 950),
      p: num(parsed?.p ?? parsed?.protein, 100),
      f: num(parsed?.f ?? parsed?.fat, 100),
      c: num(parsed?.c ?? parsed?.carbs, 100),
    }
    if (!out.kcal100)
      throw new Error('Не удалось оценить блюдо — уточните название (например: «борщ со свининой»)')
    cachePut(key, out)
    return { ...out, source: 'ai' }
  })
}

// ── Голос: запись (base64) → речь → блюдо ──────────────────────
// ВАЖНО ПРО ДЕНЬГИ: распознавание записи стоит за КАЖДУЮ МИНУТУ аудио
// (whisper-1 — 1,55 ₽/мин, gpt-4o-mini-transcribe — 0,77 ₽/мин).
// Говорите коротко, а разбор фразы после этого чаще всего бесплатный.
export async function recognizeVoiceAudio(audioBase64, timeoutMs = 30000) {
  if (!AI_CONFIG.voiceModel) {
    throw new Error(
      'Голос не настроен: добавьте в файл .env строку EXPO_PUBLIC_AI_VOICE_MODEL=whisper-1 (или gpt-4o-mini-transcribe — вдвое дешевле) — или введите фразу текстом ниже'
    )
  }
  assertConfigured()

  // base64 → файл в кэше (FormData в React Native грузит файл по uri)
  const voiceFile = new File(Paths.cache, 'nutribear-voice.m4a')
  voiceFile.write(audioBase64, { encoding: 'base64' })
  const fileUri = voiceFile.uri

  const form = new FormData()
  form.append('file', { uri: fileUri, name: 'voice.m4a', type: 'audio/m4a' })
  form.append('model', AI_CONFIG.voiceModel)

  const { signal, done } = withTimeout(timeoutMs)
  try {
    let res
    try {
      res = await fetch(apiUrl('/audio/transcriptions'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${AI_CONFIG.apiKey}` },
        body: form,
        signal,
      })
      if (!res.ok) throw await apiError(res)
    } catch (e) {
      if (e?.name === 'AbortError')
        throw new Error('Речь не успела распознаться — попробуйте ещё раз')
      throw e
    }
    const data = await res.json()
    const text = String(data?.text || '').trim()
    if (!text) throw new Error('Речь не распознана — говорите ближе к микрофону')
    return await recognizeVoiceText(text)
  } finally {
    done()
  }
}
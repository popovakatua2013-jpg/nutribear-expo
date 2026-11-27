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
import { ImageManipulator, SaveFormat, manipulateAsync } from 'expo-image-manipulator'
import { AI_CONFIG } from './ai-config'
import { buildMultipartBody, decodeBase64ToBytes } from './multipart'
import { FOODS } from './data/foods'

const TIMEOUT_MS = 45000

const VISION_SYSTEM =
  'Ты — нутрициолог приложения NutriBear. Определяешь блюдо по фотографии. ' +
  'Отвечай ТОЛЬКО валидным JSON, без пояснений и без markdown.'

const VOICE_SYSTEM =
  'Ты — помощник дневника питания NutriBear. Из русской фразы о еде извлекаешь ВСЕ ' +
  'продукты и блюда — их может быть несколько (перечислены через запятую или «и»). ' +
  'Для каждого указывай вес порции в граммах (штуки переводите в граммы: 1 яйцо ≈ 55 г, ' +
  'кружка кофе ≈ 250–350 мл). Извлекай ТОЛЬКО то, что названо во фразе: не добавляй ' +
  'продукты, которых в ней нет (отзыв Кати 27.11: к «грудке с гречкой» модель приписала ' +
  'лишнее «Яйцо варёное»). Отвечай ТОЛЬКО валидным JSON, без пояснений.'

// ═══════════════════════════════════════════════════════════════
//  ВСТРОЕННАЯ БАЗА ПОПУЛЯРНЫХ БЛЮД — на 100 грамм (бесплатно!)
//  n — название, e — эмодзи, dg — обычная порция (г), al — синонимы
// ═══════════════════════════════════════════════════════════════
// Экспортируется для офлайн-сборки ИИ-меню (menu-ai.js, этап 2 монетизации):
// без сети меню собирается из этой же базы — честная подпись в тосте
export const LOCAL_DISHES = [
  // Супы
  { n: 'Борщ', e: '🍲', kcal100: 49, p: 2.6, f: 2.9, c: 5.5, dg: 300, al: ['борщ украинский'], fib: 1.9, sug: 2.6 },
  { n: 'Борщ со свининой', e: '🍲', kcal100: 55, p: 2.8, f: 3.2, c: 5.8, dg: 300, fib: 1.8, sug: 2.5 },
  { n: 'Суп овощной', e: '🥣', kcal100: 38, p: 1.5, f: 1.2, c: 6.0, dg: 300, al: ['овощной суп'], fib: 1.5, sug: 2 },
  { n: 'Суп куриный', e: '🥣', kcal100: 36, p: 2.5, f: 1.8, c: 2.5, dg: 300, al: ['куриный суп'], fib: 0.4, sug: 0.7 },
  { n: 'Суп с фрикадельками', e: '🥣', kcal100: 55, p: 3.0, f: 3.0, c: 4.5, dg: 300, fib: 0.5, sug: 0.8 },
  { n: 'Щи', e: '🥣', kcal100: 38, p: 1.8, f: 2.0, c: 4.0, dg: 300, fib: 1.6, sug: 2 },
  { n: 'Рассольник', e: '🥣', kcal100: 42, p: 1.8, f: 1.8, c: 5.5, dg: 300, fib: 1.2, sug: 1.5 },
  { n: 'Солянка мясная', e: '🥣', kcal100: 68, p: 4.0, f: 4.5, c: 4.0, dg: 300, al: ['солянка'], fib: 0.5, sug: 1 },
  { n: 'Уха', e: '🥣', kcal100: 30, p: 3.0, f: 1.0, c: 2.0, dg: 300, fib: 0.3, sug: 0.5 },
  { n: 'Гороховый суп', e: '🥣', kcal100: 66, p: 4.5, f: 2.0, c: 8.5, dg: 300, fib: 2.5, sug: 1.5 },
  { n: 'Окрошка', e: '🥣', kcal100: 60, p: 2.0, f: 2.5, c: 7.0, dg: 300, fib: 0.8, sug: 2 },
  { n: 'Куриный бульон', e: '🥣', kcal100: 15, p: 2.0, f: 0.5, c: 0, dg: 300, al: ['бульон'], fib: 0, sug: 0 },
  // Каши и гарниры
  { n: 'Овсянка на воде', e: '🥣', kcal100: 88, p: 3.0, f: 1.7, c: 15.0, dg: 250, al: ['овсянка', 'овсяная каша', 'каша овсяная'], fib: 1.7, sug: 0.5 },
  { n: 'Овсянка на молоке', e: '🥣', kcal100: 102, p: 3.5, f: 3.0, c: 16.0, dg: 250, al: ['овсяная каша на молоке', 'каша овсяная на молоке'], fib: 1.4, sug: 2.6 },
  { n: 'Гречка отварная', e: '🍚', kcal100: 110, p: 4.2, f: 1.1, c: 21.3, dg: 200, al: ['гречка', 'гречневая каша', 'варёная гречка'], fib: 2.7, sug: 0.9 },
  { n: 'Рис отварной', e: '🍚', kcal100: 120, p: 2.4, f: 0.5, c: 25.0, dg: 200, al: ['рис', 'варёный рис', 'белый рис'], fib: 0.4, sug: 0.1 },
  { n: 'Макароны отварные', e: '🍝', kcal100: 140, p: 4.5, f: 1.0, c: 27.5, dg: 200, al: ['макароны', 'паста', 'спагетти'], fib: 1.8, sug: 0.8 },
  { n: 'Картофельное пюре', e: '🥔', kcal100: 90, p: 2.0, f: 3.0, c: 14.0, dg: 200, al: ['пюре'], fib: 1.3, sug: 1.2 },
  { n: 'Картофель отварной', e: '🥔', kcal100: 80, p: 2.0, f: 0.4, c: 16.5, dg: 200, al: ['варёный картофель', 'варёная картошка'], fib: 1.3, sug: 0.9 },
  { n: 'Картошка жареная', e: '🥔', kcal100: 190, p: 2.8, f: 9.5, c: 23.0, dg: 200, al: ['жареная картошка', 'жареный картофель'], fib: 1.8, sug: 1.2 },
  { n: 'Картофель фри', e: '🍟', kcal100: 312, p: 3.4, f: 15.0, c: 41.0, dg: 150, al: ['фри'], fib: 1.8, sug: 0.3 },
  { n: 'Каша пшённая', e: '🥣', kcal100: 90, p: 3.0, f: 0.8, c: 17.0, dg: 250, al: ['пшёнка'], fib: 1.3, sug: 1.5 },
  { n: 'Каша манная на молоке', e: '🥣', kcal100: 98, p: 3.0, f: 3.0, c: 15.5, dg: 250, al: ['манная каша', 'манка'], fib: 0.8, sug: 2.5 },
  { n: 'Перловка отварная', e: '🥣', kcal100: 109, p: 3.1, f: 0.4, c: 22.0, dg: 200, al: ['перловка', 'перловая каша'], fib: 3.8, sug: 0.4 },
  // Мясо и птица
  { n: 'Куриная грудка отварная', e: '🍗', kcal100: 137, p: 29.6, f: 1.8, c: 0.4, dg: 150, al: ['куриная грудка', 'грудка отварная'], fib: 0, sug: 0 },
  { n: 'Курица отварная', e: '🍗', kcal100: 150, p: 25.0, f: 5.0, c: 0, dg: 150, al: ['варёная курица', 'отварная курица'], fib: 0, sug: 0 },
  { n: 'Курица жареная', e: '🍗', kcal100: 210, p: 26.0, f: 12.0, c: 0, dg: 150, al: ['жареная курица'], fib: 0, sug: 0 },
  { n: 'Котлета куриная', e: '🍗', kcal100: 200, p: 15.0, f: 13.0, c: 10.0, dg: 150, al: ['куриная котлета'], fib: 0.6, sug: 1.4 },
  { n: 'Котлета мясная', e: '🍖', kcal100: 260, p: 13.0, f: 20.0, c: 8.0, dg: 150, al: ['котлета', 'котлеты', 'котлета свиная'], fib: 0.5, sug: 1.5 },
  { n: 'Говядина отварная', e: '🥩', kcal100: 220, p: 27.0, f: 12.0, c: 0, dg: 150, al: ['варёная говядина'], fib: 0, sug: 0 },
  { n: 'Свинина жареная', e: '🥩', kcal100: 290, p: 22.0, f: 22.0, c: 0, dg: 150, al: ['жареная свинина'], fib: 0, sug: 0 },
  { n: 'Тефтели', e: '🍖', kcal100: 210, p: 12.0, f: 14.0, c: 8.0, dg: 150, fib: 0.5, sug: 1.2 },
  { n: 'Плов', e: '🍚', kcal100: 200, p: 8.0, f: 9.0, c: 23.0, dg: 250, al: ['плов с курицей', 'плов с мясом'], fib: 1.1, sug: 1.3 },
  { n: 'Гуляш из говядины', e: '🥩', kcal100: 180, p: 14.0, f: 12.0, c: 3.0, dg: 150, al: ['гуляш'], fib: 0.6, sug: 1.2 },
  { n: 'Пельмени варёные', e: '🥟', kcal100: 250, p: 11.0, f: 10.0, c: 28.0, dg: 250, al: ['пельмени'], fib: 1.2, sug: 1 },
  { n: 'Сосиски', e: '🌭', kcal100: 260, p: 12.0, f: 23.0, c: 2.0, dg: 140, al: ['сосиски отварные', 'варёные сосиски'], fib: 0, sug: 1 },
  { n: 'Колбаса варёная', e: '🌭', kcal100: 300, p: 13.0, f: 27.0, c: 2.0, dg: 50, al: ['варёная колбаса', 'докторская'], fib: 0, sug: 1 },
  { n: 'Шашлык из свинины', e: '🍖', kcal100: 300, p: 22.0, f: 22.0, c: 0, dg: 200, al: ['шашлык'], fib: 0, sug: 0 },
  // Рыба и морепродукты
  { n: 'Треска отварная', e: '🐟', kcal100: 78, p: 17.8, f: 0.7, c: 0, dg: 150, al: ['треска'], fib: 0, sug: 0 },
  { n: 'Минтай отварной', e: '🐟', kcal100: 79, p: 17.5, f: 1.0, c: 0, dg: 150, al: ['минтай'], fib: 0, sug: 0 },
  { n: 'Горбуша запечённая', e: '🐟', kcal100: 160, p: 22.0, f: 7.0, c: 0, dg: 150, al: ['горбуша'], fib: 0, sug: 0 },
  { n: 'Лосось запечённый', e: '🐟', kcal100: 200, p: 22.0, f: 12.0, c: 0, dg: 150, al: ['лосось', 'сёмга', 'семга'], fib: 0, sug: 0 },
  { n: 'Сельдь солёная', e: '🐟', kcal100: 220, p: 18.0, f: 16.0, c: 0, dg: 100, al: ['селёдка', 'сельдь'], fib: 0, sug: 0 },
  { n: 'Креветки отварные', e: '🦐', kcal100: 95, p: 20.0, f: 1.5, c: 0, dg: 150, al: ['креветки'], fib: 0, sug: 0 },
  { n: 'Котлета рыбная', e: '🐟', kcal100: 160, p: 14.0, f: 8.0, c: 10.0, dg: 150, al: ['рыбная котлета'], fib: 0.6, sug: 1 },
  { n: 'Рыба жареная', e: '🐟', kcal100: 180, p: 18.0, f: 11.0, c: 2.0, dg: 150, al: ['жареная рыба'], fib: 0.2, sug: 0.3 },
  // Салаты
  { n: 'Салат овощной', e: '🥗', kcal100: 30, p: 1.0, f: 1.5, c: 3.5, dg: 150, al: ['овощной салат'], fib: 1.8, sug: 2 },
  { n: 'Оливье', e: '🥗', kcal100: 240, p: 4.5, f: 19.0, c: 9.5, dg: 200, al: ['салат оливье'], fib: 0.8, sug: 2 },
  { n: 'Винегрет', e: '🥗', kcal100: 95, p: 1.7, f: 4.5, c: 12.0, dg: 150, fib: 2.5, sug: 4 },
  { n: 'Цезарь с курицей', e: '🥗', kcal100: 180, p: 12.0, f: 11.0, c: 6.0, dg: 200, al: ['цезарь'], fib: 1, sug: 1.5 },
  { n: 'Крабовый салат', e: '🥗', kcal100: 190, p: 8.0, f: 14.0, c: 8.0, dg: 150, fib: 0.5, sug: 2 },
  // Яйца и завтраки
  { n: 'Яйцо варёное', e: '🥚', kcal100: 157, p: 12.7, f: 11.5, c: 0.7, dg: 55, al: ['яйцо', 'яйца', 'варёное яйцо', 'варёные яйца'], fib: 0, sug: 0.4 },
  { n: 'Омлет', e: '🍳', kcal100: 184, p: 11.0, f: 15.0, c: 2.0, dg: 150, fib: 0, sug: 0.5 },
  { n: 'Яичница', e: '🍳', kcal100: 175, p: 12.0, f: 14.0, c: 1.0, dg: 150, fib: 0, sug: 0.3 },
  { n: 'Творог 5%', e: '🥛', kcal100: 121, p: 17.0, f: 5.0, c: 1.8, dg: 150, al: ['творог'], fib: 0, sug: 1.5 },
  { n: 'Творожная запеканка', e: '🍮', kcal100: 220, p: 16.0, f: 10.0, c: 17.0, dg: 150, al: ['запеканка творожная'], fib: 0.4, sug: 4 },
  { n: 'Сырники', e: '🥞', kcal100: 225, p: 15.0, f: 12.0, c: 14.0, dg: 150, fib: 0.4, sug: 3.8 },
  { n: 'Блинчики', e: '🥞', kcal100: 190, p: 6.0, f: 8.0, c: 24.0, dg: 150, al: ['блины', 'блин'], fib: 1, sug: 3 },
  // Хлеб, выпечка, фастфуд
  { n: 'Хлеб белый', e: '🍞', kcal100: 260, p: 8.1, f: 3.2, c: 49.0, dg: 30, al: ['белый хлеб', 'батон'], fib: 2.4, sug: 3 },
  { n: 'Хлеб чёрный', e: '🍞', kcal100: 215, p: 6.6, f: 1.2, c: 44.0, dg: 30, al: ['чёрный хлеб', 'ржаной хлеб', 'бородинский'], fib: 5.8, sug: 1.2 },
  { n: 'Сыр твёрдый', e: '🧀', kcal100: 360, p: 25.0, f: 30.0, c: 0, dg: 30, al: ['сыр'], fib: 0, sug: 0.5 },
  { n: 'Бутерброд с сыром', e: '🥪', kcal100: 270, p: 10.0, f: 13.0, c: 28.0, dg: 100, fib: 2.1, sug: 2.2 },
  { n: 'Пицца', e: '🍕', kcal100: 265, p: 11.0, f: 10.0, c: 32.0, dg: 200, fib: 2.3, sug: 3.2 },
  { n: 'Шаурма', e: '🌯', kcal100: 220, p: 10.0, f: 10.0, c: 23.0, dg: 300, fib: 1.9, sug: 2.2 },
  { n: 'Бургер', e: '🍔', kcal100: 295, p: 13.0, f: 15.0, c: 27.0, dg: 220, al: ['гамбургер'], fib: 1.8, sug: 5.5 },
  { n: 'Роллы', e: '🍣', kcal100: 180, p: 6.0, f: 5.0, c: 26.0, dg: 200, al: ['суши'], fib: 0.9, sug: 3 },
  { n: 'Хачапури', e: '🥯', kcal100: 280, p: 12.0, f: 15.0, c: 25.0, dg: 250, fib: 1.5, sug: 2.5 },
  // Напитки
  { n: 'Кофе с молоком и сахаром', e: '☕', kcal100: 50, p: 1.5, f: 1.5, c: 8.0, dg: 200, al: ['кофе с молоком'], fib: 0, sug: 8 },
  { n: 'Кофе без сахара', e: '☕', kcal100: 2, p: 0.1, f: 0, c: 0, dg: 200, al: ['кофе', 'американо', 'эспрессо'], fib: 0, sug: 0 },
  { n: 'Чай с сахаром', e: '🍵', kcal100: 25, p: 0, f: 0, c: 6.0, dg: 200, fib: 0, sug: 6 },
  { n: 'Чай без сахара', e: '🍵', kcal100: 1, p: 0, f: 0, c: 0, dg: 200, al: ['чай', 'чёрный чай', 'зелёный чай'], fib: 0, sug: 0 },
  { n: 'Компот', e: '🥤', kcal100: 85, p: 0.1, f: 0, c: 21.0, dg: 250, fib: 0.2, sug: 18 },
  { n: 'Сок', e: '🧃', kcal100: 45, p: 0.7, f: 0.2, c: 10.0, dg: 200, al: ['сок апельсиновый', 'апельсиновый сок', 'яблочный сок'], fib: 0.2, sug: 9 },
  { n: 'Кефир 1%', e: '🥛', kcal100: 40, p: 3.0, f: 1.0, c: 4.0, dg: 250, al: ['кефир'], fib: 0, sug: 4 },
  { n: 'Молоко 2.5%', e: '🥛', kcal100: 52, p: 2.8, f: 2.5, c: 4.7, dg: 200, al: ['молоко'], fib: 0, sug: 4.7 },
  { n: 'Ряженка', e: '🥛', kcal100: 55, p: 2.9, f: 2.5, c: 4.2, dg: 250, fib: 0, sug: 4.2 },
  { n: 'Йогурт питьевой', e: '🥛', kcal100: 70, p: 2.8, f: 2.0, c: 11.0, dg: 290, al: ['йогурт'], fib: 0, sug: 10 },
  // Фрукты и десерты
  { n: 'Банан', e: '🍌', kcal100: 90, p: 1.1, f: 0.3, c: 22.8, dg: 120, fib: 2.6, sug: 12.2 },
  { n: 'Яблоко', e: '🍎', kcal100: 47, p: 0.4, f: 0.4, c: 10.0, dg: 180, fib: 2.4, sug: 10.4 },
  { n: 'Апельсин', e: '🍊', kcal100: 43, p: 0.9, f: 0.2, c: 9.0, dg: 200, fib: 2.4, sug: 9 },
  { n: 'Груша', e: '🍐', kcal100: 47, p: 0.4, f: 0.3, c: 10.0, dg: 180, fib: 3.1, sug: 9.8 },
  { n: 'Виноград', e: '🍇', kcal100: 70, p: 0.6, f: 0.2, c: 16.0, dg: 150, fib: 0.9, sug: 15.5 },
  { n: 'Мандарин', e: '🍊', kcal100: 53, p: 0.8, f: 0.3, c: 11.5, dg: 150, fib: 1.8, sug: 8 },
  { n: 'Арбуз', e: '🍉', kcal100: 30, p: 0.6, f: 0.2, c: 7.5, dg: 300, fib: 0.4, sug: 6.2 },
  { n: 'Шоколад', e: '🍫', kcal100: 550, p: 7.0, f: 32.0, c: 58.0, dg: 30, al: ['шоколадка', 'молочный шоколад'], fib: 3, sug: 54 },
  { n: 'Печенье', e: '🍪', kcal100: 430, p: 6.0, f: 14.0, c: 70.0, dg: 30, fib: 2.6, sug: 22 },
  { n: 'Торт', e: '🍰', kcal100: 350, p: 5.0, f: 15.0, c: 50.0, dg: 100, al: ['тортик'], fib: 1.5, sug: 35 },
  { n: 'Мороженое', e: '🍦', kcal100: 210, p: 3.5, f: 12.0, c: 22.0, dg: 100, al: ['пломбир', 'эскимо'], fib: 0.7, sug: 21 },
  { n: 'Мёд', e: '🍯', kcal100: 320, p: 0.8, f: 0, c: 80.0, dg: 20, fib: 0.2, sug: 81 },
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
    // Чисто цифровые слова («5%», «1.5») не участвуют в поиске, а
    // буквенно-цифровые бренды («7up», «j7») — участвуют; раньше фильтр
    // /^\d/ выкашивал «7up» целиком, у позиции оставался пустой массив
    // основ и [].every() матчило ЛЮБОЙ запрос
    .filter((w) => w && !/^\d+$/.test(w))
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
      // al.length>0: алиас из одних цифр («7up») после фильтра цифр даёт
      // пустой массив основ, а [].every() — всегда true: такой алиас
      // матчит ЛЮБОЙ запрос (проявилось на бренде 7UP)
      e.aliases.some((al) => al.length > 0 && al.every((w) => qStems.has(w)))
    if (hit && (!best || e.len > best.len)) best = e
  }
  return best ? best.d : null
}

// Поиск по базе продуктов (foods.js: обычные + брендовые позиции
// foods-brands.js — «Вязанка», «Простоквашино», «Брест-Литовск» и др.,
// просьба Кати 19.11: «база продуктов по поставщикам, не просто варёная
// колбаса, а варёная колбаса „Вязанка“»). Правило то же, что у блюд:
// все основы названия должны быть во фразе; алиасы (f.al) покрывают
// короткие запросы («вязанка докторская»). Побеждает самое длинное
// название, а при цифрах в запросе — позиция с совпавшей цифрой
// («молоко 2.5» выбирает 2,5%, а не первое попавшееся молоко: раньше
// «30% сметаны» нельзя было различить от 10/15/20% — цифры выкашивались
// из основ и совпавшая первая сметана получала 117 ккал вместо 291;
// отзыв Кати 20.11 про «придуманный коллораж»). КБЖУ — этикеточные,
// бесплатно, без ИИ
const FOOD_INDEX = FOODS.map((f) => ({
  f,
  stems: stemsOf(f.name),
  aliases: (f.al || []).map(stemsOf),
  len: normName(f.name).length,
  // чисто цифровые токены названия («2 5» из «2,5%», «30» из «30%»)
  digits: normName(f.name).split(' ').filter((w) => /^\d+$/.test(w)),
}))

// Числовой вес позиции против запроса: сколько её цифр совпало
// с цифрами запроса. «2.5» нормализуется в два токена «2» и «5»,
// поэтому «молоко 2.5» и «молоко 2,5%» вес сойдутся
function digitScore(eDigits, qDigits) {
  if (!qDigits.length || !eDigits.length) return 0
  return eDigits.reduce((n, w) => n + (qDigits.includes(w) ? 1 : 0), 0)
}

export function findLocalFood(query) {
  const q = normName(query)
  if (!q) return null
  const qTokens = q.split(' ').filter(Boolean)
  const qStems = new Set(qTokens.map(dishStem))
  const qDigits = qTokens.filter((w) => /^\d+$/.test(w))
  let best = null
  for (const e of FOOD_INDEX) {
    const hit =
      e.stems.every((w) => qStems.has(w)) ||
      // al.length>0 — см. findLocalDish: пустые алиасы не матчат всё подряд
      e.aliases.some((al) => al.length > 0 && al.every((w) => qStems.has(w)))
    if (!hit) continue
    const d = digitScore(e.digits, qDigits)
    if (!best || d > best.d || (d === best.d && e.len > best.len)) best = { f: e.f, d, len: e.len }
  }
  return best ? best.f : null
}

// ── Брендовый приоритет для ИИ-ответов (фото/голос) ──────────
// ИИ «придумывает» калораж знакомых марок и сетей (отзыв Кати 19.11:
// «очень много продуктов показывает придуманный коллораж»). Если
// название из ответа ИИ ЦЕЛИКОМ покрывается брендовой позицией базы
// (все основы слов названия есть среди основ названия/алиаса позиции,
// и лишних слов у ИИ нет) — подставляем этикеточные КБЖУ из базы
// вместо ИИ-оценки. Примеры: «Селёдка в масле» → консервы 239 ккал,
// «Воппер» → 192, «Твистер» → 173. А «Омлет с селёдкой в масле» НЕ
// перекрывается позицией «Сельдь в масле» (лишнее слово «омлет») —
// остаётся честная ИИ-оценка целого блюда. При цифрах в названии
// («Сметана 30%») приоритет у позиции с совпавшей цифрой — как в
// findLocalFood, иначе ИИ-имя «30%» получало КБЖУ первой сметаны 10%
export function preferBrandBase(items) {
  if (!Array.isArray(items) || !items.length) return items
  return items.map((it) => {
    if (!it || !it.name) return it
    const qStems = stemsOf(it.name) // основы без цифр — как в поиске
    if (!qStems.length) return it
    const qSet = new Set(qStems)
    const qDigits = normName(it.name).split(' ').filter((w) => /^\d+$/.test(w))
    let best = null
    for (const e of FOOD_INDEX) {
      const fid = e.f.id || ''
      if (!/^(ff-|brand\d*-)/.test(fid)) continue
      let covered = null
      if (e.stems.every((w) => qSet.has(w))) covered = e.stems
      else {
        const al = e.aliases.find((st) => st.length > 0 && st.every((w) => qSet.has(w)))
        if (!al) continue
        covered = al
      }
      // Полное покрытие: у названия ИИ нет слов вне позиции базы
      if (!qStems.every((w) => covered.includes(w))) continue
      const d = digitScore(e.digits, qDigits)
      if (!best || d > best.d || (d === best.d && e.len > best.len)) best = { f: e.f, d, len: e.len }
    }
    if (!best) return it
    const b = best.f
    return {
      ...it,
      kcal100: b.kcal,
      p: b.p,
      f: b.f,
      c: b.c,
      fib: b.fib || 0,
      sug: b.sug || 0,
      source: 'brand',
    }
  })
}

// ── Локальный разбор фразы без ИИ («тарелка борща 300 граммов») ─
const GRAMS_RE = /(\d{1,4})\s*(граммов|грамма|грамм|миллилитров|миллилитра|миллилитр|гр|г|мл)(?![а-я])/
// Штуки/куски: «2 штуки», «3 шт», «1 ломтик», «полплитки не считаем» — граммовка
// штуки берётся из PIECE_GRAMS по блюду (\b в JS не работает с кириллицей).
// «шт» добавлено: нейросеть транскрипции записывает «штуки» часто как «шт»
// (отзыв Кати 23.11: «варёное яйцо 3 шт»)
const PIECES_RE = /(\d{1,2})\s*(штук[а-я]*|шт|кусочк[а-я]*|кусок|куска|куски|ломтик[а-я]*|плитк[а-я]*)(?![а-я])/

// Вес одной штуки, г — для перевода «2 штуки» в граммы. Только ходовые
// позиции, где штука стабильна; у остальных блюд штука неопределённа
const PIECE_GRAMS = {
  'Яйцо варёное': 55,
  'Сосиски': 50,
  'Пельмени варёные': 15,
  'Блинчики': 90,
  'Бутерброд с сыром': 100,
  'Котлета мясная': 120,
  'Котлета куриная': 120,
  'Сырники': 60,
  'Сыр твёрдый': 30,
  'Хлеб белый': 30,
  'Хлеб чёрный': 30,
  'Банан': 120,
  'Яблоко': 180,
  'Апельсин': 200,
  'Мандарин': 70,
  'Груша': 180,
  'Мороженое': 100,
  // Овощи поштучно: средний помидор/огурец ≈ 120 г («огурец 1 штука»)
  'Помидор': 120,
  'Огурец': 120,
}

// Объёмная посуда во фразе: «кружка кофе», «большая кружка», «тарелка супа»
function volumeFromSegment(seg) {
  const words = seg.split(' ').filter(Boolean)
  let ml = 0
  for (const w of words) {
    if (/^кружк/.test(w)) ml = Math.max(ml, 250)
    else if (/^чашк/.test(w)) ml = Math.max(ml, 200)
    else if (/^стакан/.test(w)) ml = Math.max(ml, 250)
    else if (/^бокал/.test(w)) ml = Math.max(ml, 250)
    else if (/^тарелк/.test(w)) ml = Math.max(ml, 300)
    else if (/^миск/.test(w)) ml = Math.max(ml, 300)
    else if (/^пиал/.test(w)) ml = Math.max(ml, 200)
  }
  // «большая кружка», «большая тарелка» — на 40% больше (350/420)
  if (ml && words.some((w) => /^больш/.test(w))) ml = Math.round((ml * 1.4) / 10) * 10
  return ml || null
}

// Один сегмент фразы (между запятыми) → элемент дневника или null
function parsePhraseSegment(text0) {
  const seg = normName(text0)
  if (!seg || !stemsOf(seg).length) return null
  const gm = seg.match(GRAMS_RE)
  const pm = seg.match(PIECES_RE)
  const name0 = seg.replace(GRAMS_RE, ' ').replace(PIECES_RE, ' ')
  const dish = findLocalDish(name0)
  // Не блюдо — может, продуктовая позиция базы (в т.ч. брендовая из
  // foods-brands.js): «колбаса варёная вязанка 50 грамм» голосом —
  // тоже считается офлайн и бесплатно
  const food = dish ? null : findLocalFood(name0)
  if (!dish && !food) return null
  const src = dish || food

  // Вес порции: явные граммы → штуки × вес штуки → посуда (кружка/тарелка) →
  // обычная порция блюда. null остаётся только если не распознано ничего
  let grams = null
  if (gm) grams = Math.max(1, Math.min(2000, parseInt(gm[1], 10)))
  else if (pm && PIECE_GRAMS[src.n || src.name]) {
    grams = Math.max(1, Math.min(2000, parseInt(pm[1], 10) * PIECE_GRAMS[src.n || src.name]))
  } else grams = volumeFromSegment(seg)

  const item = {
    // У блюд поля n/e, у продуктов базы — name/emoji (foods.js)
    name: src.n || src.name,
    emoji: src.e || src.emoji || '🍽️',
    kcal100: dish ? dish.kcal100 : food.kcal,
    p: dish ? dish.p : food.p,
    f: dish ? dish.f : food.f,
    c: dish ? dish.c : food.c,
    fib: (dish ? dish.fib : food.fib) || 0,
    sug: (dish ? dish.sug : food.sug) || 0,
    source: 'base',
  }
  const dg = dish ? dish.dg : food.defaultGrams
  if (dg) item.defaultGrams = dg
  // Распознанный вес — и на карточку (итоговый калораж), и в предзаполнение
  // граммовки на экране порции (SelectedFood берёт defaultGrams)
  if (grams) {
    item.grams = grams
    item.defaultGrams = grams
  }
  return item
}

// ── Разбивка сегмента БЕЗ запятых на отдельные продукты ────────
// Диктовка часто идёт сплошным потоком: нейросеть транскрипции не
// расставляет запятые, и «грудка 200 грамм яйцо 3 штуки помидор 200
// грамм огурец» превращалось в ОДИН продукт — первое блюдо получало
// первую граммовку, остальные терялись молча (отзыв Кати 23.11:
// диктует 4 продукта — в списке 1). Режем по «погонам» слов: числа и
// единицы (грамм/шт) стоят между названиями и служат границами.
const SEG_UNIT_WORDS = new Set([
  'граммов', 'грамма', 'грамм', 'миллилитров', 'миллилитра', 'миллилитр', 'гр', 'г', 'мл',
])
const SEG_PIECE_WORDS = /^(штук[а-я]*|шт|кусочк[а-я]*|кусок|куска|куски|ломтик[а-я]*|плитк[а-я]*)$/
const SEG_NUM_RE = /^\d+$/
const clampGrams = (n) => Math.max(1, Math.min(2000, Math.round(n)))

function sameStemSet(a, b) {
  const sa = new Set(a)
  const sb = new Set(b)
  if (!sa.size || sa.size !== sb.size) return false
  for (const w of sa) if (!sb.has(w)) return false
  return true
}

// Слова-модификаторы — сами по себе НЕ названия продуктов: «варёная»
// и «варенье» после огласовки имеют одну основу («варен»), и раньше
// «варёная куриная грудка» начиналась с карточки «Варенье». Проверяем
// по словоформе: у прилагательных типовые окончания, у существительных
// («варенье») их нет — «варенье 20 грамм» продолжает работать
const MODIFIER_STEMS = new Set([
  'варен', 'жарен', 'тушен', 'парен', 'запечен', 'копчен', 'солен', 'сушен', 'вялен',
  'печен', 'квашен', 'мочен', 'свеж', 'свежеморожен', 'заморожен', 'консервирован',
  'маринован', 'отварн', 'больш', 'маленьк', 'средн', 'домашн',
])
const ADJ_END_RE = /(ая|ое|ый|ые|ой|ий|ым|ом|их|им|ем|его|ему|ого|ому)$/
function isModifierWord(w) {
  return w.length > 3 && ADJ_END_RE.test(w) && MODIFIER_STEMS.has(dishStem(w))
}

// Точное совпадение погона слов с названием/псевдонимом блюда или
// продукта базы. Лишних слов быть не может — жадный захват исключён
function equalitySpanMatch(spanWords) {
  const set = stemsOf(spanWords.join(' '))
  if (!set.length) return null
  for (const e of DISH_INDEX) {
    if (sameStemSet(e.stems, set)) return e.d
    for (const al of e.aliases) if (al.length && sameStemSet(al, set)) return e.d
  }
  for (const e of FOOD_INDEX) {
    if (sameStemSet(e.stems, set)) return e.f
    for (const al of e.aliases) if (al.length && sameStemSet(al, set)) return e.f
  }
  return null
}

// Непокрытые слова погона сами образуют продукт? Значит, захват был
// жадный («куриная грудка вареное яйцо» одним погоном) — укорачиваем,
// чтобы сосед не проглотился. Модификаторы («варёная», «свежий») сами
// по себе не продукты — их не считаем
function leftoverHasProduct(spanWords, coveredStems) {
  const covered = new Set(coveredStems)
  const leftover = spanWords.filter((w) => !covered.has(dishStem(w)))
  for (let i = 0; i < leftover.length; i++) {
    for (let len = 1; len <= Math.min(3, leftover.length - i); len++) {
      if (len === 1 && isModifierWord(leftover[i])) continue
      if (equalitySpanMatch(leftover.slice(i, i + len))) return true
    }
  }
  return false
}

// Один погон слов → найденные продукты в порядке следования.
// 1) точное совпадение названия (самое длинное — «кофе с молоком и
//    сахаром» точнее, чем «кофе»); блюдо сильнее продукта базы,
//    у продуктов приоритет у совпавшей цифры («молоко 2,5» → 2,5%);
// 2) иначе неполное название: все основы названия/псевдонима внутри
//    погона («свежий помидор» → «Помидор»), минимальный захват;
// 3) иначе слово не продукт — пропускаем
function matchProductAt(words, i, qDigits) {
  const maxLen = Math.min(6, words.length - i)
  let bestDish = null
  let bestFood = null
  for (let len = 1; len <= maxLen; len++) {
    const span = words.slice(i, i + len)
    // одиночное слово-модификатор («варёная», «свежий») — не продукт
    if (len === 1 && isModifierWord(span[0])) continue
    const set = stemsOf(span.join(' '))
    if (!set.length) continue
    for (const e of DISH_INDEX) {
      const eq =
        sameStemSet(e.stems, set) ||
        e.aliases.some((al) => al.length && sameStemSet(al, set))
      if (eq && (!bestDish || e.len > bestDish.nameLen)) bestDish = { src: e.d, len, nameLen: e.len }
    }
    for (const e of FOOD_INDEX) {
      const eq =
        sameStemSet(e.stems, set) ||
        e.aliases.some((al) => al.length && sameStemSet(al, set))
      if (!eq) continue
      const d = digitScore(e.digits, qDigits)
      if (!bestFood || d > bestFood.d || (d === bestFood.d && e.len > bestFood.nameLen))
        bestFood = { src: e.f, len, nameLen: e.len, d }
    }
  }
  if (bestDish) return { src: bestDish.src, len: bestDish.len }
  if (bestFood) return { src: bestFood.src, len: bestFood.len }

  for (let len = 1; len <= maxLen; len++) {
    const span = words.slice(i, i + len)
    if (len === 1 && isModifierWord(span[0])) continue
    const set = new Set(stemsOf(span.join(' ')))
    if (!set.size) continue
    let cand = null
    for (const e of DISH_INDEX) {
      const cov = e.stems.every((w) => set.has(w))
        ? e.stems
        : e.aliases.find((al) => al.length && al.every((w) => set.has(w)))
      if (cov && (!cand || e.len > cand.nameLen)) cand = { src: e.d, nameLen: e.len, covered: cov }
    }
    if (!cand) {
      for (const e of FOOD_INDEX) {
        const cov = e.stems.every((w) => set.has(w))
          ? e.stems
          : e.aliases.find((al) => al.length && al.every((w) => set.has(w)))
        if (!cov) continue
        const d = digitScore(e.digits, qDigits)
        if (!cand || d > (cand.d || 0) || (d === (cand.d || 0) && e.len > cand.nameLen))
          cand = { src: e.f, nameLen: e.len, covered: cov, d }
      }
    }
    if (!cand) continue
    const covered = new Set(cand.covered)
    const leftover = span.filter((w) => !covered.has(dishStem(w)))
    if (cand.covered.length === 1 && leftover.length) {
      // у кандидата одна основа, а в погоне есть лишние слова: разрешаем
      // их ТОЛЬКО если все — модификаторы («свежий помидор» → «Помидор»);
      // иначе одноосновные продукты цепляются за чужие слова («вареная
      // куриная» ловила «Варенье» по основе «варен»)
      if (!leftover.every((w) => isModifierWord(w))) continue
    } else if (leftoverHasProduct(span, cand.covered)) continue // сосед рядом — укорачиваем захват
    return { src: cand.src, len }
  }
  return null
}

function segmentRunProducts(words, qDigits) {
  const out = []
  let i = 0
  while (i < words.length) {
    const m = matchProductAt(words, i, qDigits)
    if (m) {
      out.push({ src: m.src, grams: null })
      i += m.len
    } else i++
  }
  return out
}

// Сегмент фразы (между запятыми) → МАССИВ продуктов (0…5).
// Поток режется на блоки: погоны слов и разделители (числа/единицы/штуки).
// Число+единица после погона — вес последнего продукта («грудка 200
// грамм»); перед погоном — вес первого («300 грамм свинины»). Число
// без единицы рядом со штучным продуктом — штуки («яйца 2» → 110 г);
// прочие голые числа не трогаем: это чаще всего проценты из транскрипта
// («молоко 2 5», «сметана 15»)
function parseSegmentMulti(text0) {
  const norm = normName(text0)
  const toks = norm.split(' ').filter(Boolean)
  const qDigits = toks.filter((w) => SEG_NUM_RE.test(w))

  // Блоки в порядке следования: { type: 'run' | 'sep', words }
  const blocks = []
  for (const w of toks) {
    const last = blocks[blocks.length - 1]
    const sepLike = SEG_NUM_RE.test(w) || SEG_UNIT_WORDS.has(w) || SEG_PIECE_WORDS.test(w)
    if (sepLike) {
      if (last && last.type === 'sep') last.words.push(w)
      else blocks.push({ type: 'sep', words: [w] })
    } else {
      if (last && last.type === 'run') last.words.push(w)
      else blocks.push({ type: 'run', words: [w] })
    }
  }

  const matched = []
  const usedSep = new Set() // индексы блоков-разделителей, уже отданных продукту
  const pieceGramsOf = (p) => PIECE_GRAMS[p.src.n || p.src.name] || null

  const applySep = (blockIdx, target) => {
    const blk = blocks[blockIdx]
    if (!blk || blk.type !== 'sep' || usedSep.has(blockIdx)) return false
    if (target == null || target.grams != null) return false
    const sep = blk.words
    const n = sep.find((w) => SEG_NUM_RE.test(w))
    if (n == null) return false
    const num = parseInt(n, 10)
    const afterNum = sep[sep.indexOf(n) + 1]
    const pg = pieceGramsOf(target)
    let grams = null
    if (afterNum && SEG_UNIT_WORDS.has(afterNum)) grams = num
    else if (afterNum && SEG_PIECE_WORDS.test(afterNum) && pg) grams = num * pg
    else if (!afterNum && sep.length === 1) {
      // голое число: рядом со штучным продуктом — штуки, иначе только
      // «взрослые» числа (≥20) считаем граммами («грудка 100»), мелкие
      // — проценты из транскрипта, не вес
      if (pg) grams = num * pg
      else if (num >= 20) grams = num
    }
    if (grams == null) return false
    target.grams = clampGrams(grams)
    usedSep.add(blockIdx)
    return true
  }

  for (let k = 0; k < blocks.length; k++) {
    const b = blocks[k]
    if (b.type !== 'run') continue
    const products = segmentRunProducts(b.words, qDigits)
    if (!products.length) continue

    // разделитель ПОСЛЕ погона — последнему продукту («грудка 200 грамм»);
    // не отдан — достанется первому продукту следующего погона
    applySep(k + 1, products[products.length - 1])
    // разделитель ПЕРЕД погоном — первому продукту («300 грамм свинины»,
    // «2 яйца»), если предыдущий погон его не забрал
    applySep(k - 1, products[0])

    // посуда внутри погона («тарелка борща», «большая кружка кофе») —
    // объём первому продукту без веса; явная граммовка сильнее
    if (products.some((p) => p.grams == null)) {
      const vol = volumeFromSegment(b.words.join(' '))
      if (vol) {
        const target = products.find((p) => p.grams == null)
        target.grams = clampGrams(vol)
      }
    }

    for (const p of products) {
      const src = p.src
      const dish = src.n ? src : null
      const food = dish ? null : src
      const item = {
        name: src.n || src.name,
        emoji: src.e || src.emoji || '🍽️',
        kcal100: dish ? dish.kcal100 : food.kcal,
        p: dish ? dish.p : food.p,
        f: dish ? dish.f : food.f,
        c: dish ? dish.c : food.c,
        fib: (dish ? dish.fib : food.fib) || 0,
        sug: (dish ? dish.sug : food.sug) || 0,
        source: 'base',
      }
      const dg = dish ? dish.dg : food.defaultGrams
      if (dg) item.defaultGrams = dg
      if (p.grams != null) {
        item.grams = p.grams
        item.defaultGrams = p.grams
      }
      matched.push(item)
    }
  }

  // Посуда в соседнем погоне без чисел: «салат 2 тарелки», «кофе большая
  // кружка» (сегмент из одного продукта) — объём единственному продукту
  // без веса, как в прежнем разборе
  if (matched.length === 1 && matched[0].grams == null) {
    const vol = volumeFromSegment(norm)
    if (vol) {
      matched[0].grams = clampGrams(vol)
      matched[0].defaultGrams = matched[0].grams
    }
  }
  return matched
}

function localParsePhrase(raw) {
  const text0 = String(raw || '').trim()
  if (!text0) return null

  // Несколько продуктов через запятую/точку с запятой: «яйцо 2 штуки,
  // грудка 100 грамм, кофе с молоком и сахаром, большая кружка».
  // Разрезаем ТОЛЬКО по запятым — «и» резать нельзя («кофе с молоком
  // и сахаром»), иначе связка распадётся. 5 позиций — разумный предел
  const parts = text0.split(/[,;]/).map((s) => s.trim()).filter(Boolean)
  const items = []
  for (const part of parts) {
    // Погонный разбор: сегмент без запятых может содержать несколько
    // продуктов подряд (диктовка без пауз — транскрипт без пунктуации)
    const multi = parseSegmentMulti(part)
    if (multi.length) {
      for (const it of multi) {
        items.push(it)
        if (items.length >= 5) break
      }
      if (items.length >= 5) break
      continue
    }
    const it = parsePhraseSegment(part)
    if (it) {
      items.push(it)
      if (items.length >= 5) break
      continue
    }
    // Сегмент без блюда, но с посудой («большая кружка», «две тарелки»)
    // — это продолжение предыдущего продукта: переносим объём в его вес,
    // если свой вес ещё не распознался
    const vol = volumeFromSegment(normName(part))
    if (vol && items.length) {
      const prev = items[items.length - 1]
      if (!prev.grams) {
        prev.grams = vol
        prev.defaultGrams = vol
      }
    }
  }
  if (items.length) {
    // Совместимость со старым полем grams (тост «Распознан вес»): вес
    // первого распознанного сегмента
    const grams = items.find((i) => i.grams)?.grams ?? null
    return { text: text0, grams, items }
  }

  // Ни один сегмент не распознался — прежний путь: самое длинное блюдо
  // во всей фразе целиком (одно блюдо с одной граммовкой)
  const text = normName(text0)
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
    fib: dish.fib || 0,
    sug: dish.sug || 0,
    source: 'base',
  }
  if (dish.dg) item.defaultGrams = dish.dg
  return { text: text0, grams, items: [item] }
}

// ── Подсчёт КБЖУ ПО СОСТАВУ («свинина 300 грамм, картошка 500 грамм») ──
// Отдельный словарь ингредиентов: усреднённые значения варёных/тушёных
// продуктов — то, что попадает в готовое блюдо. Работает БЕСПЛАТНО, без ИИ.
const INGREDIENTS = [
  { n: 'Свинина', w: ['свинина', 'свининки', 'свинки'], kcal100: 250, p: 20.0, f: 18.5, c: 0, fib: 0, sug: 0 },
  { n: 'Говядина', w: ['говядина', 'говяжье'], kcal100: 220, p: 27.0, f: 12.0, c: 0, fib: 0, sug: 0 },
  { n: 'Курица', w: ['курица', 'курицу', 'курицей'], kcal100: 150, p: 25.0, f: 5.0, c: 0, fib: 0, sug: 0 },
  { n: 'Куриное филе', w: ['филе', 'грудка'], kcal100: 137, p: 29.6, f: 1.8, c: 0.4, fib: 0, sug: 0 },
  // Бедро жирнее грудки — усреднённое тушёное с кожей (отзыв Кати 19.11:
  // «бедро куриное 150 гр» считалось как безымянная «Курица»)
  { n: 'Куриное бедро', w2: ['куриное бедро', 'бедро куриное'], w: ['бедро', 'бедрышка', 'бедрышки'], kcal100: 190, p: 22.0, f: 12.5, c: 0, fib: 0, sug: 0 },
  { n: 'Индейка', w: ['индейка'], kcal100: 160, p: 25.0, f: 6.0, c: 0, fib: 0, sug: 0 },
  { n: 'Фарш', w: ['фарш', 'фарша'], kcal100: 250, p: 17.0, f: 20.0, c: 0, fib: 0, sug: 0 },
  { n: 'Картошка', w: ['картошка', 'картофель', 'картошку'], kcal100: 80, p: 2.0, f: 0.4, c: 16.5, fib: 1.3, sug: 0.9 },
  { n: 'Морковь', w: ['морковь', 'морковка', 'морковью'], kcal100: 32, p: 1.3, f: 0.1, c: 6.9, fib: 2.4, sug: 4.7 },
  { n: 'Свёкла', w: ['свекла', 'бурак'], kcal100: 44, p: 1.7, f: 0, c: 10.0, fib: 2, sug: 8 },
  { n: 'Капуста', w: ['капуста', 'капусту'], kcal100: 28, p: 1.8, f: 0.1, c: 4.7, fib: 2.3, sug: 3.2 },
  { n: 'Лук', w: ['лук', 'луковица'], kcal100: 41, p: 1.1, f: 0.1, c: 8.4, fib: 1.4, sug: 4.2 },
  { n: 'Помидор', w: ['помидор', 'томат'], kcal100: 20, p: 1.1, f: 0.2, c: 3.7, fib: 1.2, sug: 2.6 },
  { n: 'Огурец', w: ['огурец', 'огурца', 'огурцов', 'огурчики'], kcal100: 15, p: 0.8, f: 0.1, c: 2.8, fib: 0.5, sug: 1.7 },
  { n: 'Перец', w: ['перец'], kcal100: 27, p: 1.3, f: 0.1, c: 5.3, fib: 2.1, sug: 4.4 },
  { n: 'Чеснок', w: ['чеснок'], kcal100: 143, p: 6.4, f: 0.5, c: 33.0, fib: 2.1, sug: 1 },
  { n: 'Зелень', w: ['зелень', 'укроп', 'петрушка'], kcal100: 36, p: 3.0, f: 0.4, c: 6.0, fib: 2.5, sug: 1 },
  { n: 'Грибы', w: ['грибы', 'грибов', 'шампиньоны'], kcal100: 30, p: 3.1, f: 0.3, c: 3.3, fib: 1.2, sug: 1.5 },
  { n: 'Фасоль', w: ['фасоль'], kcal100: 123, p: 7.8, f: 0.5, c: 21.0, fib: 5.5, sug: 0.4 },
  { n: 'Зелёный горошек', w: ['горошек'], kcal100: 70, p: 5.0, f: 0.5, c: 10.0, fib: 4.5, sug: 4 },
  { n: 'Рис', w: ['рис', 'риса'], kcal100: 120, p: 2.4, f: 0.5, c: 25.0, fib: 0.4, sug: 0.1 },
  { n: 'Гречка', w: ['гречка', 'гречи'], kcal100: 110, p: 4.2, f: 1.1, c: 21.3, fib: 2.7, sug: 0.9 },
  { n: 'Макароны', w: ['макароны', 'макарон', 'паста', 'спагетти'], kcal100: 140, p: 4.5, f: 1.0, c: 27.5, fib: 1.8, sug: 0.8 },
  { n: 'Масло сливочное', w2: ['сливочное масло', 'масло сливочное'], kcal100: 750, p: 0.5, f: 82.5, c: 0.8, fib: 0, sug: 0 },
  { n: 'Масло растительное', w2: ['растительное масло', 'масло растительное', 'подсолнечное масло', 'оливковое масло'], w: ['масло'], kcal100: 900, p: 0, f: 99.9, c: 0, fib: 0, sug: 0 },
  { n: 'Сметана', w: ['сметана', 'сметаны'], kcal100: 200, p: 2.6, f: 20.0, c: 3.4, fib: 0, sug: 3 },
  { n: 'Молоко', w: ['молоко', 'молока'], kcal100: 52, p: 2.8, f: 2.5, c: 4.7, fib: 0, sug: 4.7 },
  { n: 'Яйцо', w: ['яйцо', 'яйца'], kcal100: 157, p: 12.7, f: 11.5, c: 0.7, fib: 0, sug: 0.4 },
  { n: 'Сыр', w: ['сыр', 'сыра'], kcal100: 360, p: 25.0, f: 30.0, c: 0, fib: 0, sug: 0.5 },
  { n: 'Творог', w: ['творог', 'творога'], kcal100: 121, p: 17.0, f: 5.0, c: 1.8, fib: 0, sug: 1.5 },
  { n: 'Мука', w: ['мука', 'муки'], kcal100: 334, p: 10.3, f: 1.1, c: 68.9, fib: 2.7, sug: 0.3 },
  { n: 'Колбаса', w: ['колбаса', 'колбасы'], kcal100: 300, p: 13.0, f: 27.0, c: 2.0, fib: 0, sug: 1 },
  { n: 'Колбаса копчёная', w2: ['колбаса копченая', 'копченая колбаса', 'колбаса сырокопченая', 'сырокопченая колбаса'], kcal100: 425, p: 16.0, f: 40.0, c: 0, fib: 0, sug: 0.5 },
  { n: 'Сосиски', w: ['сосиски', 'сосиска'], kcal100: 260, p: 12.0, f: 23.0, c: 2.0, fib: 0, sug: 1 },
  { n: 'Тыква', w: ['тыква'], kcal100: 26, p: 1.0, f: 0.1, c: 6.0, fib: 1, sug: 2.8 },
  { n: 'Кабачок', w: ['кабачок'], kcal100: 24, p: 0.6, f: 0.3, c: 4.6, fib: 1, sug: 2.5 },
  { n: 'Бульон', w: ['бульон', 'бульона'], kcal100: 15, p: 2.0, f: 0.5, c: 0, fib: 0, sug: 0 },
  { n: 'Вода', w: ['вода', 'воды'], kcal100: 0, p: 0, f: 0, c: 0, fib: 0, sug: 0 },
  { n: 'Сахар', w: ['сахар'], kcal100: 387, p: 0, f: 0, c: 99.8, fib: 0, sug: 99.8 },
  { n: 'Соль', w: ['соль'], kcal100: 0, p: 0, f: 0, c: 0, fib: 0, sug: 0 },
  // ── Рыба и консервы: селёдки здесь не было вовсе — «селёдка в масле»
  //    ловила слово «масле» и вешала растительное масло 900 ккал/100 г
  //    на всю граммовку (скрин Кати 19.11: омлет с сельдью показал
  //    414 ккал/100 г вместо ~170). Значения — солёная/консервированная
  //    рыба без заливки, как в LOCAL_DISHES и базе продуктов
  { n: 'Сельдь', w: ['сельдь', 'селедка'], kcal100: 220, p: 18.0, f: 16.0, c: 0, fib: 0, sug: 0 },
  { n: 'Тунец', w: ['тунец', 'тунца'], kcal100: 96, p: 23.4, f: 0.8, c: 0, fib: 0, sug: 0 },
  { n: 'Шпроты', w: ['шпроты', 'шпрот'], kcal100: 320, p: 18.0, f: 28.0, c: 0, fib: 0, sug: 0 },
  { n: 'Горбуша', w: ['горбуша', 'горбуши'], kcal100: 160, p: 22.0, f: 7.0, c: 0, fib: 0, sug: 0 },
  // ── Расширение: ходовые продукты домашней кухни (молочка, выпечка,
  //    соусы, сухофрукты) — больше рецептов считаются офлайн и бесплатно
  { n: 'Сливки 33%', w: ['сливки', 'сливок'], kcal100: 337, p: 2.2, f: 33.0, c: 3.3, fib: 0, sug: 3.3 },
  { n: 'Майонез', w: ['майонез', 'майонеза'], kcal100: 627, p: 2.4, f: 67.0, c: 3.7, fib: 0, sug: 2.6 },
  { n: 'Кефир', w: ['кефир', 'кефира'], kcal100: 56, p: 2.8, f: 3.2, c: 4.1, fib: 0, sug: 4.1 },
  { n: 'Баранина', w: ['баранина', 'баранины'], kcal100: 209, p: 16.3, f: 15.3, c: 0, fib: 0, sug: 0 },
  { n: 'Бекон', w: ['бекон', 'бекона'], kcal100: 500, p: 10.4, f: 50.0, c: 0, fib: 0, sug: 0 },
  { n: 'Сало', w: ['сало', 'сала'], kcal100: 797, p: 1.4, f: 89.0, c: 0, fib: 0, sug: 0 },
  { n: 'Сгущённое молоко', w: ['сгущенка', 'сгущенки'], w2: ['сгущенное молоко', 'молоко сгущенное', 'сгущеное молоко', 'сгущенного молока', 'сгущенка вареная'], kcal100: 320, p: 7.2, f: 8.5, c: 55.5, fib: 0, sug: 55.5 },
  { n: 'Творожный сыр', w2: ['творожный сыр', 'сыр творожный'], kcal100: 253, p: 6.5, f: 24.0, c: 3.5, fib: 0, sug: 3.5 },
  { n: 'Моцарелла', w: ['моцарелла', 'моцареллы'], kcal100: 280, p: 22.0, f: 20.0, c: 2.2, fib: 0, sug: 1.0 },
  { n: 'Пармезан', w: ['пармезан', 'пармезана'], kcal100: 392, p: 33.0, f: 28.0, c: 0, fib: 0, sug: 0 },
  { n: 'Томатная паста', w: ['томатная'], w2: ['томатная паста', 'паста томатная'], kcal100: 82, p: 4.3, f: 0.5, c: 15.5, fib: 1.9, sug: 9.0 },
  { n: 'Кетчуп', w: ['кетчуп', 'кетчупа'], kcal100: 93, p: 1.3, f: 0.1, c: 22.0, fib: 0.3, sug: 20.0 },
  { n: 'Соевый соус', w2: ['соевый соус', 'соус соевый'], kcal100: 51, p: 7.9, f: 0.1, c: 4.9, fib: 0, sug: 0.4 },
  { n: 'Какао-порошок', w: ['какао'], kcal100: 290, p: 20.4, f: 13.7, c: 33.2, fib: 30.0, sug: 3.0 },
  { n: 'Шоколад', w: ['шоколад', 'шоколада'], kcal100: 546, p: 6.9, f: 35.3, c: 47.5, fib: 4.6, sug: 42.0 },
  { n: 'Изюм', w: ['изюм', 'изюма'], kcal100: 299, p: 2.3, f: 0.5, c: 71.3, fib: 3.5, sug: 65.0 },
  { n: 'Чернослив', w: ['чернослив', 'чернослива'], kcal100: 231, p: 2.3, f: 0.5, c: 57.7, fib: 7.0, sug: 49.0 },
  { n: 'Курага', w: ['курага', 'кураги'], kcal100: 215, p: 5.2, f: 0.3, c: 51.0, fib: 7.3, sug: 46.0 },
  { n: 'Грецкие орехи', w: ['орехи', 'орехов'], w2: ['грецкие орехи', 'орехи грецкие', 'грецких орехов', 'орехов грецких'], kcal100: 654, p: 15.2, f: 65.2, c: 7.0, fib: 6.7, sug: 2.6 },
  { n: 'Крахмал', w: ['крахмал', 'крахмала'], kcal100: 330, p: 0.7, f: 0.1, c: 82.0, fib: 0, sug: 0 },
  { n: 'Тесто слоёное', w: ['слоеное'], w2: ['слоеное тесто', 'тесто слоеное'], kcal100: 458, p: 8.2, f: 28.5, c: 45.9, fib: 1.5, sug: 1.5 },
  { n: 'Ванильный сахар', w: ['ванилин', 'ваниль'], w2: ['ванильный сахар', 'сахар ванильный'], kcal100: 380, p: 0, f: 0, c: 99.5, fib: 0, sug: 99.5 },
  { n: 'Сода', w: ['сода', 'соды'], kcal100: 0, p: 0, f: 0, c: 0, fib: 0, sug: 0 },
  { n: 'Разрыхлитель', w: ['разрыхлитель'], kcal100: 0, p: 0, f: 0, c: 0, fib: 0, sug: 0 },
  { n: 'Дрожжи сухие', w: ['дрожжи', 'дрожжей'], kcal100: 325, p: 40.0, f: 7.6, c: 36.0, fib: 0, sug: 0 },
  { n: 'Яблоки', w: ['яблоки', 'яблока', 'яблоко'], kcal100: 47, p: 0.4, f: 0.4, c: 9.8, fib: 1.8, sug: 9.0 },
  { n: 'Лимон', w: ['лимон', 'лимона'], w2: ['лимонный сок', 'сок лимонный'], kcal100: 33, p: 0.9, f: 0.1, c: 3.0, fib: 0.5, sug: 3.0 },
  { n: 'Кукуруза (консервы)', w: ['кукуруза', 'кукурузы'], kcal100: 119, p: 3.2, f: 1.3, c: 22.7, fib: 2.4, sug: 4.5 },
  { n: 'Огурцы солёные', w2: ['огурцы соленые', 'соленые огурцы', 'огурцы маринованные', 'маринованные огурцы', 'огурцов соленых', 'соленых огурцов', 'огурцов маринованных', 'маринованных огурцов'], kcal100: 12, p: 0.8, f: 0.1, c: 1.9, fib: 0.7, sug: 1.4 },
  { n: 'Оливки', w: ['оливки', 'маслины'], kcal100: 115, p: 0.8, f: 10.7, c: 6.3, fib: 1.6, sug: 0 },
  { n: 'Шпинат', w: ['шпинат', 'шпината'], kcal100: 23, p: 2.9, f: 0.4, c: 3.6, fib: 1.3, sug: 0.4 },
  { n: 'Брокколи', w: ['брокколи'], kcal100: 34, p: 2.8, f: 0.4, c: 6.6, fib: 2.6, sug: 1.7 },
  { n: 'Цветная капуста', w2: ['цветная капуста', 'капуста цветная'], kcal100: 30, p: 2.5, f: 0.3, c: 5.4, fib: 2.1, sug: 1.9 },
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
  // Модификаторы подачи («в масле», «в собственном соку») — не отдельный
  // ингредиент: вырезаем ДО разбора. Раньше слово «масле» спалось с
  // основой «масл» и подтягивало «Масло растительное» 900 ккал/100 г на
  // всю граммовку продукта (скрин Кати 19.11 — «селёдка в масле» в омлете
  // дал 414 ккал/100 г; теперь сельдь считается сама — ~171).
  // «омлет НА масле» остаётся без изменений — масло жарки честно входит
  const prepped = text
    .replace(
      /(?:^|\s)(?:в|во)\s+(?:масле|собственном|своем|томатном|томате|маринаде|желе|сиропе|рассоле)(?:\s+(?:соку|соусе|маринаде))?(?=\s|$)/g,
      ' '
    )
    .replace(/\s+/g, ' ')
    .trim()
  const tokens = prepped.split(' ').filter(Boolean)
  const UNIT_WORDS = new Set([
    'граммов', 'грамма', 'грамм', 'миллилитров', 'миллилитра', 'миллилитр', 'гр', 'г', 'мл',
  ])
  const LITER_RE = /^(литров|литра|литр|л)$/
  const NUM_RE = /^\d{1,4}(\.\d{1,2})?$/
  const items = []
  const missed = [] // граммовки, чьё название не нашлось в базе
  let liters = 0
  let pending = [] // слова ДО граммовки («свинина 300 грамм»)
  let afterBuf = [] // слова ПОСЛЕ граммовки («300 грамм свинины»)
  let awaitGrams = 0 // граммовка, чьё название ещё не встретилось
  let expectName = false // после граммовки слова копим в afterBuf
  let missedName = '' // слова из pending, когда продукт так и не нашёлся

  const takeItem = (ing, grams) => {
    if (ing && items.length < 20)
      items.push({ ...ing, grams: Math.max(1, Math.min(5000, grams)) })
  }
  // Название так и не пришло? Ищем его в накопленных словах
  const resolveAwait = () => {
    if (!awaitGrams) return
    const ing = lookupIngredient(afterBuf) || findLocalDish(afterBuf.join(' '))
    takeItem(ing, awaitGrams)
    if (!ing && (missedName || afterBuf.length))
      missed.push({ name: missedName || afterBuf.join(' '), grams: awaitGrams })
    awaitGrams = 0
    afterBuf = []
    missedName = ''
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
      const pendingWords = pending // слова-название до граммовки
      const ing =
        lookupIngredient(pending) || findLocalDish(pending.join(' '))
      takeItem(ing, grams)
      pending = []
      // имя могло быть до граммовки — если нет, ждём его после; слова
      // до граммовки запоминаем: если продукт не найдётся, покажем
      // его в missed («бедро кролика 150 г» не должно исчезать молча)
      awaitGrams = ing ? 0 : grams
      missedName = ing ? '' : pendingWords.join(' ')
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
  let fib = 0
  let sug = 0
  let weight = 0
  for (const it of items) {
    kcal += (it.kcal100 * it.grams) / 100
    p += (it.p * it.grams) / 100
    f += (it.f * it.grams) / 100
    c += (it.c * it.grams) / 100
    fib += ((it.fib || 0) * it.grams) / 100
    sug += ((it.sug || 0) * it.grams) / 100
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
    fib: Math.round((fib / weight) * 1000) / 10,
    sug: Math.round((sug / weight) * 1000) / 10,
    weight: Math.round(weight),
    // Ккал каждого ингредиента — для окна «Исправить блюдо»: Катя 19.11
    // («не видно как считает калории, из каких ингредиентов») должна
    // видеть, что именно вошло в цифру
    items: items.map((it) => ({
      name: it.n,
      grams: it.grams,
      kcal: Math.round((it.kcal100 * it.grams) / 100),
    })),
    // Нераспознанные позиции: граммовка была, продукта в базе нет —
    // в расчёт они не вошли, но молча терять нельзя (пользователь
    // решит: поправить название или принять)
    missed: missed.map((m) => ({ name: m.name, grams: m.grams })),
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
  // В прокси-режиме ключ не нужен — он на сервере (см. ai-config.js)
  const { apiKey, proxyUrl } = AI_CONFIG
  if (!apiKey && !proxyUrl) {
    // Техническая причина — в консоль (видна только разработчику),
    // пользователь видит короткое человеческое сообщение
    console.warn('[food-ai] ИИ не настроен: EXPO_PUBLIC_AI_KEY (.env) или EXPO_PUBLIC_AI_PROXY_URL')
    throw new Error('ИИ ещё не подключён — добавьте блюдо вручную или попробуйте позже')
  }
}

function httpError(status, extra = '') {
  // Детали (статусы, имена переменных) — только в консоль; в интерфейсе
  // объясняем по-человечески, без упоминаний .env и кодов
  if (status === 401 || status === 403) {
    console.warn(
      `[food-ai] ${status}${extra ? `: ${extra}` : ''}` +
        ' — если это «Требуется секрет», задайте NB_PROXY_SECRET в GitHub Secrets'
    )
  } else if (status === 404) {
    console.warn('[food-ai] 404 — проверьте EXPO_PUBLIC_AI_BASE_URL и EXPO_PUBLIC_AI_MODEL')
  }
  let msg
  if (status === 401 || status === 403) {
    // Воркер с общим секретом отклоняет сборку без него — это настройка
    // релиза (NB_PROXY_SECRET в GitHub Secrets), а не сбой сети
    msg = /секрет/i.test(String(extra))
      ? 'Сервис ИИ не принял эту сборку: не совпал секрет доступа (NB_PROXY_SECRET в GitHub)'
      : 'Сервис ИИ временно недоступен — попробуйте позже'
  } else if (status === 404) {
    msg = 'Сервис ИИ недоступен — попробуйте позже'
  } else if (status === 413) {
    msg = 'Снимок слишком большой — попробуйте ещё раз'
  } else if (status === 429) {
    msg = 'Слишком много запросов подряд — подождите минуту и повторите'
  } else if (status >= 500) {
    msg = 'Сервис ИИ временно недоступен — попробуйте позже'
  } else {
    msg = 'Сервис ИИ не отвечает — попробуйте позже'
  }
  return new Error(msg)
}

// Читаем тело ответа сервера — при ошибках 400 там точная причина.
// Воркер возвращает { error: 'текст' } (строка) — тоже читаем
async function apiError(res) {
  let extra = ''
  try {
    const j = await res.json()
    extra = String(
      j?.error?.message || (typeof j?.error === 'string' ? j.error : '') || j?.message || ''
    ).slice(0, 300)
  } catch {}
  return httpError(res.status, extra)
}

// Адрес запроса: прокси-режим (EXPO_PUBLIC_AI_PROXY_URL) имеет приоритет —
// тогда ключ в приложение не зашивается вовсе
function apiUrl(path) {
  const base = AI_CONFIG.proxyUrl || AI_CONFIG.baseUrl
  return `${String(base).replace(/\/+$/, '')}${path}`
}

// Заголовки: Authorization добавляем только в прямом режиме с ключом.
// В прокси-режиме приложение шлёт запросы анонимно — ключ подставляет
// сервер. Если на воркере задан общий секрет (NB_SECRET), прикладываем
// его в X-NB-Secret — воркер отклоняет чужие запросы
function authHeaders(extra = {}) {
  const headers = { ...extra }
  if (!AI_CONFIG.proxyUrl && AI_CONFIG.apiKey) {
    headers.Authorization = `Bearer ${AI_CONFIG.apiKey}`
  }
  if (AI_CONFIG.proxyUrl && AI_CONFIG.proxySecret) {
    headers['X-NB-Secret'] = AI_CONFIG.proxySecret
  }
  return headers
}

// Ошибка — «нет сети»? Фото-режим по этому признаку убирает снимок в
// очередь (usePhotoQueueStore) вместо страшной красной ошибки. Сетевые
// сбои приходят в двух видах: сырой RN-текст «Network request failed» и
// наш человекочитаемый текст из postJson ниже
export function isOfflineError(e) {
  const msg = String(e?.message || e)
  return (
    msg === 'Network request failed' ||
    /Нет интернета|Network request failed|network|internet|соединен/i.test(msg)
  )
}

// POST JSON к OpenAI-совместимому API → распарсенный ответ.
// Экспортируется для ИИ-меню на неделю (menu-ai.js) — тот же канал,
// те же проверки: прокси-воркер режет max_tokens и модель, ключ не в бандле
export async function postJson(path, body, timeoutMs = TIMEOUT_MS) {
  assertConfigured()
  const { signal, done } = withTimeout(timeoutMs)
  try {
    let res
    try {
      res = await fetch(apiUrl(path), {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(body),
        signal,
      })
      if (!res.ok) throw await apiError(res)
      return await res.json()
    } catch (e) {
      if (e?.name === 'AbortError')
        throw new Error(`ИИ не ответил за ${Math.round(timeoutMs / 1000)} секунд — попробуйте ещё раз`)
      if (e?.message === 'Network request failed' || /network|internet|соединен/i.test(String(e?.message)))
        throw new Error(
          'Нет интернета — распознавание требует сети. ' +
            'Записи, база из ~85 блюд и отчёты работают офлайн. ' +
            'В сканере еды фото само уйдёт в очередь и распознается, когда сеть появится'
        )
      throw e
    }
  } finally {
    done()
  }
}

// Достаём JSON из ответа модели (терпит ```-обёртки и болтовню вокруг JSON).
// Экспортируется для menu-ai.js — там свой разбор недельного меню
export function parseAiJson(content) {
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

// Приводим ответ модели к формату приложения (kcal100/p/f/c/fib/sug — на 100 г)
function normalizeItem(it) {
  if (!it || typeof it !== 'object') return null
  const name = String(it.name || '').trim()
  if (!name) return null
  const grams = num(it.defaultGrams, 1500)
  // Распознанный вес порции (голос/текст): на карточку «≈ ккал · г» и в
  // предзаполнение граммовки. Для фото/сканера поле просто отсутствует
  const gr = Number(it.grams)
  const parsedGrams = Number.isFinite(gr) && gr > 0 ? Math.round(gr) : undefined
  return {
    name,
    emoji: String(it.emoji || '🍽️').slice(0, 4),
    kcal100: num(it.kcal100 ?? it.kcal, 950),
    p: num(it.p ?? it.protein, 100),
    f: num(it.f ?? it.fat, 100),
    c: num(it.c ?? it.carbs, 100),
    fib: num(it.fib ?? it.fiber, 50),
    sug: num(it.sug ?? it.sugar, 100),
    defaultGrams: parsedGrams || (grams > 0 ? Math.round(grams) : undefined),
    grams: parsedGrams,
    source: 'ai',
  }
}

// Итоговый калораж элемента: калорийность на 100 г × вес порции.
// null — вес неизвестен (нельзя показать честную цифру)
export function estimateItemKcal(item) {
  const g = Math.round(Number(item?.grams ?? item?.defaultGrams) || 0)
  const k = Number(item?.kcal100) || 0
  if (g <= 0 || k <= 0) return null
  return Math.round((k * g) / 100)
}

// ── Сканер и галерея: фото → блюдо ─────────────────────────────
// Галерея может отдать HEIC/HEIF (новые Android-телефоны), а сервер
// принимает только png/jpeg/gif/webp — конвертируем в JPEG и прижимаем
// по большой стороне до 1280 px.
// ПОЧЕМУ НЕ ОДНО САЖАТИЕ: фото-запрос — это JSON с data URL, и снимок
// 1280 px после base64 тянет 200–400 КБ. Старый лимит воркера (256 КБ)
// отсекал половину фото ошибкой 413, которую интерфейс показывал как
// «Сервис ИИ не отвечает». Прижимаем до целевого размера с усилением
// (шагами) — тело запроса гарантированно влезает даже в старый лимит.
const PHOTO_B64_LIMIT = 200000 // максимум символов base64 (≈150 КБ JPEG)
const PHOTO_PRESETS = [
  { maxSide: 1280, quality: 0.8 },
  { maxSide: 1024, quality: 0.6 },
  { maxSide: 820, quality: 0.45 },
  { maxSide: 640, quality: 0.35 },
]

// Чтение base64 файла снимка — общий шаг обоих путей сжатия
async function fileToBase64(uri) {
  return await new File(uri).base64()
}

// Путь 1 — новый API ImageManipulator (renderAsync/saveAsync). На части
// устройств (замечено на Samsung, скрин Кати 16.11 01:52) он может
// дать некорректные размеры или не пожать файл до лимита: resize с NaN
// молча возвращает исходный снимок, тело запроса выходит за 256 КБ и
// воркер режет его ошибкой 413 — «Снимок слишком большой». Гард на
// размеры превращает тихий сбой в исключение — включается резервный
// путь ниже
async function compressWithRenderApi(uri) {
  const first = await ImageManipulator.manipulate(uri).renderAsync()
  const big = Math.max(first.width, first.height)
  if (!Number.isFinite(big) || big <= 0)
    throw new Error('renderAsync вернул некорректный размер снимка')
  let lastB64 = ''
  for (const preset of PHOTO_PRESETS) {
    const needsResize = big > preset.maxSide
    const ref =
      !needsResize && preset.maxSide >= 1280
        ? first
        : await ImageManipulator.manipulate(uri)
            .resize({
              width: Math.max(1, Math.round((first.width * preset.maxSide) / big)),
              height: Math.max(1, Math.round((first.height * preset.maxSide) / big)),
            })
            .renderAsync()
    const saved = await ref.saveAsync({ format: SaveFormat.JPEG, quality: preset.quality })
    lastB64 = await fileToBase64(saved.uri)
    if (lastB64.length <= PHOTO_B64_LIMIT) return lastB64
  }
  return lastB64
}

// Путь 2 — легаси-API manipulateAsync: другая нативная реализация,
// проверена годами — переживает сбои нового API. Плюс самый мелкий
// пресет 480 px/0.25, которого в основном списке нет
async function compressWithLegacyApi(uri) {
  let lastB64 = ''
  for (const preset of [...PHOTO_PRESETS, { maxSide: 480, quality: 0.25 }]) {
    const saved = await manipulateAsync(
      uri,
      [{ resize: { width: preset.maxSide } }],
      { compress: preset.quality, format: SaveFormat.JPEG }
    )
    lastB64 = await fileToBase64(saved.uri)
    if (lastB64.length <= PHOTO_B64_LIMIT) return lastB64
  }
  return lastB64
}

async function photoToJpegBase64(uri) {
  let best = ''
  try {
    best = (await compressWithRenderApi(uri)) || ''
  } catch (e) {
    console.warn('[food-ai] новый ImageManipulator не сработал, включаю резервный путь:', e?.message)
  }
  if (best.length > 0 && best.length <= PHOTO_B64_LIMIT) return best
  try {
    const b64 = await compressWithLegacyApi(uri)
    if (b64 && (!best.length || b64.length < best.length)) best = b64
  } catch (e) {
    console.warn('[food-ai] резервный manipulateAsync тоже не сработал:', e?.message)
  }
  if (best.length > 0 && best.length <= PHOTO_B64_LIMIT) return best
  // Оба пути не дали снимок в лимит — НЕ шлём огромное тело (воркер
  // ответит 413): вместо этого понятная ошибка с подсказкой
  console.warn(
    '[food-ai] снимок не удалось ужать до', PHOTO_B64_LIMIT, 'символов, получено', best.length
  )
  throw new Error(
    'Снимок не удалось подготовить — сфотографируйте блюдо ещё раз или выберите фото из галереи'
  )
}

export async function scanFoodImage(imageUri, timeoutMs = TIMEOUT_MS) {
  const base64 = await photoToJpegBase64(imageUri)
  const key = 'vis2:' + strHash(base64)

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
                  'Для знакомых продуктов, брендов и блюд используй типовые справочные значения калорийности ' +
                  '(этикетки, таблицы химического состава), а не произвольные числа. ' +
                  'Внимательно ищи ингредиенты ВНУТРИ блюда, а не только сверху: сыр внутри омлета или ' +
                  'бутерброда, масло для жарки, соус, ветчина, начинка. Такие скрытые добавки учитывай ' +
                  'в калорийности и КБЖУ и упоминай в названии (например, «Омлет с двумя видами сыра», ' +
                  'а не просто «Омлет»). ' +
                  'Ответь строго JSON-массивом из одного объекта:\n' +
                  '[{"name":"название по-русски","emoji":"один эмодзи","kcal100":число,"p":число,"f":число,"c":число,"fib":число,"sug":число,"defaultGrams":число}]\n' +
                  'fib — клетчатка (г) и sug — сахара (г) на 100 г — оцени приблизительно. ' +
                  'defaultGrams — реальный вес СЪЕДОБНОЙ ЧАСТИ на фото в граммах (50–800).\n' +
                  'Оценивай вес как человек: посчитай количество штук на фото и умножь на средний вес одной ' +
                  '(банан без кожуры ≈ 130 г, яблоко ≈ 180 г, яйцо ≈ 55 г, котлета ≈ 90 г, картофелина ≈ 130 г, ' +
                  'блин ≈ 70 г, бутерброд ≈ 120 г, пирожок ≈ 85 г). Сверяй размер с тарелкой и предметами рядом. ' +
                  'Вес НЕ занижай: например, два крупных банана ≈ 300 г, большая тарелка супа ≈ 400 г. ' +
                  'Если на фото нет еды — верни [].',
              },
              { type: 'image_url', image_url: { url: dataUrl, detail: 'high' } },
            ],
          },
        ],
      },
      timeoutMs
    )

    const content = data?.choices?.[0]?.message?.content
    const parsed = parseAiJson(content)
    const list = Array.isArray(parsed) ? parsed : []
    // Брендовые позиции перекрывают ИИ-оценку: «Селёдка в масле» → 239,
    // «Воппер» → 192 — вместо придуманного коллоража
    const items = preferBrandBase(list.map(normalizeItem).filter(Boolean))
    if (!items.length)
      throw new Error('Еда на фото не распознана — попробуйте снять блюдо ближе и при хорошем свете')
    cachePut(key, items)
    return items
  })
}

// ── Этикетка: фото таблицы «на 100 г» → КБЖУ ───────────────────
const LABEL_SYSTEM =
  'Ты — помощник дневника питания NutriBear. Читаешь фото этикетки/упаковки продукта. ' +
  'Отвечай ТОЛЬКО валидным JSON, без пояснений и без markdown.'

export async function scanNutritionLabel(imageUri, timeoutMs = TIMEOUT_MS) {
  const base64 = await photoToJpegBase64(imageUri)
  const key = 'label:' + strHash(base64)

  // Та же этикетка уже распознавалась? Берем ответ из кэша — бесплатно
  const cached = cacheGet(key)
  if (cached) return cached

  return once(key, async () => {
    const dataUrl = `data:image/jpeg;base64,${base64}`

    const data = await postJson(
      '/chat/completions',
      {
        model: AI_CONFIG.model,
        temperature: 0.1,
        max_tokens: 200,
        messages: [
          { role: 'system', content: LABEL_SYSTEM },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text:
                  'На фото этикетка или упаковка продукта. Найди таблицу пищевой ценности НА 100 ГРАММ ' +
                  '(строки «на 100 г», «100 г продукта»; «на порцию» не бери). Ответь строго JSON-объектом:\n' +
                  '{"name":"название продукта по-русски","emoji":"один эмодзи","kcal100":число,"p":число,"f":число,"c":число,"fib":число,"sug":число}\n' +
                  'kcal100 — килокалории, p — белки (г), f — жиры (г), c — углеводы (г), fib — клетчатка (г), sug — сахара (г). ' +
                  'Числа бери С ЭТИКЕТКИ, не оценивай и не выдумывай; если поле не указано — 0. ' +
                  'Если на фото нет таблицы пищевой ценности — верни {"name":"","emoji":"🏷️","kcal100":0,"p":0,"f":0,"c":0,"fib":0,"sug":0}.',
              },
              { type: 'image_url', image_url: { url: dataUrl, detail: 'high' } },
            ],
          },
        ],
      },
      timeoutMs
    )

    const parsed = parseAiJson(data?.choices?.[0]?.message?.content)
    const name = String(parsed?.name || '').trim()
    if (!name)
      throw new Error(
        'Не нашёл таблицу пищевой ценности — сфотографируйте этикетку ближе, ровно и при хорошем свете'
      )
    const out = {
      name: name.slice(0, 60),
      emoji: String(parsed?.emoji || '🏷️').slice(0, 4) || '🏷️',
      kcal100: num(parsed?.kcal100, 950),
      p: num(parsed?.p, 100),
      f: num(parsed?.f, 100),
      c: num(parsed?.c, 100),
      fib: num(parsed?.fib, 50),
      sug: num(parsed?.sug, 100),
      source: 'label',
    }
    cachePut(key, out)
    return out
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
        max_tokens: 400,
        messages: [
          { role: 'system', content: VOICE_SYSTEM },
          {
            role: 'user',
            content:
              `Фраза: «${t}»\n` +
              'Извлеки ВСЕ продукты и блюда из фразы (их может быть несколько — через запятую или «и»), ' +
              'для каждого — свой вес порции в граммах (штуки переведи в граммы: 1 яйцо ≈ 55 г, кружка ≈ 250–350 мл). ' +
              'НЕ выдумывай и не добавляй блюда, которых нет во фразе. ' +
              'Ответь строго JSON-объектом:\n' +
              '{"text":"исправленная фраза","items":[{"name":"название по-русски","emoji":"эмодзи","kcal100":число,"p":число,"f":число,"c":число,"fib":число,"sug":число,"grams":число_или_null}]}\n' +
              'kcal100, p, f, c — пищевая ценность НА 100 ГРАММ, fib — клетчатка (г) и sug — сахара (г) на 100 г, ' +
              'grams — вес порции этого продукта в граммах (null, если вес понять нельзя). ' +
              'Используй типовые справочные значения (таблицы состава, этикетки), не придумывай калорийность. ' +
              'Если во фразе нет еды — items: [].',
          },
        ],
      },
      timeoutMs
    )

    const content = data?.choices?.[0]?.message?.content
    const parsed = parseAiJson(content)
    const items = preferBrandBase(
      (Array.isArray(parsed?.items) ? parsed.items : []).map(normalizeItem).filter(Boolean)
    )
    if (!items.length)
      throw new Error('Не понял фразу — попробуйте иначе, например: «Тарелка овсянки 250 граммов»')

    // Совместимость: старые ответы и кэш держали вес одним числом на всю
    // фразу (grams сверху) — переносим его первому продукту без своего веса
    const topGrams = Number(parsed?.grams)
    if (Number.isFinite(topGrams) && topGrams > 0 && !items.some((i) => i.grams)) {
      items[0].grams = Math.round(topGrams)
      items[0].defaultGrams = Math.round(topGrams)
    }

    const result = {
      text: String(parsed?.text || t),
      grams: items.find((i) => i.grams)?.grams ?? null,
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

  // 1) Встроенная база — БЕСПЛАТНО. Ищем и в блюдах, и в продуктах
  //     (включая брендовые «Вязанка», «Простоквашино»…): побеждает
  //     ДЛИННЕЙШЕЕ совпадение, чтобы «колбаса варёная вязанка докторская»
  //     взяла этикеточные 230 ккал бренда, а не общий усреднённый «блюдо
  //     Колбаса варёная» 300. Раньше бренды проваливались в платный ИИ
  //     и он мог выдать «придуманный» колораж (отзыв Кати 19.11)
  const dish = findLocalDish(q)
  const food = findLocalFood(q)
  const dishLen = dish ? normName(dish.n).length : -1
  const foodLen = food ? normName(food.name).length : -1
  if (dish && dishLen >= foodLen)
    return {
      kcal100: dish.kcal100,
      p: dish.p,
      f: dish.f,
      c: dish.c,
      fib: dish.fib || 0,
      sug: dish.sug || 0,
      source: 'base',
    }
  if (food && foodLen > dishLen)
    return {
      kcal100: food.kcal,
      p: food.p,
      f: food.f,
      c: food.c,
      fib: food.fib || 0,
      sug: food.sug || 0,
      source: 'base',
    }

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
              '{"kcal100":число,"p":число,"f":число,"c":число,"fib":число,"sug":число}\n' +
              'kcal100 — килокалории, p — белки (г), f — жиры (г), c — углеводы (г), fib — клетчатка (г), sug — сахара (г), все на 100 г.',
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
      fib: num(parsed?.fib ?? parsed?.fiber, 50),
      sug: num(parsed?.sug ?? parsed?.sugar, 100),
    }
    if (!out.kcal100)
      throw new Error('Не удалось оценить блюдо — уточните название (например: «борщ со свининой»)')
    cachePut(key, out)
    return { ...out, source: 'ai' }
  })
}

// ── Состав рецепта → КБЖУ всего набора (форма рецептов) ────────
// Локальный разбор состава (estimateFromDescription) бесплатен — форма
// пробует сначала его. Если база не узнала ни одного продукта, форма
// вызывает ИИ: он оценивает калории и БЖУ ВСЕГО перечисленного набора
// («свинина 300 грамм, картошка 500 грамм, сливки 100 мл»). Результат
// кэшируется на телефоне навсегда — повторный расчёт того же состава
// бесплатен. Платный запрос уходит только если результат не в кэше.
export async function estimateCompositionByAi(text, timeoutMs = 45000) {
  const t = String(text || '').trim()
  if (!t)
    throw new Error('Впишите состав — например: свинина 300 грамм, картошка 500 грамм')

  // Кэш: тот же состав — та же оценка (бесплатно всегда)
  const key = 'rec:' + strHash(t.toLowerCase())
  const cached = cacheGet(key)
  if (cached) return cached

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
              `Состав блюда: ${t}\n` +
              'Оцени пищевую ценность ВСЕГО перечисленного набора продуктов — ' +
              'сумму по указанным граммовкам (не на 100 г). Ответь строго JSON-объектом:\n' +
              '{"kcal":число,"p":число,"f":число,"c":число}\n' +
              'kcal — килокалории всего набора, p — белки (г), f — жиры (г), c — углеводы (г) всего набора.',
          },
        ],
      },
      timeoutMs
    )

    const parsed = parseAiJson(data?.choices?.[0]?.message?.content)
    const out = {
      kcal: Math.round(num(parsed?.kcal ?? parsed?.kcal100, 20000)),
      p: Math.round(num(parsed?.p ?? parsed?.protein, 2000)),
      f: Math.round(num(parsed?.f ?? parsed?.fat, 2000)),
      c: Math.round(num(parsed?.c ?? parsed?.carbs, 2000)),
    }
    if (!out.kcal)
      throw new Error('ИИ не смог оценить состав — напишите продукты с граммовками: «лук 50 грамм»')
    cachePut(key, out)
    return out
  })
}

// ── Голос: запись (base64) → речь → блюдо ──────────────────────
// ВАЖНО ПРО ДЕНЬГИ: распознавание записи стоит за КАЖДУЮ МИНУТУ аудио
// (whisper-1 — 1,55 ₽/мин, gpt-4o-mini-transcribe — 0,77 ₽/мин).
// Говорите коротко, а разбор фразы после этого чаще всего бесплатный.
//
// FormData здесь НЕ работает: в Expo SDK 58 fetch — winter-полифилл,
// который не умеет RN-часть { uri, name, type } и падает с
// «Unsupported FormDataPart implementation» ДО сети (отзыв Кати 16.11:
// голосовой ввод не работал в rc1/rc2). Собираем multipart руками —
// см. src/lib/multipart.js
export async function recognizeVoiceAudio(audioBase64, timeoutMs = 30000) {
  if (!AI_CONFIG.voiceModel) {
    console.warn('[food-ai] Голос не настроен: добавьте EXPO_PUBLIC_AI_VOICE_MODEL в .env')
    throw new Error('Распознавание голоса ещё не включено — введите фразу текстом ниже')
  }
  assertConfigured()

  const bytes = decodeBase64ToBytes(audioBase64)
  if (!bytes.length)
    throw new Error('Запись пустая — нажмите на микрофон и скажите блюдо ещё раз')

  // whisper-1 понимает m4a; language=ru уменьшает шанс англ. текста
  const { body, contentType } = buildMultipartBody([
    { name: 'file', filename: 'voice.m4a', type: 'audio/m4a', bytes },
    { name: 'model', value: AI_CONFIG.voiceModel },
    { name: 'language', value: 'ru' },
  ])

  const { signal, done } = withTimeout(timeoutMs)
  try {
    let res
    try {
      res = await fetch(apiUrl('/audio/transcriptions'), {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': contentType }),
        body,
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

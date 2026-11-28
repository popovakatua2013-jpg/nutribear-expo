// Основная база продуктов: калорийность и БЖУ на 100 г / 100 мл.
// p/f/c — белки, жиры, углеводы в граммах. tags — подходящие приёмы пищи.

import { EXTRA_FOODS } from './foods-extra'
import { MORE_FOODS } from './foods-more'
import { REQUESTED_FOODS } from './foods-requests'
import { BIG_FOODS } from './foods-big'
import { XL_FOODS } from './foods-xl'
import { XL2_FOODS } from './foods-xl2'
import { XL3_FOODS } from './foods-xl3'
import { BRAND_FOODS } from './foods-brands'
import { BRAND2_FOODS } from './foods-brands-2'
import { BRAND3_FOODS } from './foods-brands-3'
import { BRAND4_FOODS } from './foods-brands-4'
import { BRAND5_FOODS } from './foods-brands-5'
import { BRAND6_FOODS } from './foods-brands-6'
import { BRAND7_FOODS } from './foods-brands-7'
import { BRAND8_FOODS } from './foods-brands-8'
import { BRAND9_FOODS } from './foods-brands-9'
import { BRAND10_FOODS } from './foods-brands-10'
import { BRAND11_FOODS } from './foods-brands-11'
import { BRAND12_FOODS } from './foods-brands-12'
import { BRAND13_FOODS } from './foods-brands-13'
import { FASTFOOD_FOODS } from './foods-fastfood'
import { MICROS } from './micros'
import { spoonsFor } from './spoons'

const BASE_FOODS = [
  // ---------- Завтрак ----------
  { id: 'oatmeal', emoji: '🥣', name: 'Овсянка на молоке', kcal: 88, p: 3, f: 1.7, c: 15, fib: 1.4, sug: 2.6, defaultGrams: 250, tags: ['breakfast'] },
  { id: 'omelet', emoji: '🍳', name: 'Омлет из 2 яиц', kcal: 154, p: 11, f: 11.7, c: 1.4, fib: 0.0, sug: 0.4, defaultGrams: 150, tags: ['breakfast', 'dinner'] },
  { id: 'fried-eggs', emoji: '🥚', name: 'Яичница', kcal: 196, p: 13.6, f: 15.4, c: 0.8, fib: 0.0, sug: 0.3, defaultGrams: 120, tags: ['breakfast'] },
  { id: 'syrniki', emoji: '🧀', name: 'Сырники', kcal: 183, p: 14, f: 9, c: 11, fib: 0.4, sug: 3.8, defaultGrams: 150, tags: ['breakfast', 'snack'] },
  { id: 'avocado-toast', emoji: '🥑', name: 'Тост с авокадо', kcal: 187, p: 5, f: 11, c: 17, fib: 4.2, sug: 1.8, defaultGrams: 100, tags: ['breakfast', 'snack'] },
  { id: 'greek-yogurt', emoji: '🥛', name: 'Греческий йогурт', kcal: 59, p: 10, f: 0.7, c: 3.6, fib: 0.0, sug: 3.2, defaultGrams: 150, tags: ['breakfast', 'snack'] },
  { id: 'pancakes', emoji: '🥞', name: 'Блины', kcal: 189, p: 6.4, f: 8.4, c: 21.7, fib: 1.1, sug: 3.0, defaultGrams: 120, tags: ['breakfast'] },
  { id: 'cheese-sandwich', emoji: '🍞', name: 'Бутерброд с сыром', kcal: 250, p: 12, f: 11, c: 26, fib: 2.1, sug: 2.2, defaultGrams: 80, tags: ['breakfast', 'snack'] },
  { id: 'buckwheat', emoji: '🌾', name: 'Гречка отварная', kcal: 110, p: 3.6, f: 2.2, c: 19, fib: 2.7, sug: 0.9, defaultGrams: 180, tags: ['breakfast', 'lunch', 'dinner'] },
  { id: 'cappuccino', emoji: '☕', name: 'Капучино', kcal: 41, p: 2.2, f: 1.9, c: 3.6, fib: 0.0, sug: 3.6, defaultGrams: 200, tags: ['breakfast', 'snack'] },

  // ---------- Обед ----------
  { id: 'chicken-grill', emoji: '🍗', name: 'Куриная грудка гриль', kcal: 165, p: 23, f: 8, c: 0, fib: 0.0, sug: 0.0, defaultGrams: 150, tags: ['lunch', 'dinner'] },
  { id: 'rice', emoji: '🍚', name: 'Рис отварной', kcal: 116, p: 2.2, f: 0.5, c: 25.5, fib: 0.4, sug: 0.1, defaultGrams: 180, tags: ['lunch', 'dinner'] },
  { id: 'chicken-soup', emoji: '🍲', name: 'Куриный суп', kcal: 36, p: 3, f: 1.5, c: 2.5, fib: 0.4, sug: 0.7, defaultGrams: 300, tags: ['lunch'] },
  { id: 'borscht', emoji: '🍅', name: 'Борщ', kcal: 49, p: 1.5, f: 2.5, c: 5.5, fib: 1.9, sug: 2.6, defaultGrams: 300, tags: ['lunch', 'dinner'] },
  { id: 'pasta-bolognese', emoji: '🍝', name: 'Паста болоньезе', kcal: 158, p: 7.3, f: 4.9, c: 21, fib: 1.8, sug: 2.1, defaultGrams: 250, tags: ['lunch'] },
  { id: 'veggie-salad', emoji: '🥗', name: 'Овощной салат', kcal: 52, p: 1.1, f: 3.4, c: 3.9, fib: 2.1, sug: 1.9, defaultGrams: 150, tags: ['lunch', 'dinner'] },
  { id: 'greek-salad', emoji: '🫒', name: 'Греческий салат', kcal: 118, p: 3, f: 9.4, c: 6, fib: 1.7, sug: 2.1, defaultGrams: 180, tags: ['lunch', 'dinner'] },
  { id: 'pilaf', emoji: '🍛', name: 'Плов с курицей', kcal: 190, p: 8.5, f: 7.6, c: 22.4, fib: 1.1, sug: 1.3, defaultGrams: 250, tags: ['lunch'] },
  { id: 'mashed-potato', emoji: '🥔', name: 'Картофельное пюре', kcal: 106, p: 2, f: 4.2, c: 15.4, fib: 1.4, sug: 1.3, defaultGrams: 200, tags: ['lunch', 'dinner'] },
  { id: 'cod-baked', emoji: '🐟', name: 'Треска запечённая', kcal: 105, p: 18, f: 3.2, c: 0.6, fib: 0.0, sug: 0.0, defaultGrams: 150, tags: ['lunch', 'dinner'] },

  // ---------- Ужин ----------
  { id: 'salmon', emoji: '🐠', name: 'Лосось запечённый', kcal: 208, p: 22.6, f: 13, c: 0.5, fib: 0.0, sug: 0.0, defaultGrams: 150, tags: ['dinner', 'lunch'] },
  { id: 'turkey', emoji: '🦃', name: 'Индейка отварная', kcal: 135, p: 25, f: 3.6, c: 0, fib: 0.0, sug: 0.0, defaultGrams: 150, tags: ['dinner', 'lunch'] },
  { id: 'stewed-veggies', emoji: '🥦', name: 'Тушёные овощи', kcal: 60, p: 2.4, f: 2.6, c: 6.4, fib: 2.7, sug: 2.5, defaultGrams: 200, tags: ['dinner', 'lunch'] },
  { id: 'cheesecake-baked', emoji: '🧁', name: 'Творожная запеканка', kcal: 168, p: 15, f: 7, c: 10.5, fib: 0.4, sug: 4.2, defaultGrams: 150, tags: ['dinner', 'breakfast'] },
  { id: 'pumpkin-soup', emoji: '🎃', name: 'Суп-пюре из тыквы', kcal: 42, p: 1.4, f: 1.8, c: 6, fib: 1.7, sug: 3.4, defaultGrams: 250, tags: ['dinner'] },
  { id: 'tuna-salad', emoji: '🥙', name: 'Салат с тунцом', kcal: 128, p: 11, f: 7.6, c: 3.6, fib: 1.2, sug: 1.0, defaultGrams: 180, tags: ['dinner', 'lunch'] },
  { id: 'kefir', emoji: '🍶', name: 'Кефир 1%', kcal: 40, p: 3, f: 1, c: 4.7, fib: 0.0, sug: 4.0, defaultGrams: 250, tags: ['dinner', 'snack'] },
  { id: 'veggie-omelet', emoji: '🍳', name: 'Омлет с овощами', kcal: 120, p: 9, f: 7.6, c: 3.6, fib: 1.5, sug: 1.6, defaultGrams: 180, tags: ['dinner', 'breakfast'] },

  // ---------- Перекус / Полдник ----------
  { id: 'banana', emoji: '🍌', name: 'Банан', kcal: 89, p: 1.1, f: 0.3, c: 21, fib: 2.6, sug: 12.2, defaultGrams: 120, tags: ['snack', 'breakfast'] },
  { id: 'apple', emoji: '🍎', name: 'Яблоко', kcal: 52, p: 0.4, f: 0.4, c: 11.4, fib: 2.4, sug: 10.4, defaultGrams: 150, tags: ['snack'] },
  { id: 'orange', emoji: '🍊', name: 'Апельсин', kcal: 43, p: 0.9, f: 0.2, c: 9.4, fib: 2.4, sug: 9.4, defaultGrams: 180, tags: ['snack'] },
  { id: 'blueberry', emoji: '🫐', name: 'Черника', kcal: 57, p: 0.7, f: 0.3, c: 12.9, fib: 2.4, sug: 10.0, defaultGrams: 100, tags: ['snack', 'breakfast'] },
  { id: 'walnuts', emoji: '🥜', name: 'Грецкие орехи', kcal: 654, p: 15.2, f: 62.5, c: 7, fib: 6.7, sug: 2.6, defaultGrams: 30, tags: ['snack'] },
  { id: 'almonds', emoji: '🌰', name: 'Миндаль', kcal: 579, p: 21.2, f: 45, c: 21.6, fib: 12.5, sug: 4.4, defaultGrams: 30, tags: ['snack'] },
  { id: 'dark-chocolate', emoji: '🍫', name: 'Горький шоколад', kcal: 546, p: 7.8, f: 38.3, c: 36, fib: 11.0, sug: 24.0, defaultGrams: 25, tags: ['snack'] },
  { id: 'dates', emoji: '🌴', name: 'Финики', kcal: 282, p: 2.5, f: 0.5, c: 69, fib: 8.0, sug: 63.0, defaultGrams: 40, tags: ['snack'] },
  { id: 'berry-smoothie', emoji: '🥤', name: 'Смузи ягодный', kcal: 60, p: 1.5, f: 1.2, c: 11.4, fib: 1.9, sug: 9.2, defaultGrams: 250, tags: ['snack', 'breakfast'] },
  { id: 'cottage-berries', emoji: '🍓', name: 'Творог с ягодами', kcal: 105, p: 12, f: 2.5, c: 9, fib: 0.9, sug: 5.2, defaultGrams: 150, tags: ['snack', 'breakfast', 'dinner'] },
  { id: 'protein-bar', emoji: '🍫', name: 'Протеиновый батончик', kcal: 350, p: 30, f: 9.5, c: 38, fib: 3.5, sug: 15.0, defaultGrams: 60, tags: ['snack'] },
  { id: 'hummus-carrot', emoji: '🥕', name: 'Хумус с морковью', kcal: 166, p: 6, f: 9.5, c: 15, fib: 4.6, sug: 2.6, defaultGrams: 120, tags: ['snack'] },
]

// Полная база: основные продукты + расширенный набор + второй набор
// (макароны, белый хлеб, булочки, суши и др.) + набор по запросам
// (молочка разной жирности, торты, зелень, капуста и т.д.) + большой
// набор (мясо, рыба, каши, овощи, фрукты, молочка, выпечка, фастфуд,
// напитки — с реалистичными дефолтными порциями) + три XL-набора
// (мясо и готовые блюда, рыба/морепродукты, супы, каши, овощи/салаты,
// фрукты, молочка и сыры, завтраки, выпечка, сладости/снеки, фастфуд,
// соусы, напитки, консервы, веган/ЗОЖ) — база 247 → ~494 позиций.
// Брендовые позиции «по поставщикам» и фастфуд сетей (просьба Кати
// 19.11: «варёная колбаса „Вязанка“, фастфуд — КФС, Вкусно и точка,
// Бургер Кинг»; продолжение — «+300 позиций популярных»):
// foods-brands.js (~29) + foods-brands-2 (молочка, сыры, мясо — 85) +
// foods-brands-3 (крупы, хлеб, соусы, снеки, напитки, консервы,
// заморозка, ВкусВилл — 146) + foods-fastfood.js (сети — 72).
// Большое расширение по просьбе Кати 20.11 («желательно 2-3 тыс
// позиций») и 28.11 (молоко/йогурты/соки/сыры/колбасы, лапша и пюре
// быстрого, сухие завтраки, детское питание, соусы, лаваш, маринады):
// части 4–13 доводят базу суммарно до ~2440 позиций.
// Витамины/минералы (fe/ca/k/mg/vitc/vita) подмешиваются из micros.js —
// их использует рейтинг питания.
export const FOODS = [
  ...BASE_FOODS,
  ...EXTRA_FOODS,
  ...MORE_FOODS,
  ...REQUESTED_FOODS,
  ...BIG_FOODS,
  ...XL_FOODS,
  ...XL2_FOODS,
  ...XL3_FOODS,
  // Брендовые позиции «по поставщикам» (просьба Кати 19.11: варёная
  // колбаса не просто «варёная колбаса», а «Вязанка») — этикеточные
  // КБЖУ из Open Food Facts и справочников состава
  ...BRAND_FOODS,
  // Продолжение брендовой базы: молочка/сыры/мясо (файл 2) + крупы,
  // хлеб, соусы, снеки, напитки, консервы, заморозка (файл 3)
  ...BRAND2_FOODS,
  ...BRAND3_FOODS,
  // Большое расширение по просьбе Кати 20.11 («максимально сколько
  // можешь за раз, желательно 2-3 тыс позиций»): молочка/детское (4),
  // мясо/колбасы/заморозка (5), бакалея/соусы/консервы (6), сладкое/
  // снеки/мороженое/выпечка (7), напитки/чай/кофе (8), фастфуд сетей
  // + свежее (9), ВкусВилл/готовые блюда/деликатесы (10)
  ...BRAND4_FOODS,
  ...BRAND5_FOODS,
  ...BRAND6_FOODS,
  ...BRAND7_FOODS,
  ...BRAND8_FOODS,
  ...BRAND9_FOODS,
  ...BRAND10_FOODS,
  // Расширение по списку Кати 28.11 («молоко, йогурты, соки, вермишель
  // и пюре быстрого приготовления, сухие завтраки, сыры, колбасы,
  // детское питание, соусы, кетчупы, лаваш, маринованные продукты»):
  // молочка/кисломолочка/йогурты/сыры/колбасы/соки (11), лапша и пюре
  // быстрого, сухие завтраки, детское питание, соусы/кетчупы, лаваш,
  // маринады (12), заморозка/снеки/чай-кофе/приправы/десерты (13)
  ...BRAND11_FOODS,
  ...BRAND12_FOODS,
  ...BRAND13_FOODS,
  // Фастфуд сетей: Вкусно и точка, Ростикс (КФС), Бургер Кинг, Додо,
  // Теремок, Крошка Картошка, Шоколадница, Cofix, Coffee Like
  ...FASTFOOD_FOODS,
].map((f) => {
  // Микроэлементы из micros.js, затем ложки для сыпучих (просьба Кати
  // 28.11: «в 1 ч.л. сахара ?кал» — spoons.js: сахар 8/25 г с горкой)
  const base = MICROS[f.id] ? { ...f, ...MICROS[f.id] } : f
  const sp = spoonsFor(base)
  return sp ? { ...base, tsp: sp.tsp, tbsp: sp.tbsp } : base
})

// Быстрый выбор граммовки в модалке добавления
export const QUICK_GRAMS = [50, 100, 150, 200, 250]

// kcal для указанной порции (граммы)
export function kcalForPortion(food, grams) {
  if (!food) return 0
  return Math.round((food.kcal * grams) / 100)
}

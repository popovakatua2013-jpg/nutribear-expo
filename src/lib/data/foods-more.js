// Второе расширение базы: то, чего чаще всего не хватало — макароны,
// белый хлеб и булочки, суши и роллы, полуфабрикаты, соусы, напитки,
// снеки, фрукты/ягоды. Калорийность и БЖУ на 100 г / 100 мл.
// p/f/c — белки, жиры, углеводы в граммах; fib/sug — клетчатка/сахар;
// витамины/минералы — в micros.js (мержатся в FOODS вместе с этими полями).

export const MORE_FOODS = [
  // ---------- Макароны и гарниры ----------
  { id: 'pasta-boiled', emoji: '🍝', name: 'Макароны отварные', kcal: 135, p: 4.5, f: 1.1, c: 26, fib: 1.8, sug: 0.6, defaultGrams: 200, tags: ['lunch', 'dinner'] },
  { id: 'pasta-cheese', emoji: '🧀', name: 'Макароны с сыром', kcal: 220, p: 8.5, f: 8.5, c: 27, fib: 1.5, sug: 2.0, defaultGrams: 220, tags: ['lunch', 'dinner'] },
  { id: 'fried-potato', emoji: '🥔', name: 'Картофель жареный', kcal: 192, p: 2.8, f: 9.5, c: 23, fib: 1.8, sug: 1.2, defaultGrams: 180, tags: ['lunch', 'dinner'] },
  { id: 'baked-potato', emoji: '🥔', name: 'Картофель запечённый', kcal: 130, p: 2.2, f: 3.5, c: 21, fib: 2.0, sug: 1.0, defaultGrams: 200, tags: ['lunch', 'dinner'] },
  { id: 'rice-milk-porridge', emoji: '🥣', name: 'Рисовая каша на молоке', kcal: 97, p: 2.9, f: 2.9, c: 14.5, fib: 0.4, sug: 5.0, defaultGrams: 220, tags: ['breakfast'] },
  { id: 'semolina', emoji: '🥣', name: 'Манная каша на молоке', kcal: 98, p: 3.0, f: 3.2, c: 14.4, fib: 0.5, sug: 5.5, defaultGrams: 220, tags: ['breakfast'] },
  { id: 'lentils', emoji: '🫘', name: 'Чечевица отварная', kcal: 116, p: 9.0, f: 0.4, c: 20, fib: 7.9, sug: 1.8, defaultGrams: 180, tags: ['lunch', 'dinner'] },
  { id: 'red-beans', emoji: '🫘', name: 'Фасоль отварная', kcal: 127, p: 8.7, f: 0.5, c: 22.8, fib: 6.4, sug: 0.3, defaultGrams: 150, tags: ['lunch', 'dinner'] },

  // ---------- Хлеб, выпечка ----------
  { id: 'bread-white', emoji: '🍞', name: 'Хлеб белый', kcal: 265, p: 8.0, f: 3.2, c: 49, fib: 2.7, sug: 3.0, defaultGrams: 40, tags: ['breakfast', 'lunch'] },
  { id: 'loaf-white', emoji: '🥖', name: 'Батон нарезной', kcal: 264, p: 7.8, f: 3.0, c: 51, fib: 2.5, sug: 3.5, defaultGrams: 40, tags: ['breakfast'] },
  { id: 'sweet-bun', emoji: '🥯', name: 'Булочка сдобная', kcal: 320, p: 7.5, f: 8.0, c: 55, fib: 2.0, sug: 10.0, defaultGrams: 60, tags: ['breakfast', 'snack'] },
  { id: 'lavash', emoji: '🫓', name: 'Лаваш тонкий', kcal: 275, p: 8.8, f: 1.2, c: 57, fib: 2.2, sug: 1.0, defaultGrams: 50, tags: ['lunch', 'dinner'] },
  { id: 'fritters', emoji: '🥞', name: 'Оладьи', kcal: 235, p: 6.5, f: 10.0, c: 29, fib: 1.5, sug: 6.0, defaultGrams: 150, tags: ['breakfast'] },
  { id: 'waffles', emoji: '🧇', name: 'Вафли', kcal: 425, p: 6.0, f: 14.0, c: 66, fib: 1.6, sug: 25.0, defaultGrams: 50, tags: ['snack'] },
  { id: 'gingerbread', emoji: '🍪', name: 'Пряник', kcal: 340, p: 5.0, f: 4.0, c: 71, fib: 1.8, sug: 35.0, defaultGrams: 50, tags: ['snack'] },

  // ---------- Суши, роллы, азиатское ----------
  { id: 'sushi-salmon', emoji: '🍣', name: 'Суши с лососем', kcal: 145, p: 8.0, f: 4.0, c: 20, fib: 0.6, sug: 4.0, defaultGrams: 150, tags: ['lunch', 'dinner'] },
  { id: 'california-roll', emoji: '🍣', name: 'Ролл Калифорния', kcal: 175, p: 5.5, f: 5.5, c: 25.5, fib: 1.0, sug: 4.5, defaultGrams: 200, tags: ['lunch', 'dinner'] },
  { id: 'wok-chicken', emoji: '🍜', name: 'WOK с курицей и овощами', kcal: 155, p: 7.0, f: 5.0, c: 20, fib: 1.5, sug: 3.0, defaultGrams: 300, tags: ['lunch', 'dinner'] },
  { id: 'soy-sauce', emoji: '🥢', name: 'Соевый соус', kcal: 53, p: 8.0, f: 0.6, c: 4.9, fib: 0.8, sug: 0.5, defaultGrams: 15, tags: ['lunch', 'dinner'] },

  // ---------- Мясо, полуфабрикаты ----------
  { id: 'boiled-sausage', emoji: '🌭', name: 'Колбаса варёная', kcal: 301, p: 12.8, f: 27.0, c: 2.2, fib: 0.0, sug: 1.5, defaultGrams: 50, tags: ['breakfast', 'snack'] },
  { id: 'frankfurters', emoji: '🌭', name: 'Сосиски', kcal: 266, p: 12.0, f: 24.0, c: 2.0, fib: 0.0, sug: 1.2, defaultGrams: 120, tags: ['lunch', 'dinner'] },
  { id: 'chicken-thigh', emoji: '🍗', name: 'Куриное бедро запечённое', kcal: 195, p: 23.0, f: 11.0, c: 0, fib: 0.0, sug: 0.0, defaultGrams: 150, tags: ['lunch', 'dinner'] },
  { id: 'nuggets', emoji: '🍗', name: 'Наггетсы', kcal: 296, p: 15.0, f: 17.0, c: 19, fib: 1.0, sug: 1.2, defaultGrams: 150, tags: ['lunch', 'snack'] },
  { id: 'crab-sticks', emoji: '🦀', name: 'Крабовые палочки', kcal: 99, p: 8.0, f: 1.0, c: 15, fib: 0.0, sug: 4.0, defaultGrams: 100, tags: ['snack', 'lunch'] },

  // ---------- Салаты и закуски ----------
  { id: 'olivier', emoji: '🥗', name: 'Салат Оливье', kcal: 198, p: 4.5, f: 16.5, c: 8.5, fib: 1.2, sug: 2.5, defaultGrams: 180, tags: ['lunch', 'dinner'] },
  { id: 'cabbage-salad', emoji: '🥗', name: 'Салат из свежей капусты', kcal: 68, p: 1.5, f: 4.5, c: 6.0, fib: 2.2, sug: 3.5, defaultGrams: 150, tags: ['lunch', 'dinner'] },
  { id: 'red-caviar', emoji: '🐟', name: 'Икра красная', kcal: 250, p: 32.0, f: 13.0, c: 0, fib: 0.0, sug: 0.0, defaultGrams: 30, tags: ['breakfast', 'snack'] },

  // ---------- Молочное ----------
  { id: 'condensed-milk', emoji: '🥛', name: 'Сгущённое молоко', kcal: 324, p: 7.5, f: 8.5, c: 55, fib: 0.0, sug: 55.0, defaultGrams: 30, tags: ['snack', 'breakfast'] },
  { id: 'ryazhenka', emoji: '🥛', name: 'Ряженка 2.5%', kcal: 54, p: 2.9, f: 2.5, c: 4.2, fib: 0.0, sug: 4.2, defaultGrams: 250, tags: ['snack', 'dinner'] },
  { id: 'processed-cheese', emoji: '🧀', name: 'Сыр плавленый', kcal: 290, p: 12.0, f: 24.0, c: 4.0, fib: 0.0, sug: 2.5, defaultGrams: 30, tags: ['breakfast'] },
  { id: 'drinkable-yogurt', emoji: '🥛', name: 'Питьевой йогурт', kcal: 70, p: 2.8, f: 2.0, c: 10, fib: 0.0, sug: 9.5, defaultGrams: 290, tags: ['snack', 'breakfast'] },

  // ---------- Напитки ----------
  { id: 'black-coffee', emoji: '☕', name: 'Кофе чёрный без сахара', kcal: 2, p: 0.2, f: 0, c: 0.3, fib: 0.0, sug: 0.0, defaultGrams: 200, tags: ['breakfast', 'snack'] },
  { id: 'tea-with-sugar', emoji: '🍵', name: 'Чай с сахаром', kcal: 25, p: 0, f: 0, c: 6.3, fib: 0.0, sug: 6.3, defaultGrams: 200, tags: ['breakfast', 'snack'] },
  { id: 'compote', emoji: '🥤', name: 'Компот из сухофруктов', kcal: 85, p: 0.1, f: 0, c: 21, fib: 0.3, sug: 19.0, defaultGrams: 250, tags: ['lunch', 'dinner', 'snack'] },
  { id: 'cocoa', emoji: '🥛', name: 'Какао на молоке', kcal: 80, p: 3.0, f: 2.5, c: 12, fib: 0.8, sug: 9.0, defaultGrams: 200, tags: ['breakfast', 'snack'] },
  { id: 'beer', emoji: '🍺', name: 'Пиво светлое 4.5%', kcal: 43, p: 0.5, f: 0, c: 3.8, fib: 0.0, sug: 0.0, defaultGrams: 500, tags: ['dinner', 'snack'] },
  { id: 'red-wine', emoji: '🍷', name: 'Вино красное сухое', kcal: 85, p: 0.1, f: 0, c: 2.6, fib: 0.0, sug: 0.3, defaultGrams: 150, tags: ['dinner'] },

  // ---------- Сладкое, снеки ----------
  { id: 'halva', emoji: '🍬', name: 'Халва', kcal: 520, p: 12.0, f: 30.0, c: 55, fib: 5.0, sug: 45.0, defaultGrams: 30, tags: ['snack'] },
  { id: 'jam', emoji: '🍯', name: 'Варенье', kcal: 278, p: 0.3, f: 0.1, c: 70, fib: 0.8, sug: 68.0, defaultGrams: 30, tags: ['breakfast', 'snack'] },
  { id: 'cake', emoji: '🍰', name: 'Торт бисквитный', kcal: 350, p: 5.5, f: 15.0, c: 49, fib: 1.0, sug: 32.0, defaultGrams: 120, tags: ['snack'] },
  { id: 'chips', emoji: '🍟', name: 'Чипсы картофельные', kcal: 536, p: 6.6, f: 33.0, c: 53, fib: 4.4, sug: 0.6, defaultGrams: 60, tags: ['snack'] },
  { id: 'popcorn', emoji: '🍿', name: 'Попкорн', kcal: 401, p: 8.0, f: 12.0, c: 65, fib: 8.0, sug: 0.5, defaultGrams: 50, tags: ['snack'] },
  { id: 'raisins', emoji: '🍇', name: 'Изюм', kcal: 299, p: 3.0, f: 0.5, c: 70, fib: 3.7, sug: 60.0, defaultGrams: 30, tags: ['snack', 'breakfast'] },
  { id: 'pistachios', emoji: '🥜', name: 'Фисташки', kcal: 560, p: 20.0, f: 45.0, c: 28, fib: 10.3, sug: 7.7, defaultGrams: 30, tags: ['snack'] },
  { id: 'peanuts', emoji: '🥜', name: 'Арахис жареный', kcal: 567, p: 26.0, f: 49.0, c: 16, fib: 8.5, sug: 4.7, defaultGrams: 30, tags: ['snack'] },

  // ---------- Фрукты, ягоды, овощи ----------
  { id: 'tangerine', emoji: '🍊', name: 'Мандарин', kcal: 53, p: 0.8, f: 0.3, c: 11.5, fib: 1.8, sug: 10.5, defaultGrams: 150, tags: ['snack'] },
  { id: 'peach', emoji: '🍑', name: 'Персик', kcal: 39, p: 0.9, f: 0.3, c: 8.8, fib: 1.5, sug: 8.4, defaultGrams: 150, tags: ['snack'] },
  { id: 'apricot', emoji: '🍑', name: 'Абрикос', kcal: 48, p: 1.4, f: 0.4, c: 9.0, fib: 2.0, sug: 8.2, defaultGrams: 150, tags: ['snack'] },
  { id: 'plum', emoji: '🫐', name: 'Слива', kcal: 46, p: 0.8, f: 0.3, c: 9.6, fib: 1.4, sug: 7.5, defaultGrams: 120, tags: ['snack'] },
  { id: 'sweet-cherry', emoji: '🍒', name: 'Черешня', kcal: 63, p: 1.1, f: 0.4, c: 14, fib: 1.4, sug: 12.0, defaultGrams: 150, tags: ['snack'] },
  { id: 'boiled-beet', emoji: '🍠', name: 'Свёкла отварная', kcal: 44, p: 1.7, f: 0.2, c: 10, fib: 2.0, sug: 8.0, defaultGrams: 150, tags: ['lunch', 'dinner'] },
  { id: 'broccoli', emoji: '🥦', name: 'Брокколи отварная', kcal: 35, p: 2.4, f: 0.4, c: 7.0, fib: 3.3, sug: 1.4, defaultGrams: 150, tags: ['lunch', 'dinner'] },
  { id: 'fried-mushrooms', emoji: '🍄', name: 'Шампиньоны жареные', kcal: 105, p: 3.7, f: 8.0, c: 3.5, fib: 1.6, sug: 1.5, defaultGrams: 150, tags: ['lunch', 'dinner'] },

  // ---------- Масло и соусы ----------
  { id: 'vegetable-oil', emoji: '🫒', name: 'Масло растительное', kcal: 899, p: 0, f: 99.8, c: 0, fib: 0.0, sug: 0.0, defaultGrams: 10, tags: ['lunch', 'dinner'] },
  { id: 'butter', emoji: '🧈', name: 'Масло сливочное', kcal: 748, p: 0.5, f: 82.5, c: 0.8, fib: 0.0, sug: 0.5, defaultGrams: 15, tags: ['breakfast'] },
  { id: 'mayo', emoji: '🥫', name: 'Майонез', kcal: 680, p: 1.0, f: 75.0, c: 3.0, fib: 0.0, sug: 2.0, defaultGrams: 20, tags: ['lunch', 'dinner'] },
  { id: 'ketchup', emoji: '🥫', name: 'Кетчуп', kcal: 112, p: 1.3, f: 0.1, c: 25, fib: 1.4, sug: 20.0, defaultGrams: 20, tags: ['lunch', 'dinner'] },
]

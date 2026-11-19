// Фастфуд по сетям (просьба Кати 19.11: «добавь в базу фастфуд — КФС,
// Вкусно и точка, Бургер Кинг и другие»). КФЖУ на 100 г, порции (dg) —
// вес одной штуки/стандартной порции. Значения — средние по открытым
// данным сетей (пищевая ценность на сайтах ресторанов, этикетки
// упаковки) и по таблицам состава для типовых блюд; у позиции одной
// сети ккал сходятся с энергетическим уравнением (4Б + 9Ж + 4У).
//
// Названия без апострофов и латиницы в марки («Ростикс», не «Ростик'с»;
// «Бургер Кинг», не «Burger King») — поиск в BaseMode пословный по
// подстроке, апостроф и латиница рвут поиск. КФС добавлено в название
// позиций Ростикса: Катя ищет сеть как «кфс»/«киэфси».
//
// al — алиасы для голосового/текстового разбора (food-ai.js):
// все основы алиаса должны быть во фразе. Голые короткие алиасы
// («воппер») даём только одной позиции сети, иначе простой запрос
// «воппер» побеждал бы «Двойной Воппер» (побеждает длиннейшее
// название среди совпавших).

export const FASTFOOD_FOODS = [
  // ---------- Вкусно и точка ----------
  { id: 'ff-vit-big-hit', emoji: '🍔', name: 'Бургер Биг Хит «Вкусно и точка»', kcal: 198, p: 9.3, f: 10.7, c: 16.2, fib: 1.5, sug: 4.5, defaultGrams: 280, tags: ['lunch', 'dinner'], al: ['биг хит', 'бигхит', 'вкусно и точка биг хит'] },
  { id: 'ff-vit-big-hit-double', emoji: '🍔', name: 'Бургер Биг Хит Двойной «Вкусно и точка»', kcal: 239, p: 12.9, f: 13.4, c: 16.8, fib: 1.5, sug: 4.5, defaultGrams: 380, tags: ['lunch', 'dinner'], al: ['двойной биг хит', 'биг хит двойной'] },
  { id: 'ff-vit-grand', emoji: '🍔', name: 'Бургер Гранд «Вкусно и точка»', kcal: 201, p: 8.8, f: 11, c: 16.8, fib: 1.5, sug: 4.5, defaultGrams: 290, tags: ['lunch', 'dinner'], al: ['гранд вкусно и точка', 'вкусно и точка гранд'] },
  { id: 'ff-vit-grand-de-luxe', emoji: '🍔', name: 'Бургер Гранд Де Люкс «Вкусно и точка»', kcal: 225, p: 9.5, f: 13, c: 17.5, fib: 1.5, sug: 5, defaultGrams: 300, tags: ['lunch', 'dinner'], al: ['гранд де люкс', 'де люкс'] },
  { id: 'ff-vit-chicken-hit', emoji: '🍔', name: 'Бургер Чикен Хит «Вкусно и точка»', kcal: 193, p: 9, f: 10.5, c: 15.5, fib: 1.5, sug: 4.5, defaultGrams: 230, tags: ['lunch', 'dinner'], al: ['чикен хит', 'вкусно и точка чикен'] },
  { id: 'ff-vit-chicken-hit-double', emoji: '🍔', name: 'Бургер Чикен Хит Двойной «Вкусно и точка»', kcal: 226, p: 12.4, f: 12.5, c: 16, fib: 1.5, sug: 4.5, defaultGrams: 330, tags: ['lunch', 'dinner'], al: ['двойной чикен хит'] },
  { id: 'ff-vit-cheeseburger', emoji: '🍔', name: 'Чизбургер «Вкусно и точка»', kcal: 250, p: 11, f: 14, c: 20, fib: 1.5, sug: 5, defaultGrams: 115, tags: ['lunch', 'dinner', 'snack'], al: ['чизбургер вкусно и точка', 'вкусно и точка чизбургер'] },
  { id: 'ff-vit-double-cheeseburger', emoji: '🍔', name: 'Двойной Чизбургер «Вкусно и точка»', kcal: 268, p: 12, f: 16, c: 19, fib: 1.5, sug: 5, defaultGrams: 165, tags: ['lunch', 'dinner'], al: ['двойной чизбургер вкусно и точка'] },
  { id: 'ff-vit-hamburger', emoji: '🍔', name: 'Гамбургер «Вкусно и точка»', kcal: 224, p: 9.3, f: 11, c: 22, fib: 1.5, sug: 5, defaultGrams: 100, tags: ['lunch', 'dinner', 'snack'], al: ['гамбургер вкусно и точка'] },
  { id: 'ff-vit-fishburger', emoji: '🍔', name: 'Фишбургер «Вкусно и точка»', kcal: 224, p: 9, f: 12, c: 20, fib: 1.5, sug: 4.5, defaultGrams: 150, tags: ['lunch', 'dinner'], al: ['фишбургер', 'рыбный бургер'] },
  { id: 'ff-vit-fries', emoji: '🍟', name: 'Картофель фри «Вкусно и точка»', kcal: 313, p: 3.4, f: 15, c: 41, fib: 1.8, sug: 0.3, defaultGrams: 130, tags: ['lunch', 'dinner', 'snack'], al: ['фри вкусно и точка', 'картошка фри вкусно и точка'] },
  { id: 'ff-vit-nuggets-6', emoji: '🍗', name: 'Наггетсы 6 шт «Вкусно и точка»', kcal: 264, p: 13, f: 16, c: 17, fib: 1, sug: 1.2, defaultGrams: 95, tags: ['lunch', 'dinner', 'snack'], al: ['наггетсы', 'нагетсы', 'наггетсы вкусно и точка'] },
  { id: 'ff-vit-sauce', emoji: '🥫', name: 'Соус Картофельный «Вкусно и точка»', kcal: 238, p: 2, f: 22, c: 8, fib: 0.3, sug: 3, defaultGrams: 30, tags: ['lunch', 'dinner'], al: ['соус картофельный', 'соус к картошке'] },
  { id: 'ff-vit-cone', emoji: '🍦', name: 'Мороженое Рожок «Вкусно и точка»', kcal: 191, p: 3.5, f: 9, c: 24, fib: 0.3, sug: 18, defaultGrams: 90, tags: ['snack'], al: ['рожок', 'мороженое рожок', 'рожок вкусно и точка'] },
  { id: 'ff-vit-latte', emoji: '☕', name: 'Латте «Вкусно и точка»', kcal: 57, p: 2.7, f: 2.5, c: 5.8, fib: 0, sug: 5.5, defaultGrams: 250, tags: ['breakfast', 'snack'], al: ['латте вкусно и точка', 'латте'] },

  // ---------- Ростикс (быв. КФС / KFC) ----------
  { id: 'ff-rostiks-twister', emoji: '🌯', name: 'Твистер «Ростикс» (КФС)', kcal: 173, p: 8.8, f: 8.4, c: 15.6, fib: 1.6, sug: 2.5, defaultGrams: 320, tags: ['lunch', 'dinner'], al: ['твистер', 'twister', 'твистер кфс', 'твистер ростикс'] },
  { id: 'ff-rostiks-strips-3', emoji: '🍗', name: 'Стрипсы 3 шт «Ростикс» (КФС)', kcal: 300, p: 18.9, f: 15.6, c: 21.1, fib: 1.2, sug: 1, defaultGrams: 90, tags: ['lunch', 'dinner', 'snack'], al: ['стрипсы', 'стрипсы кфс', 'стрипсы ростикс'] },
  { id: 'ff-rostiks-strips-5', emoji: '🍗', name: 'Стрипсы 5 шт «Ростикс» (КФС)', kcal: 300, p: 18.9, f: 15.6, c: 21.1, fib: 1.2, sug: 1, defaultGrams: 150, tags: ['lunch', 'dinner', 'snack'], al: ['стрипсы 5', 'пять стрипс'] },
  { id: 'ff-rostiks-wings', emoji: '🍗', name: 'Крылышки Острые 6 шт «Ростикс» (КФС)', kcal: 168, p: 13.5, f: 11.5, c: 2.5, fib: 0.2, sug: 0.3, defaultGrams: 270, tags: ['lunch', 'dinner'], al: ['кфс крылышки', 'крылышки острые', 'острые крылышки', 'kfc крылышки'] },
  { id: 'ff-rostiks-nuggets-9', emoji: '🍗', name: 'Наггетсы 9 шт «Ростикс» (КФС)', kcal: 264, p: 13, f: 16, c: 17, fib: 1, sug: 1.2, defaultGrams: 140, tags: ['lunch', 'dinner', 'snack'], al: ['наггетсы кфс', 'кфс наггетсы', 'наггетсы ростикс'] },
  { id: 'ff-rostiks-chickenburger', emoji: '🍔', name: 'Чикенбургер «Ростикс» (КФС)', kcal: 258, p: 11, f: 14, c: 22, fib: 1.5, sug: 5, defaultGrams: 170, tags: ['lunch', 'dinner'], al: ['чикенбургер', 'чикен бургер кфс'] },
  { id: 'ff-rostiks-homeburger', emoji: '🍔', name: 'Хоум-бургер «Ростикс» (КФС)', kcal: 239, p: 10.8, f: 13.5, c: 18.5, fib: 1.5, sug: 5, defaultGrams: 220, tags: ['lunch', 'dinner'], al: ['хоум бургер', 'хоумбургер'] },
  { id: 'ff-rostiks-country-potato', emoji: '🥔', name: 'Картофель по-деревенски «Ростикс» (КФС)', kcal: 261, p: 3, f: 13, c: 33, fib: 2.2, sug: 0.5, defaultGrams: 150, tags: ['lunch', 'dinner', 'snack'], al: ['картошка по деревенски кфс', 'по деревенски кфс'] },
  { id: 'ff-rostiks-fries', emoji: '🍟', name: 'Картофель фри «Ростикс» (КФС)', kcal: 313, p: 3.4, f: 15, c: 41, fib: 1.8, sug: 0.3, defaultGrams: 130, tags: ['lunch', 'dinner', 'snack'], al: ['фри кфс', 'картошка фри кфс'] },
  { id: 'ff-rostiks-club', emoji: '🥪', name: 'Сэндвич Клаб «Ростикс» (КФС)', kcal: 214, p: 10.5, f: 11.5, c: 17, fib: 1.5, sug: 3, defaultGrams: 240, tags: ['lunch', 'dinner'], al: ['сэндвич клаб', 'клаб сэндвич кфс'] },
  { id: 'ff-rostiks-corndog', emoji: '🌭', name: 'Корн-дог «Ростикс» (КФС)', kcal: 252, p: 8.5, f: 14, c: 23, fib: 1.2, sug: 4, defaultGrams: 160, tags: ['lunch', 'snack'], al: ['корн дог', 'корндог'] },

  // ---------- Бургер Кинг ----------
  { id: 'ff-bk-whopper', emoji: '🍔', name: 'Воппер «Бургер Кинг»', kcal: 192, p: 7.3, f: 11.8, c: 14.2, fib: 1.5, sug: 4, defaultGrams: 330, tags: ['lunch', 'dinner'], al: ['воппер', 'whopper', 'воппер бургер кинг'] },
  { id: 'ff-bk-double-whopper', emoji: '🍔', name: 'Двойной Воппер «Бургер Кинг»', kcal: 224, p: 10.1, f: 14.3, c: 13.8, fib: 1.5, sug: 4, defaultGrams: 435, tags: ['lunch', 'dinner'], al: ['двойной воппер', 'воппер двойной'] },
  { id: 'ff-bk-whopper-junior', emoji: '🍔', name: 'Воппер Джуниор «Бургер Кинг»', kcal: 201, p: 7.6, f: 12.4, c: 14.8, fib: 1.5, sug: 4, defaultGrams: 210, tags: ['lunch', 'dinner', 'snack'], al: ['воппер джюниор', 'воппер юниор', 'джуниор воппер'] },
  { id: 'ff-bk-cheeseburger', emoji: '🍔', name: 'Чизбургер «Бургер Кинг»', kcal: 272, p: 11.7, f: 15, c: 22.5, fib: 1.5, sug: 5.5, defaultGrams: 120, tags: ['lunch', 'dinner', 'snack'], al: ['чизбургер бургер кинг', 'бургер кинг чизбургер'] },
  { id: 'ff-bk-double-cheeseburger', emoji: '🍔', name: 'Двойной Чизбургер «Бургер Кинг»', kcal: 283, p: 13, f: 17, c: 19.5, fib: 1.5, sug: 5.5, defaultGrams: 165, tags: ['lunch', 'dinner'], al: ['двойной чизбургер бургер кинг'] },
  { id: 'ff-bk-long-chicken', emoji: '🍔', name: 'Лонг Чикен «Бургер Кинг»', kcal: 190, p: 8.6, f: 9, c: 18.6, fib: 1.5, sug: 4.5, defaultGrams: 350, tags: ['lunch', 'dinner'], al: ['лонг чикен', 'лонгчикен'] },
  { id: 'ff-bk-chicken-file', emoji: '🍔', name: 'Чикен Филе «Бургер Кинг»', kcal: 207, p: 10, f: 10.5, c: 18, fib: 1.5, sug: 4.5, defaultGrams: 180, tags: ['lunch', 'dinner'], al: ['чикен филе бургер кинг'] },
  { id: 'ff-bk-nuggets-king-9', emoji: '🍗', name: 'Наггетсы King 9 шт «Бургер Кинг»', kcal: 264, p: 13, f: 16, c: 17, fib: 1, sug: 1.2, defaultGrams: 155, tags: ['lunch', 'dinner', 'snack'], al: ['наггетсы кинг', 'наггетсы бургер кинг', 'кинг наггетсы'] },
  { id: 'ff-bk-onion-rings', emoji: '🧅', name: 'Луковые кольца «Бургер Кинг»', kcal: 278, p: 4, f: 14, c: 34, fib: 2, sug: 3, defaultGrams: 120, tags: ['lunch', 'dinner', 'snack'], al: ['луковые кольца', 'кольца бургер кинг'] },
  { id: 'ff-bk-fries', emoji: '🍟', name: 'Картофель фри «Бургер Кинг»', kcal: 313, p: 3.4, f: 15, c: 41, fib: 1.8, sug: 0.3, defaultGrams: 130, tags: ['lunch', 'dinner', 'snack'], al: ['фри бургер кинг', 'картошка фри бургер кинг'] },
  { id: 'ff-bk-country-potato', emoji: '🥔', name: 'Картофель по-деревенски «Бургер Кинг»', kcal: 261, p: 3, f: 13, c: 33, fib: 2.2, sug: 0.5, defaultGrams: 140, tags: ['lunch', 'dinner', 'snack'], al: ['по деревенски бургер кинг'] },
  { id: 'ff-bk-sundae', emoji: '🍨', name: 'Сандей Шоколадный «Бургер Кинг»', kcal: 190, p: 3.5, f: 8, c: 26, fib: 0.5, sug: 20, defaultGrams: 150, tags: ['snack'], al: ['сандей', 'сандей шоколадный'] },
  { id: 'ff-bk-cherry-pie', emoji: '🥧', name: 'Пирожок с вишней «Бургер Кинг»', kcal: 294, p: 4.5, f: 12, c: 42, fib: 1.2, sug: 14, defaultGrams: 85, tags: ['snack'], al: ['пирожок с вишней', 'вишнёвый пирожок'] },
  { id: 'ff-bk-mors', emoji: '🥤', name: 'Морс Клюквенный «Бургер Кинг»', kcal: 46, p: 0.1, f: 0, c: 11.5, fib: 0.2, sug: 11, defaultGrams: 300, tags: ['snack'], al: ['морс бургер кинг', 'клюквенный морс'] },

  // ---------- Додо Пицца ----------
  { id: 'ff-dodo-pepperoni', emoji: '🍕', name: 'Пицца Пепперони «Додо»', kcal: 272, p: 11, f: 12, c: 30, fib: 2, sug: 3.5, defaultGrams: 300, tags: ['lunch', 'dinner'], al: ['додо пепперони', 'пепперони'] },
  { id: 'ff-dodo-margarita', emoji: '🍕', name: 'Пицца Маргарита «Додо»', kcal: 221, p: 8.5, f: 7, c: 31, fib: 2, sug: 3.5, defaultGrams: 280, tags: ['lunch', 'dinner'], al: ['додо маргарита', 'маргарита'] },
  { id: 'ff-dodo-four-cheese', emoji: '🍕', name: 'Пицца Четыре сыра «Додо»', kcal: 284, p: 11.5, f: 13.5, c: 29, fib: 2, sug: 3.5, defaultGrams: 280, tags: ['lunch', 'dinner'], al: ['четыре сыра', 'додо четыре сыра'] },
  { id: 'ff-dodo-hawaiian', emoji: '🍕', name: 'Пицца Гавайская «Додо»', kcal: 227, p: 9, f: 7, c: 32, fib: 2, sug: 4, defaultGrams: 280, tags: ['lunch', 'dinner'], al: ['гавайская', 'додо гавайская'] },
  { id: 'ff-dodo-meat', emoji: '🍕', name: 'Пицца Мясная «Додо»', kcal: 268, p: 11, f: 12, c: 29, fib: 2, sug: 3.5, defaultGrams: 300, tags: ['lunch', 'dinner'], al: ['мясная пицца', 'додо мясная'] },
  { id: 'ff-dodo-diablo', emoji: '🍕', name: 'Пицца Диабло «Додо»', kcal: 273, p: 11.5, f: 12.5, c: 28.5, fib: 2, sug: 3.5, defaultGrams: 280, tags: ['lunch', 'dinner'], al: ['диабло', 'додо диабло'] },
  { id: 'ff-dodo-deluxe', emoji: '🍕', name: 'Пицца Де Люкс «Додо»', kcal: 281, p: 11.5, f: 13, c: 29.5, fib: 2, sug: 4, defaultGrams: 300, tags: ['lunch', 'dinner'], al: ['додо де люкс'] },
  { id: 'ff-dodo-strips', emoji: '🍗', name: 'Стрипсы «Додо»', kcal: 258, p: 14, f: 14, c: 19, fib: 1, sug: 1, defaultGrams: 150, tags: ['lunch', 'dinner', 'snack'], al: ['стрипсы додо', 'додо стрипсы'] },
  { id: 'ff-dodo-fries', emoji: '🍟', name: 'Картофель фри «Додо»', kcal: 313, p: 3.4, f: 15, c: 41, fib: 1.8, sug: 0.3, defaultGrams: 150, tags: ['lunch', 'dinner', 'snack'], al: ['фри додо'] },
  { id: 'ff-dodo-donut', emoji: '🍩', name: 'Пончик «Додо»', kcal: 335, p: 6.5, f: 13, c: 48, fib: 1.5, sug: 22, defaultGrams: 70, tags: ['snack'], al: ['пончик додо', 'донатс'] },

  // ---------- Теремок ----------
  { id: 'ff-teremok-oat-berry', emoji: '🥣', name: 'Каша Овсяная с ягодами «Теремок»', kcal: 78, p: 2.2, f: 1.6, c: 13.8, fib: 2, sug: 5.5, defaultGrams: 280, tags: ['breakfast'], al: ['теремок овсянка', 'каша теремок', 'овсяная каша теремок'] },
  { id: 'ff-teremok-buckwheat-mushroom', emoji: '🥣', name: 'Каша Гречневая с грибами «Теремок»', kcal: 95, p: 3, f: 2.5, c: 15, fib: 2.5, sug: 1.5, defaultGrams: 280, tags: ['lunch', 'dinner'], al: ['гречка теремок', 'теремок гречка'] },
  { id: 'ff-teremok-rice-milk', emoji: '🥣', name: 'Каша Рисовая на молоке «Теремок»', kcal: 93, p: 2.5, f: 2.5, c: 15, fib: 0.5, sug: 6, defaultGrams: 280, tags: ['breakfast'], al: ['рисовая каша теремок'] },
  { id: 'ff-teremok-pancake-tv', emoji: '🥞', name: 'Блины с творогом «Теремок»', kcal: 204, p: 8, f: 8, c: 25, fib: 1, sug: 6, defaultGrams: 200, tags: ['breakfast', 'snack'], al: ['блины с творогом теремок', 'теремок блины с творогом'] },
  { id: 'ff-teremok-pancake-meat', emoji: '🥞', name: 'Блины с мясом «Теремок»', kcal: 230, p: 8, f: 10, c: 27, fib: 1, sug: 3, defaultGrams: 220, tags: ['lunch', 'dinner'], al: ['блины с мясом теремок'] },
  { id: 'ff-teremok-syrniki', emoji: '🧀', name: 'Сырники со сметаной «Теремок»', kcal: 223, p: 12, f: 11, c: 19, fib: 0.6, sug: 7, defaultGrams: 180, tags: ['breakfast', 'snack'], al: ['сырники теремок'] },
  { id: 'ff-teremok-noodle-soup', emoji: '🍲', name: 'Суп-лапша куриная «Теремок»', kcal: 40, p: 2.5, f: 1.5, c: 4.2, fib: 0.4, sug: 1, defaultGrams: 350, tags: ['lunch'], al: ['суп теремок', 'лапша куриная теремок'] },
  { id: 'ff-teremok-mors', emoji: '🥤', name: 'Морс Клюквенный «Теремок»', kcal: 46, p: 0.1, f: 0, c: 11.5, fib: 0.2, sug: 11, defaultGrams: 300, tags: ['snack'], al: ['морс теремок', 'теремок морс'] },

  // ---------- Крошка Картошка ----------
  { id: 'ff-kroshka-classic', emoji: '🥔', name: 'Картофель с соусом «Крошка Картошка»', kcal: 121, p: 2, f: 5, c: 17, fib: 1.8, sug: 1.5, defaultGrams: 400, tags: ['lunch', 'dinner'], al: ['крошка картошка', 'картошка крошка'] },
  { id: 'ff-kroshka-chicken', emoji: '🥔', name: 'Картофель с курицей «Крошка Картошка»', kcal: 132, p: 3.5, f: 5.5, c: 17, fib: 1.8, sug: 1.5, defaultGrams: 400, tags: ['lunch', 'dinner'], al: ['крошка картошка с курицей'] },
  { id: 'ff-kroshka-mushroom', emoji: '🥔', name: 'Картофель с грибами «Крошка Картошка»', kcal: 123, p: 2.5, f: 5, c: 17, fib: 1.8, sug: 1.5, defaultGrams: 400, tags: ['lunch', 'dinner'], al: ['крошка картошка с грибами'] },

  // ---------- Шоколадница ----------
  { id: 'ff-shoko-latte', emoji: '☕', name: 'Латте «Шоколадница»', kcal: 57, p: 2.7, f: 2.5, c: 5.8, fib: 0, sug: 5.5, defaultGrams: 250, tags: ['breakfast', 'snack'], al: ['латте шоколадница', 'шоколадница латте'] },
  { id: 'ff-shoko-cappuccino', emoji: '☕', name: 'Капучино «Шоколадница»', kcal: 45, p: 2.2, f: 2, c: 4.5, fib: 0, sug: 4.2, defaultGrams: 220, tags: ['breakfast', 'snack'], al: ['капучино шоколадница'] },
  { id: 'ff-shoko-cheesecake', emoji: '🍰', name: 'Чизкейк Нью-Йорк «Шоколадница»', kcal: 336, p: 7, f: 20, c: 32, fib: 0.6, sug: 24, defaultGrams: 120, tags: ['snack'], al: ['чизкейк нью йорк', 'чизкейк шоколадница'] },
  { id: 'ff-shoko-caesar', emoji: '🥗', name: 'Цезарь с курицей «Шоколадница»', kcal: 172, p: 11, f: 12, c: 5, fib: 1, sug: 1.5, defaultGrams: 230, tags: ['lunch', 'dinner'], al: ['цезарь шоколадница'] },

  // ---------- Cofix ----------
  { id: 'ff-cofix-cappuccino', emoji: '☕', name: 'Капучино «Cofix»', kcal: 45, p: 2.2, f: 2, c: 4.5, fib: 0, sug: 4.2, defaultGrams: 220, tags: ['breakfast', 'snack'], al: ['капучино cofix', 'кофик капучино'] },
  { id: 'ff-cofix-latte', emoji: '☕', name: 'Латте «Cofix»', kcal: 57, p: 2.7, f: 2.5, c: 5.8, fib: 0, sug: 5.5, defaultGrams: 250, tags: ['breakfast', 'snack'], al: ['латте cofix', 'кофик латте'] },
  { id: 'ff-cofix-americano', emoji: '☕', name: 'Американо «Cofix»', kcal: 3, p: 0.2, f: 0, c: 0.5, fib: 0, sug: 0, defaultGrams: 200, tags: ['breakfast', 'snack'], al: ['американо cofix', 'кофик американо'] },
  { id: 'ff-cofix-donut', emoji: '🍩', name: 'Пончик глазированный «Cofix»', kcal: 384, p: 6, f: 16, c: 54, fib: 1.5, sug: 30, defaultGrams: 60, tags: ['snack'], al: ['пончик cofix', 'кофик пончик'] },

  // ---------- Coffee Like ----------
  { id: 'ff-coffeelike-raf', emoji: '☕', name: 'Раф Ванильный «Coffee Like»', kcal: 104, p: 2.6, f: 6, c: 10, fib: 0, sug: 9.5, defaultGrams: 250, tags: ['breakfast', 'snack'], al: ['раф', 'раф ванильный', 'раф coffee like'] },
  { id: 'ff-coffeelike-latte', emoji: '☕', name: 'Латте «Coffee Like»', kcal: 57, p: 2.7, f: 2.5, c: 5.8, fib: 0, sug: 5.5, defaultGrams: 250, tags: ['breakfast', 'snack'], al: ['латте coffee like'] },
  { id: 'ff-coffeelike-cappuccino', emoji: '☕', name: 'Капучино «Coffee Like»', kcal: 45, p: 2.2, f: 2, c: 4.5, fib: 0, sug: 4.2, defaultGrams: 220, tags: ['breakfast', 'snack'], al: ['капучино coffee like'] },
]

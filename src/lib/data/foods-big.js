// Большой набор продуктов: типовые справочные значения на 100 г / 100 мл
// (таблицы химсостава продуктов). p/f/c — белки, жиры, углеводы в граммах,
// fib/sug — клетчатка/сахары (для рейтинга питания), defaultGrams —
// РЕАЛИСТИЧНАЯ порция (печенье ~30 г, конфета ~20 г, яйцо ~110 г —
// анти-паттерн конкурентов «2 печенья = 200 г» не допускаем).
// tags — подходящие приёмы пищи: breakfast | lunch | dinner | snack.

export const BIG_FOODS = [
  // ---------- Мясо и птица ----------
  { id: 'big-beef-boiled', emoji: '🥩', name: 'Говядина отварная', kcal: 254, p: 25.8, f: 16.8, c: 0, fib: 0, sug: 0, defaultGrams: 150, tags: ['lunch', 'dinner'] },
  { id: 'big-pork-baked', emoji: '🥓', name: 'Свинина запечённая', kcal: 265, p: 24, f: 18, c: 0, fib: 0, sug: 0, defaultGrams: 150, tags: ['lunch', 'dinner'] },
  { id: 'big-chicken-thigh', emoji: '🍗', name: 'Куриные бёдра запечённые', kcal: 207, p: 23.5, f: 12, c: 0, fib: 0, sug: 0, defaultGrams: 150, tags: ['lunch', 'dinner'] },
  { id: 'big-beef-cutlet', emoji: '🍖', name: 'Котлета из говядины', kcal: 250, p: 18, f: 18, c: 5, fib: 0.4, sug: 1, defaultGrams: 140, tags: ['lunch', 'dinner'] },
  { id: 'big-goulash', emoji: '🍲', name: 'Гуляш из говядины', kcal: 200, p: 17, f: 13, c: 3.5, fib: 0.5, sug: 1, defaultGrams: 200, tags: ['lunch', 'dinner'] },
  { id: 'big-shashlik', emoji: '🍢', name: 'Шашлык свиной', kcal: 280, p: 22, f: 21, c: 0, fib: 0, sug: 0, defaultGrams: 180, tags: ['lunch', 'dinner'] },
  { id: 'big-sausage-smoked', emoji: '🌭', name: 'Колбаса полукопчёная', kcal: 380, p: 17, f: 34, c: 1.5, fib: 0, sug: 0.5, defaultGrams: 50, tags: ['breakfast', 'snack'] },
  { id: 'big-salo', emoji: '🥓', name: 'Сало солёное', kcal: 797, p: 1.4, f: 89, c: 0, fib: 0, sug: 0, defaultGrams: 30, tags: ['snack'] },

  // ---------- Рыба и морепродукты ----------
  { id: 'big-mackerel', emoji: '🐟', name: 'Скумбрия запечённая', kcal: 191, p: 18, f: 13.2, c: 0, fib: 0, sug: 0, defaultGrams: 150, tags: ['lunch', 'dinner'] },
  { id: 'big-pollock', emoji: '🐟', name: 'Минтай отварной', kcal: 79, p: 17.6, f: 1, c: 0, fib: 0, sug: 0, defaultGrams: 150, tags: ['lunch', 'dinner'] },
  { id: 'big-pikeperch', emoji: '🐟', name: 'Судак отварной', kcal: 84, p: 18.2, f: 1.1, c: 0, fib: 0, sug: 0, defaultGrams: 150, tags: ['lunch', 'dinner'] },

  // ---------- Каши и гарниры ----------
  { id: 'big-millet', emoji: '🥣', name: 'Пшённая каша на молоке', kcal: 110, p: 4, f: 4, c: 15, fib: 0.9, sug: 4.5, defaultGrams: 250, tags: ['breakfast'] },
  { id: 'big-yachka', emoji: '🥣', name: 'Ячневая каша', kcal: 110, p: 3.6, f: 2, c: 19, fib: 3.2, sug: 0.4, defaultGrams: 180, tags: ['breakfast', 'lunch'] },
  { id: 'big-potato-boiled', emoji: '🥔', name: 'Картофель отварной', kcal: 82, p: 2, f: 0.4, c: 17, fib: 1.8, sug: 0.9, defaultGrams: 200, tags: ['lunch', 'dinner'] },
  { id: 'big-beans', emoji: '🫘', name: 'Фасоль красная отварная', kcal: 123, p: 7.8, f: 0.5, c: 21, fib: 6.4, sug: 0.4, defaultGrams: 180, tags: ['lunch', 'dinner'] },
  { id: 'big-chickpea', emoji: '🫘', name: 'Нут отварной', kcal: 164, p: 8.9, f: 2.6, c: 27, fib: 7.6, sug: 4.8, defaultGrams: 150, tags: ['lunch', 'dinner'] },

  // ---------- Овощи и салаты ----------
  { id: 'big-tomato', emoji: '🍅', name: 'Помидор', kcal: 20, p: 0.9, f: 0.2, c: 3.7, fib: 1.2, sug: 3.3, defaultGrams: 150, tags: ['snack', 'lunch', 'dinner'] },
  { id: 'big-zucchini-stew', emoji: '🥬', name: 'Кабачки тушёные', kcal: 60, p: 1.5, f: 3, c: 6, fib: 1.8, sug: 3, defaultGrams: 200, tags: ['lunch', 'dinner'] },
  { id: 'big-mushroom-fried', emoji: '🍄', name: 'Грибы жареные', kcal: 120, p: 3.6, f: 10, c: 3, fib: 2.2, sug: 1.2, defaultGrams: 150, tags: ['lunch', 'dinner'] },
  { id: 'big-shuba', emoji: '🥗', name: 'Селёдка под шубой', kcal: 165, p: 7.5, f: 12, c: 7, fib: 1.4, sug: 2.4, defaultGrams: 200, tags: ['lunch', 'dinner'] },
  { id: 'big-vinaigrette', emoji: '🥗', name: 'Винегрет', kcal: 102, p: 1.7, f: 6, c: 12, fib: 3.2, sug: 4, defaultGrams: 200, tags: ['lunch', 'dinner'] },
  { id: 'big-caesar', emoji: '🥗', name: 'Цезарь с курицей', kcal: 190, p: 12, f: 12, c: 5, fib: 1.2, sug: 1.6, defaultGrams: 200, tags: ['lunch', 'dinner'] },

  // ---------- Фрукты и сухофрукты ----------
  { id: 'big-melon', emoji: '🍈', name: 'Дыня', kcal: 36, p: 0.6, f: 0.2, c: 8.2, fib: 0.9, sug: 7.9, defaultGrams: 250, tags: ['snack'] },
  { id: 'big-raspberry', emoji: '🫐', name: 'Малина', kcal: 52, p: 1.2, f: 0.7, c: 12, fib: 6.5, sug: 4.4, defaultGrams: 120, tags: ['snack', 'breakfast'] },
  { id: 'big-kiwi', emoji: '🥝', name: 'Киви', kcal: 61, p: 1.1, f: 0.5, c: 15, fib: 3, sug: 9, defaultGrams: 100, tags: ['snack'] },
  { id: 'big-pomegranate', emoji: '🍎', name: 'Гранат', kcal: 83, p: 1.7, f: 1.2, c: 18.7, fib: 4, sug: 13.7, defaultGrams: 150, tags: ['snack'] },
  { id: 'big-sour-cherry', emoji: '🍒', name: 'Вишня', kcal: 52, p: 1, f: 0.3, c: 12, fib: 1.6, sug: 9.9, defaultGrams: 150, tags: ['snack'] },
  { id: 'big-avocado', emoji: '🥑', name: 'Авокадо', kcal: 160, p: 2, f: 14.7, c: 8.5, fib: 6.7, sug: 0.7, defaultGrams: 100, tags: ['snack', 'breakfast'] },
  { id: 'big-dried-apricot', emoji: '🍑', name: 'Курага', kcal: 241, p: 3.4, f: 0.5, c: 63, fib: 7.3, sug: 53, defaultGrams: 40, tags: ['snack'] },
  { id: 'big-prunes', emoji: '🫐', name: 'Чернослив', kcal: 240, p: 2.3, f: 0.4, c: 64, fib: 7.1, sug: 38, defaultGrams: 40, tags: ['snack'] },

  // ---------- Молочка ----------
  { id: 'big-milk-25', emoji: '🥛', name: 'Молоко 2,5%', kcal: 52, p: 2.8, f: 2.5, c: 4.7, fib: 0, sug: 4.7, defaultGrams: 250, tags: ['breakfast', 'snack'] },
  { id: 'big-milk-32', emoji: '🥛', name: 'Молоко 3,2%', kcal: 59, p: 2.9, f: 3.2, c: 4.7, fib: 0, sug: 4.7, defaultGrams: 250, tags: ['breakfast', 'snack'] },
  { id: 'big-cottage-9', emoji: '🧀', name: 'Творог 9%', kcal: 159, p: 16.7, f: 9, c: 2, fib: 0, sug: 2, defaultGrams: 150, tags: ['breakfast', 'snack', 'dinner'] },
  { id: 'big-cottage-0', emoji: '🧀', name: 'Творог обезжиренный', kcal: 71, p: 16.5, f: 0.6, c: 1.3, fib: 0, sug: 1.3, defaultGrams: 150, tags: ['breakfast', 'snack', 'dinner'] },
  { id: 'big-sour-cream-15', emoji: '🥛', name: 'Сметана 15%', kcal: 158, p: 2.6, f: 15, c: 3.6, fib: 0, sug: 2.9, defaultGrams: 40, tags: ['lunch', 'dinner'] },
  { id: 'big-cream-10', emoji: '🥛', name: 'Сливки 10%', kcal: 118, p: 2.8, f: 10, c: 4, fib: 0, sug: 4, defaultGrams: 50, tags: ['breakfast'] },
  { id: 'big-drink-yogurt', emoji: '🥛', name: 'Йогурт питьевой 2%', kcal: 60, p: 2.8, f: 2, c: 8, fib: 0, sug: 7.5, defaultGrams: 290, tags: ['snack', 'breakfast'] },
  { id: 'big-ryazhenka', emoji: '🍶', name: 'Ряженка 2,5%', kcal: 54, p: 2.9, f: 2.5, c: 4.2, fib: 0, sug: 4.1, defaultGrams: 250, tags: ['snack', 'dinner'] },
  { id: 'big-cheese-gouda', emoji: '🧀', name: 'Сыр Гауда', kcal: 356, p: 24.9, f: 27.4, c: 2.2, fib: 0, sug: 2.2, defaultGrams: 40, tags: ['breakfast', 'snack'] },
  { id: 'big-cheese-russian', emoji: '🧀', name: 'Сыр Российский', kcal: 360, p: 23, f: 29, c: 0, fib: 0, sug: 0, defaultGrams: 40, tags: ['breakfast', 'snack'] },
  { id: 'big-parmesan', emoji: '🧀', name: 'Пармезан', kcal: 392, p: 35.8, f: 28.6, c: 0, fib: 0, sug: 0, defaultGrams: 30, tags: ['lunch', 'dinner'] },
  { id: 'big-cheese-processed', emoji: '🧀', name: 'Плавленый сыр', kcal: 290, p: 12.5, f: 25.6, c: 3.5, fib: 0, sug: 3, defaultGrams: 35, tags: ['breakfast', 'snack'] },
  { id: 'big-feta', emoji: '🧀', name: 'Фета', kcal: 264, p: 14, f: 21, c: 4, fib: 0, sug: 4, defaultGrams: 60, tags: ['lunch', 'dinner'] },
  { id: 'big-condensed-milk', emoji: '🥫', name: 'Сгущёнка', kcal: 320, p: 7.2, f: 8.5, c: 55, fib: 0, sug: 54, defaultGrams: 40, tags: ['snack', 'breakfast'] },

  // ---------- Хлеб и выпечка ----------
  { id: 'big-black-bread', emoji: '🍞', name: 'Хлеб чёрный (Бородинский)', kcal: 201, p: 6.9, f: 1.3, c: 39, fib: 5.8, sug: 3.5, defaultGrams: 40, tags: ['breakfast', 'lunch'] },
  { id: 'big-whole-bread', emoji: '🍞', name: 'Хлеб цельнозерновой', kcal: 247, p: 9.8, f: 3.8, c: 42, fib: 7, sug: 3.6, defaultGrams: 40, tags: ['breakfast', 'lunch'] },
  { id: 'big-sugar-cookie', emoji: '🍪', name: 'Печенье сахарное', kcal: 417, p: 8, f: 12, c: 71, fib: 1.5, sug: 26, defaultGrams: 30, tags: ['snack'] },
  { id: 'big-burger-bun', emoji: '🍔', name: 'Булочка с кунжутом', kcal: 337, p: 8.5, f: 9.5, c: 54, fib: 2.2, sug: 6, defaultGrams: 60, tags: ['lunch'] },
  { id: 'big-fried-pie', emoji: '🥟', name: 'Пирожок с картошкой жареный', kcal: 290, p: 5.5, f: 14, c: 36, fib: 1.8, sug: 2.2, defaultGrams: 100, tags: ['lunch', 'snack'] },
  { id: 'big-marmalade', emoji: '🍬', name: 'Мармелад', kcal: 321, p: 0.2, f: 0.1, c: 79, fib: 0.4, sug: 66, defaultGrams: 30, tags: ['snack'] },
  { id: 'big-pryanik', emoji: '🍪', name: 'Пряники', kcal: 350, p: 5.2, f: 6, c: 68, fib: 1.8, sug: 34, defaultGrams: 40, tags: ['snack'] },
  { id: 'big-sushki', emoji: '🥨', name: 'Сушки', kcal: 340, p: 10.5, f: 4.5, c: 68, fib: 1.6, sug: 8, defaultGrams: 25, tags: ['snack'] },
  { id: 'big-bread-crisp', emoji: '🍘', name: 'Хлебцы цельнозерновые', kcal: 300, p: 11, f: 2.5, c: 57, fib: 8, sug: 2, defaultGrams: 25, tags: ['snack', 'breakfast'] },

  // ---------- Сладкое ----------
  { id: 'big-candy', emoji: '🍬', name: 'Конфета шоколадная', kcal: 480, p: 4.5, f: 25, c: 65, fib: 1.5, sug: 55, defaultGrams: 20, tags: ['snack'] },
  { id: 'big-ice-cream', emoji: '🍦', name: 'Мороженое пломбир', kcal: 227, p: 3.2, f: 14, c: 21, fib: 0.6, sug: 20, defaultGrams: 100, tags: ['snack'] },
  { id: 'big-napoleon', emoji: '🍰', name: 'Торт Наполеон', kcal: 470, p: 5.5, f: 30, c: 42, fib: 0.9, sug: 22, defaultGrams: 120, tags: ['snack'] },
  { id: 'big-honey-cake', emoji: '🍰', name: 'Медовик', kcal: 420, p: 4.5, f: 22, c: 55, fib: 0.8, sug: 33, defaultGrams: 120, tags: ['snack'] },
  { id: 'big-cheesecake', emoji: '🍰', name: 'Чизкейк', kcal: 321, p: 6.5, f: 22.5, c: 25, fib: 0.6, sug: 18, defaultGrams: 120, tags: ['snack'] },

  // ---------- Фастфуд и готовые блюда ----------
  { id: 'big-burger', emoji: '🍔', name: 'Чизбургер', kcal: 300, p: 15, f: 14, c: 28, fib: 1.5, sug: 5.5, defaultGrams: 220, tags: ['lunch', 'dinner'] },
  { id: 'big-rolls-phila', emoji: '🍣', name: 'Роллы Филадельфия', kcal: 200, p: 7, f: 9, c: 21, fib: 0.8, sug: 3.5, defaultGrams: 220, tags: ['lunch', 'dinner'] },
  { id: 'big-rolls-calif', emoji: '🍣', name: 'Роллы Калифорния', kcal: 176, p: 5.5, f: 5, c: 26, fib: 1, sug: 4.5, defaultGrams: 220, tags: ['lunch', 'dinner'] },

  // ---------- Супы ----------
  { id: 'big-solyanka', emoji: '🍲', name: 'Солянка мясная', kcal: 167, p: 6.5, f: 12, c: 7, fib: 0.9, sug: 1.8, defaultGrams: 300, tags: ['lunch'] },
  { id: 'big-rassolnik', emoji: '🍲', name: 'Рассольник', kcal: 49, p: 1.4, f: 2, c: 6, fib: 1, sug: 1.4, defaultGrams: 300, tags: ['lunch'] },
  { id: 'big-ukha', emoji: '🍲', name: 'Уха', kcal: 45, p: 5, f: 1.5, c: 3, fib: 0.4, sug: 1.2, defaultGrams: 300, tags: ['lunch'] },
  { id: 'big-mushroom-soup', emoji: '🍲', name: 'Грибной суп', kcal: 48, p: 2, f: 2, c: 5, fib: 1.1, sug: 1.5, defaultGrams: 300, tags: ['lunch'] },
  { id: 'big-pea-soup', emoji: '🍲', name: 'Гороховый суп', kcal: 66, p: 4.4, f: 1.6, c: 9, fib: 2.2, sug: 1.6, defaultGrams: 300, tags: ['lunch'] },

  // ---------- Яйца и прочее ----------

  // ---------- Напитки ----------
  { id: 'big-latte', emoji: '☕', name: 'Латте на молоке 2,5%', kcal: 55, p: 3, f: 2.1, c: 6.5, fib: 0, sug: 6.3, defaultGrams: 250, tags: ['breakfast', 'snack'] },
  { id: 'big-cola-zero', emoji: '🥤', name: 'Кола без сахара', kcal: 0, p: 0, f: 0, c: 0, fib: 0, sug: 0, defaultGrams: 330, tags: ['snack'] },
  { id: 'big-apple-juice', emoji: '🧃', name: 'Яблочный сок', kcal: 46, p: 0.1, f: 0.1, c: 10, fib: 0.2, sug: 9.1, defaultGrams: 250, tags: ['snack'] },
  { id: 'big-compote', emoji: '🥤', name: 'Компот', kcal: 60, p: 0.2, f: 0, c: 15, fib: 0.2, sug: 14, defaultGrams: 250, tags: ['lunch', 'snack'] },
  { id: 'big-mors', emoji: '🥤', name: 'Морс клюквенный', kcal: 44, p: 0.1, f: 0, c: 11, fib: 0.1, sug: 10.5, defaultGrams: 250, tags: ['snack'] },
  { id: 'big-kvas', emoji: '🥤', name: 'Квас', kcal: 27, p: 0.2, f: 0, c: 5.8, fib: 0, sug: 5.4, defaultGrams: 300, tags: ['snack'] },
  { id: 'big-energy-drink', emoji: '⚡', name: 'Энергетик', kcal: 45, p: 0, f: 0, c: 11, fib: 0, sug: 11, defaultGrams: 250, tags: ['snack'] },
  { id: 'big-beer', emoji: '🍺', name: 'Пиво светлое 4,5%', kcal: 43, p: 0.5, f: 0, c: 3.6, fib: 0, sug: 0.5, defaultGrams: 500, tags: ['snack'] },
  { id: 'big-wine-white', emoji: '🥂', name: 'Вино белое сухое', kcal: 66, p: 0.1, f: 0, c: 0.3, fib: 0, sug: 0.4, defaultGrams: 150, tags: ['snack'] },
  { id: 'big-vodka', emoji: '🥃', name: 'Водка 40%', kcal: 235, p: 0, f: 0, c: 0.1, fib: 0, sug: 0, defaultGrams: 50, tags: ['snack'] },
]

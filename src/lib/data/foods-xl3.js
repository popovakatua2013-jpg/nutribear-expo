// Третий большой набор (фастфуд и готовые блюда, соусы, напитки, консервы, веган и ЗОЖ): типовые справочные значения на 100 г / 100 мл (таблицы химсостава,
// USDA/Скурихин). p/f/c — белки, жиры, углеводы в граммах, fib/sug — клетчатка
// и сахара (для рейтинга питания), defaultGrams — реалистичная порция
// (конфета ~20–50 г, масло ~10–15 г), tags — breakfast | lunch | dinner | snack.
// Файл сгенерирован scripts/foods-xl-build.py — правки значений вносить там
// или здесь аккуратно: ккал считается по правилу 4/9/4 от БЖУ (у алкоголя
// калорийность табличная — из этанола).

export const XL3_FOODS = [
  // ---------- Фастфуд и готовые блюда ----------
  { id: 'xl-pizza-margherita', emoji: '🍕', name: 'Пицца Маргарита', kcal: 246, p: 10, f: 9.5, c: 30, fib: 1.8, sug: 3.5, defaultGrams: 200, tags: ['lunch', 'dinner'] },
  { id: 'xl-pizza-4cheese', emoji: '🍕', name: 'Пицца Четыре сыра', kcal: 282, p: 13, f: 13.5, c: 27, fib: 1.5, sug: 3, defaultGrams: 200, tags: ['lunch', 'dinner'] },
  { id: 'xl-carbonara', emoji: '🍝', name: 'Паста карбонара', kcal: 217, p: 8.5, f: 11, c: 21, fib: 1.2, sug: 2, defaultGrams: 250, tags: ['lunch', 'dinner'] },
  { id: 'xl-wok-beef', emoji: '🍜', name: 'Вок с говядиной и овощами', kcal: 146, p: 8, f: 6, c: 15, fib: 1.5, sug: 3, defaultGrams: 300, tags: ['lunch', 'dinner'] },
  { id: 'xl-udon-chicken', emoji: '🍜', name: 'Удон с курицей', kcal: 135, p: 6.5, f: 4.5, c: 17, fib: 1.4, sug: 2.5, defaultGrams: 300, tags: ['lunch', 'dinner'] },
  { id: 'xl-ramen', emoji: '🍜', name: 'Рамен с курицей и яйцом', kcal: 109, p: 5, f: 4.5, c: 12, fib: 0.8, sug: 1.5, defaultGrams: 400, tags: ['lunch', 'dinner'] },
  { id: 'xl-pad-thai', emoji: '🍜', name: 'Пад Тай с курицей', kcal: 171, p: 7, f: 6.5, c: 21, fib: 1.2, sug: 5, defaultGrams: 300, tags: ['lunch', 'dinner'] },
  { id: 'xl-lagman', emoji: '🍜', name: 'Лагман с говядиной', kcal: 120, p: 5.5, f: 5.5, c: 12, fib: 1, sug: 2, defaultGrams: 350, tags: ['lunch', 'dinner'] },
  { id: 'xl-soba', emoji: '🍜', name: 'Соба (гречневая лапша) с овощами', kcal: 128, p: 5, f: 4, c: 18, fib: 1.8, sug: 3, defaultGrams: 250, tags: ['lunch', 'dinner'] },
  { id: 'xl-fried-dumplings', emoji: '🥟', name: 'Пельмени жареные', kcal: 294, p: 12, f: 14, c: 30, fib: 1.2, sug: 1.5, defaultGrams: 220, tags: ['lunch', 'dinner'] },
  { id: 'xl-vareniki-potato', emoji: '🥟', name: 'Вареники с картошкой', kcal: 145, p: 4, f: 4.5, c: 22, fib: 1.2, sug: 1, defaultGrams: 250, tags: ['lunch', 'dinner'] },
  { id: 'xl-navy-pasta', emoji: '🍝', name: 'Макароны по-флотски', kcal: 206, p: 9, f: 10, c: 20, fib: 1.2, sug: 1.5, defaultGrams: 250, tags: ['lunch', 'dinner'] },
  { id: 'xl-potato-wedges', emoji: '🥔', name: 'Картофель по-деревенски', kcal: 181, p: 3, f: 9, c: 22, fib: 2, sug: 0.8, defaultGrams: 180, tags: ['lunch', 'snack'] },
  { id: 'xl-onion-rings', emoji: '🧅', name: 'Луковые кольца в кляре', kcal: 210, p: 3.5, f: 12, c: 22, fib: 1.8, sug: 3, defaultGrams: 120, tags: ['lunch', 'snack'] },
  { id: 'xl-fish-chips', emoji: '🐟', name: 'Рыба и картофель фри', kcal: 233, p: 9, f: 13, c: 20, fib: 1.8, sug: 1.5, defaultGrams: 300, tags: ['lunch', 'dinner'] },
  { id: 'xl-chicken-wrap', emoji: '🌯', name: 'Ролл с курицей и сыром (врап)', kcal: 218, p: 10, f: 10, c: 22, fib: 1.4, sug: 2.5, defaultGrams: 220, tags: ['lunch', 'dinner'] },
  { id: 'xl-tuna-sandwich', emoji: '🥪', name: 'Сэндвич с тунцом', kcal: 203, p: 9, f: 7, c: 26, fib: 1.8, sug: 3, defaultGrams: 150, tags: ['lunch', 'snack'] },
  { id: 'xl-sandwich-sausage', emoji: '🥪', name: 'Бутерброд с колбасой и сыром', kcal: 257, p: 10, f: 13, c: 25, fib: 1.8, sug: 2, defaultGrams: 90, tags: ['breakfast', 'snack'] },
  { id: 'xl-sandwich-salmon', emoji: '🥪', name: 'Бутерброд с красной рыбой', kcal: 213, p: 9, f: 9, c: 24, fib: 1.8, sug: 2, defaultGrams: 90, tags: ['breakfast', 'snack'] },
  { id: 'xl-ragu-meat', emoji: '🥘', name: 'Овощное рагу с мясом', kcal: 128, p: 6, f: 8, c: 8, fib: 2, sug: 4, defaultGrams: 250, tags: ['lunch', 'dinner'] },
  { id: 'xl-shakshuka', emoji: '🍳', name: 'Шакшука', kcal: 103, p: 5, f: 7, c: 5, fib: 1.2, sug: 3, defaultGrams: 200, tags: ['breakfast', 'dinner'] },
  // ---------- Соусы и масла ----------
  { id: 'xl-olive-oil', emoji: '🫒', name: 'Масло оливковое', kcal: 898, p: 0, f: 99.8, c: 0, fib: 0, sug: 0, defaultGrams: 10, tags: ['breakfast', 'lunch', 'dinner'] },
  { id: 'xl-tartar', emoji: '🥫', name: 'Соус тартар', kcal: 433, p: 2, f: 45, c: 5, fib: 0.2, sug: 3, defaultGrams: 30, tags: ['lunch', 'dinner'] },
  { id: 'xl-teriyaki', emoji: '🥫', name: 'Соус терияки', kcal: 93, p: 2, f: 0.5, c: 20, fib: 0.3, sug: 16, defaultGrams: 20, tags: ['lunch', 'dinner'] },
  { id: 'xl-bbq-sauce', emoji: '🥫', name: 'Соус барбекю', kcal: 116, p: 0.8, f: 0.5, c: 27, fib: 0.3, sug: 20, defaultGrams: 25, tags: ['lunch', 'dinner'] },
  { id: 'xl-tkemali', emoji: '🥫', name: 'Соус ткемали', kcal: 68, p: 1.5, f: 1.5, c: 12, fib: 0.5, sug: 8, defaultGrams: 25, tags: ['lunch', 'dinner'] },
  { id: 'xl-balsamic', emoji: '🥫', name: 'Крем-бальзамик', kcal: 84, p: 0.5, f: 0.2, c: 20, fib: 0.1, sug: 17, defaultGrams: 15, tags: ['lunch', 'dinner'] },
  { id: 'xl-mayo-light', emoji: '🥫', name: 'Майонез лёгкий', kcal: 339, p: 1, f: 35, c: 5, fib: 0.1, sug: 3.5, defaultGrams: 20, tags: ['lunch', 'dinner'] },
  { id: 'xl-sriracha', emoji: '🌶', name: 'Соус шрирача', kcal: 73, p: 1.5, f: 0.8, c: 15, fib: 0.8, sug: 11, defaultGrams: 15, tags: ['lunch', 'dinner'] },
  { id: 'xl-cheese-sauce', emoji: '🧀', name: 'Соус сырный', kcal: 202, p: 4, f: 18, c: 6, fib: 0.1, sug: 4, defaultGrams: 30, tags: ['lunch', 'dinner'] },
  // ---------- Напитки (в т.ч. алкоголь — калории из этанола) ----------
  { id: 'xl-green-tea', emoji: '🍵', name: 'Чай зелёный', kcal: 1, p: 0, f: 0, c: 0.25, fib: 0, sug: 0, defaultGrams: 200, tags: ['breakfast', 'snack'] },
  { id: 'xl-espresso', emoji: '☕', name: 'Эспрессо', kcal: 2, p: 0.1, f: 0.1, c: 0.2, fib: 0, sug: 0.2, defaultGrams: 60, tags: ['breakfast', 'snack'] },
  { id: 'xl-americano-milk', emoji: '☕', name: 'Американо с молоком', kcal: 25, p: 1.5, f: 1, c: 2.5, fib: 0, sug: 2.5, defaultGrams: 200, tags: ['breakfast', 'snack'] },
  { id: 'xl-coffee-3in1', emoji: '☕', name: 'Кофе 3 в 1', kcal: 70, p: 1, f: 2, c: 12, fib: 0, sug: 11, defaultGrams: 200, tags: ['breakfast', 'snack'] },
  { id: 'xl-raf', emoji: '☕', name: 'Раф на сливках', kcal: 82, p: 3, f: 4, c: 8.5, fib: 0, sug: 8.5, defaultGrams: 250, tags: ['breakfast', 'snack'] },
  { id: 'xl-hot-chocolate', emoji: '🍫', name: 'Горячий шоколад', kcal: 116, p: 3, f: 3.5, c: 18, fib: 0.5, sug: 14, defaultGrams: 200, tags: ['snack'] },
  { id: 'xl-lemonade', emoji: '🥤', name: 'Лимонад', kcal: 46, p: 0, f: 0, c: 11.5, fib: 0, sug: 11.5, defaultGrams: 330, tags: ['snack'] },
  { id: 'xl-kombucha', emoji: '🥤', name: 'Комбуча', kcal: 18, p: 0.1, f: 0, c: 4.5, fib: 0, sug: 4.5, defaultGrams: 250, tags: ['snack'] },
  { id: 'xl-kissel', emoji: '🥤', name: 'Кисель', kcal: 56, p: 0.1, f: 0, c: 14, fib: 0.1, sug: 12, defaultGrams: 200, tags: ['snack'] },
  { id: 'xl-multifruit-juice', emoji: '🧃', name: 'Мультифруктовый сок', kcal: 44, p: 0.3, f: 0.1, c: 10.5, fib: 0.2, sug: 10, defaultGrams: 250, tags: ['breakfast', 'snack'] },
  { id: 'xl-green-smoothie', emoji: '🥤', name: 'Смузи зелёный', kcal: 51, p: 1.5, f: 1, c: 9, fib: 1.5, sug: 7, defaultGrams: 250, tags: ['breakfast', 'snack'] },
  { id: 'xl-milkshake', emoji: '🥤', name: 'Молочный коктейль', kcal: 109, p: 3.5, f: 3, c: 17, fib: 0.3, sug: 15, defaultGrams: 300, tags: ['snack'] },
  // У алкоголя калории этанола (7 ккал/г) учитывает поле alc —
  // г спирта на 100 г: обычная формула 4/9/4 по БЖУ их не покрывает
  { id: 'xl-cider', emoji: '🍺', name: 'Сидр', kcal: 49, p: 0.2, f: 0, c: 6, fib: 0, sug: 6, alc: 3.5, defaultGrams: 330, tags: ['dinner', 'snack'] },
  { id: 'xl-champagne-brut', emoji: '🥂', name: 'Шампанское брют', kcal: 82, p: 0.1, f: 0, c: 2, fib: 0, sug: 2, alc: 10.5, defaultGrams: 150, tags: ['dinner', 'snack'] },
  { id: 'xl-red-wine-semisweet', emoji: '🍷', name: 'Вино красное полусладкое', kcal: 95, p: 0.1, f: 0, c: 4.5, fib: 0, sug: 4.5, alc: 10.9, defaultGrams: 150, tags: ['dinner', 'snack'] },
  { id: 'xl-whisky', emoji: '🥃', name: 'Виски 40%', kcal: 250, p: 0, f: 0, c: 0.1, fib: 0, sug: 0, alc: 35.7, defaultGrams: 40, tags: ['snack'] },
  { id: 'xl-cognac', emoji: '🥃', name: 'Коньяк 40%', kcal: 239, p: 0, f: 0, c: 0.1, fib: 0, sug: 0, alc: 34.1, defaultGrams: 40, tags: ['snack'] },
  { id: 'xl-liqueur', emoji: '🥃', name: 'Ликёр', kcal: 270, p: 0, f: 0, c: 40, fib: 0, sug: 38, alc: 15.7, defaultGrams: 40, tags: ['snack'] },
  // ---------- Консервы и заготовки ----------
  { id: 'xl-beans-tomato', emoji: '🥫', name: 'Фасоль в томатном соусе', kcal: 100, p: 5.5, f: 1.5, c: 16, fib: 4, sug: 7, defaultGrams: 150, tags: ['lunch', 'dinner'] },
  { id: 'xl-canned-pineapple', emoji: '🍍', name: 'Ананасы консервированные (в соку)', kcal: 59, p: 0.4, f: 0.1, c: 14, fib: 1, sug: 12, defaultGrams: 100, tags: ['lunch', 'snack'] },
  { id: 'xl-tushonka', emoji: '🥫', name: 'Тушёнка говяжья', kcal: 229, p: 19, f: 17, c: 0, fib: 0, sug: 0, defaultGrams: 100, tags: ['lunch', 'dinner'] },
  // ---------- Веган и ЗОЖ ----------
  { id: 'xl-tempeh', emoji: '🍥', name: 'Темпе', kcal: 189, p: 19, f: 9, c: 8, fib: 1.5, sug: 1, defaultGrams: 100, tags: ['lunch', 'dinner'] },
  { id: 'xl-falafel', emoji: '🧆', name: 'Фалафель', kcal: 290, p: 11.5, f: 18, c: 20.5, fib: 4.5, sug: 1.5, defaultGrams: 120, tags: ['lunch', 'dinner', 'snack'] },
  { id: 'xl-hummus-classic', emoji: '🫘', name: 'Хумус классический', kcal: 178, p: 8, f: 10, c: 14, fib: 4.5, sug: 1, defaultGrams: 60, tags: ['lunch', 'dinner', 'snack'] },
  { id: 'xl-chia', emoji: '🌱', name: 'Семена чиа', kcal: 509, p: 16.5, f: 31, c: 41, fib: 30, sug: 2, defaultGrams: 15, tags: ['breakfast', 'snack'] },
  { id: 'xl-flax-seeds', emoji: '🌱', name: 'Семена льна', kcal: 544, p: 18, f: 40, c: 28, fib: 25, sug: 2, defaultGrams: 15, tags: ['breakfast', 'snack'] },
  { id: 'xl-sesame', emoji: '🌱', name: 'Кунжут', kcal: 574, p: 19, f: 50, c: 12, fib: 9, sug: 0.5, defaultGrams: 15, tags: ['breakfast', 'snack'] },
  { id: 'xl-pumpkin-seeds', emoji: '🎃', name: 'Тыквенные семечки', kcal: 554, p: 24, f: 46, c: 11, fib: 6, sug: 1.5, defaultGrams: 30, tags: ['snack'] },
  { id: 'xl-sunflower-seeds', emoji: '🌻', name: 'Семечки подсолнуха', kcal: 591, p: 21, f: 51, c: 12, fib: 7, sug: 2.5, defaultGrams: 30, tags: ['snack'] },
  { id: 'xl-guacamole', emoji: '🥑', name: 'Гуакамоле', kcal: 140, p: 1.5, f: 12, c: 6.5, fib: 4.5, sug: 1.5, defaultGrams: 60, tags: ['lunch', 'snack'] },
  { id: 'xl-cashew', emoji: '🥜', name: 'Кешью', kcal: 556, p: 18, f: 44, c: 22, fib: 3, sug: 6, defaultGrams: 30, tags: ['snack'] },
  { id: 'xl-hazelnut', emoji: '🌰', name: 'Фундук', kcal: 649, p: 15, f: 61, c: 10, fib: 6, sug: 4, defaultGrams: 30, tags: ['snack'] },
  { id: 'xl-pine-nuts', emoji: '🥜', name: 'Кедровые орехи', kcal: 648, p: 14, f: 60, c: 13, fib: 3.5, sug: 3.5, defaultGrams: 25, tags: ['snack'] },
]

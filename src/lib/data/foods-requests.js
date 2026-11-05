// Третье расширение базы: продукты по запросам пользователей — молочка
// разной жирности, кофе с молоком и сахаром, сахар, жареное яйцо, лаваш
// армянский, лазанья, пловы, домашние пироги и торты, зелень, томаты,
// маринованные и квашеные овощи. Калорийность и БЖУ на 100 г / 100 мл.
// p/f/c — белки, жиры, углеводы в граммах; fib/sug — клетчатка/сахар.

export const REQUESTED_FOODS = [
  // ---------- Молоко разной жирности ----------
  { id: 'milk-05', emoji: '🥛', name: 'Молоко 0.5%', kcal: 35, p: 2.8, f: 0.5, c: 4.7, fib: 0.0, sug: 4.7, defaultGrams: 250, tags: ['breakfast', 'snack'] },
  { id: 'milk-1', emoji: '🥛', name: 'Молоко 1%', kcal: 42, p: 2.9, f: 1.0, c: 4.7, fib: 0.0, sug: 4.7, defaultGrams: 250, tags: ['breakfast', 'snack'] },
  { id: 'milk-15', emoji: '🥛', name: 'Молоко 1.5%', kcal: 44, p: 2.9, f: 1.5, c: 4.7, fib: 0.0, sug: 4.7, defaultGrams: 250, tags: ['breakfast', 'snack'] },
  { id: 'milk-32', emoji: '🥛', name: 'Молоко 3.2%', kcal: 59, p: 2.9, f: 3.2, c: 4.7, fib: 0.0, sug: 4.7, defaultGrams: 250, tags: ['breakfast', 'snack'] },
  { id: 'milk-35', emoji: '🥛', name: 'Молоко 3.5%', kcal: 62, p: 2.9, f: 3.5, c: 4.7, fib: 0.0, sug: 4.7, defaultGrams: 250, tags: ['breakfast', 'snack'] },
  { id: 'milk-baked', emoji: '🥛', name: 'Молоко топлёное 4%', kcal: 68, p: 3.0, f: 4.0, c: 4.7, fib: 0.0, sug: 4.7, defaultGrams: 250, tags: ['breakfast', 'snack'] },

  // ---------- Напитки и прочее ----------
  { id: 'coffee-milk-sugar', emoji: '☕', name: 'Кофе с молоком и сахаром', kcal: 46, p: 1.4, f: 1.3, c: 7.3, fib: 0.0, sug: 6.5, defaultGrams: 200, tags: ['breakfast', 'snack'] },
  { id: 'sugar', emoji: '🥄', name: 'Сахар-песок', kcal: 387, p: 0.0, f: 0.0, c: 99.8, fib: 0.0, sug: 99.8, defaultGrams: 10, tags: ['breakfast', 'snack'] },
  { id: 'fried-egg', emoji: '🍳', name: 'Яйцо жареное', kcal: 184, p: 13.6, f: 14.0, c: 0.8, fib: 0.0, sug: 0.3, defaultGrams: 60, tags: ['breakfast'] },

  // ---------- Хлеб и горячее ----------
  { id: 'lavash-arm', emoji: '🫓', name: 'Лаваш армянский', kcal: 260, p: 8.1, f: 0.9, c: 55, fib: 2.2, sug: 1.0, defaultGrams: 80, tags: ['lunch', 'dinner'] },
  { id: 'lasagna', emoji: '🍝', name: 'Лазанья', kcal: 135, p: 6.5, f: 5.5, c: 15.5, fib: 1.2, sug: 2.0, defaultGrams: 250, tags: ['lunch', 'dinner'] },
  { id: 'pilaf-pork', emoji: '🍛', name: 'Плов со свининой', kcal: 225, p: 7.5, f: 11.5, c: 23.5, fib: 1.0, sug: 1.3, defaultGrams: 250, tags: ['lunch'] },
  { id: 'pilaf-lamb', emoji: '🍛', name: 'Плов с бараниной', kcal: 205, p: 8.5, f: 9.5, c: 22.0, fib: 1.0, sug: 1.3, defaultGrams: 250, tags: ['lunch'] },

  // ---------- Домашняя выпечка и торты ----------
  { id: 'pie-zebra', emoji: '🍰', name: 'Пирог Зебра', kcal: 290, p: 5.0, f: 12.0, c: 40.0, fib: 1.0, sug: 26.0, defaultGrams: 100, tags: ['snack'] },
  { id: 'mannik', emoji: '🍰', name: 'Манник', kcal: 240, p: 4.5, f: 8.0, c: 38.0, fib: 0.8, sug: 22.0, defaultGrams: 100, tags: ['snack', 'breakfast'] },
  { id: 'cake-honey', emoji: '🍰', name: 'Торт Медовик', kcal: 440, p: 5.5, f: 20.0, c: 58.0, fib: 1.0, sug: 45.0, defaultGrams: 100, tags: ['snack'] },
  { id: 'cake-milk-girl', emoji: '🍰', name: 'Торт Молочная девочка', kcal: 380, p: 6.0, f: 15.0, c: 54.0, fib: 0.9, sug: 40.0, defaultGrams: 100, tags: ['snack'] },
  { id: 'cake-velvet', emoji: '🍰', name: 'Торт Красный бархат', kcal: 380, p: 5.5, f: 17.0, c: 52.0, fib: 1.0, sug: 38.0, defaultGrams: 100, tags: ['snack'] },

  // ---------- Зелень ----------
  { id: 'green-onion', emoji: '🌿', name: 'Лук зелёный (перо)', kcal: 19, p: 1.3, f: 0.0, c: 3.2, fib: 1.7, sug: 1.6, defaultGrams: 15, tags: ['lunch', 'dinner', 'snack'] },
  { id: 'parsley', emoji: '🌿', name: 'Петрушка', kcal: 47, p: 3.7, f: 0.4, c: 7.6, fib: 2.1, sug: 0.9, defaultGrams: 10, tags: ['lunch', 'dinner', 'snack'] },
  { id: 'cilantro', emoji: '🌿', name: 'Кинза', kcal: 23, p: 1.9, f: 0.5, c: 3.7, fib: 2.8, sug: 0.9, defaultGrams: 10, tags: ['lunch', 'dinner', 'snack'] },

  // ---------- Томаты, маринады, капуста ----------
  { id: 'tomato-paste', emoji: '🥫', name: 'Томатная паста', kcal: 82, p: 4.3, f: 0.5, c: 15.5, fib: 1.9, sug: 9.0, defaultGrams: 20, tags: ['lunch', 'dinner'] },
  { id: 'tomato-juice', emoji: '🧃', name: 'Томатный сок', kcal: 18, p: 0.8, f: 0.1, c: 3.5, fib: 0.4, sug: 3.0, defaultGrams: 200, tags: ['lunch', 'snack'] },
  { id: 'pickled-cucumbers', emoji: '🥒', name: 'Огурцы маринованные', kcal: 12, p: 0.8, f: 0.1, c: 1.9, fib: 0.7, sug: 1.4, defaultGrams: 100, tags: ['lunch', 'dinner', 'snack'] },
  { id: 'cabbage-fresh', emoji: '🥬', name: 'Капуста свежая', kcal: 28, p: 1.8, f: 0.2, c: 5.4, fib: 2.5, sug: 3.2, defaultGrams: 150, tags: ['lunch', 'dinner', 'snack'] },
  { id: 'cabbage-stewed', emoji: '🥬', name: 'Капуста тушёная', kcal: 96, p: 2.2, f: 5.4, c: 9.5, fib: 2.0, sug: 4.5, defaultGrams: 200, tags: ['lunch', 'dinner'] },
  { id: 'cabbage-sauerkraut', emoji: '🥬', name: 'Капуста квашеная', kcal: 19, p: 1.8, f: 0.1, c: 4.4, fib: 2.7, sug: 2.5, defaultGrams: 150, tags: ['lunch', 'dinner', 'snack'] },
]

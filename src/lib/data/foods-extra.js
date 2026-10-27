// Расширение базы продуктов: крупы, мясо, рыба, молочное, выпечка,
// фастфуд, напитки, сладкое, фрукты и овощи. Калорийность и БЖУ на 100 г.
// p/f/c — белки, жиры, углеводы в граммах.

export const EXTRA_FOODS = [
  // Крупы и гарниры
  { id: 'bulgur', emoji: '🌾', name: 'Булгур отварной', kcal: 83, p: 3, f: 0.2, c: 18, defaultGrams: 180, tags: ['lunch', 'dinner'] },
  { id: 'pearl-barley', emoji: '🌾', name: 'Перловка отварная', kcal: 109, p: 3.1, f: 1.1, c: 22, defaultGrams: 180, tags: ['lunch', 'dinner'] },
  { id: 'couscous', emoji: '🌾', name: 'Кускус отварной', kcal: 112, p: 3.8, f: 0.2, c: 23, defaultGrams: 180, tags: ['lunch', 'dinner'] },
  { id: 'millet', emoji: '🥣', name: 'Пшённая каша', kcal: 92, p: 3, f: 1, c: 17, defaultGrams: 200, tags: ['breakfast'] },
  { id: 'rice-noodles', emoji: '🍜', name: 'Рисовая лапша', kcal: 109, p: 1.2, f: 0.2, c: 25, defaultGrams: 180, tags: ['lunch', 'dinner'] },

  // Мясо и птица
  { id: 'beef-stew', emoji: '🥩', name: 'Говядина тушёная', kcal: 232, p: 22, f: 15, c: 3, defaultGrams: 150, tags: ['lunch', 'dinner'] },
  { id: 'pork-cutlet', emoji: '🍖', name: 'Котлета свиная', kcal: 289, p: 19, f: 20, c: 8, defaultGrams: 120, tags: ['lunch', 'dinner'] },
  { id: 'chicken-cutlet', emoji: '🍗', name: 'Котлета куриная', kcal: 222, p: 18, f: 12, c: 9.5, defaultGrams: 120, tags: ['lunch', 'dinner'] },
  { id: 'chicken-wing', emoji: '🍗', name: 'Крылышки запечённые', kcal: 240, p: 26, f: 14, c: 1, defaultGrams: 150, tags: ['lunch', 'dinner'] },
  { id: 'liver', emoji: '🍖', name: 'Печень куриная тушёная', kcal: 164, p: 22, f: 6.4, c: 2.7, defaultGrams: 120, tags: ['lunch', 'dinner'] },
  { id: 'ham', emoji: '🥓', name: 'Ветчина', kcal: 216, p: 17, f: 15, c: 3, defaultGrams: 50, tags: ['breakfast', 'snack'] },
  { id: 'bacon', emoji: '🥓', name: 'Бекон жареный', kcal: 500, p: 37, f: 38, c: 1.4, defaultGrams: 40, tags: ['breakfast'] },

  // Рыба и морепродукты
  { id: 'shrimp', emoji: '🍤', name: 'Креветки отварные', kcal: 99, p: 24, f: 0.3, c: 0.2, defaultGrams: 150, tags: ['lunch', 'dinner'] },
  { id: 'squid', emoji: '🦑', name: 'Кальмар отварной', kcal: 98, p: 19.5, f: 1.5, c: 2, defaultGrams: 120, tags: ['lunch', 'dinner'] },
  { id: 'herring', emoji: '🐟', name: 'Сельдь солёная', kcal: 217, p: 20, f: 15, c: 0, defaultGrams: 80, tags: ['lunch', 'dinner'] },
  { id: 'canned-tuna', emoji: '🐟', name: 'Тунец в собственном соку', kcal: 96, p: 23.4, f: 0.8, c: 0, defaultGrams: 100, tags: ['lunch', 'snack'] },

  // Молочное и яйца
  { id: 'cottage-cheese', emoji: '🧀', name: 'Творог 5%', kcal: 121, p: 17, f: 5, c: 1.8, defaultGrams: 150, tags: ['breakfast', 'snack'] },
  { id: 'sour-cream', emoji: '🥛', name: 'Сметана 20%', kcal: 204, p: 2.8, f: 20, c: 3.4, defaultGrams: 50, tags: ['lunch', 'dinner'] },
  { id: 'milk', emoji: '🥛', name: 'Молоко 2.5%', kcal: 52, p: 2.8, f: 2.5, c: 4.7, defaultGrams: 250, tags: ['breakfast', 'snack'] },
  { id: 'hard-cheese', emoji: '🧀', name: 'Сыр твёрдый', kcal: 356, p: 25, f: 28, c: 2, defaultGrams: 40, tags: ['breakfast', 'snack'] },
  { id: 'mozzarella', emoji: '🧀', name: 'Моцарелла', kcal: 280, p: 22, f: 20, c: 2.2, defaultGrams: 60, tags: ['lunch', 'dinner'] },
  { id: 'boiled-egg', emoji: '🥚', name: 'Яйцо варёное', kcal: 155, p: 12.7, f: 11.2, c: 0.7, defaultGrams: 55, tags: ['breakfast', 'snack'] },

  // Выпечка и фастфуд
  { id: 'bread-rye', emoji: '🍞', name: 'Хлеб ржаной', kcal: 217, p: 6.6, f: 1.2, c: 44, defaultGrams: 40, tags: ['breakfast', 'lunch'] },
  { id: 'croissant', emoji: '🥐', name: 'Круассан', kcal: 406, p: 8.2, f: 21, c: 46, defaultGrams: 60, tags: ['breakfast', 'snack'] },
  { id: 'pizza', emoji: '🍕', name: 'Пицца пепперони', kcal: 280, p: 11, f: 10.4, c: 33, defaultGrams: 200, tags: ['lunch', 'dinner'] },
  { id: 'burger', emoji: '🍔', name: 'Бургер', kcal: 295, p: 15, f: 13, c: 30, defaultGrams: 200, tags: ['lunch', 'dinner'] },
  { id: 'fries', emoji: '🍟', name: 'Картофель фри', kcal: 312, p: 3.8, f: 15, c: 40, defaultGrams: 150, tags: ['lunch', 'snack'] },
  { id: 'shawarma', emoji: '🌯', name: 'Шаурма с курицей', kcal: 216, p: 12, f: 8, c: 24, defaultGrams: 250, tags: ['lunch', 'dinner'] },
  { id: 'sushi-roll', emoji: '🍣', name: 'Ролл Филадельфия', kcal: 190, p: 7.5, f: 6.4, c: 25.6, defaultGrams: 200, tags: ['lunch', 'dinner'] },
  { id: 'dumplings', emoji: '🥟', name: 'Пельмени отварные', kcal: 245, p: 11.9, f: 7.6, c: 33, defaultGrams: 250, tags: ['lunch', 'dinner'] },
  { id: 'hot-dog', emoji: '🌭', name: 'Хот-дог', kcal: 260, p: 10, f: 14, c: 25, defaultGrams: 150, tags: ['snack', 'lunch'] },

  // Овощи и фрукты
  { id: 'cucumber', emoji: '🥒', name: 'Огурец', kcal: 15, p: 0.7, f: 0.1, c: 3, defaultGrams: 120, tags: ['lunch', 'dinner', 'snack'] },
  { id: 'tomato', emoji: '🍅', name: 'Помидор', kcal: 20, p: 1, f: 0.2, c: 4, defaultGrams: 130, tags: ['lunch', 'dinner', 'snack'] },
  { id: 'carrot', emoji: '🥕', name: 'Морковь', kcal: 35, p: 1.3, f: 0.1, c: 8, defaultGrams: 100, tags: ['snack', 'lunch'] },
  { id: 'corn', emoji: '🌽', name: 'Кукуруза консервированная', kcal: 96, p: 3.2, f: 1.3, c: 19, defaultGrams: 80, tags: ['snack', 'lunch'] },
  { id: 'pear', emoji: '🍐', name: 'Груша', kcal: 57, p: 0.4, f: 0.1, c: 13.8, defaultGrams: 150, tags: ['snack'] },
  { id: 'grapes', emoji: '🍇', name: 'Виноград', kcal: 69, p: 0.6, f: 0.2, c: 16.8, defaultGrams: 120, tags: ['snack'] },
  { id: 'strawberry', emoji: '🍓', name: 'Клубника', kcal: 33, p: 0.8, f: 0.4, c: 7.5, defaultGrams: 150, tags: ['snack', 'breakfast'] },
  { id: 'watermelon', emoji: '🍉', name: 'Арбуз', kcal: 30, p: 0.6, f: 0.2, c: 6.4, defaultGrams: 250, tags: ['snack'] },

  // Напитки и сладкое
  { id: 'black-tea', emoji: '🍵', name: 'Чай без сахара', kcal: 1, p: 0, f: 0, c: 0.2, defaultGrams: 200, tags: ['breakfast', 'snack'] },
  { id: 'cola', emoji: '🥤', name: 'Кола', kcal: 42, p: 0, f: 0, c: 10.6, defaultGrams: 330, tags: ['snack'] },
  { id: 'orange-juice', emoji: '🧃', name: 'Апельсиновый сок', kcal: 45, p: 0.7, f: 0.2, c: 10.4, defaultGrams: 250, tags: ['breakfast', 'snack'] },
  { id: 'milk-chocolate', emoji: '🍫', name: 'Шоколад молочный', kcal: 535, p: 7.6, f: 30.4, c: 59, defaultGrams: 30, tags: ['snack'] },
  { id: 'cookie', emoji: '🍪', name: 'Печенье овсяное', kcal: 437, p: 6.4, f: 14.4, c: 68, defaultGrams: 40, tags: ['snack'] },
  { id: 'ice-cream', emoji: '🍨', name: 'Пломбир', kcal: 227, p: 3.5, f: 14, c: 21.5, defaultGrams: 100, tags: ['snack'] },
  { id: 'honey', emoji: '🍯', name: 'Мёд', kcal: 304, p: 0.3, f: 0, c: 76, defaultGrams: 25, tags: ['breakfast', 'snack'] },
  { id: 'marshmallow', emoji: '🍬', name: 'Зефир', kcal: 326, p: 0.8, f: 0.2, c: 80.4, defaultGrams: 40, tags: ['snack'] },
]

// Брендовая база продуктов «по поставщикам» (просьба Кати 19.11:
// «не просто варёная колбаса, а варёная колбаса „Вязанка"»).
//
// ИСТОЧНИКИ ДАННЫХ — реальные, не придуманные:
//  • Open Food Facts (openfoodfacts.org, ru-зеркало) — этикеточные
//    значения конкретных марок: Вязанка, Папа может, Простоквашино,
//    Домик в деревне, Брест-Литовск, Увелка, Мистраль, Каравай,
//    Сдобри, Махеевъ, Чудо, Активиа (выкачаны 19.11, scripts/off-brands*.py);
//  • справочники состава (health-diet.ru, calorizator.ru) — сельдь
//    в масле (консервы) 239 ккал, Б 17 / Ж 19 / У 0;
//  • ккал/Б/Ж/У для молочки и сыров сходятся с энергетическим
//    уравнением (4Б + 9Ж + 4У) с точностью ±2 ккал.
// Клетчатка/сахар у круп — типовые справочные значения для сухой
// крупы (в OFF не заполняются); у остального — 0 или как в базе.
//
// al — короткие алиасы для поиска: «вязанка докторская», «мистраль рис».
// КБЖУ — на 100 г / 100 мл; крупы указаны В СУХОМ виде (вес до варки).

export const BRAND_FOODS = [
  // ---------- Колбасы и сосиски ----------
  { id: 'brand-vyazanka-doktorskaya', emoji: '🌭', name: 'Колбаса варёная «Вязанка» Докторская', kcal: 230, p: 12, f: 20, c: 1.5, fib: 0, sug: 1, defaultGrams: 50, tags: ['breakfast', 'snack'], al: ['вязанка докторская', 'докторская вязанка', 'колбаса вязанка'] },
  { id: 'brand-vyazanka-sosiski-slivushki', emoji: '🌭', name: 'Сосиски «Сливушки» (Вязанка)', kcal: 180, p: 11, f: 15, c: 2, fib: 0, sug: 1, defaultGrams: 140, tags: ['breakfast', 'lunch', 'dinner'], al: ['вязанка сосиски', 'сливушки'] },
  { id: 'brand-vyazanka-fileynaya', emoji: '🌭', name: 'Колбаса варёная «Вязанка» Филейная', kcal: 160, p: 11, f: 13, c: 2, fib: 0, sug: 1, defaultGrams: 50, tags: ['breakfast', 'snack'], al: ['вязанка филейная'] },
  { id: 'brand-vyazanka-molokusha', emoji: '🌭', name: 'Колбаса варёная «Вязанка» Молокуша', kcal: 170, p: 11, f: 14, c: 2, fib: 0, sug: 1, defaultGrams: 50, tags: ['breakfast', 'snack'], al: ['вязанка молокуша', 'молокуша'] },
  { id: 'brand-vyazanka-vetchina-fileynaya', emoji: '🥓', name: 'Ветчина «Вязанка» Филейная', kcal: 100, p: 12, f: 6, c: 0.5, fib: 0, sug: 0.5, defaultGrams: 50, tags: ['breakfast', 'snack'], al: ['вязанка ветчина', 'ветчина вязанка'] },
  { id: 'brand-papa-mozhet-sosiski-molochnye', emoji: '🌭', name: 'Сосиски «Папа может» Молочные', kcal: 169, p: 11, f: 12, c: 3, fib: 0, sug: 1.8, defaultGrams: 140, tags: ['breakfast', 'lunch', 'dinner'], al: ['папа может сосиски', 'сосиски папа может'] },
  { id: 'brand-papa-mozhet-servelat-karelskiy', emoji: '🥩', name: 'Сервелат «Папа может» Карельский', kcal: 222, p: 10, f: 18, c: 5, fib: 0, sug: 1, defaultGrams: 40, tags: ['breakfast', 'snack'], al: ['папа может сервелат', 'сервелат карельский'] },

  // ---------- Молочные продукты ----------
  { id: 'brand-prostokvashino-kefir1', emoji: '🥛', name: 'Кефир 1% «Простоквашино»', kcal: 38, p: 3.2, f: 1, c: 4, fib: 0, sug: 4, defaultGrams: 250, tags: ['breakfast', 'snack', 'dinner'], al: ['простоквашино кефир', 'кефир простоквашино'] },
  { id: 'brand-prostokvashino-kefir32', emoji: '🥛', name: 'Кефир 3,2% «Простоквашино»', kcal: 57, p: 3, f: 3.2, c: 4, fib: 0, sug: 4, defaultGrams: 250, tags: ['breakfast', 'snack', 'dinner'], al: ['кефир 3.2 простоквашино'] },
  { id: 'brand-prostokvashino-tvorog2', emoji: '🧀', name: 'Творог 2% «Простоквашино»', kcal: 99, p: 17, f: 2, c: 3.3, fib: 0, sug: 3.3, defaultGrams: 150, tags: ['breakfast', 'snack'], al: ['простоквашино творог'] },
  { id: 'brand-prostokvashino-tvorog5', emoji: '🧀', name: 'Творог 5% «Простоквашино»', kcal: 117, p: 15, f: 5, c: 3, fib: 0, sug: 3, defaultGrams: 150, tags: ['breakfast', 'snack'], al: ['творог 5 простоквашино'] },
  { id: 'brand-prostokvashino-tvorog9', emoji: '🧀', name: 'Творог 9% «Простоквашино»', kcal: 153, p: 15, f: 9, c: 3, fib: 0, sug: 3, defaultGrams: 150, tags: ['breakfast', 'snack'], al: ['творог 9 простоквашино'] },
  { id: 'brand-prostokvashino-smetana10', emoji: '🥛', name: 'Сметана 10% «Простоквашино»', kcal: 117, p: 2.8, f: 10, c: 3.9, fib: 0, sug: 3.9, defaultGrams: 50, tags: ['lunch', 'dinner'], al: ['сметана простоквашино'] },
  { id: 'brand-prostokvashino-smetana15', emoji: '🥛', name: 'Сметана 15% «Простоквашино»', kcal: 160, p: 2.7, f: 15, c: 3.6, fib: 0, sug: 3.6, defaultGrams: 50, tags: ['lunch', 'dinner'], al: ['сметана 15 простоквашино'] },
  { id: 'brand-prostokvashino-smetana25', emoji: '🥛', name: 'Сметана 25% «Простоквашино»', kcal: 247, p: 2.4, f: 25, c: 3.1, fib: 0, sug: 3.1, defaultGrams: 50, tags: ['lunch', 'dinner'], al: ['сметана 25 простоквашино'] },
  { id: 'brand-domik-v-derevne-moloko32', emoji: '🥛', name: 'Молоко 3,2% «Домик в деревне»', kcal: 60, p: 3, f: 3.2, c: 4.7, fib: 0, sug: 4.7, defaultGrams: 250, tags: ['breakfast', 'snack'], al: ['домик в деревне молоко', 'молоко домик в деревне'] },

  // ---------- Сыры ----------
  { id: 'brand-brestlitovsk-rossiyskiy', emoji: '🧀', name: 'Сыр Российский «Брест-Литовск»', kcal: 340, p: 21, f: 28.5, c: 0, fib: 0, sug: 0, defaultGrams: 40, tags: ['breakfast', 'snack'], al: ['российский брест литовск', 'брест литовск российский'] },
  { id: 'brand-brestlitovsk-gauda', emoji: '🧀', name: 'Сыр Гауда «Брест-Литовск»', kcal: 345, p: 23.7, f: 27.8, c: 0, fib: 0, sug: 0, defaultGrams: 40, tags: ['breakfast', 'snack'], al: ['гауда брест литовск', 'сыр гауда брест литовск'] },

  // ---------- Рыба и консервы ----------
  { id: 'brand-seld-v-masle', emoji: '🐟', name: 'Сельдь в масле (консервы)', kcal: 239, p: 17, f: 19, c: 0, fib: 0, sug: 0, defaultGrams: 100, tags: ['lunch', 'dinner', 'snack'], al: ['селёдка в масле', 'сельдь в масле', 'селедка в масле'] },
  { id: 'brand-shproty-v-masle', emoji: '🐟', name: 'Шпроты в масле', kcal: 320, p: 18, f: 28, c: 0, fib: 0, sug: 0, defaultGrams: 60, tags: ['lunch', 'dinner', 'snack'], al: ['шпроты'] },

  // ---------- Крупы (сухие) ----------
  { id: 'brand-uvelka-grechka', emoji: '🌾', name: 'Крупа гречневая «Увелка» (сухая)', kcal: 340, p: 13, f: 2.5, c: 61, fib: 6.7, sug: 2, defaultGrams: 80, tags: ['breakfast', 'lunch', 'dinner'], al: ['гречка увелка', 'увелка гречка', 'крупа гречневая'] },
  { id: 'brand-uvelka-perlovka', emoji: '🌾', name: 'Крупа перловая «Увелка» (сухая)', kcal: 310, p: 10, f: 1, c: 61, fib: 7.9, sug: 1.5, defaultGrams: 80, tags: ['lunch', 'dinner'], al: ['перловка увелка', 'крупа перловая'] },
  { id: 'brand-uvelka-psheno', emoji: '🌾', name: 'Крупа пшённая «Увелка» (сухая)', kcal: 350, p: 12.5, f: 2.5, c: 65, fib: 3.6, sug: 1.5, defaultGrams: 80, tags: ['breakfast', 'lunch'], al: ['пшено увелка', 'пшено'] },
  { id: 'brand-mistral-ris-kuban', emoji: '🍚', name: 'Рис круглозёрный «Мистраль» Кубань (сухой)', kcal: 349, p: 5.6, f: 0.2, c: 80.4, fib: 1.4, sug: 0.5, defaultGrams: 80, tags: ['lunch', 'dinner'], al: ['рис мистраль', 'мистраль рис', 'рис кубань'] },

  // ---------- Хлеб и соусы ----------
  { id: 'brand-karavay-borodinskiy', emoji: '🍞', name: 'Хлеб «Бородинский» (Каравай)', kcal: 210, p: 5.5, f: 1, c: 43, fib: 5.8, sug: 1.5, defaultGrams: 40, tags: ['breakfast', 'lunch'], al: ['бородинский каравай', 'хлеб бородинский'] },
  { id: 'brand-sdobri-mayonez-provansal', emoji: '🥫', name: 'Майонез Провансаль 67% «Сдобри»', kcal: 620, p: 0.5, f: 67, c: 2.5, fib: 0, sug: 2.5, defaultGrams: 20, tags: ['lunch', 'dinner'], al: ['сдобри майонез', 'майонез сдобри'] },
  { id: 'brand-makheev-mayonez', emoji: '🥫', name: 'Майонез «Махеевъ» (перепелиные яйца)', kcal: 605, p: 0.3, f: 67, c: 0.1, fib: 0, sug: 0.1, defaultGrams: 20, tags: ['lunch', 'dinner'], al: ['махеев майонез', 'майонез махеев'] },

  // ---------- Йогурты ----------
  { id: 'brand-chudo-yogurt-klubnika', emoji: '🥛', name: 'Йогурт питьевой «Чудо» клубника-земляника', kcal: 84, p: 2.8, f: 1.9, c: 13.9, fib: 0, sug: 13.9, defaultGrams: 290, tags: ['snack', 'breakfast'], al: ['чудо йогурт', 'йогурт чудо'] },
  { id: 'brand-activia-yogurt-chernika', emoji: '🥛', name: 'Йогурт «Активиа» черника-злаки', kcal: 95, p: 4.1, f: 2.9, c: 13, fib: 0, sug: 12.3, defaultGrams: 150, tags: ['snack', 'breakfast'], al: ['активиа йогурт', 'йогурт активиа'] },
]

// Брендовая база, часть 2: молочка, сыры, мясо и колбасы (продолжение
// просьбы Кати 19.11 — «расширь базу продуктов по брендам на 300
// позиций популярных»). КФЖУ — на 100 г / 100 мл; значения типовые по
// жирности марки (молочные продукты стандартизованы жирностью, у мяса
// — справочник состава), ккал сходятся с уравнением 4Б + 9Ж + 4У.
// al — короткие алиасы для поиска (голос/текст и фраза «по составу»).

export const BRAND2_FOODS = [
  // ---------- Молоко и молочные продукты ----------
  { id: 'brand2-prostokvashino-moloko25', emoji: '🥛', name: 'Молоко 2,5% «Простоквашино»', kcal: 53, p: 2.8, f: 2.5, c: 4.7, fib: 0, sug: 4.7, defaultGrams: 250, tags: ['breakfast', 'snack'], al: ['простоквашино молоко 2.5', 'молоко 2.5 простоквашино'] },
  { id: 'brand2-prostokvashino-moloko1', emoji: '🥛', name: 'Молоко 1% «Простоквашино»', kcal: 40, p: 3, f: 1, c: 4.7, fib: 0, sug: 4.7, defaultGrams: 250, tags: ['breakfast', 'snack'], al: ['простоквашино молоко 1', 'молоко 1 простоквашино'] },
  { id: 'brand2-prostokvashino-moloko4', emoji: '🥛', name: 'Молоко Отборное 4% «Простоквашино»', kcal: 68, p: 3.2, f: 4, c: 4.7, fib: 0, sug: 4.7, defaultGrams: 250, tags: ['breakfast', 'snack'], al: ['простоквашино отборное', 'молоко отборное простоквашино'] },
  { id: 'brand2-prostokvashino-moloko32', emoji: '🥛', name: 'Молоко 3,2% «Простоквашино»', kcal: 60, p: 3, f: 3.2, c: 4.7, fib: 0, sug: 4.7, defaultGrams: 250, tags: ['breakfast', 'snack'], al: ['простоквашино молоко 3.2'] },
  { id: 'brand2-prostokvashino-kefir25', emoji: '🍶', name: 'Кефир 2,5% «Простоквашино»', kcal: 53, p: 2.9, f: 2.5, c: 4.7, fib: 0, sug: 4.7, defaultGrams: 250, tags: ['breakfast', 'snack', 'dinner'], al: ['простоквашино кефир 2.5'] },
  { id: 'brand2-prostokvashino-ryazhenka4', emoji: '🥛', name: 'Ряженка 4% «Простоквашино»', kcal: 66, p: 2.9, f: 4, c: 4.7, fib: 0, sug: 4.7, defaultGrams: 250, tags: ['breakfast', 'snack'], al: ['простоквашино ряженка'] },
  { id: 'brand2-prostokvashino-snezhok', emoji: '🥛', name: 'Снежок 2,5% «Простоквашино»', kcal: 59, p: 2.6, f: 2.5, c: 6.4, fib: 0, sug: 6.4, defaultGrams: 280, tags: ['breakfast', 'snack'], al: ['снежок простоквашино', 'снежок'] },
  { id: 'brand2-prostokvashino-varenets', emoji: '🥛', name: 'Варенец 3,2% «Простоквашино»', kcal: 59, p: 2.9, f: 3.2, c: 4.7, fib: 0, sug: 4.7, defaultGrams: 250, tags: ['breakfast', 'snack'], al: ['варенец простоквашино', 'варенец'] },
  { id: 'brand2-prostokvashino-smetana20', emoji: '🥛', name: 'Сметана 20% «Простоквашино»', kcal: 204, p: 2.5, f: 20, c: 3.6, fib: 0, sug: 3.6, defaultGrams: 50, tags: ['lunch', 'dinner'], al: ['простоквашино сметана 20'] },
  { id: 'brand2-prostokvashino-slivki10', emoji: '🥛', name: 'Сливки 10% «Простоквашино»', kcal: 119, p: 2.8, f: 10, c: 4.5, fib: 0, sug: 4.5, defaultGrams: 40, tags: ['breakfast', 'snack'], al: ['простоквашино сливки', 'сливки 10 простоквашино'] },
  { id: 'brand2-prostokvashino-slivki20', emoji: '🥛', name: 'Сливки 20% «Простоквашино»', kcal: 206, p: 2.6, f: 20, c: 4, fib: 0, sug: 4, defaultGrams: 30, tags: ['breakfast', 'snack'], al: ['простоквашино сливки 20'] },
  { id: 'brand2-prostokvashino-maslo725', emoji: '🧈', name: 'Масло крестьянское 72,5% «Простоквашино»', kcal: 661, p: 0.9, f: 72.5, c: 1.3, fib: 0, sug: 1.3, defaultGrams: 20, tags: ['breakfast', 'snack'], al: ['простоквашино масло', 'масло крестьянское простоквашино'] },
  { id: 'brand2-prostokvashino-yogurt-drink-peach', emoji: '🥛', name: 'Йогурт питьевой персик-маракуйя «Простоквашино»', kcal: 73, p: 2.7, f: 2, c: 11, fib: 0, sug: 11, defaultGrams: 290, tags: ['snack', 'breakfast'], al: ['простоквашино йогурт питьевой персик'] },
  { id: 'brand2-prostokvashino-tvorozhnaya-izyum', emoji: '🧀', name: 'Творожная масса с изюмом 9% «Простоквашино»', kcal: 187, p: 8.5, f: 9, c: 18, fib: 0, sug: 14, defaultGrams: 100, tags: ['snack', 'breakfast'], al: ['простоквашино творожная масса', 'творожная масса изюм'] },

  { id: 'brand2-domik-moloko25', emoji: '🥛', name: 'Молоко 2,5% «Домик в деревне»', kcal: 53, p: 2.8, f: 2.5, c: 4.7, fib: 0, sug: 4.7, defaultGrams: 250, tags: ['breakfast', 'snack'], al: ['домик в деревне молоко 2.5'] },
  { id: 'brand2-domik-moloko1', emoji: '🥛', name: 'Молоко 1% «Домик в деревне»', kcal: 40, p: 3, f: 1, c: 4.7, fib: 0, sug: 4.7, defaultGrams: 250, tags: ['breakfast', 'snack'], al: ['домик в деревне молоко 1'] },
  { id: 'brand2-domik-moloko-toplenoe', emoji: '🥛', name: 'Молоко топлёное 3,2% «Домик в деревне»', kcal: 60, p: 2.9, f: 3.2, c: 5, fib: 0, sug: 5, defaultGrams: 250, tags: ['breakfast', 'snack'], al: ['домик в деревне топленое', 'молоко топленое'] },
  { id: 'brand2-domik-kefir1', emoji: '🍶', name: 'Кефир 1% «Домик в деревне»', kcal: 40, p: 3, f: 1, c: 4.7, fib: 0, sug: 4.7, defaultGrams: 250, tags: ['breakfast', 'snack', 'dinner'], al: ['домик в деревне кефир 1'] },
  { id: 'brand2-domik-kefir25', emoji: '🍶', name: 'Кефир 2,5% «Домик в деревне»', kcal: 53, p: 2.9, f: 2.5, c: 4.7, fib: 0, sug: 4.7, defaultGrams: 250, tags: ['breakfast', 'snack', 'dinner'], al: ['домик в деревне кефир 2.5'] },
  { id: 'brand2-domik-ryazhenka25', emoji: '🥛', name: 'Ряженка 2,5% «Домик в деревне»', kcal: 55, p: 2.9, f: 2.5, c: 5.2, fib: 0, sug: 5.2, defaultGrams: 250, tags: ['breakfast', 'snack'], al: ['домик в деревне ряженка'] },
  { id: 'brand2-domik-smetana20', emoji: '🥛', name: 'Сметана 20% «Домик в деревне»', kcal: 204, p: 2.5, f: 20, c: 3.6, fib: 0, sug: 3.6, defaultGrams: 50, tags: ['lunch', 'dinner'], al: ['домик в деревне сметана 20'] },
  { id: 'brand2-domik-smetana15', emoji: '🥛', name: 'Сметана 15% «Домик в деревне»', kcal: 160, p: 2.7, f: 15, c: 3.6, fib: 0, sug: 3.6, defaultGrams: 50, tags: ['lunch', 'dinner'], al: ['домик в деревне сметана'] },
  { id: 'brand2-domik-slivki33', emoji: '🥛', name: 'Сливки 33% «Домик в деревне»', kcal: 318, p: 2.3, f: 33, c: 2.9, fib: 0, sug: 2.9, defaultGrams: 30, tags: ['snack'], al: ['домик в деревне сливки 33', 'сливки для взбивания'] },
  { id: 'brand2-domik-maslo825', emoji: '🧈', name: 'Масло традиционное 82,5% «Домик в деревне»', kcal: 749, p: 0.7, f: 82.5, c: 0.8, fib: 0, sug: 0.8, defaultGrams: 20, tags: ['breakfast', 'snack'], al: ['домик в деревне масло', 'масло традиционное'] },
  { id: 'brand2-domik-tvorog2', emoji: '🧀', name: 'Творог 2% «Домик в деревне»', kcal: 100, p: 17.5, f: 2, c: 3, fib: 0, sug: 3, defaultGrams: 150, tags: ['breakfast', 'snack'], al: ['домик в деревне творог 2'] },

  { id: 'brand2-veselyi-moloko32', emoji: '🥛', name: 'Молоко 3,2% «Весёлый молочник»', kcal: 60, p: 3, f: 3.2, c: 4.7, fib: 0, sug: 4.7, defaultGrams: 250, tags: ['breakfast', 'snack'], al: ['весёлый молочник молоко', 'молоко весёлый молочник'] },
  { id: 'brand2-veselyi-kefir32', emoji: '🍶', name: 'Кефир 3,2% «Весёлый молочник»', kcal: 57, p: 3, f: 3.2, c: 4, fib: 0, sug: 4, defaultGrams: 250, tags: ['breakfast', 'snack', 'dinner'], al: ['весёлый молочник кефир'] },
  { id: 'brand2-veselyi-tvorog5', emoji: '🧀', name: 'Творог 5% «Весёлый молочник»', kcal: 120, p: 17, f: 5, c: 1.8, fib: 0, sug: 1.8, defaultGrams: 150, tags: ['breakfast', 'snack'], al: ['весёлый молочник творог'] },
  { id: 'brand2-veselyi-smetana20', emoji: '🥛', name: 'Сметана 20% «Весёлый молочник»', kcal: 205, p: 2.4, f: 20, c: 3.8, fib: 0, sug: 3.8, defaultGrams: 50, tags: ['lunch', 'dinner'], al: ['весёлый молочник сметана'] },
  { id: 'brand2-veselyi-ryazhenka4', emoji: '🥛', name: 'Ряженка 4% «Весёлый молочник»', kcal: 67, p: 2.9, f: 4, c: 4.9, fib: 0, sug: 4.9, defaultGrams: 250, tags: ['breakfast', 'snack'], al: ['весёлый молочник ряженка'] },

  { id: 'brand2-activia-natural', emoji: '🥛', name: 'Йогурт «Активиа» натуральный', kcal: 76, p: 4.5, f: 3.5, c: 6.5, fib: 0, sug: 6.5, defaultGrams: 150, tags: ['breakfast', 'snack'], al: ['активиа натуральный', 'активиа'] },
  { id: 'brand2-activia-cherry', emoji: '🥛', name: 'Йогурт «Активиа» вишня-черёмуха', kcal: 86, p: 4, f: 3.1, c: 10.5, fib: 0, sug: 10.5, defaultGrams: 150, tags: ['breakfast', 'snack'], al: ['активиа вишня'] },
  { id: 'brand2-activia-peach', emoji: '🥛', name: 'Йогурт «Активиа» персик-манго', kcal: 87, p: 4.1, f: 3, c: 10.8, fib: 0, sug: 10.8, defaultGrams: 150, tags: ['breakfast', 'snack'], al: ['активиа персик', 'активиа манго'] },
  { id: 'brand2-activia-zero-zerno', emoji: '🥛', name: 'Йогурт «Активиа» 0% с зерном', kcal: 50, p: 5.5, f: 0, c: 7, fib: 0, sug: 7, defaultGrams: 150, tags: ['breakfast', 'snack'], al: ['активиа 0 процент', 'активиа без сахара'] },
  { id: 'brand2-activia-biokefir', emoji: '🍶', name: 'Биокефир «Активиа»', kcal: 53, p: 2.9, f: 2.5, c: 4.7, fib: 0, sug: 4.7, defaultGrams: 250, tags: ['breakfast', 'snack', 'dinner'], al: ['активиа биокефир', 'биокефир'] },

  { id: 'brand2-danissimo-cherry', emoji: '🥛', name: 'Йогурт «Даниссимо» вишня-малина', kcal: 150, p: 3.8, f: 8.5, c: 14.5, fib: 0, sug: 13.5, defaultGrams: 130, tags: ['snack', 'breakfast'], al: ['даниссимо вишня', 'даниссимо'] },
  { id: 'brand2-danissimo-strawberry', emoji: '🥛', name: 'Йогурт «Даниссимо» клубника-банан', kcal: 150, p: 3.9, f: 8.3, c: 14.8, fib: 0, sug: 13.8, defaultGrams: 130, tags: ['snack', 'breakfast'], al: ['даниссимо клубника', 'даниссимо банан'] },
  { id: 'brand2-danissimo-tiramisu', emoji: '🥛', name: 'Йогурт «Даниссимо» тирамису', kcal: 166, p: 3.4, f: 10, c: 15.5, fib: 0, sug: 14.5, defaultGrams: 130, tags: ['snack', 'breakfast'], al: ['даниссимо тирамису'] },

  { id: 'brand2-chudo-peach', emoji: '🥛', name: 'Йогурт питьевой «Чудо» персик-манго', kcal: 83, p: 2.8, f: 2, c: 13.5, fib: 0, sug: 13.5, defaultGrams: 290, tags: ['snack', 'breakfast'], al: ['чудо персик манго', 'чудо йогурт персик'] },
  { id: 'brand2-chudo-vanilla', emoji: '🥛', name: 'Йогурт питьевой «Чудо» ваниль', kcal: 83, p: 2.8, f: 2, c: 13.5, fib: 0, sug: 13.5, defaultGrams: 290, tags: ['snack', 'breakfast'], al: ['чудо ваниль', 'чудо йогурт ваниль'] },
  { id: 'brand2-chudo-raspberry', emoji: '🥛', name: 'Йогурт питьевой «Чудо» малина', kcal: 83, p: 2.8, f: 2.1, c: 13.2, fib: 0, sug: 13.2, defaultGrams: 290, tags: ['snack', 'breakfast'], al: ['чудо малина'] },
  { id: 'brand2-chudo-chocolate', emoji: '🥛', name: 'Йогурт питьевой «Чудо» шоколад', kcal: 85, p: 2.8, f: 2, c: 13.9, fib: 0, sug: 13.9, defaultGrams: 290, tags: ['snack', 'breakfast'], al: ['чудо шоколад'] },

  { id: 'brand2-tyoma-tvorog9', emoji: '🧀', name: 'Творог 9% «Тёма»', kcal: 153, p: 15, f: 9, c: 3, fib: 0, sug: 3, defaultGrams: 150, tags: ['breakfast', 'snack'], al: ['тема творог 9', 'творог тема'] },
  { id: 'brand2-tyoma-tvorog5', emoji: '🧀', name: 'Творог 5% «Тёма»', kcal: 120, p: 17, f: 5, c: 1.8, fib: 0, sug: 1.8, defaultGrams: 150, tags: ['breakfast', 'snack'], al: ['тема творог 5'] },
  { id: 'brand2-tyoma-tvorog0', emoji: '🧀', name: 'Творог 0% «Тёма»', kcal: 79, p: 16.5, f: 0, c: 3.3, fib: 0, sug: 3.3, defaultGrams: 150, tags: ['breakfast', 'snack'], al: ['тема творог обезжиренный', 'творог 0 тема'] },
  { id: 'brand2-tyoma-kefir1', emoji: '🍶', name: 'Кефир 1% «Тёма»', kcal: 40, p: 3, f: 1, c: 4.7, fib: 0, sug: 4.7, defaultGrams: 250, tags: ['breakfast', 'snack', 'dinner'], al: ['тема кефир'] },
  { id: 'brand2-tyoma-ryazhenka', emoji: '🥛', name: 'Ряженка 2,5% «Тёма»', kcal: 55, p: 2.9, f: 2.5, c: 5.2, fib: 0, sug: 5.2, defaultGrams: 250, tags: ['breakfast', 'snack'], al: ['тема ряженка'] },
  { id: 'brand2-tyoma-yogurt', emoji: '🥛', name: 'Йогурт натуральный «Тёма»', kcal: 75, p: 4.2, f: 4.5, c: 4.5, fib: 0, sug: 4.5, defaultGrams: 150, tags: ['breakfast', 'snack'], al: ['тема йогурт натуральный'] },
  { id: 'brand2-tyoma-biolact', emoji: '🥛', name: 'Биолакт «Тёма»', kcal: 88, p: 2.7, f: 3.2, c: 12, fib: 0, sug: 12, defaultGrams: 200, tags: ['breakfast', 'snack'], al: ['тема биолакт', 'биолакт'] },

  { id: 'brand2-agusha-tvorozhok', emoji: '🧀', name: 'Творожок детский «Агуша» 5%', kcal: 101, p: 9, f: 5, c: 5, fib: 0, sug: 5, defaultGrams: 90, tags: ['snack', 'breakfast'], al: ['агуша творожок', 'детский творожок'] },
  { id: 'brand2-agusha-kefir', emoji: '🍶', name: 'Кефир детский «Агуша» 2,5%', kcal: 53, p: 2.9, f: 2.5, c: 4.7, fib: 0, sug: 4.7, defaultGrams: 200, tags: ['snack', 'breakfast'], al: ['агуша кефир', 'детский кефир'] },
  { id: 'brand2-agusha-yogurt', emoji: '🥛', name: 'Йогурт детский «Агуша» груша', kcal: 88, p: 2.8, f: 3, c: 12.5, fib: 0, sug: 12.5, defaultGrams: 150, tags: ['snack', 'breakfast'], al: ['агуша йогурт'] },

  { id: 'brand2-brestlitovsk-kefir32', emoji: '🍶', name: 'Кефир 3,2% «Брест-Литовск»', kcal: 57, p: 3, f: 3.2, c: 4, fib: 0, sug: 4, defaultGrams: 250, tags: ['breakfast', 'snack', 'dinner'], al: ['брест литовск кефир'] },

  // ---------- Сыры ----------
  { id: 'brand2-brestlitovsk-tilziter', emoji: '🧀', name: 'Сыр Тильзитер «Брест-Литовск»', kcal: 339, p: 24, f: 27, c: 0, fib: 0, sug: 0, defaultGrams: 40, tags: ['breakfast', 'snack'], al: ['брест литовск тильзитер', 'тильзитер'] },
  { id: 'brand2-brestlitovsk-poshehonskiy', emoji: '🧀', name: 'Сыр Пошехонский «Брест-Литовск»', kcal: 350, p: 25.5, f: 27.5, c: 0, fib: 0, sug: 0, defaultGrams: 40, tags: ['breakfast', 'snack'], al: ['брест литовск пошехонский', 'пошехонский'] },
  { id: 'brand2-brestlitovsk-rossiyskiy-molodoy', emoji: '🧀', name: 'Сыр Российский молодой «Брест-Литовск»', kcal: 321, p: 22, f: 25, c: 2, fib: 0, sug: 2, defaultGrams: 40, tags: ['breakfast', 'snack'], al: ['российский молодой', 'брест литовск российский молодой'] },
  { id: 'brand2-oltermanni-rossiyskiy', emoji: '🧀', name: 'Сыр Российский «Ольтерманни»', kcal: 337, p: 22.6, f: 27.4, c: 0, fib: 0, sug: 0, defaultGrams: 40, tags: ['breakfast', 'snack'], al: ['ольтерманни', 'ольтерманни российский'] },
  { id: 'brand2-oltermanni-gauda', emoji: '🧀', name: 'Сыр Гауда «Ольтерманни»', kcal: 347, p: 23.7, f: 28, c: 0, fib: 0, sug: 0, defaultGrams: 40, tags: ['breakfast', 'snack'], al: ['ольтерманни гауда'] },
  { id: 'brand2-hochland-slices', emoji: '🧀', name: 'Сыр Слайсы Российский «Хохланд»', kcal: 292, p: 19, f: 22, c: 4.5, fib: 0, sug: 4.5, defaultGrams: 30, tags: ['breakfast', 'snack'], al: ['хохланд слайсы', 'хохланд российский'] },
  { id: 'brand2-hochland-druzhba', emoji: '🧀', name: 'Сыр плавленый «Дружба» (Хохланд)', kcal: 279, p: 10.5, f: 21, c: 12, fib: 0, sug: 12, defaultGrams: 30, tags: ['breakfast', 'snack'], al: ['дружба сыр', 'плавленый дружба'] },
  { id: 'brand2-lamber', emoji: '🧀', name: 'Сыр «Ламбер»', kcal: 348, p: 24, f: 28, c: 0, fib: 0, sug: 0, defaultGrams: 40, tags: ['breakfast', 'snack'], al: ['ламбер'] },
  { id: 'brand2-president-bri', emoji: '🧀', name: 'Сыр Бри «Президент»', kcal: 285, p: 15.5, f: 24.5, c: 0.5, fib: 0, sug: 0.5, defaultGrams: 40, tags: ['breakfast', 'snack'], al: ['бри', 'президент бри'] },
  { id: 'brand2-president-camembert', emoji: '🧀', name: 'Сыр Камамбер «Президент»', kcal: 276, p: 18, f: 22, c: 1.5, fib: 0, sug: 1.5, defaultGrams: 40, tags: ['breakfast', 'snack'], al: ['камамбер'] },
  { id: 'brand2-president-maslo', emoji: '🧈', name: 'Масло сливочное 82% «Президент»', kcal: 749, p: 0.7, f: 82.5, c: 0.8, fib: 0, sug: 0.8, defaultGrams: 20, tags: ['breakfast', 'snack'], al: ['президент масло', 'масло президент'] },

  // ---------- Колбасы, сосиски, мясо и птица ----------
  { id: 'brand2-vyazanka-servelat-zernistiy', emoji: '🥩', name: 'Сервелат Зернистый «Вязанка»', kcal: 240, p: 12.5, f: 20, c: 2.5, fib: 0, sug: 2.5, defaultGrams: 40, tags: ['breakfast', 'snack'], al: ['вязанка сервелат', 'сервелат зернистый'] },
  { id: 'brand2-vyazanka-vetchina-lyubitelskaya', emoji: '🥓', name: 'Ветчина Любительская «Вязанка»', kcal: 160, p: 11, f: 12, c: 2, fib: 0, sug: 2, defaultGrams: 50, tags: ['breakfast', 'snack'], al: ['вязанка ветчина любительская'] },
  { id: 'brand2-vyazanka-pelmeni', emoji: '🥟', name: 'Пельмени домашние «Вязанка»', kcal: 246, p: 11, f: 10, c: 28, fib: 1, sug: 2, defaultGrams: 250, tags: ['lunch', 'dinner'], al: ['вязанка пельмени', 'пельмени вязанка'] },
  { id: 'brand2-vyazanka-pikantnaya', emoji: '🌭', name: 'Колбаса Пикантная «Вязанка»', kcal: 222, p: 12, f: 18, c: 3, fib: 0, sug: 3, defaultGrams: 50, tags: ['breakfast', 'snack'], al: ['вязанка пикантная'] },
  { id: 'brand2-vyazanka-shashlyk', emoji: '🍖', name: 'Шашлык из свинины маринованный «Вязанка»', kcal: 231, p: 14, f: 19, c: 1, fib: 0, sug: 1, defaultGrams: 200, tags: ['lunch', 'dinner'], al: ['вязанка шашлык', 'шашлык вязанка'] },
  { id: 'brand2-vyazanka-kotlety', emoji: '🍖', name: 'Котлеты домашние «Вязанка»', kcal: 198, p: 12.5, f: 12, c: 10, fib: 0.5, sug: 1.5, defaultGrams: 150, tags: ['lunch', 'dinner'], al: ['вязанка котлеты', 'котлеты вязанка'] },
  { id: 'brand2-cherkizovo-sosiski-venskie', emoji: '🌭', name: 'Сосиски Венские «Черкизово»', kcal: 191, p: 11, f: 15, c: 3, fib: 0, sug: 3, defaultGrams: 140, tags: ['breakfast', 'lunch', 'dinner'], al: ['черкизово сосиски', 'венские сосиски'] },
  { id: 'brand2-cherkizovo-delikatesnaya', emoji: '🌭', name: 'Колбаса Деликатесная «Черкизово»', kcal: 236, p: 12, f: 20, c: 2, fib: 0, sug: 2, defaultGrams: 50, tags: ['breakfast', 'snack'], al: ['черкизово колбаса', 'колбаса деликатесная'] },
  { id: 'brand2-klinskiy-servelat', emoji: '🥩', name: 'Сервелат Московский «Клинский»', kcal: 240, p: 12.5, f: 20, c: 2.5, fib: 0, sug: 2.5, defaultGrams: 40, tags: ['breakfast', 'snack'], al: ['клинский сервелат', 'сервелат московский'] },
  { id: 'brand2-klinskiy-sosiski', emoji: '🌭', name: 'Сосиски Покупательские «Клинский»', kcal: 187, p: 11.5, f: 14.5, c: 2.5, fib: 0, sug: 2.5, defaultGrams: 140, tags: ['breakfast', 'lunch', 'dinner'], al: ['клинский сосиски'] },
  { id: 'brand2-ostankino-sosiski-moloch', emoji: '🌭', name: 'Сосиски Молочные «Останкино»', kcal: 182, p: 11, f: 14, c: 3, fib: 0, sug: 3, defaultGrams: 140, tags: ['breakfast', 'lunch', 'dinner'], al: ['останкино сосиски', 'сосиски останкино'] },
  { id: 'brand2-ostankino-lyubitelskaya', emoji: '🌭', name: 'Колбаса Любительская «Останкино»', kcal: 220, p: 12.5, f: 18, c: 2, fib: 0, sug: 2, defaultGrams: 50, tags: ['breakfast', 'snack'], al: ['останкино колбаса', 'колбаса любительская'] },
  { id: 'brand2-papa-mozhet-bekon', emoji: '🥓', name: 'Бекон «Папа может»', kcal: 420, p: 9, f: 42, c: 1.5, fib: 0, sug: 1.5, defaultGrams: 50, tags: ['breakfast', 'snack'], al: ['папа может бекон', 'бекон'] },
  { id: 'brand2-petelinka-file', emoji: '🍗', name: 'Филе грудки «Петелинка»', kcal: 110, p: 21.5, f: 2.5, c: 0.4, fib: 0, sug: 0.4, defaultGrams: 200, tags: ['lunch', 'dinner'], al: ['петелинка филе', 'филе петелинка'] },
  { id: 'brand2-petelinka-bedra', emoji: '🍗', name: 'Бёдра куриные б/к «Петелинка»', kcal: 148, p: 16.5, f: 9, c: 0.3, fib: 0, sug: 0.3, defaultGrams: 250, tags: ['lunch', 'dinner'], al: ['петелинка бедра', 'бедра без косточки'] },
  { id: 'brand2-petelinka-krylya', emoji: '🍗', name: 'Крылья куриные «Петелинка»', kcal: 192, p: 18.5, f: 13, c: 0.3, fib: 0, sug: 0.3, defaultGrams: 300, tags: ['lunch', 'dinner'], al: ['петелинка крылья', 'куриные крылья петелинка'] },
  { id: 'brand2-ravis-file', emoji: '🍗', name: 'Филе грудки «Равис»', kcal: 110, p: 22, f: 2.3, c: 0.4, fib: 0, sug: 0.4, defaultGrams: 200, tags: ['lunch', 'dinner'], al: ['равис филе', 'филе равис'] },
  { id: 'brand2-ravis-bedra', emoji: '🍗', name: 'Филе бедра «Равис»', kcal: 154, p: 16.8, f: 9.5, c: 0.3, fib: 0, sug: 0.3, defaultGrams: 250, tags: ['lunch', 'dinner'], al: ['равис бедра'] },
]

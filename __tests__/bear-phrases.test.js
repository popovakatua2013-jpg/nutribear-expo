// Медвежьи пинки: тон по поведению, склонения, подстановка {meal}/{streak}
// и подсчёт серий записей/пропусков по журналу. Чистая логика — Node.

import {
  localDayKey,
  pluralRu,
  pickPhrase,
  pickTone,
  mealPokeMessage,
  mealStreaks,
  WATER_PHRASES,
  WEIGH_PHRASES,
  GONE_PHRASES,
  WORKOUT_PHRASES,
  waterPokeMessage,
  weighPokeMessage,
  gonePokeBody,
  workoutPokeBody,
} from '@/lib/bearPhrases'

const POOL0 = () => 0 // random-стаб: всегда первая фраза пула

describe('pluralRu', () => {
  test('1 день, 2 дня, 5 дней', () => {
    expect(pluralRu(1, ['день', 'дня', 'дней'])).toBe('1 день')
    expect(pluralRu(2, ['день', 'дня', 'дней'])).toBe('2 дня')
    expect(pluralRu(5, ['день', 'дня', 'дней'])).toBe('5 дней')
  })

  test('исключения: 11 дней, 21 день, 12 дней', () => {
    expect(pluralRu(11, ['день', 'дня', 'дней'])).toBe('11 дней')
    expect(pluralRu(21, ['день', 'дня', 'дней'])).toBe('21 день')
    expect(pluralRu(12, ['день', 'дня', 'дней'])).toBe('12 дней')
  })
})

describe('localDayKey', () => {
  test('формат ГГГГ-ММ-ДД с ведущими нулями', () => {
    const d = new Date(2026, 0, 5) // 5 января 2026
    expect(localDayKey(d)).toBe('2026-01-05')
  })

  test('совпадает с форматом dayKeyOf стора истории', () => {
    // день формируется локально, не UTC
    const d = new Date(2026, 10, 23)
    expect(localDayKey(d)).toBe('2026-11-23')
  })
})

describe('pickPhrase', () => {
  test('детерминизм: random=0 → первая фраза', () => {
    const pool = ['а', 'б', 'в']
    expect(pickPhrase(pool, POOL0)).toBe('а')
  })

  test('random≈1 → последняя фраза; пустой пул → пусто', () => {
    const pool = ['а', 'б', 'в']
    expect(pickPhrase(pool, () => 0.999)).toBe('в')
    expect(pickPhrase([], POOL0)).toBe('')
  })
})

describe('pickTone', () => {
  const base = { missedStreak: 0, goodStreak: 0 }

  test('стиль «мягко» перекрывает всё', () => {
    expect(pickTone({ ...base, missedStreak: 5, style: 'soft' })).toBe('soft')
    expect(pickTone({ ...base, goodStreak: 9, style: 'soft' })).toBe('soft')
  })

  test('приём записан сегодня — хвалим', () => {
    expect(pickTone({ ...base, loggedToday: true })).toBe('praise')
    expect(pickTone({ ...base, loggedToday: true, missedStreak: 4 })).toBe('praise')
  })

  test('2+ дня пропуска — настойчивый подкол', () => {
    expect(pickTone({ ...base, missedStreak: 2 })).toBe('firm')
    expect(pickTone({ ...base, missedStreak: 7 })).toBe('firm')
  })

  test('пропуск сегодня добавляется к серии: 1 день пропуска до вчера + пропуск сегодня = firm', () => {
    expect(pickTone({ ...base, missedStreak: 1 })).toBe('tease')
    expect(pickTone({ ...base, missedStreak: 1, missedToday: true })).toBe('firm')
    expect(pickTone({ ...base, missedToday: true })).toBe('tease')
  })

  test('серия 3+ дней — гордимся', () => {
    expect(pickTone({ ...base, goodStreak: 3 })).toBe('cheer')
    expect(pickTone({ ...base, goodStreak: 10 })).toBe('cheer')
    expect(pickTone({ ...base, goodStreak: 2 })).toBe('soft')
  })
})

describe('mealPokeMessage', () => {
  test('мягкий тон сохраняет прежние тексты и заголовки приёмов', () => {
    const m = mealPokeMessage({ mealId: 'lunch', tone: 'soft' })
    expect(m.title).toBe('☀️ Обед')
    expect(m.body).toContain('Обеденный перерыв')
    expect(mealPokeMessage({ mealId: 'breakfast', tone: 'soft' }).title).toBe('🌅 Завтрак')
  })

  test('firm: заголовок с характером, {meal} подставляется с заглавной в начале', () => {
    // random=0.2 → вторая фраза пула («{meal} второй день мимо…»)
    const m = mealPokeMessage({ mealId: 'dinner', tone: 'firm', random: () => 0.2 })
    expect(m.title).toBe('🐻 Куда пропал?')
    expect(m.body).toContain('Ужин')
    expect(m.body).not.toContain('{meal}')
    expect(m.body).not.toContain('{m:')
  })

  test('tease: заголовок называет приём', () => {
    const m = mealPokeMessage({ mealId: 'lunch', tone: 'tease', random: POOL0 })
    expect(m.title).toBe('🐻 А обед-то?')
    expect(m.body).toContain('Обед')
  })

  test('cheer: серия склоняется в тексте', () => {
    const m = mealPokeMessage({ mealId: 'lunch', tone: 'cheer', streak: 5, random: POOL0 })
    expect(m.body).toContain('5 дней')
    expect(m.body).not.toContain('{streak}')
    const m2 = mealPokeMessage({ mealId: 'lunch', tone: 'cheer', streak: 2, random: POOL0 })
    expect(m2.body).toContain('2 дня')
  })
})

describe('mealPokeMessage: пол пользователя', () => {
  test('мужчина: «Куда пропал?», «Сдался?»', () => {
    const m = mealPokeMessage({ mealId: 'lunch', tone: 'firm', gender: 'm', random: POOL0 })
    expect(m.title).toBe('🐻 Куда пропал?')
    const m1 = mealPokeMessage({ mealId: 'lunch', tone: 'firm', gender: 'm', random: () => 0.2 })
    expect(m1.body).toContain('Сдался?')
  })

  test('женщина: «Куда пропала?», «Сдалась?»', () => {
    const m = mealPokeMessage({ mealId: 'lunch', tone: 'firm', gender: 'f', random: POOL0 })
    expect(m.title).toBe('🐻 Куда пропала?')
    const m1 = mealPokeMessage({ mealId: 'lunch', tone: 'firm', gender: 'f', random: () => 0.2 })
    expect(m1.body).toContain('Сдалась?')
    expect(m1.body).not.toContain('Сдался')
  })

  test('«Исчез в закат» / «Исчезла в закат» (pool[3])', () => {
    const male = mealPokeMessage({ mealId: 'lunch', tone: 'firm', gender: 'm', random: () => 0.65 })
    const female = mealPokeMessage({ mealId: 'lunch', tone: 'firm', gender: 'f', random: () => 0.65 })
    expect(male.body).toContain('Исчез в закат')
    expect(female.body).toContain('Исчезла в закат')
  })

  test('по умолчанию — мужской род (совместимость со старым поведением)', () => {
    const m = mealPokeMessage({ mealId: 'lunch', tone: 'firm', random: POOL0 })
    expect(m.title).toBe('🐻 Куда пропал?')
    expect(m.title).not.toContain('-а')
  })
})

describe('mealPokeMessage: имя из профиля', () => {
  test('имя подставляется в заголовок: «Катя, куда пропала?»', () => {
    const m = mealPokeMessage({ mealId: 'lunch', tone: 'firm', gender: 'f', name: 'Катя', random: POOL0 })
    expect(m.title).toBe('🐻 Катя, куда пропала?')
  })

  test('фраза пользователя: «Катя, булочки? 🥐 А ужин всё ещё ждёт…»', () => {
    // random=0.85 → floor(0.85*5)=4 — пятая фраза пула firm
    const m = mealPokeMessage({ mealId: 'dinner', tone: 'firm', name: 'Катя', random: () => 0.85 })
    expect(m.body).toBe('Катя, булочки? 🥐 А ужин всё ещё ждёт. Покажи ему, кто здесь главный')
  })

  test('без имени — прежние тексты, токен отрезается вместе с запятой', () => {
    const m = mealPokeMessage({ mealId: 'lunch', tone: 'firm', random: POOL0 })
    expect(m.title).toBe('🐻 Куда пропал?')
    expect(m.body).toBe('Куда пропал? Уже булочки жуёшь? 🥐🐻')
    expect(m.body).not.toContain('{name}')
  })

  test('без имени первое слово получает заглавную', () => {
    const m = mealPokeMessage({ mealId: 'lunch', tone: 'tease', random: () => 0.1 })
    expect(m.body).toBe('Обед в расписании, а тебя не было. Уже булочки потянуло? 🥐')
    const soft = mealPokeMessage({ mealId: 'breakfast', tone: 'soft' })
    expect(soft.body).toBe('Самое время позавтракать — запиши приём в дневник 🐻')
  })

  test('цифры не капитализируются: «5 дней подряд», а не «5 Дней»', () => {
    const m = mealPokeMessage({ mealId: 'lunch', tone: 'cheer', streak: 5, random: POOL0 })
    expect(m.body).toBe('5 дней подряд — как по нотам! Не останавливайся 🐻💪')
  })

  test('имя в серии и похвале: «Катя, 5 дней подряд…», «🐻 Катя, оперативно!»', () => {
    const cheer = mealPokeMessage({ mealId: 'lunch', tone: 'cheer', streak: 5, name: 'Катя', random: POOL0 })
    expect(cheer.body).toBe('Катя, 5 дней подряд — как по нотам! Не останавливайся 🐻💪')
    const praise = mealPokeMessage({ mealId: 'lunch', tone: 'praise', name: 'Катя', random: POOL0 })
    expect(praise.title).toBe('🐻 Катя, оперативно!')
    expect(praise.body).toBe('Уже записано — оперативно! Медведь аплодирует 👏🐻')
  })

  test('мягкий тон с именем и без', () => {
    const withName = mealPokeMessage({ mealId: 'breakfast', tone: 'soft', name: 'Катя' })
    expect(withName.title).toBe('🌅 Завтрак')
    expect(withName.body).toBe('Катя, самое время позавтракать — запиши приём в дневник 🐻')
    const noName = mealPokeMessage({ mealId: 'lunch', tone: 'soft' })
    expect(noName.body).toBe('Обеденный перерыв: не забудь поесть и записать 🐻')
  })

  test('многословное имя с пробелами — берём первое слово', () => {
    const m = mealPokeMessage({ mealId: 'lunch', tone: 'firm', name: '  Катя Иванова  ', random: POOL0 })
    expect(m.title).toBe('🐻 Катя, куда пропал?')
  })

  test('имя длиннее 24 символов обрезается, пустая строка = без имени', () => {
    const m = mealPokeMessage({ mealId: 'lunch', tone: 'cheer', name: 'А'.repeat(30), streak: 3, random: () => 0.1 })
    expect(m.body.startsWith(`${'А'.repeat(24)}, 3 дня подряд`)).toBe(true)
    const empty = mealPokeMessage({ mealId: 'lunch', tone: 'firm', name: '   ', random: POOL0 })
    expect(empty.title).toBe('🐻 Куда пропал?')
  })
})

describe('вторая серия: вода, весы, «пропал», тренировка', () => {
  test('пулы непустые и без обещаний результата/рекламы премиума', () => {
    for (const pool of [WATER_PHRASES, WEIGH_PHRASES, GONE_PHRASES, WORKOUT_PHRASES]) {
      expect(pool.length).toBeGreaterThan(0)
      for (const p of pool) {
        expect(typeof p).toBe('string')
        expect(p.length).toBeGreaterThan(10)
        // без рекламы и обещаний результата (правила серии)
        expect(p.toLowerCase()).not.toContain('премиум')
        expect(p.toLowerCase()).not.toContain('подписк')
      }
    }
  })

  test('вода: soft — прежний текст, bear — живой пул', () => {
    const soft = waterPokeMessage({ style: 'soft' })
    expect(soft.title).toBe('💧 Пора выпить воды')
    expect(soft.body).toContain('мишка считает стаканы')
    const bear = waterPokeMessage({ style: 'bear', random: POOL0 })
    expect(bear.body).toBe(WATER_PHRASES[0])
    const spicy = waterPokeMessage({ style: 'spicy', random: () => 0.999 })
    expect(spicy.body).toBe(WATER_PHRASES[WATER_PHRASES.length - 1])
  })

  test('весы: soft — прежний текст, bear — живой пул', () => {
    const soft = weighPokeMessage({ style: 'soft' })
    expect(soft.body).toContain('натощак')
    const bear = weighPokeMessage({ style: 'bear', random: POOL0 })
    expect(bear.body).toBe(WEIGH_PHRASES[0])
  })

  test('«пропал»: soft → null, bear → фраза из пула', () => {
    expect(gonePokeBody({ style: 'soft' })).toBeNull()
    expect(gonePokeBody({ style: 'bear', random: POOL0 })).toBe(GONE_PHRASES[0])
  })

  test('тренировка: детерминированный выбор фразы', () => {
    expect(workoutPokeBody({ random: POOL0 })).toBe(WORKOUT_PHRASES[0])
    expect(workoutPokeBody({ random: () => 0.999 })).toBe(WORKOUT_PHRASES[WORKOUT_PHRASES.length - 1])
  })

  test('тренировка: формулировки без рода (правило серии)', () => {
    // без «ты забыл/забыла» — только нейтральные обороты
    for (const p of [...WORKOUT_PHRASES, ...GONE_PHRASES]) {
      expect(p).not.toMatch(/забыл[аа]?\b/)
      expect(p).not.toMatch(/пропал[аа]?[,.]/)
    }
  })
})

describe('mealPokeMessage: тон «с перцем» (spicy)', () => {
  test('spicy добавляет дерзкие фразы к пулу tease', () => {
    // пул tease: 4 медвежьих + 6 дерзких = 10; random=0.95 → индекс 9 —
    // последняя дерзкая
    const m = mealPokeMessage({ mealId: 'lunch', tone: 'tease', style: 'spicy', random: () => 0.95 })
    expect(m.body).toBe('Это уведомление — не назойливость. Это забота. В формате лёгкого пинка. Почти невесомого')
    // медвежьи фразы остаются доступны: random=0 → первая медвежья
    const bear1 = mealPokeMessage({ mealId: 'lunch', tone: 'tease', style: 'spicy', random: POOL0 })
    expect(bear1.body).toContain('Обед в расписании')
  })

  test('spicy добавляет дерзкие фразы к пулу firm', () => {
    // firm: 5 медвежьих + 8 дерзких = 13; random=0.999 → индекс 12 — последняя дерзкая
    const m = mealPokeMessage({ mealId: 'dinner', tone: 'firm', style: 'spicy', random: () => 0.999 })
    expect(m.body).toBe('Мы тебе не спамим. Мы верим в тебя. Это разные вещи, между прочим')
  })

  test('spicy не меняет praise/cheer и не меняет bear-тон', () => {
    const praiseSpicy = mealPokeMessage({ mealId: 'lunch', tone: 'praise', style: 'spicy', random: POOL0 })
    const praiseBear = mealPokeMessage({ mealId: 'lunch', tone: 'praise', random: POOL0 })
    expect(praiseSpicy.body).toBe(praiseBear.body)
    const bearTease = mealPokeMessage({ mealId: 'lunch', tone: 'tease', random: () => 0.95 })
    // без spicy random=0.95 → индекс 3 из 4 — последняя медвежья tease
    expect(bearTease.body).not.toBe('Мы тебе не спамим. Мы верим в тебя. Это разные вещи, между прочим')
  })

  test('дерзкие фразы совместимы с именем из профиля (заголовок сохраняется)', () => {
    const m = mealPokeMessage({ mealId: 'lunch', tone: 'tease', style: 'spicy', name: 'Катя', random: () => 0.95 })
    expect(m.title).toBe('🐻 Катя, а обед-то?')
    expect(m.body).toBe('Это уведомление — не назойливость. Это забота. В формате лёгкого пинка. Почти невесомого')
  })
})

describe('mealStreaks', () => {
  const key = (daysAgo) => {
    const d = new Date()
    d.setDate(d.getDate() - daysAgo)
    return localDayKey(d)
  }

  test('серия записей: 3 дня подряд с обедом', () => {
    const history = [
      { day: key(1), mealId: 'lunch' },
      { day: key(2), mealId: 'lunch' },
      { day: key(3), mealId: 'lunch' },
    ]
    const st = mealStreaks(history, 'lunch', key(0))
    expect(st.goodStreak).toBe(3)
    expect(st.missedStreak).toBe(0)
    expect(st.loggedToday).toBe(false)
  })

  test('серия пропусков: вчера и позавчера без обеда, 3 дня назад был', () => {
    const history = [
      { day: key(3), mealId: 'lunch' },
      { day: key(4), mealId: 'lunch' },
    ]
    const st = mealStreaks(history, 'lunch', key(0))
    expect(st.missedStreak).toBe(2)
    expect(st.goodStreak).toBe(0)
  })

  test('запись сегодня не входит в серии и видна как loggedToday', () => {
    const history = [
      { day: key(0), mealId: 'lunch' },
      { day: key(1), mealId: 'lunch' },
    ]
    const st = mealStreaks(history, 'lunch', key(0))
    expect(st.loggedToday).toBe(true)
    expect(st.goodStreak).toBe(1) // только вчера; сегодня считается отдельно
  })

  test('приёмы не путаются между собой', () => {
    const history = [
      { day: key(1), mealId: 'dinner' },
      { day: key(1), mealId: 'lunch' },
    ]
    expect(mealStreaks(history, 'dinner', key(0)).goodStreak).toBe(1)
    expect(mealStreaks(history, 'breakfast', key(0)).goodStreak).toBe(0)
    expect(mealStreaks(history, 'breakfast', key(0)).missedStreak).toBe(1)
  })

  test('новичок: дни до первой записи журнала не считаются пропущенными', () => {
    // журнал существует один день (вчера), завтрака в нём не было —
    // это 1 день пропуска, а не 30: медведь не подкалывает новичка
    const history = [{ day: key(1), mealId: 'lunch' }]
    expect(mealStreaks(history, 'breakfast', key(0)).missedStreak).toBe(1)
    // пустой журнал — вообще без серий
    const empty = mealStreaks([], 'lunch', key(0))
    expect(empty.goodStreak).toBe(0)
    expect(empty.missedStreak).toBe(0)
  })
})

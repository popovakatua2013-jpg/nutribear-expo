// Медвежьи пинки: тон по поведению, склонения, подстановка {meal}/{streak}
// и подсчёт серий записей/пропусков по журналу. Чистая логика — Node.

import {
  localDayKey,
  pluralRu,
  pickPhrase,
  pickTone,
  mealPokeMessage,
  mealStreaks,
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

  test('firm: заголовок с характером, {meal} подставляется', () => {
    // random=0.2 → вторая фраза пула («{meal} второй день мимо…»)
    const m = mealPokeMessage({ mealId: 'dinner', tone: 'firm', random: () => 0.2 })
    expect(m.title).toBe('🐻 Куда пропал-а?')
    expect(m.body).toContain('ужин')
    expect(m.body).not.toContain('{meal}')
  })

  test('tease: заголовок называет приём', () => {
    const m = mealPokeMessage({ mealId: 'lunch', tone: 'tease', random: POOL0 })
    expect(m.title).toBe('🐻 А обед-то?')
    expect(m.body).toContain('обед')
  })

  test('cheer: серия склоняется в тексте', () => {
    const m = mealPokeMessage({ mealId: 'lunch', tone: 'cheer', streak: 5, random: POOL0 })
    expect(m.body).toContain('5 дней')
    expect(m.body).not.toContain('{streak}')
    const m2 = mealPokeMessage({ mealId: 'lunch', tone: 'cheer', streak: 2, random: POOL0 })
    expect(m2.body).toContain('2 дня')
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

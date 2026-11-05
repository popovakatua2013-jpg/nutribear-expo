// ═══════════════════════════════════════════════════════════════
//  МЕДВЕЖЬИ ПИНКИ — адаптивные тексты напоминаний о приёмах пищи
// ═══════════════════════════════════════════════════════════════
//  Идея пользователя: не банальное «не забудьте поесть», а живой
//  медведь с характером. Он видит, что вы пропускаете приёмы, и
//  подкалывает: «Куда пропал-а? Уже булочки жуёшь?». А если всё
//  по плану — хвалит. Без обид: подкол всегда добрый.
//
//  Модуль чистый (без React/store) — покрывается юнит-тестами.
//
//  Тон выбирается по поведению:
//   praise — приём уже записан (оперативно!)      → хвалим
//   firm   — 2+ дня подряд пропуск                → настойчивый подкол
//   tease  — 1 день пропуска                      → лёгкое поддразнивание
//   cheer  — серия 3+ дня подряд с записями       → гордимся
//   soft   — прочее (или стиль «Мягко»)           → нейтральное напоминание

// Локальная дата «ГГГГ-ММ-ДД» — точь-в-точь как dayKeyOf в
// useHistoryStore, но без импорта стора (модуль чистый).
export function localDayKey(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export const MEAL_LABEL = { breakfast: 'завтрак', lunch: 'обед', dinner: 'ужин' }

// Русское склонение: pluralRu(3, ['день','дня','дней']) → '3 дня'
export function pluralRu(n, forms) {
  const abs = Math.abs(Math.round(n))
  const mod10 = abs % 10
  const mod100 = abs % 100
  const form = mod10 === 1 && mod100 !== 11 ? forms[0] : mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20) ? forms[1] : forms[2]
  return `${n} ${form}`
}

const POOLS = {
  praise: [
    'Уже записано — оперативно! Медведь аплодирует 👏🐻',
    'Дневник блестит. Так и держать! 🐻✨',
    'Записано раньше медведя успел. Респект 🐻👍',
  ],
  firm: [
    'Куда пропал-а? Уже булочки жуёшь? 🥐🐻',
    '{meal} второй день мимо. Сдался? А я в тебя всё ещё верю!',
    'Дневник пустой и грустит. Без драм — просто вернись и поешь нормально 🐻',
    'Исчез в закат — и прямиком к булочкам? Вернись, я всё простил 🐻',
    '{meal} сам себя не съест. Пора показать булочкам, кто здесь главный 🥐',
  ],
  tease: [
    '{meal} в расписании, а тебя не было. Уже булочки потянуло? 🥐',
    'Тарелка скучает без тебя. Запиши {meal} — и медведь отстанет 🐻',
    'Пока тебя не было, калории тоже взяли выходной. Возвращаемся к делу? 🐻',
    'Сегодня {meal} ещё не записан. Сдаёмся без боя? Я так не думаю 🐻',
  ],
  cheer: [
    '{streak} подряд — как по нотам! Не останавливайся 🐻💪',
    'Серия {streak}: медведь гордится. Сегодня тоже по плану? 🐻',
    '{streak} без пропусков — так держать! Дневник радуется 🐻✨',
  ],
  soft: {
    breakfast: 'Самое время позавтракать — запишите приём в дневник 🐻',
    lunch: 'Обеденный перерыв: не забудьте поесть и записать 🐻',
    dinner: 'Время ужина — внесите приём в дневник 🐻',
  },
}

const TITLES = {
  praise: '🐻 Оперативно!',
  firm: '🐻 Куда пропал-а?',
  tease: '🐻 А {meal}-то?',
  cheer: '🐻 Серия жива!',
  soft: { breakfast: '🌅 Завтрак', lunch: '☀️ Обед', dinner: '🌙 Ужин' },
}

// Случайная фраза из пула. random — для тестов (детерминизм).
export function pickPhrase(pool, random = Math.random) {
  if (!Array.isArray(pool) || pool.length === 0) return ''
  return pool[Math.floor(random() * pool.length) % pool.length]
}

// Какой тон выбрать по поведению пользователя.
//  loggedToday  — приём уже записан сегодня
//  missedToday  — время приёма уже прошло, а записи нет
//  missedStreak — сколько дней подряд ДО вчера этот приём пропускали
//  goodStreak   — сколько дней подряд ДО вчера приём записывали
//  style        — 'bear' (с характером) | 'soft' (мягко)
export function pickTone({ loggedToday = false, missedToday = false, missedStreak = 0, goodStreak = 0, style = 'bear' }) {
  if (style === 'soft') return 'soft'
  if (loggedToday) return 'praise'
  const missed = missedStreak + (missedToday ? 1 : 0)
  if (missed >= 2) return 'firm'
  if (missed === 1) return 'tease'
  if (goodStreak >= 3) return 'cheer'
  return 'soft'
}

// Готовый текст уведомления: { title, body }
export function mealPokeMessage({ mealId = 'lunch', tone = 'soft', streak = 0, random = Math.random }) {
  const label = MEAL_LABEL[mealId] || 'приём пищи'
  const fill = (s) =>
    String(s)
      .replaceAll('{meal}', label)
      .replaceAll('{streak}', streak > 0 ? pluralRu(streak, ['день', 'дня', 'дней']) : '')

  if (tone === 'soft') {
    return { title: TITLES.soft[mealId] || '🐻 Напоминание', body: POOLS.soft[mealId] || POOLS.soft.lunch }
  }
  return { title: fill(TITLES[tone] || '🐻 Напоминание'), body: fill(pickPhrase(POOLS[tone], random)) }
}

// Статистика приёма по журналу: серия записей и серия пропусков до вчера.
// history — журнал приёмов useFoodStore: [{ day, mealId, ... }]
// Дни ДО первой записи в журнале не считаются пропущенными: медведь
// не подкалывает новичка, чьей истории еды он ещё не знает.
export function mealStreaks(history, mealId, todayKey) {
  const logged = new Set()
  let firstDay = null
  for (const e of history || []) {
    if (!e || !e.day) continue
    if (firstDay === null || e.day < firstDay) firstDay = e.day
    if (e.mealId === mealId) logged.add(e.day)
  }
  // Журнал пуст — медведь пользователя ещё не знает: без серий,
  // пинки остаются мягкими, пока не появится первая запись
  if (firstDay === null) return { goodStreak: 0, missedStreak: 0, loggedToday: false }
  // Сегодня не считаем — он живёт отдельно (loggedToday / missedToday)
  let good = 0
  for (let off = 1; off <= 30; off++) {
    const d = new Date()
    d.setDate(d.getDate() - off)
    const key = localDayKey(d)
    if (firstDay !== null && key < firstDay) break // неизвестная область
    if (logged.has(key)) good++
    else break
  }
  let missed = 0
  for (let off = 1; off <= 30; off++) {
    const d = new Date()
    d.setDate(d.getDate() - off)
    const key = localDayKey(d)
    if (firstDay !== null && key < firstDay) break // неизвестная область
    if (!logged.has(key)) missed++
    else break
  }
  return { goodStreak: good, missedStreak: missed, loggedToday: logged.has(todayKey) }
}

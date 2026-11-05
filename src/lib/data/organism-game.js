// Игровые системы организма: Эволюция, Рейд стаи, Генные капсулы.
// Чистые функции без сторов — как organism.js. Всё работает офлайн,
// стая симулируется детерминированно (одинаковые вклады на одном устройстве),
// никакого pay-to-win: ресурсы только из дневных событий.

// ── Ветки эволюции ──────────────────────────────────────────────────────────
// Ветку выбирает геном: склонность = самая сильная ось недели.
export const BRANCHES = {
  protein: { name: 'Силач', axis: 'protein', emoji: '🧬', note: 'белок и сила' },
  hydration: { name: 'Исток', axis: 'hydration', emoji: '💧', note: 'вода и поток' },
  energy: { name: 'Искра', axis: 'energy', emoji: '⚡', note: 'энергия баланса' },
  activity: { name: 'Стайер', axis: 'activity', emoji: '👣', note: 'шаги и выносливость' },
}

export const FORM_START = 'Протоплазма'
export const FORM_FINAL = 'Титан'

// Цена эволюции в генах по стадиям 0→1, 1→2, 2→3, 3→Титан
export const EVOLVE_COST = [25, 50, 100, 200]
// Требуемый средний геном (из 70) для каждой стадии
export const EVOLVE_GENOME = [0, 25, 35, 45]

export const GENOME_MAX = 70

// Средний геном 0…70 из осей 0…100
export function genomeAvg70(axes) {
  const avg = (axes.hydration + axes.protein + axes.energy + axes.activity) / 4
  return Math.max(0, Math.min(GENOME_MAX, Math.round(avg * 0.7)))
}

// Склонность: сильнейшая ось + её значение
export function tendencyOf(axes) {
  const rows = Object.entries(BRANCHES).map(([key, b]) => ({ key, ...b, v: axes[b.axis] || 0 }))
  rows.sort((a, b) => b.v - a.v)
  return rows[0]
}

// Название текущей формы
export function formName(stage, branchName) {
  if (stage <= 0) return FORM_START
  if (stage >= 4) return FORM_FINAL
  return `${branchName} ${['I', 'II', 'III'][stage - 1]}`
}

// Что нужно для следующей стадии: null когда достигнут Титан
export function nextEvolution(stage) {
  if (stage >= 4) return null
  return { cost: EVOLVE_COST[stage], genome: EVOLVE_GENOME[stage], to: stage + 1 }
}

// ── Рейд стаи ───────────────────────────────────────────────────────────────
export const PACK_SIZE = 6 // ты + 5 участников стаи

// Боссы ротируются по неделям
export const BOSSES = [
  { name: 'Диван-Пожиратель', hp: 1200, emoji: '🛋️' },
  { name: 'Холодильник-Призрак', hp: 1400, emoji: '👻' },
  { name: 'Тапки Бездны', hp: 1000, emoji: '🥾' },
  { name: 'Сидень Ленивца', hp: 1300, emoji: '🪑' },
]

// Награда за павшего босса
export const RAID_REWARD = { genes: 15, crystals: 5 }

// Регенерация босса: за каждый день недели без моего вклада он лечится;
// стаканы воды (щиты) гасят лечение по 6 HP за стакан
export const BOSS_HEAL_PER_SKIP = 30
export const SHIELD_ABSORB_PER_GLASS = 6

// Итоговые HP босса с учётом регенерации и щитов:
// пропущенные дни лечат босса, вода не даст ему отлежаться
export function raidBattleHp(bossHp, myDmg, packDmg, skips, shield) {
  const heal = Math.max(0, skips || 0) * BOSS_HEAL_PER_SKIP
  const absorb = Math.min((shield || 0) * SHIELD_ABSORB_PER_GLASS, heal)
  return Math.max(0, Math.round(bossHp - (myDmg || 0) - (packDmg || 0) + heal - absorb))
}

// Сколько HP босс вылечил и сколько из этого погасили щиты — для строки в карточке
export function raidHealAbsorb(skips, shield) {
  const heal = Math.max(0, skips || 0) * BOSS_HEAL_PER_SKIP
  return { heal, absorb: Math.min((shield || 0) * SHIELD_ABSORB_PER_GLASS, heal) }
}

// Понедельник текущей недели (ключ «ГГГГ-ММ-ДД»)
export function mondayKeyOf(date = new Date()) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const shift = (d.getDay() + 6) % 7 // пн = 0
  d.setDate(d.getDate() - shift)
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

// Индекс дня внутри недели: 0 = понедельник
export function weekDayIdx(date = new Date()) {
  return (date.getDay() + 6) % 7
}

// Детерминированный хеш → вклад бота за день (0, если «день отдыха»)
function hash32(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export function botDayDamage(weekKey, dayIdx, botIdx) {
  const h = hash32(`${weekKey}|${dayIdx}|${botIdx}`)
  if (h % 7 === 0) return 0 // участник пропустил день
  return 12 + (h % 42) // 12…54 урона за активный день
}

// Вклад стаи (ботов) за неделю до текущего дня включительно
export function packDamage(weekKey, daysElapsed) {
  let sum = 0
  for (let bot = 0; bot < PACK_SIZE - 1; bot++) {
    for (let d = 0; d <= daysElapsed; d++) sum += botDayDamage(weekKey, d, bot)
  }
  return sum
}

// Мой вклад за неделю из сохранённых дней
export function myWeekTotals(raidDays, weekKey) {
  let dmg = 0
  let shield = 0
  let crit = 0
  for (const [dayKey, v] of Object.entries(raidDays || {})) {
    if (v && v.weekKey === weekKey) {
      dmg += v.dmg || 0
      shield += v.shield || 0
      crit += v.crit || 0
    }
  }
  return { dmg, shield, crit }
}

// Урон за день из реальных данных: еда = удар, тренировка = крит —
// удваивает урон еды за этот день (и даёт +15 за каждую)
export function dayRaidDamage(kcal, workouts) {
  const base = Math.round((kcal || 0) / 40)
  const crit = (workouts || 0) > 0 ? base : 0
  return base + crit + (workouts || 0) * 15
}

// ── Генные капсулы ──────────────────────────────────────────────────────────
// Честные шансы — совпадают с макетом 60/25/10/5
export const DROPS = [
  { key: 'common', name: 'Обычный ген', reward: '+2 гена', genes: 2, p: 0.6, color: '#9CA3AF' },
  { key: 'rare', name: 'Редкий ген', reward: '+5 генов', genes: 5, p: 0.25, color: '#2DD4BF' },
  { key: 'artifact', name: 'Артефакт биома', reward: '+20 кристаллов', crystals: 20, p: 0.1, color: '#A855F7' },
  { key: 'aura', name: 'Аура сезона', reward: '+40 кристаллов', crystals: 40, p: 0.05, color: '#FACC15' },
]

// Коллекционные артефакты биомов и ауры сезона
export const ARTIFACTS = ['Мшистый тотем', 'Кристалл родника', 'Уголь пустоши', 'Иней высокогорья']
export const AURAS = ['Аура: Лаймовый шторм', 'Аура: Полярное сияние', 'Аура: Уголь и мята']
export const DUP_MUTAGEN = 3 // дубликат превращается в мутаген
// Мутации: накопленный мутаген (дубликаты + стабильность) меняется на капсулы
export const MUTAGEN_PER_CAPSULE = 9

// Прокрутка капсулы: возвращает дроп по честным весам
export function rollDrop(rand = Math.random()) {
  let acc = 0
  for (const d of DROPS) {
    acc += d.p
    if (rand < acc) return d
  }
  return DROPS[DROPS.length - 1]
}

// ── Комбо-шкала дня ─────────────────────────────────────────────────────────
// «За каждое событие дневника»: записи пищи, стаканы воды, тренировки.
// 100 → день засчитан в стрик; стрик 7 → капсула.
export const COMBO_GOAL = 100
export const STREAK_FOR_CAPSULE = 7

export function dayCombo(entriesCount, glasses, workouts) {
  const v = (entriesCount || 0) * 22 + (glasses || 0) * 8 + (workouts || 0) * 20
  return Math.max(0, Math.min(COMBO_GOAL, v))
}

// Вчерашний ключ дня (для серий без хранения всей истории)
export function yesterdayKeyOf(key) {
  const [y, m, d] = key.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() - 1)
  const p = (n) => String(n).padStart(2, '0')
  return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}`
}

// ── Экспедиции ──────────────────────────────────────────────────────────────
// Организм уходит в поход на реальное время (idle-механика из прототипа):
// можно закрыть приложение — время идёт само. Вернулся — забери добычу.
// Длинный путь выгоднее за час, но ждать дольше: 0.5 / 0.63 / 0.75 гена в час.
export const EXPEDITIONS = [
  { key: 'walk', name: 'Прогулка к холмам', emoji: '🌿', hours: 4, genes: 2, crystals: 3 },
  { key: 'hike', name: 'Поход к роднику', emoji: '🏞️', hours: 8, genes: 5, crystals: 7 },
  { key: 'quest', name: 'Большая экспедиция', emoji: '🧭', hours: 12, genes: 9, crystals: 12 },
]

export function expeditionOf(key) {
  return EXPEDITIONS.find((e) => e.key === key) || null
}

// Прогресс похода: done / remainingMs / fraction 0…1. Нет похода — null.
// speed — множитель длительности от Компаса странника (0.9 = на 10% быстрее).
// Скачок часов вперёд (startedAt в будущем) = «только ушёл», без читов.
export function expeditionProgress(expedition, now = Date.now(), speed = 1) {
  const e = expeditionOf(expedition && expedition.key)
  const startedAt = expedition && expedition.startedAt
  if (!e || !startedAt) return null
  const durationMs = e.hours * 3600000 * Math.max(0.5, speed || 1)
  const elapsed = Math.max(0, now - startedAt)
  return {
    done: elapsed >= durationMs,
    remainingMs: Math.max(0, durationMs - elapsed),
    fraction: Math.min(1, elapsed / durationMs),
  }
}

// Лор возвращения — короткая фраза для истории организма
export const EXPEDITION_TALES = {
  walk: [
    'Тропа была мягкой, взгляд — ясным.',
    'Скатился с холма тёплым шариком — смех и трава в геноме.',
    'Нашёл лужайку, где светится мох. Немного забрал с собой.',
  ],
  hike: [
    'У родника вода звенела так, что резонировал геном.',
    'Дорога была долгой, но каждый шаг ложился в ДНК ровно.',
    'Встретил на тропе улитку-философа. Разошлись довольные.',
  ],
  quest: [
    'За туманом нашёл поляну, где растут гены. Аккуратно собрал.',
    'Перешёл хребет — оттуда виден весь биом. Геном гудел от гордости.',
    'Вернулся с сумкой полных кристаллов и историей на неделю.',
  ],
}

export function expeditionTale(key, rand = Math.random()) {
  const list = EXPEDITION_TALES[key] || EXPEDITION_TALES.walk
  return list[Math.floor(rand * list.length) % list.length]
}

// Русские формы слов: 1 ген / 2 гена / 5 генов
function plural(n, one, few, many) {
  const m10 = n % 10
  const m100 = n % 100
  if (m10 === 1 && m100 !== 11) return one
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few
  return many
}

export function genesLabel(n) {
  return `${n} ${plural(n, 'ген', 'гена', 'генов')}`
}

export function crystalsLabel(n) {
  return `${n} ${plural(n, 'кристалл', 'кристалла', 'кристаллов')}`
}

// Метка дня для журнала: «сегодня», «вчера» или «3 ноя»
const MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']
export function journalDayLabel(ts, now = Date.now()) {
  const d = new Date(ts)
  const n = new Date(now)
  const dayKey = (x) => `${x.getFullYear()}-${x.getMonth()}-${x.getDate()}`
  if (dayKey(d) === dayKey(n)) return 'сегодня'
  const y = new Date(n)
  y.setDate(y.getDate() - 1)
  if (dayKey(d) === dayKey(y)) return 'вчера'
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`
}

// Прыщи от игнора: детерминированные позиции на арене (доли ширины/высоты),
// ниже зоны реплики справа сверху. Индекс пятна — его «личность» на день.
export const PIMPLE_SPOTS = [
  { x: 0.30, y: 0.34 },
  { x: 0.68, y: 0.30 },
  { x: 0.18, y: 0.52 },
  { x: 0.76, y: 0.55 },
  { x: 0.34, y: 0.72 },
  { x: 0.60, y: 0.80 },
]

// «3 ч 12 м» / «45 м» — остаток пути для таймера
export function fmtRemaining(ms) {
  const min = Math.max(0, Math.ceil(ms / 60000))
  const h = Math.floor(min / 60)
  const m = min % 60
  return h > 0 ? `${h} ч ${m} м` : `${m} м`
}

// ── Ежедневные квесты ───────────────────────────────────────────────────────
// Пул из 6 квестов, детерминированный выбор 3 на день (одинаковый за сутки).
// Прогресс считается из живых метрик дня, награда — +2 гена за квест,
// все три закрыты → +1 кристалл. Ничего наказующего: не выполнил — просто
// завтра новые.

export const QUESTS = [
  { key: 'water', emoji: '💧', name: 'Наполни колодец', sub: '6 стаканов воды за день', metric: 'glasses', goal: 6 },
  { key: 'steps', emoji: '👣', name: 'Дальний маршрут', sub: '8 000 шагов за день', metric: 'steps', goal: 8000 },
  { key: 'workout', emoji: '💪', name: 'Тренировка дня', sub: 'любая тренировка', metric: 'workouts', goal: 1 },
  { key: 'protein', emoji: '🥩', name: 'Белковый фундамент', sub: '50 г белка за день', metric: 'protein', goal: 50 },
  { key: 'meals', emoji: '🍽️', name: 'Режим питания', sub: '3 записи в дневнике питания', metric: 'meals', goal: 3 },
  { key: 'balance', emoji: '⚖️', name: 'Держишь баланс', sub: 'калории 80–115% от цели', metric: 'balance', goal: 1 },
]

export const QUEST_REWARD = { genes: 2, allBonusCrystals: 1 }

// Детерминированный выбор 3 квестов на день (seed = хеш даты)
export function questsForDay(dayKey) {
  let h = 2166136261
  for (let i = 0; i < dayKey.length; i++) {
    h ^= dayKey.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  const pool = [...QUESTS]
  const picked = []
  let seed = h >>> 0
  while (picked.length < 3 && pool.length) {
    seed = (Math.imul(seed, 48271) + 11) >>> 0
    picked.push(pool.splice(seed % pool.length, 1)[0])
  }
  return picked
}

// Прогресс квеста по живым метрикам дня → { cur, goal, done }
export function questProgress(quest, m) {
  const cur = Math.max(0, m?.[quest.metric] || 0)
  return { cur: Math.min(cur, quest.goal), goal: quest.goal, done: cur >= quest.goal }
}

// ── Энциклопедия питания (коллекция «жителей») ─────────────────────────────
// Первое закрытие цели дня открывает нового «жителя биома» с настоящим
// фактом о пользе. Обучение через коллекционирование, без занудства.

export const CODEX = [
  { key: 'water', emoji: '💦', name: 'Капелька', fact: 'Вода участвует во всех обменных процессах — даже лёгкое обезвоживание снижает концентрацию и силы.' },
  { key: 'steps', emoji: '🦶', name: 'Шагоход', fact: '8 000 шагов в день связывают с более низким риском сердечных заболеваний — показывают крупные исследования.' },
  { key: 'workout', emoji: '🏋️', name: 'Силач-гриб', fact: 'Силовые тренировки укрепляют кости и поддерживают мышцы, которые после 30 лет теряются без нагрузки.' },
  { key: 'protein', emoji: '🥚', name: 'Белковый ёжик', fact: 'Белок — строительный материал мышц и ферментов; он дольше переваривается и дольше оставляет сытость.' },
  { key: 'meals', emoji: '🍲', name: 'Кастрюлька', fact: 'Регулярные приёмы пищи помогают держать ровный сахар в крови — меньше резкого голода и перееданий.' },
  { key: 'balance', emoji: '⚖️', name: 'Весы-чудеса', fact: 'Умеренный дефицит или баланс калорий — единственный научно подтверждённый способ управления весом.' },
  { key: 'streak3', emoji: '🔥', name: 'Огонёк', fact: 'Привычка закрепляется в среднем за 66 дней регулярного повторения — серия дней реально перестраивает мозг.' },
]

// +2 кристалла за каждого нового жителя
export const CODEX_REWARD = 2

// ── Карта мира: зоны экспедиций ─────────────────────────────────────────────
// Зона открывается стадией эволюции: организм должен «дорасти» до маршрута.

export const ZONES = [
  { key: 'forest', name: 'Лес клетчатки', emoji: '🌿', need: 0, exped: 'walk', note: 'мягкие тропы для юного организма' },
  { key: 'river', name: 'Река воды', emoji: '🏞️', need: 1, exped: 'hike', note: 'путь вдоль звонких родников' },
  { key: 'mountain', name: 'Горы выносливости', emoji: '🏔️', need: 2, exped: 'quest', note: 'вершины, где растут гены' },
]

// ── Боссы-легенды (после престижа) ──────────────────────────────────────────
export const LEGEND_BOSSES = [
  { name: 'Прокрастинатор-Титан', hp: 2200, emoji: '💀' },
  { name: 'Вечно-Голодный Сумрак', hp: 2500, emoji: '🌑' },
  { name: 'Король Отговорок', hp: 2000, emoji: '👑' },
]

// Босс недели: обычная ротация, после престижа — легенды (HP ×1.6)
export function bossForWeek(weekNo, prestigeCount = 0) {
  if ((prestigeCount || 0) > 0) {
    const b = LEGEND_BOSSES[(weekNo - 1) % LEGEND_BOSSES.length]
    return { ...b, hp: Math.round(b.hp * 1.6), legend: true }
  }
  return BOSSES[(weekNo - 1) % BOSSES.length]
}

// ── Медали вклада в рейде (считаются из итогов недели, не хранятся) ─────────
export function raidMedals(mine, myDays) {
  const out = []
  if ((mine?.shield || 0) >= 28) out.push({ emoji: '💧', name: 'Щитоносец', note: '28+ стаканов за неделю' })
  if ((mine?.dmg || 0) >= 400) out.push({ emoji: '⚔️', name: 'Удар недели', note: '400+ урона' })
  if ((mine?.crit || 0) >= 3) out.push({ emoji: '🎯', name: 'Крит-мастер', note: '3+ дня с тренировками' })
  if ((myDays || 0) >= 5) out.push({ emoji: '📅', name: 'Без пропусков', note: '5+ дней вклада' })
  return out
}

// ── Синтез артефактов: мутаген → именной артефакт с пассивным бонусом ───────
// 9 мутагена = ровно 3 дубликата. Выбор: капсула или крафт — игрок решает.
export const CRAFT_COST = 9

export const CRAFTS = [
  { key: 'abundance', emoji: '🌾', name: 'Тотем изобилия', bonus: 'bloom', bonusText: '+1 ген за каждый день расцвета' },
  { key: 'stream', emoji: '💠', name: 'Кристалл потока', bonus: 'expedition', bonusText: '+2 кристалла за каждую экспедицию' },
  { key: 'compass', emoji: '🧭', name: 'Компас странника', bonus: 'speed', bonusText: 'походы идут на 10% быстрее' },
]

export function craftOf(key) {
  return CRAFTS.find((c) => c.key === key) || null
}

export function craftedHas(crafted, bonusKind) {
  return (crafted || []).some((k) => craftOf(k)?.bonus === bonusKind)
}

// ── Скины аур: подсветка сцены от найденных аур ─────────────────────────────
export const SKINS = {
  'Аура: Лаймовый шторм': { glow: '#A3E635', ring: 'rgba(163,230,53,0.45)' },
  'Аура: Полярное сияние': { glow: '#67E8F9', ring: 'rgba(103,232,249,0.45)' },
  'Аура: Уголь и мята': { glow: '#FBBF24', ring: 'rgba(251,191,36,0.4)' },
}

export function skinOf(auraName) {
  return (auraName && SKINS[auraName]) || null
}

// ── Главы сезонов: неделя = глава, победа = 5 дней расцвета ──────────────────
export const CHAPTER_WIN_DAYS = 5

export function chapterIntro(weekNo) {
  const intros = [
    'Стая собралась у костра: новая глава открывается — впереди семь дней пути.',
    'Шаман стаи бросил кости: неделя обещает быть щедрой на гены.',
    'Разведчики вернулись: тропы недели чисты, босс где-то рядом.',
    'Заря над биомом: глава началась, геном ждёт событий.',
  ]
  return intros[(weekNo - 1) % intros.length]
}

// ── Утренние реакции организма (пузырь при открытии вкладки) ────────────────
export function pickReaction({ state, streak, wave, expedition, bossHpPct, petLevel = 0, codexCount = 0 }) {
  if (expedition) return 'Я в походе — но мыслями уже дома. Накорми меня хорошим днём!'
  if (state === 'decline') return 'Утро тяжёлое… Начни со стакана воды, я поправлюсь.'
  if (streak >= 3) return `Наша серия — ${streak} дней! Геном поёт от гордости.`
  if (wave >= 3) return `Башня покоряется: волна ${wave}. Не останавливайся!`
  if (bossHpPct != null && bossHpPct <= 25) return 'Босс шатается! Добей его сегодня — вся стая верит.'
  if (petLevel >= 2) return 'Питомец подрос и просит good-day-кормёжку. Вода и еда — лучшее лакомство!'
  if (codexCount >= 3) return `В энциклопедии уже ${codexCount} жителей. Соберём всех?`
  if (state === 'bloom') return 'Сияю после вчерашнего! Погладь меня — заслужил.'
  const morning = [
    'Доброе утро! Чем наполнится мой день?',
    'Проснулся бодрым. Вода и записи — и я расцвету!',
    'Геном шепчет: сегодня хороший день для цели.',
  ]
  return morning[new Date().getDate() % morning.length]
}

// ── Дневник приключений: журнал в тональности летописи ──────────────────────
const TALE_EMOJI = [
  ['Эволюция', '🧬'], ['Рейд', '⚔️'], ['Экспедиция', '🧭'], ['поход', '🧭'],
  ['Капсула', '🎁'], ['Медосмотр', '🩺'], ['прыщ', '✨'], ['Серия', '🔥'],
  ['Мутации', '🧪'], ['Стабильность', '🛡️'], ['Глава', '📖'], ['Питомец', '🐾'],
  ['житель', '📕'], ['Квест', '📜'], ['Башня', '🗼'], ['Синтез', '⚗️'],
  ['НОВАЯ ИГРА', '👑'],
]

export function adventureTale(entry, createdAtMs) {
  const day = createdAtMs ? Math.max(1, Math.floor((entry.ts - createdAtMs) / 86400000) + 1) : null
  const hit = TALE_EMOJI.find(([word]) => entry.text.includes(word))
  const prefix = day ? `День ${day}` : journalDayLabel(entry.ts)
  return { dayLabel: prefix, emoji: hit ? hit[1] : '•', text: entry.text }
}

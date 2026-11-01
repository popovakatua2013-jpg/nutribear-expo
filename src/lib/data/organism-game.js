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

// Урон за день из реальных данных: еда = удар, тренировка = крит (бонус к урону)
export function dayRaidDamage(kcal, workouts) {
  return Math.round((kcal || 0) / 40) + (workouts || 0) * 15
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

// Разбор недели от напарника (Premium, этап 2 монетизации).
//
// Источник данных — журнал дневника (useFoodStore.history: {day, kcal,
// p, f, c, name…}): считаем статистику за текущую неделю (Пн–Вс), отдаём
// её медведю в промпт (askNutritionist — системный промпт берётся
// автоматически по выбранному напарнику, поэтому разбор «от Кедра» и
// «от Топаза» звучат по-разному). Сеть недоступна или ИИ молчит →
// офлайн-разбор по правилам нутрициологии, помечается source: 'offline'.
//
// Все функции чистые, кроме generateWeekReview — тестируются без сети.

import { askNutritionist } from './chat'

export const REVIEW_MIN_DAYS = 2 // меньше дней с записями — разбирать нечестно
export const REVIEW_TIMEOUT_MS = 30000

const pad = (n) => String(n).padStart(2, '0')

/** Ключи дней текущей недели Пн–Вс в формате дневника 'YYYY-MM-DD'. */
export function weekDayKeys(now = new Date()) {
  const d = new Date(now)
  d.setHours(12, 0, 0, 0)
  const dow = (d.getDay() + 6) % 7 // 0 = понедельник
  d.setDate(d.getDate() - dow)
  return Array.from({ length: 7 }, (_, i) => {
    const x = new Date(d)
    x.setDate(d.getDate() + i)
    return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`
  })
}

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

/** Статистика недели из журнала дневника. Чистая функция.
 * history — entries [{day, kcal, p, f, c, name}], dayKeys — 'YYYY-MM-DD'. */
export function weekFoodStats(history = [], dayKeys = []) {
  const acc = dayKeys.map(() => ({ kcal: 0, p: 0, f: 0, c: 0, dishes: 0 }))
  const idx = new Map(dayKeys.map((k, i) => [k, i]))
  const dishCount = new Map()
  for (const h of history) {
    const i = idx.get(h.day)
    if (i == null) continue
    acc[i].kcal += Number(h.kcal) || 0
    acc[i].p += Number(h.p) || 0
    acc[i].f += Number(h.f) || 0
    acc[i].c += Number(h.c) || 0
    acc[i].dishes += 1
    const name = String(h.name || '').trim().slice(0, 40)
    if (name) dishCount.set(name, (dishCount.get(name) || 0) + 1)
  }
  const byDay = acc.map((d) => ({
    kcal: Math.round(d.kcal),
    p: Math.round(d.p),
    f: Math.round(d.f),
    c: Math.round(d.c),
    dishes: d.dishes,
  }))
  const logged = byDay.filter((d) => d.kcal > 0)
  const loggedDays = logged.length
  const avg = (k) => (loggedDays ? Math.round(logged.reduce((n, d) => n + d[k], 0) / loggedDays) : 0)
  const top = [...dishCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([n, c]) => (c > 1 ? `${n} ×${c}` : n))
  return { byDay, loggedDays, avgKcal: avg('kcal'), avgP: avg('p'), avgF: avg('f'), avgC: avg('c'), top }
}

// ── Промпт для ИИ ───────────────────────────────────────────────────
/** Собирает сообщение пользователя с данными недели. Чистая функция. */
export function buildReviewPrompt({ name = '', sex = '', goal = '', kcalGoal = 0, norms = {}, stats, weekdays = WEEKDAYS }) {
  const who = String(name).trim().split(/\s+/)[0] || 'Пользователь'
  const lines = [
    `${who} — данные дневника за эту неделю (Пн–Вс):`,
    ...stats.byDay.map((d, i) =>
      `  ${weekdays[i]} — ${d.kcal} ккал${d.kcal > 0 ? ` (белки ${d.p} г, жиры ${d.f} г, углеводы ${d.c} г)` : ' — записей нет'}`,
    ),
    `Дней с записями: ${stats.loggedDays} из 7.`,
    kcalGoal > 0 ? `Цель по калориям: ${kcalGoal} ккал в день${goal ? `, цель пользователя — ${goal}` : ''}.` : '',
    norms?.p ? `Нормы нутриентов: белки ${norms.p} г, жиры ${norms.f} г, углеводы ${norms.c} г в день.` : '',
    stats.avgKcal ? `Средние за дни с записями: ${stats.avgKcal} ккал, белки ${stats.avgP} г, жиры ${stats.avgF} г, углеводы ${stats.avgC} г.` : '',
    stats.top.length ? `Частые блюда за неделю: ${stats.top.join(', ')}.` : '',
    'Сделай короткий разбор недели (150–250 слов): что хорошо, что улучшить и 2–3 конкретных совета под эти цифры. ' +
      `Обращайся к пользователю по имени${sex === 'female' ? ' в женском роде' : sex === 'male' ? ' в мужском роде' : ''}. ` +
      'Без markdown, заголовков и «**» — обычным текстом с абзацами.',
  ]
  return lines.filter(Boolean).join('\n')
}

// ── Офлайн-разбор по правилам (без ИИ) ──────────────────────────────
/** Детерминированный текст разбора — сеть не нужна. */
export function offlineWeekReview({ kcalGoal = 0, norms = {}, stats, weekdays = WEEKDAYS, who = '' }) {
  const lines = []
  if (!stats.loggedDays) {
    return (
      '🧸 За эту неделю дневник пока пустой — разбирать нечего, и это самый важный вывод. ' +
      'Записывайте еду хотя бы пару дней: даже прикидочный дневник работает лучше идеальных планов.'
    )
  }
  const missDays = stats.byDay
    .map((d, i) => (d.kcal > 0 ? null : weekdays[i]))
    .filter(Boolean)
  lines.push(
    stats.avgKcal
      ? `🧸 Разбор недели (без ИИ — сеть недоступна, считаю по правилам). Дневник вели ${stats.loggedDays} из 7 дней, в среднем ${stats.avgKcal} ккал в день.`
      : `🧸 Разбор недели (без ИИ — сеть недоступна, считаю по правилам). Дневник вели ${stats.loggedDays} из 7 дней.`,
  )
  if (kcalGoal > 0) {
    const ratio = stats.avgKcal / Math.max(1, kcalGoal)
    lines.push(
      `Средняя калорийность — ${stats.avgKcal} ккал при цели ${kcalGoal} ккал (${Math.round(ratio * 100)}%).`,
    )
    if (ratio < 0.8) {
      lines.push(
        'Стабильный недобор: на дефиците ниже 80% цели теряется больше мышц, чем жира. Добавьте сытный завтрак и белковый перекус — творог, яйца, йогурт.',
      )
    } else if (ratio > 1.15) {
      lines.push(
        'В среднем выше цели: чаще всего лишнее прячется в перекусах и напитках. Попробуйте лёгкие ужины и следите за порциями соусов и масла.',
      )
    } else {
      lines.push('Удерживать цель неделями — это и есть успех, привычка уже работает.')
    }
  }
  if (norms?.p && stats.avgP) {
    lines.push(
      stats.avgP < norms.p * 0.8
        ? `Белок в среднем ${stats.avgP} г при норме ${norms.p} г — маловато: добавьте к каждому приёму источник белка (мясо, рыба, творог, бобовые).`
        : `Белок в среднем ${stats.avgP} г при норме ${norms.p} г — с белком порядок, он бережёт мышцы и даёт сытость.`,
    )
  }
  if (missDays.length) {
    lines.push(
      `Без записей остались: ${missDays.join(', ')}. Даже прикидка на глаз лучше пустого дня — пробуйте записывать сразу после еды.`,
    )
  }
  lines.push('Итог: держите норму калорий, воду и шаги — маленькие шаги каждый день и дают результат. 🐻')
  return lines.join('\n\n')
}

// Уборка markdown-пришивок из ответа модели
function cleanReview(text) {
  const s = String(text || '')
    .replace(/```[a-z]*\n?/gi, '')
    .replace(/\*\*/g, '')
    .replace(/^#+\s*/gm, '')
    .trim()
  return s.length >= 40 ? s : ''
}

/** Разбор недели: ИИ-ответ выбранного напарника или честный офлайн-разбор.
 * Возвращает { text, source: 'ai' | 'offline' }. Бросает, если данных мало. */
export async function generateWeekReview(opts = {}) {
  const stats = opts.stats
  if (!stats || stats.loggedDays < REVIEW_MIN_DAYS) {
    throw new Error(`Мало данных: запишите еду хотя бы за ${REVIEW_MIN_DAYS} дня недели — тогда разбора не избежать 😉`)
  }
  try {
    // askNutritionist без systemOverride сам подставит промпт выбранного
    // медведя — «разбор от Кедра» и «от Топаза» звучат по-разному
    const reply = await askNutritionist(
      [{ role: 'user', content: buildReviewPrompt(opts) }],
      REVIEW_TIMEOUT_MS,
    )
    const text = cleanReview(reply)
    if (!text) throw new Error('empty')
    return { text, source: 'ai' }
  } catch (e) {
    console.warn('[week-review] ИИ недоступен, офлайн-разбор:', e?.message || e)
    return { text: offlineWeekReview(opts), source: 'offline' }
  }
}

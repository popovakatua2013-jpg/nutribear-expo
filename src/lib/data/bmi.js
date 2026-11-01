// Расчёт ИМТ (индекса массы тела) — категории по макету раздела «ИМТ».
// ИМТ = вес (кг) / рост² (м)

import { ACTIVITY_LEVELS } from './onboarding-options'

// Пять категорий: диапазон, название, цвет ромбика и цвет кольца.
// Диапазоны — с точками, как на фото-макете (18.5 – 24.9)
export const BMI_CATEGORIES = [
  { id: 'low', min: 0, max: 18.5, range: '< 18.5', label: 'Недостаток веса', color: '#facc15' },
  { id: 'norm', min: 18.5, max: 25, range: '18.5 – 24.9', label: 'Норма', color: '#4ade80' },
  { id: 'over', min: 25, max: 30, range: '25 – 29.9', label: 'Лишний вес', color: '#fb923c' },
  { id: 'obese1', min: 30, max: 35, range: '30 – 34.9', label: 'Ожирение I ст.', color: '#f87171' },
  { id: 'obese2', min: 35, max: Infinity, range: '35+', label: 'Ожирение II–III ст.', color: '#ef4444' },
]

// ИМТ по весу (кг) и росту (см), одна десятичная
export function calcBmi(weightKg, heightCm) {
  if (!weightKg || !heightCm) return 0
  const h = heightCm / 100
  return Math.round((weightKg / (h * h)) * 10) / 10
}

// Категория по значению ИМТ
export function bmiCategory(bmi) {
  return BMI_CATEGORIES.find((c) => bmi >= c.min && bmi < c.max) || BMI_CATEGORIES[0]
}

// Здоровый диапазон веса для роста (кг) — ИМТ 18,5…24,9
export function healthyRange(heightCm) {
  const h = (heightCm / 100) ** 2
  return { min: Math.round(18.5 * h), max: Math.round(24.9 * h) }
}

// Заполнение кольца датчика: шкала 0–40 — иначе при ИМТ ≥ 25 кольцо
// застывает на 100 % и «26» не отличить от «45»
export function gaugeFill(bmi) {
  return Math.min(100, Math.max(8, Math.round((bmi / 40) * 100)))
}

// Рекомендации: текст на карточке и советы внутри (по клику на «>»)
export const RECOMMENDATIONS = {
  low: {
    main: 'Твой вес ниже нормы. Добавь калорий: орехи, творог, бананы — и больше белка в рационе.',
    tips: [
      'Ешь 5–6 раз в день небольшими порциями',
      'Добавь калорий за счёт орехов, бананов и творога',
      'Силовые тренировки помогут набрать мышцы, а не жир',
    ],
  },
  norm: {
    main: 'Твой ИМТ в пределах нормы! Продолжай поддерживать активный образ жизни и сбалансированное питание.',
    tips: [
      'Держи норму калорий каждый день — цели уже настроены',
      'Пей достаточно воды — около 2 литров в день',
      'Ходи не меньше 7 000 шагов в день',
    ],
  },
  over: {
    main: 'Ты немного выше нормы. Небольшой дефицит калорий и прогулки быстро выровняют результат.',
    tips: [
      'Создай дефицит 300–500 ккал в день',
      'Замени сладости на фрукты и ягоды',
      'Добавь 2 000 шагов к своей дневной цели',
    ],
  },
  obese1: {
    main: 'Главное — постепенность. Считай калории, ходи больше и не пропускай приёмы пищи.',
    tips: [
      'Ставь реальную цель: минус 0,5 кг в неделю',
      'Больше белка и овощей — меньше сахара',
      'Отмечай воду и шаги в приложении каждый день',
    ],
  },
  obese2: {
    main: 'Каждый маленький шаг — уже победа. Начни с прогулок, воды и мягкого дефицита калорий.',
    tips: [
      'Начни с ежедневных прогулок по 30 минут',
      'Снижай калории плавно — без резких ограничений',
      'Обсуди план снижения веса с врачом',
    ],
  },
}

// ─── Калькулятор ИМТ: формулы по полным данным пользователя ───────────

// Уровни активности для суточной нормы (TDEE). Коэффициенты и id
// совпадают с ACTIVITY_LEVELS онбординга, подписи — короткие для чипов.
const ACTIVITY_SHORT = {
  sedentary: 'Минимальная',
  light: 'Лёгкая',
  moderate: 'Средняя',
  high: 'Высокая',
  athlete: 'Спорт / труд',
}

export const TDEE_LEVELS = ACTIVITY_LEVELS.map((l) => ({
  ...l,
  label: ACTIVITY_SHORT[l.id] || l.label,
}))

// Коэффициент активности по id (по умолчанию — лёгкая, как в онбординге)
export function tdeeMult(id) {
  return TDEE_LEVELS.find((l) => l.id === id)?.mult || 1.375
}

// Базовый обмен (формула Миффлина — Сан Жеора), ккал/день.
// Женщины: 10·вес + 6,25·рост − 5·возраст − 161
// Мужчины: 10·вес + 6,25·рост − 5·возраст + 5
export function bmrMifflin(sex, age, heightCm, weightKg) {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age
  return Math.round(sex === 'male' ? base + 5 : base - 161)
}

// Суточная норма калорий с учётом активности (TDEE = BMR × коэффициент)
export function tdeeKcal(bmr, mult) {
  return Math.round(bmr * mult)
}

// Идеальный вес (формула Девайна), кг:
// женщины 45,5 кг + 2,3 кг на каждый дюйм выше 152,4 см; мужчины 50 кг + 2,3
export function idealWeightDevine(sex, heightCm) {
  const inchesOver5ft = Math.max(0, (heightCm - 152.4) / 2.54)
  const base = sex === 'male' ? 50 : 45.5
  return Math.round((base + 2.3 * inchesOver5ft) * 10) / 10
}

// Оценка процента жира (формула Дёренберга): нужна только ИМТ, возраст и пол
export function bodyFatPercent(bmi, age, sex) {
  const raw = 1.2 * bmi + 0.23 * age - 10.8 * (sex === 'male' ? 1 : 0) - 5.4
  return Math.round(Math.min(60, Math.max(5, raw)) * 10) / 10
}

// «22.4» / «62.3» — с точкой, как на фото-макете (не локаль ru-RU с запятой)
export function fmtDecimal(n) {
  return (Math.round((n || 0) * 10) / 10).toFixed(1)
}

// Вес за неделю (Пн…Вс): реальные записи пользователя; дни без записей
// принимаются равными текущему весу — никаких вымышленных колебаний
export function weekWeights(weightKg, records) {
  const byDay = {}
  for (const r of records || []) {
    const d = new Date(r.date)
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
    if (!(key in byDay)) byDay[key] = r.kg // записи новые сверху — берём последнюю за день
  }
  const out = []
  const today = new Date()
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
    out.push({
      label: shortWeekday(d),
      kg: Math.round(((key in byDay ? byDay[key] : weightKg) || 0) * 10) / 10,
    })
  }
  return out
}

function shortWeekday(date) {
  const s = new Intl.DateTimeFormat('ru-RU', { weekday: 'short' }).format(date)
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// Числовой ключ дня (20251024) — надёжное сравнение дат без строк
const dayNum = (d) => d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate()

// «24.10» — короткая дата для месяцев и всего журнала
export function shortDate(date) {
  return new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit' }).format(date)
}

// Вес за месяц (последние 30 дней, точка каждые 3 дня). На каждый
// сэмпльный день берём последнее измерение «на тот день или раньше»;
// до самой первой записи — вес первой записи (не сегодняшний),
// иначе график рисует ложный обрыв в последних килограммах
export function monthWeights(weightKg, records) {
  const asc = (records || [])
    .map((r) => ({ t: dayNum(new Date(r.date)), kg: r.kg }))
    .sort((a, b) => a.t - b.t)
  const out = []
  const today = new Date()
  for (let i = 27; i >= 0; i -= 3) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const t = dayNum(d)
    let kg = null
    for (const r of asc) {
      if (r.t <= t) kg = r.kg
      else break
    }
    out.push({
      label: shortDate(d),
      kg: Math.round(((kg ?? asc[0]?.kg ?? weightKg) || 0) * 10) / 10,
    })
  }
  return out
}

// Весь журнал веса: одна точка на день (последняя за день), последние
// 24 дня с измерениями, старые → новые. Пустой массив, если записей нет —
// карточка тогда показывает неделю/месяц
export function allWeights(records) {
  const byDay = new Map()
  for (const r of records || []) {
    const d = new Date(r.date)
    byDay.set(dayNum(d), { d, kg: r.kg })
  }
  return [...byDay.values()]
    .sort((a, b) => a.d - b.d)
    .slice(-24)
    .map(({ d, kg }) => ({ label: shortDate(d), kg: Math.round(kg * 10) / 10 }))
}

// Сколько кг до следующей (лучшей) категории ИМТ — для подсказки
// в карточке «Что означает твой ИМТ». Граница честная: до ВЕРХНЕЙ
// кромки целевой категории (норма → до 24.9, лишний вес → до 29.9).
// Для «Нормы» лучшей категории нет — возвращаем рабочий диапазон веса.
export function kgToNextCategory(weightKg, heightCm) {
  if (!weightKg || !heightCm) return null
  const h2 = (heightCm / 100) ** 2
  const bmi = weightKg / h2
  const cat = bmiCategory(bmi)
  const fmt = (n) => (Math.round(n * 10) / 10).toFixed(1)

  if (cat.id === 'norm') {
    const { min, max } = healthyRange(heightCm)
    return {
      tone: 'ok',
      text: `Ты уже в лучшей категории! Держи вес в диапазоне ${min}–${max} кг`,
    }
  }

  // Цель — категория на шаг лучше: для «Недостатка веса» — норма
  // (набрать), для остальных — на ступень вниз (сбросить).
  // Названия — в родительном падеже: «До „Нормы“ осталось −3.7 кг»
  const GENITIVE = {
    norm: 'Нормы',
    over: 'Лишнего веса',
    obese1: 'Ожирения I ст.',
    obese2: 'Ожирения II–III ст.',
  }
  const idx = BMI_CATEGORIES.findIndex((c) => c.id === cat.id)
  const next = cat.id === 'low' ? BMI_CATEGORIES[1] : BMI_CATEGORIES[idx - 1]
  const bound = cat.id === 'low' ? 18.5 * h2 : (next.max - 0.1) * h2
  const diff = Math.round(Math.abs(weightKg - bound) * 10) / 10
  const sign = cat.id === 'low' ? '+' : '−'
  if (diff < 0.1) return { tone: 'ok', text: 'Совсем чуть-чуть — и следующая категория!' }
  return {
    tone: 'info',
    text: `До «${GENITIVE[next.id] || next.label}» осталось ${sign}${fmt(diff)} кг`,
  }
}

// Сколько полных недель ИМТ держится в «Норме» — для бейджа у кольца.
// Считаем по журналу: идём от свежих измерений назад и ищем последнее,
// при котором ИМТ был вне нормы; стрик начинается со следующего дня.
// Нет записей или сейчас вне нормы — стрика нет (0).
export function normStreakWeeks(weightKg, records, heightCm) {
  if (!weightKg || !heightCm) return 0
  const h2 = (heightCm / 100) ** 2
  const inNorm = (kg) => {
    const b = kg / h2
    return b >= 18.5 && b < 25
  }
  if (!inNorm(weightKg)) return 0

  const midnight = (d) => {
    const x = new Date(d)
    x.setHours(0, 0, 0, 0)
    return x.getTime()
  }
  const days = (records || [])
    .map((r) => ({ t: midnight(new Date(r.date)), kg: r.kg }))
    .sort((a, b) => b.t - a.t) // новые сверху
  if (!days.length) return 0

  // Свежайшее измерение вне нормы; если таких нет — стрик с первой записи
  const lastBad = days.find((d) => !inNorm(d.kg))
  const start = lastBad ? lastBad.t : days[days.length - 1].t
  const today = midnight(new Date())
  const daysIn = Math.floor((today - start) / 86400000)
  return Math.max(0, Math.floor(daysIn / 7))
}

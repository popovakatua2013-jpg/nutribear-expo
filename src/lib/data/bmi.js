// Расчёт ИМТ (индекса массы тела) — категории по макету раздела «Тело».
// ИМТ = вес (кг) / рост² (м)

import { ACTIVITY_LEVELS } from './onboarding-options'
// shortWeekday — один на проект («Пн»…«Вс»): раньше в bmi.js была
// своя приватная копия, байтово равная экспорту из activity.js
import { shortWeekday } from './activity'

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

// Краткое пояснение под чипами активности (отзыв Кати, «делаем» на
// рекомендацию): связь «активность → суточная норма → цель дневника»
// живыми цифрами калькулятора. Это НЕ подсказка-перечисление формул
// (её убирали в 4d225ae) — имена формул не называем, только то, что
// норма растёт от активности и как от неё считается цель в «Моей цели»
// (путь пересборки цели: «Ещё» → «Моя цель» → пересчитать под вас).
export function tdeeExplainer(sex, bmr, mult, tdee) {
  const m = String(Math.round(mult * 1000) / 1000).replace('.', ',')
  const floor = sex === 'male' ? 1500 : 1200
  return (
    `Суточная норма — это базовый обмен, умноженный на коэффициент активности: ` +
    `${bmr} × ${m} ≈ ${tdee} ккал. Выберешь активность выше — норма станет больше. ` +
    `От этой нормы считается цель в «Моей цели» (раздел «Ещё»): например, ` +
    `«Похудение» — минус ~500 ккал, но не ниже ${floor} ккал.`
  )
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

// Уровень жира для расцветки строки «Жир в организме» (решение
// пользователя: норма — зелёным, предожирение — оранжевым, ожирение —
// красным; цвет строки и цифр). Пороги по полу: женщины — норма < 32 %,
// ожирение ≥ 35 %; мужчины — норма < 25 %, ожирение ≥ 30 %; между —
// предожирение. Цвета — из палитры категорий ИМТ (norm/over/obese1)
export function bodyFatLevel(fatPct, sex) {
  const normMax = sex === 'male' ? 25 : 32
  const obeseMin = sex === 'male' ? 30 : 35
  if (fatPct >= obeseMin) return { id: 'obese', label: 'ожирение', color: '#f87171' }
  if (fatPct >= normMax) return { id: 'pred', label: 'предожирение', color: '#fb923c' }
  return { id: 'norm', label: 'норма', color: '#4ade80' }
}

// «22,4» / «62,3» — с запятой, как принято в русских интерфейсах
// (отзыв Кати: «2,3 л» и «55,0 кг» — везде единый десятичный разделитель)
export function fmtDecimal(n) {
  return (Math.round((n || 0) * 10) / 10).toFixed(1).replace('.', ',')
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

// Числовой ключ дня (20251024) — надёжное сравнение дат без строк
const dayNum = (d) => d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate()

// «24.10» — короткая числовая дата для месяцев и всего журнала.
// Имя shortDateNum — чтобы не путать со shortDate из activity.js
// (там формат «3 ноя» — подписи дней графиков дневника)
export function shortDateNum(date) {
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
      label: shortDateNum(d),
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
    .map(({ d, kg }) => ({ label: shortDateNum(d), kg: Math.round(kg * 10) / 10 }))
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
  const fmt = (n) => (Math.round(n * 10) / 10).toFixed(1).replace('.', ',')

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

// ─── «Общий прогресс» тела и поддержка под графиком веса ────────────

// Подпись-поддержка под графиком веса («Ваш вес стабилен…», как на
// макете). delta — изменение веса за выбранный период в кг,
// towardGoal — движется ли вес к цели (true — к цели, false — от цели,
// null/undefined — цели нет), towardNorm — движение к здоровой норме
// (используется, когда цели нет: текст без слова «цель»),
// goalReached — цель уже достигнута; goalPendingKg — сколько кг осталось
// до недостигнутой цели (для честной подсказки, когда вес стоит),
// gaining — цель «набрать» (совет в стабильной фазе).
// Тон: stable — всё спокойно (зелёный лайк), good — похвала,
// push — стоит на месте, но до цели далеко (янтарный, без похвалы),
// bad — мягкая поддержка без оценщины
export function weightStrip({
  delta = 0,
  towardGoal = null,
  towardNorm = null,
  goalReached = false,
  goalPendingKg = null,
  gaining = false,
}) {
  if (goalReached) {
    return {
      tone: 'good',
      title: 'Цель достигнута!',
      text: 'Удерживайте результат — взвешивайтесь раз в неделю.',
    }
  }
  if (delta === 0) {
    // Вес стоит на месте, а цель ещё НЕ достигнута, — хвалить нельзя
    // (отзыв Кати: недобор веса, цель «набрать», а приложение хвалило
    // за стабильность). Честно: сколько осталось и что делать дальше
    if (goalPendingKg != null) {
      return {
        tone: 'push',
        title: 'Вес стоит на месте',
        text: gaining
          ? `До цели ещё ${fmtDecimal(goalPendingKg)} кг. Добавьте калорий — и вес снова сдвинется!`
          : `До цели ещё ${fmtDecimal(goalPendingKg)} кг. Чуть снизьте калорийность — и вес снова сдвинется!`,
      }
    }
    return {
      tone: 'stable',
      title: 'Ваш вес стабилен',
      text: 'Отличная работа! Продолжайте в том же духе.',
    }
  }
  if (towardGoal === true) {
    return {
      tone: 'good',
      title: 'Вес движется к цели',
      text: 'Отличный темп — продолжайте в том же духе!',
    }
  }
  if (towardGoal === false) {
    return {
      tone: 'bad',
      title: 'Вес уходит от цели',
      text: 'Не сдавайтесь — регулярность важнее скорости!',
    }
  }
  // Цели нет — говорим про норму, а не про «цель» (она не задана)
  if (towardNorm === true) {
    return {
      tone: 'good',
      title: 'Вес движется к норме',
      text: 'Отличный темп — продолжайте в том же духе!',
    }
  }
  if (towardNorm === false) {
    return {
      tone: 'bad',
      title: 'Вес уходит от нормы',
      text: 'Не сдавайтесь — регулярность важнее скорости!',
    }
  }
  // Ни цели, ни нормы (запасной вариант) — нейтрально по динамике
  if (delta < 0) {
    return {
      tone: 'good',
      title: 'Вес пошёл вниз',
      text: 'Отличный сдвиг — продолжайте в том же духе!',
    }
  }
  return {
    tone: 'stable',
    title: 'Вес пошёл вверх',
    text: 'Следите за динамикой — дневник и замеры помогут.',
  }
}

// Оценка «Общий прогресс» 0–100 для карточки замеров. Три части:
//   вес (до 60) — пройденный путь от первого измерения к цели
//   (работает и на похудение, и на набор); без цели — позиция ИМТ
//   (норма 60 → ожирение II–III 12); цель есть, динамики ещё нет — 24;
//   замеры (до 25) — талия и живот: минус сантиметры = прогресс
//   (−1 см и больше — 12.5, чуть меньше — 9, на месте — 6, плюс — 3,
//   динамики пока нет — 4);
//   регулярность (до 15) — замеры с данными (по 4, максимум 12) и
//   свежая запись веса за последние 7 дней (+3).
export function bodyProgressScore({
  weightKg = 0,
  weights = [],
  goalWeightKg = null,
  heightCm = 0,
  measurements = {},
  now = new Date(),
}) {
  const clamp01 = (x) => Math.min(1, Math.max(0, x))

  // ВЕС
  const oldest = weights.length ? weights[weights.length - 1] : null
  const atGoal = goalWeightKg != null && Math.abs(weightKg - goalWeightKg) < 0.05
  const hasPath =
    goalWeightKg != null &&
    oldest &&
    weights.length >= 2 &&
    Math.abs(oldest.kg - goalWeightKg) > 0.05
  let weightPart
  if (atGoal) {
    weightPart = 60
  } else if (hasPath) {
    weightPart = clamp01((oldest.kg - weightKg) / (oldest.kg - goalWeightKg)) * 60
  } else if (goalWeightKg != null) {
    weightPart = 24
  } else {
    weightPart =
      { norm: 60, low: 36, over: 32, obese1: 20, obese2: 12 }[
        bmiCategory(calcBmi(weightKg, heightCm)).id
      ] ?? 24
  }

  // ЗАМЕРЫ: талия/живот — «похудательные», минус сантиметры это прогресс
  let measurePart = 0
  for (const key of ['waist', 'belly']) {
    const list = measurements[key] || []
    if (list.length >= 2) {
      const d = Math.round((list[0].cm - list[list.length - 1].cm) * 10) / 10
      measurePart += d <= -1 ? 12.5 : d < 0 ? 9 : d === 0 ? 6 : 3
    } else {
      measurePart += 4
    }
  }

  // РЕГУЛЯРНОСТЬ: замеры с данными + свежий вес за последние 7 дней
  const withData = Object.keys(measurements).filter(
    (k) => (measurements[k] || []).length > 0
  )
  let regularity = Math.min(3, withData.length) * 4
  if (weights[0]?.date && now - new Date(weights[0].date) <= 7 * 86400000) {
    regularity += 3
  }

  const score = Math.round(
    Math.min(100, Math.max(0, weightPart + measurePart + regularity))
  )
  return { score, caption: scoreCaption(score), stars: scoreStars(score) }
}

// Подпись к оценке «Общего прогресса» по шкале
export function scoreCaption(score) {
  if (score >= 85) return 'Отличный прогресс!'
  if (score >= 65) return 'Хороший результат!'
  if (score >= 40) return 'Есть движение!'
  return 'Начало положено!'
}

// Звёзды 0…5 с шагом 0,5 (85 баллов → 4.5, как на макете)
export function scoreStars(score) {
  return Math.round((Math.min(100, Math.max(0, score)) / 20) * 2) / 2
}

// ─── Совет дня ───────────────────────────────────────────────────────

// Восемь советов про вес, замеры и регулярность — один на день
export const TIPS_OF_DAY = [
  'Регулярные измерения помогают лучше отслеживать прогресс.',
  'Взвешивайтесь утром натощак — так цифры честнее.',
  'Талия уменьшается даже тогда, когда вес стоит: замеры не врут.',
  'Один сантиметр с талии — это примерно минус килограмм жира.',
  'Стакан воды перед едой — проще держать норму калорий.',
  'Прогулка после ужина помогает и весам, и сну.',
  'Фото-прогресс раз в месяц видит то, что цифры скрывают.',
  'Ставьте цель по весу — путь короче, а мотивация крепче.',
]

// Совет дня: по дню года — один и тот же в течение суток
export function tipOfDay(now = new Date()) {
  const start = new Date(now.getFullYear(), 0, 0)
  const doy = Math.floor((now.getTime() - start.getTime()) / 86400000)
  return TIPS_OF_DAY[doy % TIPS_OF_DAY.length]
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

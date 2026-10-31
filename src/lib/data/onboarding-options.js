// Константы анкеты онбординга: цели, темп, активность, состояния.
// Используются шагами онбординга и расчётом плана (onboarding.js).
// Блоки «Мотивация», «Пищевые привычки» и «Привычки» срезаны ради
// быстрого опроса — их константы (WHY/DIET/BEHAVIOR и пр.) удалены
// как мёртвый код, вернуть можно из истории git.

export const GOAL_OPTIONS = [
  { id: 'lose', emoji: '🔥', label: 'Похудеть', hint: 'мягкий дефицит калорий' },
  { id: 'maintain', emoji: '⚖️', label: 'Поддержать вес', hint: 'держать текущую форму' },
  { id: 'gain', emoji: '💪', label: 'Набрать вес', hint: 'профицит для роста мышц' },
]

// Темп изменения веса, кг в неделю → дефицит/профицит ккал в день
export const PACE_OPTIONS = [
  { value: 0.25, label: '0.25 кг/нед', hint: 'мягко' },
  { value: 0.5, label: '0.5 кг/нед', hint: 'рекомендуется' },
  { value: 1, label: '1 кг/нед', hint: 'быстро' },
]

// 5 классических уровней активности (множители TDEE)
export const ACTIVITY_LEVELS = [
  { id: 'sedentary', mult: 1.2, label: 'Сидячая работа', hint: 'мало движения, нет тренировок' },
  { id: 'light', mult: 1.375, label: 'Лёгкая активность', hint: 'прогулки, 1–3 тренировки в неделю' },
  { id: 'moderate', mult: 1.55, label: 'Средняя', hint: '3–5 тренировок в неделю' },
  { id: 'high', mult: 1.725, label: 'Высокая', hint: '6–7 тренировок в неделю' },
  { id: 'athlete', mult: 1.9, label: 'Тяжёлая физическая работа', hint: 'спорт + физический труд' },
]

export const STEPS_OPTIONS = [
  { value: 'lt3', label: 'до 3 тыс.' },
  { value: '3-5', label: '3–5 тыс.' },
  { value: '5-8', label: '5–8 тыс.' },
  { value: '8-12', label: '8–12 тыс.' },
  { value: 'gt12', label: '12+ тыс.' },
]

export const WORKOUT_OPTIONS = [
  { value: '0', label: 'Не тренируюсь' },
  { value: '1-2', label: '1–2 р/нед' },
  { value: '3-4', label: '3–4 р/нед' },
  { value: '4+', label: '5+ р/нед' },
]

export const WATER_BY_ANSWER = { lt4: 1500, '4-6': 1800, '6-8': 2000, gt8: 2500 }
export const STEPS_BY_ANSWER = { lt3: 3000, '3-5': 5000, '5-8': 7000, '8-12': 10000, gt12: 13000 }

// Особые состояния — только флаги, БЕЗ медицинских рекомендаций
export const SPECIAL_OPTIONS = [
  { id: 'pregnant', label: 'Беременность' },
  { id: 'lactating', label: 'Грудное вскармливание' },
  { id: 'diabetes', label: 'Диабет' },
  { id: 'pcos', label: 'СПКЯ' },
  { id: 'pressure', label: 'Повышенное давление' },
  { id: 'glp1', label: 'Принимаю GLP-1 (Оземпик и аналоги)' },
]

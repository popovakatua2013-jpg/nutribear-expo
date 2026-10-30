// Константы анкеты онбординга: цели, темп, активность, привычки, состояния.
// Используются шагами онбординга и расчётом плана (onboarding.js).

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

export const WHY_OPTIONS = [
  { id: 'health', emoji: '❤️', label: 'Здоровье' },
  { id: 'confidence', emoji: '✨', label: 'Уверенность' },
  { id: 'event', emoji: '🎉', label: 'Событие' },
  { id: 'energy', emoji: '⚡', label: 'Энергия' },
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

export const DIET_TYPES = [
  { id: 'classic', emoji: '🍽️', label: 'Обычное' },
  { id: 'veg', emoji: '🥗', label: 'Вегетарианское' },
  { id: 'vegan', emoji: '🌱', label: 'Веган' },
  { id: 'keto', emoji: '🥑', label: 'Кето' },
  { id: 'lowcarb', emoji: '🍞', label: 'Низкоуглеводное' },
  { id: 'medit', emoji: '🫒', label: 'Средиземноморское' },
]

export const ALLERGENS = ['Глютен', 'Лактоза', 'Орехи', 'Свинина']

export const MEALS_DAY_OPTIONS = [
  { value: '3', label: '3 приёма' },
  { value: '3+2', label: '3 + 2 перекуса' },
  { value: '2', label: '2 приёма' },
]

export const COOKING_OPTIONS = [
  { value: 'home', label: 'Готовлю дома' },
  { value: 'mix', label: '50 / 50' },
  { value: 'eatout', label: 'Чаще вне дома' },
]

// Поведенческие вопросы (Noom-style): для коучинговых подсказок
export const BEHAVIOR = [
  { key: 'night', q: 'Едите ли по ночам?', options: [['no', 'Нет'], ['sometimes', 'Иногда'], ['often', 'Часто']] },
  { key: 'stress', q: 'Заедаете ли стресс?', options: [['no', 'Нет'], ['sometimes', 'Иногда'], ['often', 'Часто']] },
  { key: 'waterDay', q: 'Сколько воды пьёте в день?', options: [['lt4', 'Меньше 4 ст.'], ['4-6', '4–6 ст.'], ['6-8', '6–8 ст.'], ['gt8', 'Больше 8']] },
  { key: 'alcohol', q: 'Как часто употребляете алкоголь?', options: [['no', 'Не пью'], ['rare', 'Редко'], ['often', 'Регулярно']] },
  { key: 'dietsTried', q: 'Пробовали ли диеты раньше?', options: [['no', 'Нет'], ['yes-no', 'Да, не сработало'], ['yes-ok', 'Да, с результатом']] },
  { key: 'sleep', q: 'Как качество сна?', options: [['good', 'Хорошо'], ['mid', 'Средне'], ['bad', 'Плохо']] },
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

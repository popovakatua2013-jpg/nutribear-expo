// Каталог упражнений (MET — metabolic equivalent of task).
// Сожжённые ккал = MET × 3.5 × вес(кг) / 200 × минуты.
// typ — типичная длительность, мин: подсказка «рекомендуем N мин»
// в окне тренировки (тап подставляет её в чипы минут; после выбора
// подсказка исчезает).

export const EXERCISES = [
  { id: 'walk', emoji: '🚶', name: 'Ходьба', met: 3.5, typ: 30 },
  { id: 'walk-fast', emoji: '🚶', name: 'Ходьба быстрая', met: 5.0, typ: 30 },
  { id: 'jog', emoji: '🏃', name: 'Бег трусцой', met: 7.0, typ: 30 },
  { id: 'run', emoji: '🏃', name: 'Бег', met: 9.8, typ: 45 },
  { id: 'bike', emoji: '🚴', name: 'Велосипед', met: 7.5, typ: 45 },
  { id: 'swim', emoji: '🏊', name: 'Плавание', met: 8.0, typ: 30 },
  { id: 'strength', emoji: '🏋️', name: 'Силовая тренировка', met: 5.0, typ: 45 },
  { id: 'yoga', emoji: '🧘', name: 'Йога', met: 3.0, typ: 60 },
  { id: 'football', emoji: '⚽', name: 'Футбол', met: 8.5, typ: 60 },
  { id: 'tennis', emoji: '🎾', name: 'Теннис', met: 7.3, typ: 60 },
  { id: 'dance', emoji: '💃', name: 'Танцы', met: 6.0, typ: 45 },
  { id: 'elliptical', emoji: '🌀', name: 'Эллипсоид', met: 5.5, typ: 30 },
]

export const QUICK_MINUTES = [15, 30, 45, 60, 90]

// Для «своей тренировки»: набор иконок и уровни интенсивности (MET).
// Интенсивность выбрана человеческими словами — MET считается внутри.
export const CUSTOM_EMOJIS = ['🔥', '🥊', '🏸', '⛷️', '🚣', '🤸', '🧗', '🥋', '🏄', '⛹️']

export const INTENSITY_LEVELS = [
  { id: 'low', label: 'Лёгкая', met: 3.5 },
  { id: 'mid', label: 'Средняя', met: 5.5 },
  { id: 'high', label: 'Высокая', met: 8 },
  { id: 'peak', label: 'Максимум', met: 10 },
]

export function intensityMet(levelId) {
  return INTENSITY_LEVELS.find((l) => l.id === levelId)?.met || INTENSITY_LEVELS[1].met
}

export function kcalBurned(met, weightKg, minutes) {
  return Math.round(((met * 3.5 * weightKg) / 200) * minutes)
}

// Разобрать вписанное вручную число калорий (просьба Кати 11.11: «править
// ккал вручную» в окне счётчика). Строка или число → целое от 1 до max;
// пусто, мусор или выход за диапазон → null (значит «автоподсчёт»).
// Запятая принимается как разделитель дробной части, результат округляется.
export function parseManualKcal(v, max = 10000) {
  const n = Math.round(Number(String(v ?? '').trim().replace(',', '.')) || 0)
  if (!Number.isFinite(n) || n < 1 || n > max) return null
  return n
}

export function getExercise(id) {
  return EXERCISES.find((e) => e.id === id) || EXERCISES[0]
}

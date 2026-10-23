// Каталог упражнений (MET — metabolic equivalent of task).
// Сожжённые ккал = MET × 3.5 × вес(кг) / 200 × минуты.

export const EXERCISES = [
  { id: 'walk', emoji: '🚶', name: 'Ходьба', met: 3.5 },
  { id: 'run', emoji: '🏃', name: 'Бег', met: 9.8 },
  { id: 'bike', emoji: '🚴', name: 'Велосипед', met: 7.5 },
  { id: 'swim', emoji: '🏊', name: 'Плавание', met: 8.0 },
  { id: 'strength', emoji: '🏋️', name: 'Силовая тренировка', met: 5.0 },
  { id: 'yoga', emoji: '🧘', name: 'Йога', met: 3.0 },
  { id: 'football', emoji: '⚽', name: 'Футбол', met: 8.5 },
  { id: 'tennis', emoji: '🎾', name: 'Теннис', met: 7.3 },
  { id: 'dance', emoji: '💃', name: 'Танцы', met: 6.0 },
  { id: 'elliptical', emoji: '🌀', name: 'Эллипсоид', met: 5.5 },
]

export const QUICK_MINUTES = [15, 30, 45, 60, 90]

export function kcalBurned(met, weightKg, minutes) {
  return Math.round(((met * 3.5 * weightKg) / 200) * minutes)
}

export function getExercise(id) {
  return EXERCISES.find((e) => e.id === id) || EXERCISES[0]
}

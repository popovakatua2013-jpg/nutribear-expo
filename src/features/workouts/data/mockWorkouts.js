// src/features/workouts/data/mockWorkouts.js — каталог тренировок вкладки
// Вшит в бандл: вкладка полностью работает офлайн. Сессии (журнал) живут
// отдельно — в zustand-сторе с AsyncStorage.

export const MOCK_WORKOUTS = [
  {
    id: 'w-upper',
    title: { ru: 'Силовая: верх тела', en: 'Strength: Upper Body' },
    type: 'strength', durationMin: 35, kcal: 280, level: 'intermediate',
    gradient: ['#2E4A3F', '#16281F'], recommended: false,
  },
  {
    id: 'w-hiit-burn',
    title: { ru: 'HIIT: жиросжигание', en: 'HIIT: Fat Burn' },
    type: 'hiit', durationMin: 20, kcal: 240, level: 'intermediate',
    gradient: ['#4A3A2E', '#241C14'], recommended: true,
  },
  {
    id: 'w-morning-yoga',
    title: { ru: 'Утренняя йога', en: 'Morning Yoga' },
    type: 'yoga', durationMin: 15, kcal: 80, level: 'beginner',
    gradient: ['#3A4A6B', '#1A2233'], recommended: true,
  },
  {
    id: 'w-legs',
    title: { ru: 'Ноги и ягодицы', en: 'Legs & Glutes' },
    type: 'strength', durationMin: 40, kcal: 350, level: 'advanced',
    gradient: ['#4A2E3F', '#24141C'], recommended: true,
  },
  {
    id: 'w-cardio-walk',
    title: { ru: 'Кардио: ходьба с интервалами', en: 'Cardio: Interval Walk' },
    type: 'cardio', durationMin: 25, kcal: 180, level: 'beginner',
    gradient: ['#2E4A5A', '#141F26'], recommended: false,
  },
  {
    id: 'w-stretch-eve',
    title: { ru: 'Вечерняя растяжка', en: 'Evening Stretch' },
    type: 'stretch', durationMin: 12, kcal: 45, level: 'beginner',
    gradient: ['#3F3A5A', '#1C1A29'], recommended: false,
  },
  {
    id: 'w-core',
    title: { ru: 'Кор и пресс', en: 'Core & Abs' },
    type: 'strength', durationMin: 18, kcal: 160, level: 'intermediate',
    gradient: ['#2E5A4A', '#14261F'], recommended: false,
  },
  {
    id: 'w-tabata',
    title: { ru: 'Табата экспресс', en: 'Express Tabata' },
    type: 'hiit', durationMin: 10, kcal: 120, level: 'intermediate',
    gradient: ['#5A4A2E', '#262014'], recommended: false,
  },
]

/** Эмодзи типа — для записи в дневник тренировок приложения */
export const TYPE_EMOJI = {
  strength: '🏋️',
  cardio: '🏃',
  hiit: '⚡',
  yoga: '🧘',
  stretch: '🤸',
}

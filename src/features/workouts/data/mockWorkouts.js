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
  // ── Расширение каталога (отзыв Кати: «больше тренировок») ────────────
  {
    id: 'w-abs',
    title: { ru: 'Живот и талия', en: 'Abs & Waist' },
    type: 'strength', durationMin: 20, kcal: 200, level: 'intermediate',
    gradient: ['#4A2E2E', '#241414'], recommended: true,
    // Индивидуальный набор: только упражнения на пресс и талию
    exerciseIds: ['x-crunch', 'x-bicycle', 'x-legraise', 'x-russian', 'x-sideplank', 'x-deadbug'],
  },
  {
    id: 'w-back',
    title: { ru: 'Спина и осанка', en: 'Back & Posture' },
    type: 'strength', durationMin: 25, kcal: 210, level: 'intermediate',
    gradient: ['#3E4A2E', '#1C2414'], recommended: false,
    exerciseIds: ['s-superman', 'b-birddog', 'y-cat-cow', 'b-cobra', 'b-reverseplank', 'b-chest', 's-bridge'],
  },
  {
    id: 'w-morning',
    title: { ru: 'Утренняя зарядка', en: 'Morning Warm-Up' },
    type: 'cardio', durationMin: 5, kcal: 35, level: 'beginner',
    gradient: ['#3E5A2E', '#1C2614'], recommended: true,
    // Лёгкий набор без прыжков; флаг noWarmup — зарядка сама и есть разминка
    noWarmup: true,
    exerciseIds: ['c-march', 'c-step-touch', 'c-jack', 'c-shuffle'],
  },
  {
    id: 'w-prenatal',
    title: { ru: 'Для беременных: лёгкая', en: 'Prenatal: Gentle' },
    type: 'yoga', durationMin: 15, kcal: 60, level: 'beginner',
    gradient: ['#4A3E5A', '#241C29'], recommended: false,
    // Мягкий набор без нагрузки на живот; йога — без авто-разминки/заминки
    exerciseIds: ['p-pelvic', 'y-cat-cow', 'p-sideleg', 'p-wallpushup', 'y-child', 'p-breath'],
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

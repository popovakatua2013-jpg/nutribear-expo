// src/features/workouts/data/exerciseLibrary.js — библиотека упражнений плеера
// (по референсу плеера, раздел 6.2). Названия двуязычные, как и весь
// контракт данных вкладки: локализация не зависит от слоя UI.
// Пока каталог вшит в бандл, плансбордер собирает из неё план по
// типу/длительности тренировки; если у тренировки появится свой список
// упражнений — planBuilder возьмёт его.

const ex = (id, ru, en, durationSec, restSec) => ({
  id,
  name: { ru, en },
  durationSec,
  restSec,
})

/** Силовые */
export const STRENGTH = [
  ex('s-squat', 'Приседания', 'Squats', 45, 20),
  ex('s-pushup', 'Отжимания', 'Push-ups', 40, 20),
  ex('s-lunge', 'Выпады', 'Lunges', 45, 20),
  ex('s-plank', 'Планка', 'Plank', 40, 20),
  ex('s-bridge', 'Ягодичный мост', 'Glute Bridge', 40, 15),
  ex('s-superman', 'Супермен', 'Superman', 35, 15),
]

/** Кардио */
export const CARDIO = [
  ex('c-march', 'Ходьба на месте', 'March in Place', 60, 15),
  ex('c-jack', 'Джампинг-джек', 'Jumping Jacks', 45, 20),
  ex('c-high-knees', 'Бег с высоким коленом', 'High Knees', 40, 20),
  ex('c-step-touch', 'Шаги в сторону', 'Step Touch', 60, 15),
  ex('c-shuffle', 'Приставные шаги с махом', 'Side Shuffle', 45, 20),
]

/** HIIT */
export const HIIT = [
  ex('h-burpee', 'Бёрпи', 'Burpees', 30, 20),
  ex('h-mountain', 'Скалолаз', 'Mountain Climbers', 35, 20),
  ex('h-jack', 'Джампинг-джек', 'Jumping Jacks', 40, 15),
  ex('squat-jump', 'Прыжки в приседе', 'Squat Jumps', 30, 20),
  ex('h-skater', 'Конькобежец', 'Skaters', 35, 20),
]

/** Йога */
export const YOGA = [
  ex('y-cat-cow', 'Кошка-корова', 'Cat-Cow', 60, 5),
  ex('y-down-dog', 'Собака мордой вниз', 'Downward Dog', 50, 5),
  ex('y-warrior', 'Воин I', 'Warrior I', 45, 5),
  ex('y-child', 'Поза ребёнка', "Child's Pose", 50, 5),
  ex('y-tree', 'Дерево', 'Tree Pose', 45, 5),
]

/** Растяжка */
export const STRETCH = [
  ex('st-hamstring', 'Растяжка задней поверхности бедра', 'Hamstring Stretch', 50, 5),
  ex('st-quad', 'Растяжка квадрицепса', 'Quad Stretch', 45, 5),
  ex('st-shoulder', 'Растяжка плеч', 'Shoulder Stretch', 40, 5),
  ex('st-neck', 'Растяжка шеи', 'Neck Stretch', 35, 5),
  ex('st-twist', 'Скручивание сидя', 'Seated Twist', 45, 5),
]

/** Индекс по типу тренировки */
export const LIBRARY = {
  strength: STRENGTH,
  cardio: CARDIO,
  hiit: HIIT,
  yoga: YOGA,
  stretch: STRETCH,
}

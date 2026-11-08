// src/features/workouts/data/programs.js — готовые программы на неделю
// (отзыв Кати: «делаем все»). Программа — недельный шаблон: 7 дней,
// в каждом либо тренировка из каталога, либо отдых. Прогресс считается
// по журналу сессий: день закрыт, если у его тренировки есть завершённая
// сессия за эту дату (селектор selectProgramState в сторе).

export const PROGRAMS = [
  {
    id: 'p-start',
    title: { ru: 'Старт: 3 дня в неделю', en: 'Starter: 3 Days a Week' },
    level: 'beginner',
    desc: {
      ru: 'Мягкое начало: зарядка, йога и ходьба без прыжков.',
      en: 'A gentle start: warm-up, yoga and no-jump walking.',
    },
    days: [
      { workoutId: 'w-morning-yoga' },
      { rest: true },
      { workoutId: 'w-cardio-walk' },
      { rest: true },
      { workoutId: 'w-stretch-eve' },
      { rest: true },
      { rest: true },
    ],
  },
  {
    id: 'p-burn',
    title: { ru: 'Жиросжигание: 4 дня', en: 'Fat Burn: 4 Days' },
    level: 'intermediate',
    desc: {
      ru: 'Интервалы и кардио: интенсивно, но с днями восстановления.',
      en: 'Intervals and cardio: intense, with recovery days.',
    },
    days: [
      { workoutId: 'w-hiit-burn' },
      { workoutId: 'w-cardio-walk' },
      { rest: true },
      { workoutId: 'w-tabata' },
      { rest: true },
      { workoutId: 'w-legs' },
      { rest: true },
    ],
  },
  {
    id: 'p-tone',
    title: { ru: 'Тонус: 5 дней', en: 'Tone: 5 Days' },
    level: 'intermediate',
    desc: {
      ru: 'Силовые на пресс, спину и ноги плюс кардио для выносливости.',
      en: 'Strength for abs, back and legs plus cardio for endurance.',
    },
    days: [
      { workoutId: 'w-abs' },
      { workoutId: 'w-back' },
      { rest: true },
      { workoutId: 'w-upper' },
      { workoutId: 'w-cardio-walk' },
      { workoutId: 'w-morning-yoga' },
      { rest: true },
    ],
  },
]

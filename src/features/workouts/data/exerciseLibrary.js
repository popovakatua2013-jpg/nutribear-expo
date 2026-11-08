// src/features/workouts/data/exerciseLibrary.js — библиотека упражнений плеера
// (по референсу плеера, раздел 6.2). Названия двуязычные, как и весь
// контракт данных вкладки: локализация не зависит от слоя UI.
// Помимо длительности у каждого упражнения есть наглядная пиктограмма
// (emoji) и короткая подсказка по технике tip — что учитывать при
// выполнении. Плеер показывает их в центре экрана во время упражнения,
// при отсчёте и в отдыхе (успеть прочитать, что дальше).
// Пока каталог вшит в бандл, плансбордер собирает из неё план по
// типу/длительности тренировки; если у тренировки появится свой список
// упражнений — planBuilder возьмёт его.

const ex = (id, ru, en, durationSec, restSec, emoji, tipRu, tipEn) => ({
  id,
  name: { ru, en },
  durationSec,
  restSec,
  emoji,
  tip: { ru: tipRu, en: tipEn },
})

/** Силовые */
export const STRENGTH = [
  ex('s-squat', 'Приседания', 'Squats', 45, 20, '🦵',
    'Спина прямая, колени не выходят за носки', 'Back straight, knees behind toes'),
  ex('s-pushup', 'Отжимания', 'Push-ups', 40, 20, '💪',
    'Тело в одной линии, локти под 45°', 'Body in one line, elbows at 45°'),
  ex('s-lunge', 'Выпады', 'Lunges', 45, 20, '🚶',
    'Колено передней ноги — над стопой', 'Front knee stays over the ankle'),
  ex('s-plank', 'Планка', 'Plank', 40, 20, '🧱',
    'Пресс напряжён, поясница не провисает', 'Abs tight, lower back does not sag'),
  ex('s-bridge', 'Ягодичный мост', 'Glute Bridge', 40, 15, '🌉',
    'В верхней точке сжимайте ягодицы', 'Squeeze your glutes at the top'),
  ex('s-superman', 'Супермен', 'Superman', 35, 15, '🦸',
    'Поднимайте плечи и ноги плавно', 'Lift shoulders and legs smoothly'),
]

/** Кардио */
export const CARDIO = [
  ex('c-march', 'Ходьба на месте', 'March in Place', 60, 15, '🚶‍♀️',
    'Работайте руками, дышите ровно', 'Swing your arms, breathe evenly'),
  ex('c-jack', 'Джампинг-джек', 'Jumping Jacks', 45, 20, '🤸',
    'Приземляйтесь мягко на носки', 'Land softly on your toes'),
  ex('c-high-knees', 'Бег с высоким коленом', 'High Knees', 40, 20, '🏃',
    'Колено — до уровня таза, спина прямо', 'Knees to hip height, torso upright'),
  ex('c-step-touch', 'Шаги в сторону', 'Step Touch', 60, 15, '👣',
    'Шаг шире, колени мягкие', 'Wide steps, soft knees'),
  ex('c-shuffle', 'Приставные шаги с махом', 'Side Shuffle', 45, 20, '🕺',
    'Мах — без рывков, в такт шагам', 'Swing smoothly in step with your feet'),
]

/** HIIT */
export const HIIT = [
  ex('h-burpee', 'Бёрпи', 'Burpees', 30, 20, '🤾',
    'Отжимание — с прямой спиной', 'Keep your back straight in the push-up'),
  ex('h-mountain', 'Скалолаз', 'Mountain Climbers', 35, 20, '🧗',
    'Таз не задирайте, пресс в напряжении', 'Keep hips low, abs engaged'),
  ex('h-jack', 'Джампинг-джек', 'Jumping Jacks', 40, 15, '🤸',
    'Приземляйтесь мягко на носки', 'Land softly on your toes'),
  ex('squat-jump', 'Прыжки в приседе', 'Squat Jumps', 30, 20, '🦘',
    'Приземляйтесь мягко, колени по носкам', 'Land softly, knees track toes'),
  ex('h-skater', 'Конькобежец', 'Skaters', 35, 20, '⛸️',
    'Небольшой наклон вперёд, колено — над стопой', 'Lean forward slightly, knee over foot'),
]

/** Йога */
export const YOGA = [
  ex('y-cat-cow', 'Кошка-корова', 'Cat-Cow', 60, 5, '🐈',
    'Двигайтесь в такт дыханию', 'Move with your breath'),
  ex('y-down-dog', 'Собака мордой вниз', 'Downward Dog', 50, 5, '🐕',
    'Колени можно согнуть, спина — длинная', 'Bend knees if needed, keep spine long'),
  ex('y-warrior', 'Воин I', 'Warrior I', 45, 5, '🏹',
    'Бёдра вперёд, плечи вниз', 'Hips forward, shoulders down'),
  ex('y-child', 'Поза ребёнка', "Child's Pose", 50, 5, '👶',
    'Дышите медленно и глубоко', 'Breathe slowly and deeply'),
  ex('y-tree', 'Дерево', 'Tree Pose', 45, 5, '🌳',
    'Взгляд в одну точку, стопа — к бедру', 'Eyes on one spot, foot at the inner thigh'),
]

/** Растяжка */
export const STRETCH = [
  ex('st-hamstring', 'Растяжка задней поверхности бедра', 'Hamstring Stretch', 50, 5, '🙇',
    'Тяните плавно, без боли', 'Stretch gently, no pain'),
  ex('st-quad', 'Растяжка квадрицепса', 'Quad Stretch', 45, 5, '🧎',
    'Колено назад, поясницу не прогибайте', 'Knee back, do not arch your back'),
  ex('st-shoulder', 'Растяжка плеч', 'Shoulder Stretch', 40, 5, '🙆',
    'Плечи расслаблены, без рывков', 'Relaxed shoulders, no jerks'),
  ex('st-neck', 'Растяжка шеи', 'Neck Stretch', 35, 5, '💆',
    'Наклон медленный, рукой не давите', 'Slow tilt, no pressure with the hand'),
  ex('st-twist', 'Скручивание сидя', 'Seated Twist', 45, 5, '🌀',
    'На выдохе скрутка чуть глубже', 'Exhale to deepen the twist'),
]

/** Индекс по типу тренировки */
export const LIBRARY = {
  strength: STRENGTH,
  cardio: CARDIO,
  hiit: HIIT,
  yoga: YOGA,
  stretch: STRETCH,
}

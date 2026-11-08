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

// ── Дополнительные пулы для тренировок с индивидуальным набором ─────────

/** Пресс и талия */
export const CORE = [
  ex('x-crunch', 'Скручивания', 'Crunches', 40, 15, '🎯',
    'Руки за головой без рывков, шея свободна', 'Hands behind head, no pulling on the neck'),
  ex('x-bicycle', 'Велосипед', 'Bicycle Crunches', 45, 15, '🚴',
    'Локоть к противоположному колену', 'Elbow toward the opposite knee'),
  ex('x-legraise', 'Подъёмы ног', 'Leg Raises', 40, 15, '↕️',
    'Поясница прижата к полу', 'Lower back pressed to the floor'),
  ex('x-russian', 'Русские скручивания', 'Russian Twists', 40, 15, '🔁',
    'Поворот от корпуса, а не руками', 'Twist from the torso, not the arms'),
  ex('x-sideplank', 'Боковая планка', 'Side Plank', 30, 10, '🧱',
    'Тело в линию, таз не заваливается', 'Body in a line, hips do not drop'),
  ex('x-deadbug', 'Мёртвый жук', 'Dead Bug', 40, 15, '🐞',
    'Поясница прижата, движения медленные', 'Lower back down, move slowly'),
]

/** Спина и осанка */
export const BACK = [
  ex('b-birddog', 'Птица-собака', 'Bird-Dog', 40, 10, '🐦',
    'Рука и нога — на одной линии', 'Arm and leg form one line'),
  ex('b-cobra', 'Поза змеи', 'Cobra Pose', 40, 10, '🐍',
    'Подъём за счёт спины, без давления руками', 'Lift with the back, do not push with hands'),
  ex('b-reverseplank', 'Обратная планка', 'Reverse Plank', 30, 10, '🧘',
    'Бёдра вверх, плечи раскрыты', 'Hips up, shoulders open'),
  ex('b-chest', 'Раскрывание груди', 'Chest Opener', 35, 10, '🤗',
    'Лопатки вместе, без прогиба поясницы', 'Shoulder blades together, no back arch'),
]

/** Лёгкий комплекс (подходит для беременных — всё плавно, без нагрузок на живот) */
export const GENTLE = [
  ex('p-pelvic', 'Наклоны таза', 'Pelvic Tilts', 45, 10, '🤰',
    'Движение маленькое, дыхание спокойное', 'Small movement, calm breathing'),
  ex('p-sideleg', 'Отведение ноги вбок', 'Side Leg Raise', 40, 10, '🦵',
    'Нога прямая, корпус не заваливается', 'Leg straight, torso steady'),
  ex('p-wallpushup', 'Отжимания от стены', 'Wall Push-ups', 40, 10, '🧍',
    'Стопы подальше от стены, спина прямая', 'Feet away from the wall, back straight'),
  ex('p-breath', 'Спокойное дыхание', 'Calm Breathing', 60, 0, '🌬️',
    'Вдох носом, выдох медленно ртом', 'Inhale through the nose, exhale slowly'),
]

/** Универсальная разминка (3 упражнения, ~2 минуты) */
export const WARMUP = [
  ex('w-arms', 'Вращения руками', 'Arm Circles', 30, 5, '💫',
    'Круги сначала маленькие, затем шире', 'Small circles first, then wider'),
  ex('w-torso', 'Повороты корпуса', 'Torso Twists', 30, 5, '↔️',
    'Ноги на ширине плеч, поворот плавный', 'Feet hip-width, smooth rotation'),
  ex('w-marchl', 'Лёгкая ходьба на месте', 'Light March', 45, 0, '🚶',
    'Темп спокойный, руки работают', 'Easy pace, arms swinging'),
]

/** Универсальная заминка (2 упражнения, ~1,5 минуты) */
export const COOLDOWN = [
  ex('d-hamstring', 'Растяжка бедра', 'Hamstring Stretch', 50, 5, '🙇',
    'Тяните плавно, без боли', 'Stretch gently, no pain'),
  ex('d-breath', 'Восстановление дыхания', 'Breathing Recovery', 40, 0, '🌬️',
    'Вдох — на 4 счёта, выдох — на 6', 'Inhale for 4 counts, exhale for 6'),
]

/** Плоский индекс по id — для тренировок с собственным набором (exerciseIds) */
export const EXERCISE_BY_ID = Object.fromEntries(
  [...STRENGTH, ...CARDIO, ...HIIT, ...YOGA, ...STRETCH, ...CORE, ...BACK, ...GENTLE].map(
    (e) => [e.id, e],
  ),
)

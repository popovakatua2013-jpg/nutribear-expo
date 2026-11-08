// src/features/workouts/player/demoPatterns.js — «живые» демонстрации упражнений
// Плеер показывает не статичную пиктограмму, а анимированную фигурку,
// которая повторяет движение упражнения. Чтобы не тянуть видеофайлы/GIF,
// движение описано параметрически: у каждого упражнения есть паттерн —
// набор ключевых поз условного скелета (углы корпуса, бёдер, коленей,
// рук), который циклически проигрывается, пока идёт подход.
//
// Модуль полностью чистый (без импортов): одни и те же позы и треки
// используют компонент ExerciseDemo (на UI-потоке, внутри worklet),
// html-макет для визуальной выверки поз и тесты.

/** Кадров в цикле анимации (плотность выборки ключевых поз) */
export const TRACK_N = 28

/** Значения позы по умолчанию (стоя, лицом вправо) */
export const POSE_DEFAULT = {
  fig: 0, // поворот всей фигуры: 0 — стоя, 90 — лёжа на животе, -90 — на спине
  x: 0, // смещение таза по холсту, px
  y: 0,
  sx: 1, // сжатие по горизонтали — имитация поворота корпуса (скручивания)
  lean: 0, // наклон корпуса от вертикали, + вперёд
  head: 0, // наклон головы относительно корпуса, + запрокинута назад
  hip: 0, // бедро от вертикали вниз, + колено вперёд
  knee: 0, // голень относительно бедра, + сгиб колена «назад»
  arm: 0, // плечо от вертикали вниз (в системе фигуры), + подъём вперёд
  elbow: 0, // предплечье, + сгиб вперёд
  hip2: null, // дальняя нога/рука: null → берётся с ближней (pair-режим)
  knee2: null,
  arm2: null,
  elbow2: null,
}

/** Геометрия скелета, px (холст 160×120, пол y=117) */
export const RIG = {
  cx: 80,
  cy: 64, // таз по умолчанию
  floor: 117,
  torso: 30,
  thigh: 26,
  shin: 26,
  upperArm: 18,
  foreArm: 16,
  headR: 8.5,
  headOff: 13,
}

const EASE = {
  linear: (u) => u,
  inout: (u) => (u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2),
  out: (u) => 1 - (1 - u) ** 2,
  in: (u) => u * u,
}

const NUM_PARAMS = ['fig', 'x', 'y', 'sx', 'lean', 'head', 'hip', 'knee', 'arm', 'elbow']

/**
 * Реестр паттернов. poses — ключевые позы на цикл (последняя смыкается
 * с первой); pair: 'opposite' — дальние конечности в противофазе
 * (шаги, бег, велосипед); 'same' — зеркально с ближними.
 * period — длительность цикла, мс; breath — «дыхание» для статичных поз.
 */
export const DEMO_PATTERNS = {
  // ── Стоя ──────────────────────────────────────────────────────────────
  squat: {
    period: 2100,
    poses: [
      {},
      { y: 17, lean: 26, hip: 64, knee: 66, arm: 55, elbow: 12 },
    ],
  },
  squatJump: {
    period: 2000,
    ease: 'out',
    poses: [
      { y: 15, lean: 22, hip: 60, knee: 64, arm: -25 },
      { y: -18, lean: -6, hip: 2, knee: 4, arm: 165 },
    ],
  },
  lunge: {
    period: 2000,
    poses: [
      { y: 9, lean: 4, hip: 36, knee: 6, hip2: -34, knee2: 38, arm: 8, elbow: 6 },
      { y: 20, lean: 8, hip: 44, knee: 36, hip2: -40, knee2: 66, arm: 20, elbow: 15 },
    ],
  },
  jack: {
    period: 1200,
    poses: [
      { y: -6, hip: 24, hip2: -24, arm: 150, elbow: 8, arm2: 150, elbow2: 8 },
      { hip: 0, hip2: 0, arm: 12, elbow: 4, arm2: 12, elbow2: 4 },
    ],
  },
  march: {
    period: 1100,
    pair: 'opposite',
    poses: [
      { y: 2, lean: 3, hip: 58, knee: 70, arm: -28, elbow: 60 },
      { hip: 0, knee: 2, arm: 22, elbow: 12 },
    ],
  },
  run: {
    period: 800,
    pair: 'opposite',
    poses: [
      { y: 1, lean: 14, hip: 92, knee: 96, arm: -35, elbow: 85 },
      { lean: 12, hip: 0, knee: 2, arm: 28, elbow: 75 },
    ],
  },
  step: {
    period: 1400,
    pair: 'opposite',
    poses: [
      { x: -10, y: 2, lean: 2, hip: 30, knee: 24, arm: 14, elbow: 10 },
      { x: 10, y: 2, lean: -2, hip: 2, knee: 26, arm: -8, elbow: 10 },
    ],
  },
  skater: {
    period: 1000,
    poses: [
      { x: 14, y: 4, lean: 18, hip: 26, knee: 34, hip2: -42, knee2: 70, arm: -35, elbow: 45, arm2: 30, elbow2: 40 },
      { x: -14, y: 4, lean: 18, hip: 26, knee: 34, hip2: -42, knee2: 70, arm: -35, elbow: 45, arm2: 30, elbow2: 40 },
    ],
  },
  burpee: {
    period: 2200,
    ease: 'out',
    poses: [
      {},
      { y: 26, lean: 38, hip: 95, knee: 105, arm: 88, elbow: 6 },
      { y: -16, lean: -8, hip: 6, knee: 2, arm: 175, elbow: 2 },
    ],
  },
  tree: {
    period: 3200,
    breath: true,
    poses: [
      { lean: -2, hip: 55, knee: 98, arm: 158, elbow: 6, arm2: 158, elbow2: 6 },
      { lean: 3, hip: 55, knee: 98, arm: 156, elbow: 8, arm2: 156, elbow2: 8 },
    ],
  },
  warrior: {
    period: 3200,
    breath: true,
    poses: [
      { y: 9, lean: 3, hip: 38, knee: 4, hip2: -36, knee2: 34, arm: 150, elbow: 6, arm2: 150, elbow2: 6 },
      { y: 9, lean: 5, hip: 38, knee: 6, hip2: -36, knee2: 34, arm: 148, elbow: 8, arm2: 148, elbow2: 8 },
    ],
  },
  wallpushup: {
    period: 1700,
    poses: [
      { lean: 12, arm: 60, elbow: 16 },
      { lean: 19, arm: 66, elbow: 52 },
    ],
  },
  fold: {
    period: 3000,
    poses: [
      { lean: 0 },
      { lean: 92, head: 6 },
    ],
  },
  quad: {
    period: 3200,
    breath: true,
    poses: [
      { lean: -2, hip: 2, knee: 96, arm: 78, elbow: 8 },
      { lean: 0, hip: 2, knee: 96, arm: 76, elbow: 10 },
    ],
  },
  shoulder: {
    period: 2600,
    poses: [
      { lean: 0, arm: 78, elbow: -160 },
      { lean: 4, arm: 78, elbow: -160 },
    ],
  },
  neck: {
    period: 3000,
    breath: true,
    poses: [
      { head: 6, arm: 145, elbow: 115 },
      { head: 32, arm: 145, elbow: 115 },
    ],
  },
  chestopen: {
    period: 3000,
    breath: true,
    poses: [
      { lean: -4, arm: -55, elbow: 12 },
      { lean: 0, arm: -55, elbow: 12 },
    ],
  },
  circles: {
    period: 2000,
    ease: 'linear',
    poses: [
      { lean: 2, arm: 0, elbow: 4 },
      { lean: 2, arm: 120, elbow: 4 },
      { lean: 2, arm: 240, elbow: 4 },
      { lean: 2, arm: 360, elbow: 4 },
    ],
  },
  twistStand: {
    period: 1900,
    poses: [
      { lean: 2, arm: 48, elbow: 78, sx: 1 },
      { lean: 2, arm: 48, elbow: 78, sx: 0.6 },
    ],
  },

  // ── Лёжа на животе (fig 90) ───────────────────────────────────────────
  plank: {
    period: 3000,
    breath: true,
    poses: [
      { fig: 90, y: 47, arm: 90, elbow: 90 },
      { fig: 90, y: 47, arm: 90, elbow: 90 },
    ],
  },
  pushup: {
    period: 1700,
    poses: [
      { fig: 90, y: 47, arm: 90, elbow: 2 },
      { fig: 90, y: 52, arm: 30, elbow: 60, lean: 8 },
    ],
  },
  mountain: {
    period: 900,
    pair: 'opposite',
    poses: [
      { fig: 90, y: 47, lean: 6, arm: 90, elbow: 0, hip: 0, knee: 0 },
      { fig: 90, y: 47, lean: 6, arm: 90, elbow: 0, hip: 78, knee: 112 },
    ],
  },
  superman: {
    period: 2400,
    poses: [
      { fig: 90, y: 47, hip: 0, knee: 2, arm: 200, elbow: 0 },
      { fig: 90, y: 45, hip: 10, knee: 2, arm: 202, elbow: 0, lean: -12 },
    ],
  },
  catcow: {
    period: 2800,
    poses: [
      { fig: 90, y: 26, lean: -12, head: -12, hip: 90, knee: 90, arm: 80, elbow: 12 },
      { fig: 90, y: 26, lean: 10, head: 10, hip: 90, knee: 90, arm: 80, elbow: 12 },
    ],
  },
  birddog: {
    period: 2400,
    poses: [
      { fig: 90, y: 26, lean: 0, hip: 90, knee: 90, arm: 80, elbow: 12, hip2: 90, knee2: 90, arm2: 80, elbow2: 12 },
      { fig: 90, y: 26, lean: 0, hip: 90, knee: 90, arm: 178, elbow: 0, hip2: -4, knee2: 2, arm2: 80, elbow2: 12 },
    ],
  },
  cobra: {
    period: 3000,
    breath: true,
    poses: [
      { fig: 90, y: 47, lean: -28, head: 12, hip: 0, knee: 0, arm: 100, elbow: 40 },
      { fig: 90, y: 47, lean: -12, head: 4, hip: 0, knee: 0, arm: 100, elbow: 40 },
    ],
  },

  // ── Лёжа на спине (fig -90) ───────────────────────────────────────────
  bridge: {
    period: 2400,
    poses: [
      { fig: -90, y: 42, lean: 0, head: 6, hip: 38, knee: 120, arm: 4 },
      { fig: -90, y: 30, lean: 0, head: 10, hip: 6, knee: 95, arm: 4 },
    ],
  },
  pelvic: {
    period: 2200,
    poses: [
      { fig: -90, y: 42, lean: 2, head: 6, hip: 38, knee: 120, arm: 4 },
      { fig: -90, y: 40, lean: 9, head: 6, hip: 38, knee: 120, arm: 4 },
    ],
  },
  crunch: {
    period: 1500,
    poses: [
      { fig: -90, y: 45, lean: 26, hip: 45, knee: 110, arm: 150, elbow: 105 },
      { fig: -90, y: 45, lean: 6, hip: 45, knee: 110, arm: 150, elbow: 105 },
    ],
  },
  bicycle: {
    period: 1100,
    pair: 'opposite',
    poses: [
      { fig: -90, y: 45, lean: 20, hip: 60, knee: 100, arm: 150, elbow: 100 },
      { fig: -90, y: 45, lean: 20, hip: 5, knee: 15, arm: 150, elbow: 100 },
    ],
  },
  legraise: {
    period: 2200,
    poses: [
      { fig: -90, y: 45, hip: 6, knee: 0, arm: 2 },
      { fig: -90, y: 45, hip: 84, knee: 0, arm: 2 },
    ],
  },
  deadbug: {
    period: 1400,
    pair: 'opposite',
    poses: [
      { fig: -90, y: 45, lean: 0, hip: 80, knee: 88, arm: 90, elbow: 90 },
      { fig: -90, y: 45, lean: 0, hip: 30, knee: 8, arm: 90, elbow: 90 },
    ],
  },
  revplank: {
    period: 3200,
    breath: true,
    poses: [
      { fig: -90, y: 20, lean: 0, head: 22, hip: -40, knee: -4, arm: -85, elbow: 5 },
      { fig: -90, y: 20, lean: 0, head: 22, hip: -40, knee: -4, arm: -85, elbow: 5 },
    ],
  },
  sideleg: {
    period: 1800,
    poses: [
      { fig: -90, y: 45, lean: 0, hip: 8, knee: 0, hip2: 4, knee2: 0, arm: 2 },
      { fig: -90, y: 45, lean: 0, hip: 55, knee: 0, hip2: 4, knee2: 0, arm: 2 },
    ],
  },
  russian: {
    period: 1600,
    poses: [
      { y: 48, lean: -38, head: 30, hip: 140, knee: 120, arm: 60, elbow: 88, sx: 1 },
      { y: 48, lean: -38, head: 30, hip: 140, knee: 120, arm: 60, elbow: 88, sx: 0.55 },
    ],
  },
  twistSit: {
    period: 2200,
    poses: [
      { y: 44, lean: 6, hip: 110, knee: 100, arm: 20, elbow: 30, sx: 1 },
      { y: 44, lean: 6, hip: 110, knee: 100, arm: 20, elbow: 30, sx: 0.55 },
    ],
  },

  // ── Йога: особые позы ─────────────────────────────────────────────────
  downdog: {
    period: 3200,
    breath: true,
    poses: [
      { lean: 118, head: 8, hip: 0, knee: 0, arm: 15, elbow: 0 },
      { lean: 122, head: 6, hip: 0, knee: 0, arm: 15, elbow: 0 },
    ],
  },
  child: {
    period: 3400,
    breath: true,
    poses: [
      { y: 26, lean: 112, head: -8, hip: 8, knee: 98, arm: 0, elbow: 0 },
      { y: 26, lean: 116, head: -8, hip: 8, knee: 98, arm: 0, elbow: 0 },
    ],
  },

  // ── Дыхание (без фигуры) ──────────────────────────────────────────────
  breath: {
    kind: 'breath',
    period: 5000,
    poses: [{}, {}],
  },
}

/** Явный маппинг id упражнения → паттерн */
export const DEMO_BY_ID = {
  's-squat': 'squat',
  's-pushup': 'pushup',
  's-lunge': 'lunge',
  's-plank': 'plank',
  's-bridge': 'bridge',
  's-superman': 'superman',
  'c-march': 'march',
  'c-jack': 'jack',
  'c-high-knees': 'run',
  'c-step-touch': 'step',
  'c-shuffle': 'skater',
  'h-burpee': 'burpee',
  'h-mountain': 'mountain',
  'h-jack': 'jack',
  'squat-jump': 'squatJump',
  'h-skater': 'skater',
  'y-cat-cow': 'catcow',
  'y-down-dog': 'downdog',
  'y-warrior': 'warrior',
  'y-child': 'child',
  'y-tree': 'tree',
  'st-hamstring': 'fold',
  'st-quad': 'quad',
  'st-shoulder': 'shoulder',
  'st-neck': 'neck',
  'st-twist': 'twistSit',
  'x-crunch': 'crunch',
  'x-bicycle': 'bicycle',
  'x-legraise': 'legraise',
  'x-russian': 'russian',
  'x-sideplank': 'plank',
  'x-deadbug': 'deadbug',
  'b-birddog': 'birddog',
  'b-cobra': 'cobra',
  'b-reverseplank': 'revplank',
  'b-chest': 'chestopen',
  'p-pelvic': 'pelvic',
  'p-sideleg': 'sideleg',
  'p-wallpushup': 'wallpushup',
  'p-breath': 'breath',
  'w-arms': 'circles',
  'w-torso': 'twistStand',
  'w-marchl': 'march',
  'd-hamstring': 'fold',
  'd-breath': 'breath',
}

/** Фолбэк по типу тренировки — для упражнений вне библиотеки */
const DEMO_BY_TYPE = {
  strength: 'squat',
  cardio: 'march',
  hiit: 'jack',
  yoga: 'catcow',
  stretch: 'fold',
}

/**
 * Стрелки-траектории движения (как в референсе «домашних тренировок»):
 * пунктирные дуги показывают путь кончика кисти (акцент) и стопы (циан).
 * Строятся автоматически из паттерна: концы дуги — положения кончика в
 * начале и середине цикла, выгиб — наружу от сустава-якоря (плеча/таза).
 * Смещения короче 12px (опорная конечность) и длиннее 90px (редкие
 * выбросы) дугу не дают. pattern.guide === false отключает стрелки.
 * Чистая функция — используется компонентом, html-макетом и тестами.
 */
export function buildGuides(pattern) {
  if (!pattern || pattern.kind === 'breath' || pattern.guide === false) return []
  const tracks = buildTrack(pattern)
  const at = (t) => samplePose(t, tracks, TRACK_N)
  const tip = (seg, len) => ({
    x: seg.x + len * Math.cos((seg.a * Math.PI) / 180),
    y: seg.y + len * Math.sin((seg.a * Math.PI) / 180),
  })
  const a = at(0)
  const b = at(0.5)
  const arcs = []
  const arc = (p, q, anchor, color) => {
    const dx = q.x - p.x
    const dy = q.y - p.y
    const dist = Math.hypot(dx, dy)
    if (dist < 12 || dist > 90) return
    const mx = (p.x + q.x) / 2
    const my = (p.y + q.y) / 2
    let nx = -dy / dist
    let ny = dx / dist
    if ((mx - anchor.x) * nx + (my - anchor.y) * ny < 0) {
      nx = -nx
      ny = -ny
    }
    const bump = Math.min(26, Math.max(7, dist * 0.38))
    arcs.push({
      x1: p.x, y1: p.y, x2: q.x, y2: q.y,
      cx: mx + nx * bump, cy: my + ny * bump, color,
    })
  }
  arc(tip(a.fore, RIG.foreArm), tip(b.fore, RIG.foreArm), a.arm, 'accent')
  arc(tip(a.foot, 11), tip(b.foot, 11), a.thigh, 'cyan')
  return arcs
}

/** Паттерн демонстрации для упражнения (всегда валидный ключ) */
export function demoPatternFor(exercise) {
  if (exercise) {
    // Планбордер добавляет к id номер круга («s-squat#2») — ищем базу
    const baseId = String(exercise.id || '').split('#')[0]
    const byId = DEMO_BY_ID[baseId]
    if (byId && DEMO_PATTERNS[byId]) return byId
    const byType = DEMO_BY_TYPE[exercise.type]
    if (byType && DEMO_PATTERNS[byType]) return byType
  }
  return 'march'
}

/**
 * Трек анимации: из ключевых поз в N плотных кадров + замыкающий
 * дубликат первого. farLeg/farArm — треки дальней ноги/руки: явные
 * hip2/knee2/arm2/elbow2, противофаза (сдвиг на полцикла) или копия.
 */
export function buildTrack(pattern) {
  const poses = pattern.poses
  const ease = EASE[pattern.ease] || EASE.inout
  const N = TRACK_N

  const sampleParam = (pick) => {
    const frames = new Array(N)
    for (let i = 0; i < N; i++) {
      const seg = (i / N) * poses.length
      const i0 = Math.floor(seg) % poses.length
      const i1 = (i0 + 1) % poses.length
      const u = ease(seg - Math.floor(seg))
      const a = pick(poses[i0])
      let b = pick(poses[i1])
      // Угловая непрерывность полных оборотов («вращения руками»: 360→0):
      // через стык цикла идём вперёд, без раскрутки назад. Порог 300°,
      // чтобы не задевать обычные большие махи (~190° в прыжках).
      if (Math.abs(b - a) > 300) b += a > b ? 360 : -360
      frames[i] = a + (b - a) * u
    }
    // Замыкающий кадр: продолжение первого по кратчайшей дуге
    const closing = frames[0] + Math.round((frames[N - 1] - frames[0]) / 360) * 360
    return [...frames, closing]
  }

  const rotate = (arr) => {
    const half = Math.round(N / 2)
    const out = new Array(N)
    for (let i = 0; i < N; i++) out[i] = arr[(i + half) % N]
    return [...out, out[0]]
  }

  const num = (name) => sampleParam((p) => {
    const v = p[name]
    return typeof v === 'number' ? v : POSE_DEFAULT[name]
  })

  const tracks = {
    fig: num('fig'), x: num('x'), y: num('y'), sx: num('sx'),
    lean: num('lean'), head: num('head'),
    hip: num('hip'), knee: num('knee'), arm: num('arm'), elbow: num('elbow'),
  }

  // Дальняя нога
  const farLegExplicit = poses.some((p) => p.hip2 !== undefined || p.knee2 !== undefined)
  if (farLegExplicit) {
    tracks.hip2 = sampleParam((p) => (p.hip2 ?? p.hip ?? 0))
    tracks.knee2 = sampleParam((p) => (p.knee2 ?? p.knee ?? 0))
  } else if (pattern.pair === 'opposite') {
    tracks.hip2 = rotate(tracks.hip)
    tracks.knee2 = rotate(tracks.knee)
  } else {
    tracks.hip2 = tracks.hip
    tracks.knee2 = tracks.knee
  }

  // Дальняя рука
  const farArmExplicit = poses.some((p) => p.arm2 !== undefined || p.elbow2 !== undefined)
  if (farArmExplicit) {
    tracks.arm2 = sampleParam((p) => (p.arm2 ?? p.arm ?? 0))
    tracks.elbow2 = sampleParam((p) => (p.elbow2 ?? p.elbow ?? 0))
  } else if (pattern.pair === 'opposite') {
    tracks.arm2 = rotate(tracks.arm)
    tracks.elbow2 = rotate(tracks.elbow)
  } else {
    tracks.arm2 = tracks.arm
    tracks.elbow2 = tracks.elbow
  }

  return tracks
}

/** Линейная выборка трека на позиции цикла t ∈ [0, 1) */
function sampleTrack(t, arr, N) {
  'worklet'
  const x = Math.min(Math.max(t, 0), 1) * N
  const fi = Math.floor(x)
  const i = fi % N
  const j = (i + 1) % N
  const u = x - fi
  return arr[i] + (arr[j] - arr[i]) * u
}

const DEG = Math.PI / 180

/**
 * Поза скелета на позиции цикла t. Возвращает точки сочленений и углы
 * сегментов в локальной системе фигуры (холст 160×120): {x, y} — сустав,
 * a — мировой угол сегмента (0 — вправо, 90 — вниз).
 * Помечена worklet — вызывается на UI-потоке в ExerciseDemo.
 */
// Поза считается в ЛОКАЛЬНОЙ системе фигуры: таз всегда в (cx, cy),
// смещения x/y из паттерна — мировые (прикладываются снаружи поворота
// fig контейнером, иначе лежачие позы уезжали бы вбок).
export function samplePose(t, tracks, N) {
  'worklet'
  const n = (k) => sampleTrack(t, tracks[k], N)

  const fig = n('fig')
  const wx = n('x') // мировое смещение фигуры, px
  const wy = n('y')
  const sx = n('sx')
  const lean = n('lean')
  const headT = n('head')

  const x = RIG.cx
  const y = RIG.cy

  // Корпус: от таза вверх, наклон + вперёд
  const torsoA = -90 + lean
  const cosT = Math.cos(torsoA * DEG)
  const sinT = Math.sin(torsoA * DEG)
  const neck = { x: x + RIG.torso * cosT, y: y + RIG.torso * sinT }
  const shoulder = { x: x + (RIG.torso - 3) * cosT, y: y + (RIG.torso - 3) * sinT }
  const torso = { x, y, a: torsoA }

  // Голова: центр по оси корпуса, наклон head запрокидывает назад
  const headA = torsoA - headT
  const head = {
    x: neck.x + RIG.headOff * Math.cos(headA * DEG),
    y: neck.y + RIG.headOff * Math.sin(headA * DEG),
    a: headA + 90, // ориентация «носа»
  }

  const leg = (hipV, kneeV) => {
    const thighA = 90 - hipV
    const knee = {
      x: x + RIG.thigh * Math.cos(thighA * DEG),
      y: y + RIG.thigh * Math.sin(thighA * DEG),
    }
    const shinA = thighA + kneeV
    const ankle = {
      x: knee.x + RIG.shin * Math.cos(shinA * DEG),
      y: knee.y + RIG.shin * Math.sin(shinA * DEG),
    }
    return {
      thigh: { x, y, a: thighA },
      shin: { x: knee.x, y: knee.y, a: shinA },
      foot: { x: ankle.x, y: ankle.y, a: shinA - 90 },
    }
  }

  const armSeg = (armV, elbowV) => {
    const upperA = 90 - armV
    const elbow = {
      x: shoulder.x + RIG.upperArm * Math.cos(upperA * DEG),
      y: shoulder.y + RIG.upperArm * Math.sin(upperA * DEG),
    }
    const foreA = upperA - elbowV
    return {
      arm: { x: shoulder.x, y: shoulder.y, a: upperA },
      fore: { x: elbow.x, y: elbow.y, a: foreA },
    }
  }

  const near = leg(n('hip'), n('knee'))
  const far = leg(n('hip2'), n('knee2'))
  const nearArm = armSeg(n('arm'), n('elbow'))
  const farArm = armSeg(n('arm2'), n('elbow2'))

  return {
    fig, x: wx, y: wy, sx, lean,
    torso, head,
    thigh: near.thigh, shin: near.shin, foot: near.foot,
    thigh2: far.thigh, shin2: far.shin, foot2: far.foot,
    arm: nearArm.arm, fore: nearArm.fore,
    arm2: farArm.arm, fore2: farArm.fore,
  }
}

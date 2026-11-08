// Тесты «живых» демонстраций упражнений: реестр паттернов demoPatterns.js.
// Проверяем, что у каждого упражнения библиотеки (и разминки/заминки) есть
// валидный паттерн, треки анимации бесшовно зациклены, позы скелета
// конечны, а дальние конечности в противофазе действительно смещены на
// полцикла. Модуль чистый — тестируется без React Native.

jest.requireActual('./helpers/react-native-stub')

const {
  DEMO_BY_ID,
  DEMO_PATTERNS,
  POSE_DEFAULT,
  TRACK_N,
  buildTrack,
  demoPatternFor,
  samplePose,
} = require('@/features/workouts/player/demoPatterns')
const {
  BACK,
  CARDIO,
  COOLDOWN,
  CORE,
  EXERCISE_BY_ID,
  GENTLE,
  HIIT,
  LIBRARY,
  STRENGTH,
  STRETCH,
  WARMUP,
  YOGA,
} = require('@/features/workouts/data/exerciseLibrary')
const { buildPlan } = require('@/features/workouts/player/planBuilder')
const { MOCK_WORKOUTS } = require('@/features/workouts/data/mockWorkouts')

const ALL_POOLS = [STRENGTH, CARDIO, HIIT, YOGA, STRETCH, CORE, BACK, GENTLE, WARMUP, COOLDOWN]

describe('demoPatterns: маппинг упражнений', () => {
  test('каждое упражнение всех пулов имеет валидный паттерн', () => {
    for (const pool of ALL_POOLS) {
      for (const e of pool) {
        expect(DEMO_BY_ID[e.id]).toBeDefined()
        expect(DEMO_PATTERNS[DEMO_BY_ID[e.id]]).toBeDefined()
      }
    }
  })

  test('плоский индекс библиотеки полностью покрыт маппингом', () => {
    for (const id of Object.keys(EXERCISE_BY_ID)) {
      expect(DEMO_BY_ID[id]).toBeDefined()
    }
  })

  test('demoPatternFor всегда возвращает существующий паттерн', () => {
    expect(demoPatternFor({ id: 's-squat' })).toBe('squat')
    expect(demoPatternFor({ id: 'd-breath' })).toBe('breath')
    // неизвестный id — фолбэк по типу
    expect(demoPatternFor({ id: 'unknown-x', type: 'hiit' })).toBe('jack')
    expect(demoPatternFor({ id: 'unknown-x', type: 'yoga' })).toBe('catcow')
    // совсем пустое упражнение — безопасный дефолт
    expect(demoPatternFor(null)).toBe('march')
    expect(demoPatternFor({ id: 'unknown', type: 'weird' })).toBe('march')
  })
})

describe('demoPatterns: целостность реестра', () => {
  test('у каждого паттерна ≥2 позы, период в разумных пределах', () => {
    for (const [name, pattern] of Object.entries(DEMO_PATTERNS)) {
      expect(Array.isArray(pattern.poses)).toBe(true)
      expect(pattern.poses.length).toBeGreaterThanOrEqual(2)
      expect(pattern.period).toBeGreaterThanOrEqual(500)
      expect(pattern.period).toBeLessThanOrEqual(6000)
      expect(['same', 'opposite', undefined]).toContain(pattern.pair)
      expect(['breath', undefined]).toContain(pattern.kind)
    }
  })

  test('значения поз — числа в допустимых диапазонах', () => {
    for (const pattern of Object.values(DEMO_PATTERNS)) {
      for (const pose of pattern.poses) {
        for (const [k, v] of Object.entries(pose)) {
          if (POSE_DEFAULT[k] === null) {
            // дальние конечности: явное значение или null (наследуют ближние)
            expect(v === null || Number.isFinite(v)).toBe(true)
            continue
          }
          expect(typeof POSE_DEFAULT[k]).toBe('number')
          expect(Number.isFinite(v)).toBe(true)
          if (k === 'sx') {
            expect(v).toBeGreaterThan(0.2)
            expect(v).toBeLessThanOrEqual(1.2)
          } else if (k === 'fig') {
            expect(Math.abs(v)).toBeLessThanOrEqual(90)
          } else {
            expect(Math.abs(v)).toBeLessThanOrEqual(360)
          }
        }
      }
    }
  })

  test('противофазные паттерны помечены pair: opposite', () => {
    for (const name of ['march', 'run', 'mountain', 'bicycle', 'deadbug']) {
      expect(DEMO_PATTERNS[name].pair).toBe('opposite')
    }
  })
})

describe('demoPatterns: треки анимации', () => {
  test('треки бесшовно зациклены: последний кадр ≡ первому', () => {
    for (const pattern of Object.values(DEMO_PATTERNS)) {
      const tracks = buildTrack(pattern)
      for (const [k, arr] of Object.entries(tracks)) {
        expect(arr).toHaveLength(TRACK_N + 1)
        // полные обороты (вращения руками) считаем эквивалентными 0°
        expect(Math.abs(arr[TRACK_N] - arr[0]) % 360).toBeLessThan(1e-9)
        for (const v of arr) expect(Number.isFinite(v)).toBe(true)
      }
    }
  })

  test('противофаза: дальняя нога = ближняя, смещённая на полцикла', () => {
    const tracks = buildTrack(DEMO_PATTERNS.march)
    const half = Math.round(TRACK_N / 2)
    // середина цикла ближней ноги = началу дальней
    expect(tracks.hip2[0]).toBeCloseTo(tracks.hip[half], 6)
    expect(tracks.knee2[half]).toBeCloseTo(tracks.knee[0], 6)
  })

  test('симметричный паттерн: дальние конечности копируют ближние', () => {
    const tracks = buildTrack(DEMO_PATTERNS.squat)
    expect(tracks.hip2).toBe(tracks.hip)
    expect(tracks.elbow2).toBe(tracks.elbow)
  })

  test('явные дальние конечности (выпады, птица-собака) различаются', () => {
    const lunge = buildTrack(DEMO_PATTERNS.lunge)
    // передняя и задняя ноги в разных позах
    expect(lunge.hip2[0]).not.toBeCloseTo(lunge.hip[0], 1)
    const birddog = buildTrack(DEMO_PATTERNS.birddog)
    // в середине цикла рука вытянута вперёд, дальняя — в опоре
    expect(birddog.arm[Math.round(TRACK_N / 2)]).not.toBeCloseTo(
      birddog.arm2[Math.round(TRACK_N / 2)],
      1,
    )
  })

  test('цикл «вращения руками» непрерывен через 360°', () => {
    const tracks = buildTrack(DEMO_PATTERNS.circles)
    // последний кадр цикла продолжает вращение: между кадрами N-1 и 0
    // нет скачка назад
    const last = tracks.arm[TRACK_N - 1]
    const first = tracks.arm[0]
    expect(first).toBeCloseTo(0, 6)
    expect(last).toBeGreaterThan(300)
  })
})

describe('demoPatterns: поза скелета', () => {
  test('samplePose возвращает конечные точки и углы во всех фазах', () => {
    for (const pattern of Object.values(DEMO_PATTERNS)) {
      const tracks = buildTrack(pattern)
      for (const t of [0, 0.13, 0.25, 0.5, 0.77, 0.99]) {
        const p = samplePose(t, tracks, TRACK_N)
        for (const seg of ['torso', 'head', 'thigh', 'shin', 'foot', 'arm', 'fore', 'thigh2', 'shin2', 'foot2', 'arm2', 'fore2']) {
          expect(Number.isFinite(p[seg].x)).toBe(true)
          expect(Number.isFinite(p[seg].y)).toBe(true)
          expect(Number.isFinite(p[seg].a)).toBe(true)
        }
      }
    }
  })

  test('стоя прямо: таз в базовой точке, бедро направлено вниз', () => {
    const tracks = buildTrack(DEMO_PATTERNS.squat)
    const p = samplePose(0, tracks, TRACK_N)
    expect(p.fig).toBe(0)
    // бедро от таза вниз: угол ≈ 90°, колено ниже таза
    expect(p.thigh.a).toBeCloseTo(90, 0)
    expect(p.shin.y).toBeGreaterThan(p.torso.y)
  })

  test('лёжа на спине (мост): фигура повёрнута, ноги согнуты', () => {
    const tracks = buildTrack(DEMO_PATTERNS.bridge)
    const p = samplePose(0.25, tracks, TRACK_N)
    expect(p.fig).toBeCloseTo(-90, 6)
  })

  test('дыхание — особый паттерн без фигуры', () => {
    expect(DEMO_PATTERNS.breath.kind).toBe('breath')
  })
})

describe('demoPatterns: сквозной путь до плеера', () => {
  test('план любой тренировки каталога полностью маппится в паттерны', () => {
    for (const workout of MOCK_WORKOUTS) {
      const plan = buildPlan(workout)
      expect(plan.length).toBeGreaterThan(0)
      for (const item of plan) {
        const key = demoPatternFor(item)
        expect(DEMO_PATTERNS[key]).toBeDefined()
        // планбордер вешает на id номер круга («s-squat#2») — паттерн
        // должен совпасть с паттерном базового упражнения из маппинга
        const base = item.id.split('#')[0]
        if (DEMO_BY_ID[base]) {
          expect(key).toBe(DEMO_BY_ID[base])
        }
      }
    }
  })

  test('все паттерны из маппинга существуют в реестре', () => {
    for (const key of Object.values(DEMO_BY_ID)) {
      expect(DEMO_PATTERNS[key]).toBeDefined()
    }
  })
})

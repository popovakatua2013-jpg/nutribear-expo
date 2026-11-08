// src/features/workouts/player/engine.js — чистый конечный автомат плеера
// (по референсу плеера, разделы 3 и 4).
//
// Файл намеренно не зависит от React Native — только чистая логика. Это
// позволяет гонять переходы в обычных unit-тестах и переиспользовать
// движок, если у плеера появится другая обёртка.
//
// Машина состояний:
//   prepare → exercise ⇄ rest → done
// Поверх exercise/rest действует пауза; при возврате из фона хук
// usePlayerEngine наверстывает пропущенные секунды одним батчем tick.

/** Константы таймингов плеера (раздел 4.1 референса) */
export const PLAYER_TIMINGS = {
  /** Обратный отсчёт перед первым упражнением, сек */
  prepareSec: 10,
  /** Отдых по умолчанию, если у упражнения restSec = 0 не в конце плана */
  defaultRestSec: 20,
  /** Кнопка «+20 сек» на экране отдыха */
  extendRestSec: 20,
  /** Максимум секунд, наверстываемых за один возврат из фона */
  maxCatchUpSec: 3600,
}

/** Начальное состояние: фаза «Приготовьтесь» */
export function initPlayerState(plan, startedAt = Date.now()) {
  return {
    plan,
    index: 0,
    phase: 'prepare',
    secondsLeft: PLAYER_TIMINGS.prepareSec,
    phaseTotal: PLAYER_TIMINGS.prepareSec,
    paused: false,
    activeSec: 0,
    startedAt,
  }
}

// ── Вспомогательные переходы ────────────────────────────────────────────

function enterExercise(s, index) {
  const item = s.plan[index]
  return {
    ...s,
    index,
    phase: 'exercise',
    secondsLeft: item.durationSec,
    phaseTotal: item.durationSec,
  }
}

/** Конец текущего упражнения: отдых → следующее, либо финиш */
function endExercise(s) {
  if (s.index >= s.plan.length - 1) {
    return finish(s, true)
  }
  const restSec = s.plan[s.index].restSec || PLAYER_TIMINGS.defaultRestSec
  return {
    ...s,
    phase: 'rest',
    secondsLeft: restSec,
    phaseTotal: restSec,
  }
}

function enterNext(s) {
  return enterExercise(s, s.index + 1)
}

function finish(s, completed) {
  return {
    ...s,
    phase: 'done',
    // Из какой фазы вышли: выход в отдыхе значит, что текущее упражнение
    // уже выполнено полностью — countDone учтёт его (в референсе фаза
    // затиралась и упражнение перед отдыхом при выходе терялось)
    quitFrom: s.phase,
    secondsLeft: 0,
    phaseTotal: 0,
    completed,
    finishedAt: Date.now(),
  }
}

/** Один шаг таймера (1 сек) */
function step(s) {
  if (s.paused || s.phase === 'done') return s

  switch (s.phase) {
    case 'prepare': {
      const secondsLeft = s.secondsLeft - 1
      return secondsLeft <= 0
        ? enterExercise({ ...s, secondsLeft: 0 }, 0)
        : { ...s, secondsLeft }
    }
    case 'exercise': {
      const secondsLeft = s.secondsLeft - 1
      const activeSec = s.activeSec + 1
      return secondsLeft <= 0
        ? endExercise({ ...s, secondsLeft: 0, activeSec })
        : { ...s, secondsLeft, activeSec }
    }
    case 'rest': {
      const secondsLeft = s.secondsLeft - 1
      return secondsLeft <= 0
        ? enterNext({ ...s, secondsLeft: 0 })
        : { ...s, secondsLeft }
    }
    default:
      return s
  }
}

/** Главный редьюсер. Возвращает тот же объект, если действия не было */
export function playerReducer(s, action) {
  switch (action.type) {
    case 'tick': {
      const n = Math.max(1, Math.min(action.n ?? 1, PLAYER_TIMINGS.maxCatchUpSec))
      let next = s
      for (let i = 0; i < n; i++) {
        if (next.paused || next.phase === 'done') break
        next = step(next)
      }
      return next
    }

    case 'togglePause':
      return s.phase === 'done' ? s : { ...s, paused: !s.paused }

    case 'skip': {
      if (s.paused || s.phase === 'done') return s
      switch (s.phase) {
        case 'prepare':
          // Пропуск отсчёта: сразу к первому упражнению
          return enterExercise({ ...s }, 0)
        case 'exercise':
          // Пропуск упражнения считается выполненным на 0 активных секунд —
          // переход по обычному правилу (отдых или финиш)
          return endExercise(s)
        case 'rest':
          return enterNext(s)
        default:
          return s
      }
    }

    case 'extendRest': {
      if (s.phase !== 'rest') return s
      const sec = action.sec ?? PLAYER_TIMINGS.extendRestSec
      return {
        ...s,
        secondsLeft: s.secondsLeft + sec,
        phaseTotal: s.phaseTotal + sec,
      }
    }

    case 'quit':
      return s.phase === 'done' ? s : finish(s, false)

    default:
      return s
  }
}

// ── Итог сессии ─────────────────────────────────────────────────────────

/** Активные секунды, запланированные планом (для пропорции калорий) */
function plannedActiveSec(plan) {
  return plan.reduce((a, e) => a + e.durationSec, 0)
}

/** Сколько упражнений выполнено полностью на момент выхода/финиша */
function countDone(state) {
  if (state.completed) return state.plan.length
  // В фазе rest текущее упражнение уже закончилось — в том числе если
  // выход был подтверждён именно из отдыха (см. quitFrom в finish)
  const inRest = state.phase === 'rest' || state.quitFrom === 'rest'
  const bonus = inRest ? 1 : 0
  return Math.min(state.index + bonus, state.plan.length)
}

/**
 * Итог тренировки для finishSession. Минуты считаются по активному времени —
 * паузы и отдых не раздувают календарь интенсивности (раздел 4.5 референса).
 */
export function buildResult(state, workout) {
  const planned = plannedActiveSec(state.plan) || 1
  const fraction = Math.min(state.activeSec / planned, 1)
  return {
    activeSec: state.activeSec,
    durationMin: Math.ceil(state.activeSec / 60),
    kcal: state.completed ? workout.kcal : Math.round(workout.kcal * fraction),
    completed: Boolean(state.completed),
    exercisesDone: countDone(state),
  }
}

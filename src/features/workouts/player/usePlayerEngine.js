// src/features/workouts/player/usePlayerEngine.js — обёртка движка над React
// (по референсу плеера, раздел 4.3). Здесь только системная обвязка:
// секундный интервал, сверка с Date.now при возврате из фона, тактильный
// отклик и звуковые сигналы на смене фаз. Вся логика переходов — в чистом
// playerReducer.
import { useEffect, useReducer, useRef } from 'react'
import { AppState } from 'react-native'
import * as Haptics from 'expo-haptics'
import { initPlayerState, playerReducer } from './engine'
import { playWorkoutSound } from './sounds'
import { usePrefsStore } from '../store/useWorkoutsStore'

/**
 * @param plan       план упражнений из buildPlan
 * @param active     false = плеер смонтирован, но ждать (задел под прелоад)
 * @param startIndex продолжить не с начала, а с упражнения по индексу
 */
export function usePlayerEngine(plan, active = true, startIndex = 0) {
  const [state, dispatch] = useReducer(
    playerReducer,
    plan,
    (p) => initPlayerState(p, Date.now(), startIndex),
  )
  const backgroundedAt = useRef(null)

  const soundOn = usePrefsStore((s) => s.soundOn)

  // Секундный тик — единственный источник времени в активном состоянии
  useEffect(() => {
    if (!active) return undefined
    const id = setInterval(() => dispatch({ type: 'tick' }), 1000)
    return () => clearInterval(id)
  }, [active])

  // Возврат из фона: наверстываем реальное отсутствие одной партией tick.
  // Дрейф таймера OS компенсируется сверкой с Date.now, а не счётчиком.
  useEffect(() => {
    if (!active) return undefined
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'active') {
        const bgAt = backgroundedAt.current
        backgroundedAt.current = null
        if (bgAt != null) {
          const elapsed = Math.floor((Date.now() - bgAt) / 1000)
          if (elapsed > 0) dispatch({ type: 'tick', n: elapsed })
        }
      } else if (backgroundedAt.current == null) {
        backgroundedAt.current = Date.now()
      }
    })
    return () => sub.remove()
  }, [active])

  // Тактильный и звуковой отклик: старт упражнения/отдыха, отсчёт 3-2-1, финиш
  const phase = state.phase
  const index = state.index
  const secondsLeft = state.secondsLeft
  const phaseTotal = state.phaseTotal
  useEffect(() => {
    if (phase === 'done') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
      if (soundOn) playWorkoutSound('done')
      return
    }
    if (secondsLeft === phaseTotal) {
      // только что началась новая фаза
      Haptics.impactAsync(
        phase === 'rest'
          ? Haptics.ImpactFeedbackStyle.Light
          : Haptics.ImpactFeedbackStyle.Medium,
      ).catch(() => {})
      if (soundOn && phase !== 'prepare') playWorkoutSound('switch')
    } else if (secondsLeft > 0 && secondsLeft <= 3) {
      Haptics.selectionAsync().catch(() => {})
      if (soundOn) playWorkoutSound('count')
    }
  }, [phase, index, phaseTotal, secondsLeft, soundOn])

  return { state, dispatch }
}

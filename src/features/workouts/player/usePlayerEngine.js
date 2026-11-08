// src/features/workouts/player/usePlayerEngine.js — обёртка движка над React
// (по референсу плеера, раздел 4.3). Здесь только системная обвязка:
// секундный интервал, сверка с Date.now при возврате из фона и тактильный
// отклик на смену фаз. Вся логика переходов — в чистом playerReducer.
import { useEffect, useReducer, useRef } from 'react'
import { AppState } from 'react-native'
import * as Haptics from 'expo-haptics'
import { initPlayerState, playerReducer } from './engine'

/**
 * @param plan      план упражнений из buildPlan
 * @param active    false = плеер смонтирован, но ждать (задел под прелоад)
 */
export function usePlayerEngine(plan, active = true) {
  const [state, dispatch] = useReducer(playerReducer, plan, initPlayerState)
  const backgroundedAt = useRef(null)

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

  // Тактильный отклик: старт упражнения/отдыха, отсчёт 3-2-1, финиш
  const phase = state.phase
  const index = state.index
  const secondsLeft = state.secondsLeft
  const phaseTotal = state.phaseTotal
  useEffect(() => {
    if (phase === 'done') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
      return
    }
    if (secondsLeft === phaseTotal) {
      // только что началась новая фаза
      Haptics.impactAsync(
        phase === 'rest'
          ? Haptics.ImpactFeedbackStyle.Light
          : Haptics.ImpactFeedbackStyle.Medium,
      ).catch(() => {})
    } else if (secondsLeft > 0 && secondsLeft <= 3) {
      Haptics.selectionAsync().catch(() => {})
    }
  }, [phase, index, phaseTotal, secondsLeft])

  return { state, dispatch }
}

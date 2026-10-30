// Живой шагомер: раз в минуту читаем системный счётчик шагов (с полуночи)
// и кладём в стор активности. Шаги датчика НЕ сохраняются в AsyncStorage:
// после перезапуска первый же опрос восстанавливает актуальное значение,
// а на новый день счётчик сам начинается с нуля — запрос идёт от 00:00.

import { Pedometer } from 'expo-sensors'
import { useActivityStore } from '@/store/useActivityStore'

let started = false
let timer = null

async function poll() {
  try {
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    const res = await Pedometer.getStepCountAsync(start, new Date())
    const steps = Math.max(0, Math.round(res?.steps || 0))
    useActivityStore.setState({ pedometerSteps: Math.min(200000, steps) })
  } catch {
    // Нет датчика или отозвано разрешение — молча оставляем как есть
  }
}

function startPolling() {
  if (timer) return
  poll()
  timer = setInterval(poll, 60000)
}

function stopPolling() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
  useActivityStore.setState({ pedometerSteps: 0 })
}

// Запускается один раз из корневого макета. Следит за тумблером
// «Встроенный шагомер» и сменой дня (после полуночи опрашиваем сразу).
export function startPedometerAgent() {
  if (started) return
  started = true
  useActivityStore.subscribe((s, prev) => {
    if (s.pedometerEnabled !== prev.pedometerEnabled) {
      if (s.pedometerEnabled) startPolling()
      else stopPolling()
    }
    if (s.pedometerEnabled && s.dayKey !== prev.dayKey) poll()
  })
  if (useActivityStore.getState().pedometerEnabled) startPolling()
}

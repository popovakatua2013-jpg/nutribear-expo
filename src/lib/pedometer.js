// Живой шагомер. На iOS expo-sensors умеет исторический запрос — опрашиваем
// «шаги с полуночи» раз в минуту. На Android запрос за период не поддерживается
// (нативный модуль бросает «not supported on Android yet»), там работает поток
// событий Pedometer.watchStepCount: системный датчик TYPE_STEP_COUNTER отдаёт
// шаги с момента подписки. Поэтому дневная сумма складывается так:
//   показанное на старте (переживает перезапуск приложения в сторе)
//   + шаги из живого потока,
// и в течение дня не может уменьшиться: после перезагрузки телефона счётчик
// сбрасывается — держим максимум, а на новый день начинаем с нуля.

import { Platform } from 'react-native'
import { Pedometer } from 'expo-sensors'
import { useActivityStore } from '@/store/useActivityStore'

const MAX_STEPS = 200000
const POLL_MS = 60000

let started = false
let timer = null // iOS: минутный опрос исторического запроса
let subscription = null // Android: живой поток шагов датчика
let shownDayKey = null // день, к которому относится показанная сумма
let shownSteps = 0 // сколько шагов уже показали за этот день
let subBase = 0 // показанная сумма на момент старта подписки (Android)

const clampSteps = (n) => Math.min(MAX_STEPS, Math.max(0, Math.round(n || 0)))

// Показанная за день сумма не уменьшается; новый день — с нуля.
// Первый вызов сессии продолжает с того места, что сохранено в сторе
// (шаги хранятся вместе с dayKey и обнуляются при переходе на новый день).
function publish(rawSteps) {
  const dayKey = useActivityStore.getState().dayKey
  if (shownDayKey !== dayKey) {
    shownDayKey = dayKey
    shownSteps = 0
  }
  shownSteps = Math.max(shownSteps, clampSteps(rawSteps))
  useActivityStore.setState({ pedometerSteps: shownSteps })
}

// iOS: честный исторический запрос «шагов сегодня»
async function pollToday() {
  try {
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    const res = await Pedometer.getStepCountAsync(start, new Date())
    publish(Math.max(0, Math.round(res?.steps || 0)))
  } catch {
    // Нет датчика или отозвано разрешение — молча оставляем как есть
  }
}

// Android: события считают шаги с момента подписки, поэтому прибавляем
// их к тому, что уже показали сегодня. При перезагрузке телефона
// счётчик сбрасывается — publish держит максимум, сумма не падает.
function subscribeLive() {
  try {
    subscription?.remove()
  } catch {}
  subscription = null
  if (Platform.OS === 'web') return
  try {
    subBase = shownSteps
    subscription = Pedometer.watchStepCount((ev) => {
      publish(subBase + Math.max(0, Math.round(ev?.steps || 0)))
    })
  } catch {
    subscription = null
  }
}

function startAll() {
  if (timer || subscription) return
  const s = useActivityStore.getState()
  shownDayKey = s.dayKey
  shownSteps = clampSteps(s.pedometerSteps || 0)
  if (Platform.OS === 'ios') {
    pollToday()
    timer = setInterval(pollToday, POLL_MS)
  } else {
    subscribeLive()
  }
}

function stopAll() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
  try {
    subscription?.remove()
  } catch {}
  subscription = null
  // Показанные за день шаги не стираем: они уже случились
}

// Запускается один раз из корневого макета. Следит за тумблером
// «Встроенный шагомер» и сменой дня: на новом дне сумма с нуля,
// подписка перезапускается (база событий обнуляется), на iOS —
// сразу опрашиваем шаги с полуночи.
export function startPedometerAgent() {
  if (started) return
  started = true
  useActivityStore.subscribe((s, prev) => {
    if (s.pedometerEnabled !== prev.pedometerEnabled) {
      if (s.pedometerEnabled) startAll()
      else stopAll()
    }
    if (s.pedometerEnabled && s.dayKey !== prev.dayKey) {
      shownDayKey = s.dayKey
      shownSteps = 0
      subBase = 0
      useActivityStore.setState({ pedometerSteps: 0 })
      if (Platform.OS === 'ios') pollToday()
      else subscribeLive()
    }
  })
  if (useActivityStore.getState().pedometerEnabled) startAll()
}

// Живой шагомер + Health Connect. На iOS expo-sensors умеет исторический
// запрос — опрашиваем «шаги с полуночи» раз в минуту. На Android запрос за
// период не поддерживается (нативный модуль бросает «not supported on
// Android yet»), там работает поток событий Pedometer.watchStepCount:
// системный датчик TYPE_STEP_COUNTER отдаёт шаги с момента подписки.
// Поэтому дневная сумма складывается так:
//   показанное на старте (переживает перезапуск приложения в сторе)
//   + шаги из живого потока,
// и в течение дня не может уменьшиться: после перезагрузки телефона счётчик
// сбрасывается — держим максимум, а на новый день начинаем с нуля.
//
// Health Connect (Android, тумблер «healthConnectEnabled»): раз в минуту и
// при возврате в приложение читаем «шаги с полуночи» из системного банка
// здоровья (src/lib/healthConnect.js) и публикуем через ту же publish():
// держим максимум, поэтому источники не спорят — побеждает большее (HC
// обычно включает и шаги, сделанные при закрытом приложении), а датчик
// телефона остаётся резервом, если HC пуст.

import { AppState, Platform } from 'react-native'
import { Pedometer } from 'expo-sensors'
import { useActivityStore } from '@/store/useActivityStore'
import { hcStepsToday } from '@/lib/healthConnect'

const MAX_STEPS = 200000
const POLL_MS = 60000

let started = false
let timer = null // iOS: минутный опрос исторического запроса датчика
let subscription = null // Android: живой поток шагов датчика
let hcTimer = null // Android: минутный опрос Health Connect
let shownDayKey = null // день, к которому относится показанная сумма
let shownSteps = 0 // сколько шагов уже показали за этот день
let subBase = 0 // показанная сумма на момент старта подписки (Android)

const clampSteps = (n) => Math.min(MAX_STEPS, Math.max(0, Math.round(n || 0)))
// Шагомер жив, пока работает хотя бы один источник
const anySource = (s) => Boolean(s.pedometerEnabled || s.healthConnectEnabled)

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

// iOS: честный исторический запрос «шагов сегодня» с датчика
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

// Health Connect (Android): «шаги с полуночи» из системного банка
// здоровья — включают шаги, сделанные при закрытом приложении
async function pollHealthConnect() {
  try {
    const steps = await hcStepsToday()
    if (steps > 0) publish(steps)
  } catch {
    // Нет HC или отозвано разрешение — молча оставляем как есть
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

function syncShownFromStore() {
  const s = useActivityStore.getState()
  shownDayKey = s.dayKey
  shownSteps = clampSteps(s.pedometerSteps || 0)
}

// Источник 1 — датчик телефона (iOS: минутный опрос; Android: живой поток).
// Разрешение на физическую активность нужно только датчику: на Android 10+
// это ACTIVITY_RECOGNITION, на iOS — Motion & Fitness. Без него датчик
// молчит, и выглядит так, будто шагомер «не работает». Просим тихо;
// отказ — просто не стартуем датчик (Health Connect продолжает работать).
async function startSensor() {
  if (Platform.OS === 'web') return
  syncShownFromStore()
  try {
    const perm = await Pedometer.requestPermissionsAsync()
    if (perm && perm.granted === false) return
  } catch {}
  if (timer || subscription) return
  if (Platform.OS === 'ios') {
    pollToday()
    timer = setInterval(pollToday, POLL_MS)
  } else {
    subscribeLive()
  }
}

function stopSensor() {
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

// Источник 2 — Health Connect (Android). Своё разрешение выдаётся через
// окно Health Connect (см. SyncCard), здесь только читаем.
function startHealthConnect() {
  if (Platform.OS !== 'android') return
  syncShownFromStore()
  if (hcTimer) return
  pollHealthConnect()
  hcTimer = setInterval(pollHealthConnect, POLL_MS)
}

function stopHealthConnect() {
  if (hcTimer) {
    clearInterval(hcTimer)
    hcTimer = null
  }
}

// Запускается один раз из корневого макета. Следит за тумблерами
// «Встроенный шагомер» и «Health Connect» и сменой дня: на новом дне сумма
// с нуля, подписка перезапускается (база событий обнуляется), на iOS —
// сразу опрашиваем шаги с полуночи, HC — сразу читаем.
// Плюс возврат из фона: на Android стрим событий мог заглохнуть, пока
// приложение было свёрнуто — переподписываемся (publish держит максимум,
// сумма не упадёт), на iOS сразу опрашиваем шаги с полуночи, HC — тоже.
export function startPedometerAgent() {
  // Уже запущен — отдаём no-op, чтобы useEffect не упал на undefined
  if (started) return () => {}
  started = true
  const appSub = AppState.addEventListener('change', (st) => {
    if (st !== 'active') return
    const s = useActivityStore.getState()
    if (s.pedometerEnabled) {
      if (Platform.OS === 'ios') {
        pollToday()
      } else if (timer || subscription) {
        subscribeLive()
      } else {
        startSensor()
      }
    }
    if (s.healthConnectEnabled && Platform.OS === 'android') {
      if (hcTimer) pollHealthConnect()
      else startHealthConnect()
    }
  })
  useActivityStore.subscribe((s, prev) => {
    if (s.pedometerEnabled !== prev.pedometerEnabled) {
      if (s.pedometerEnabled) startSensor()
      else stopSensor()
    }
    if (s.healthConnectEnabled !== prev.healthConnectEnabled) {
      if (s.healthConnectEnabled) startHealthConnect()
      else stopHealthConnect()
    }
    if (anySource(s) && s.dayKey !== prev.dayKey) {
      shownDayKey = s.dayKey
      shownSteps = 0
      subBase = 0
      useActivityStore.setState({ pedometerSteps: 0 })
      if (Platform.OS === 'ios') pollToday()
      else if (subscription) subscribeLive() // база событий обнулилась
      if (s.healthConnectEnabled && Platform.OS === 'android') {
        pollHealthConnect()
      }
    }
  })
  const s = useActivityStore.getState()
  if (s.pedometerEnabled) startSensor()
  if (s.healthConnectEnabled) startHealthConnect()
  return () => {
    try {
      appSub.remove()
    } catch {}
  }
}

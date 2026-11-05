// Авто-переход на новый день: когда наступают следующие сутки,
// дневник питания, вода и шаги очищаются сами — вручную нажимать
// «Начать новый день» больше не нужно.
//
// Как работает: при запуске приложения, при каждом возврате в него
// из фона и раз в минуту сравниваем сохранённый день с сегодняшним.
// Не совпал — чистим дневник и воду/шаги. История приёмов, история
// веса, отчёты и тренировки хранятся ПО ДАТАМ, поэтому их не трогаем.
//
// Важно: данные читаются из AsyncStorage асинхронно, поэтому проверка
// запускается и сразу, и после гидратации сторов (когда данные
// действительно загрузились с телефона).

import { AppState } from 'react-native'
import { dayKeyOf, useHistoryStore } from '@/store/useHistoryStore'
import { useFoodStore } from '@/store/useFoodStore'
import { useActivityStore, selectTotalSteps } from '@/store/useActivityStore'
import { useExerciseStore, totalBurned } from '@/store/useExerciseStore'
import { totalConsumed } from '@/lib/data/diary'
import { xpForDay } from '@/lib/data/activity'

// Финальные значения уходящего дня — в дневную историю (по ней строятся
// графики и отчёты). Максимум с уже записанным — чтобы не затереть
// большее значение меньшим (сторы могут быть ещё не полностью
// гидратированы — тогда просто останется прежняя запись).
function archiveOutgoingDay(key, food, act) {
  try {
    const hist = useHistoryStore.getState().days[key] || {}
    const mealCount = Object.values(food.entries || {}).flat().length
    const kcal = totalConsumed(food.entries || {})
    // ВАЖНО: шаги дня = датчик телефона + ручные (selectTotalSteps),
    // а не только extraSteps — раньше в историю уходили лишь ручные,
    // и графики шагов занижали дни, когда главная/активность не
    // открывались и живая запись не успела сработать
    const steps = selectTotalSteps(act)
    const waterMl = act.waterMl || 0
    const burned = totalBurned(useExerciseStore.getState().logs, key, steps)
    const xp = xpForDay({ steps, waterMl, mealCount, burned })
    useHistoryStore.getState().record(key, {
      kcal: Math.max(hist.kcal || 0, kcal),
      waterMl: Math.max(hist.waterMl || 0, waterMl),
      steps: Math.max(hist.steps || 0, steps),
      burned: Math.max(hist.burned || 0, burned),
      xp: Math.max(hist.xp || 0, xp),
    })
  } catch {}
}

// Вернуть true, если произошёл переход на новый день (что-то очистилось)
export function checkDayRollover() {
  // Сторы ещё не дочитали данные с телефона — рано что-то решать.
  // История и тренировки тоже обязательны: archiveOutgoingDay ПИШЕТ
  // в history и читает exercise. Если они ещё догружаются, запись
  // уйдёт во «временное» состояние и будет затёрта при догрузке
  // (вчерашние ккал/шаги исчезнут из графиков), а сгоревшее уйдёт
  // в архив без тренировок дня.
  if (!useFoodStore.persist.hasHydrated()) return false
  if (!useActivityStore.persist.hasHydrated()) return false
  if (!useHistoryStore.persist.hasHydrated()) return false
  if (!useExerciseStore.persist.hasHydrated()) return false

  const key = dayKeyOf()
  const food = useFoodStore.getState()
  const act = useActivityStore.getState()
  if (food.dayKey === key && act.dayKey === key) return false

  // Прежде чем обнулять — архивируем уходящий день: даже если приложение
  // закрыли сразу после записи, вчерашние ккал/вода/шаги/тренировки
  // гарантированно попадут в статистику
  archiveOutgoingDay(act.dayKey || food.dayKey, food, act)

  useFoodStore.getState().rollDay(key)
  useActivityStore.getState().rollDay(key)
  return true
}

// Фоновый наблюдатель: запускается один раз в корневом макете.
// Возвращает функцию остановки (для чистки при размонтировании).
export function startRolloverWatcher() {
  // Сразу при запуске
  checkDayRollover()

  // После того как сторы дочитали данные с телефона
  const offFood = useFoodStore.persist.onFinishHydration(() => checkDayRollover())
  const offAct = useActivityStore.persist.onFinishHydration(() => checkDayRollover())
  const offHist = useHistoryStore.persist.onFinishHydration(() => checkDayRollover())
  const offEx = useExerciseStore.persist.onFinishHydration(() => checkDayRollover())

  // Вернулись в приложение из фона (утром, после сна телефона)
  const sub = AppState.addEventListener('change', (state) => {
    if (state === 'active') checkDayRollover()
  })

  // Приложение осталось открытым через полночь
  const timer = setInterval(checkDayRollover, 60 * 1000)

  return () => {
    offFood()
    offAct()
    offHist()
    offEx()
    sub.remove()
    clearInterval(timer)
  }
}

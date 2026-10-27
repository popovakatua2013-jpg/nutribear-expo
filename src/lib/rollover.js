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
import { dayKeyOf } from '@/store/useHistoryStore'
import { useFoodStore } from '@/store/useFoodStore'
import { useActivityStore } from '@/store/useActivityStore'

// Вернуть true, если произошёл переход на новый день (что-то очистилось)
export function checkDayRollover() {
  // Сторы ещё не дочитали данные с телефона — рано что-то решать
  if (!useFoodStore.persist.hasHydrated()) return false
  if (!useActivityStore.persist.hasHydrated()) return false

  const key = dayKeyOf()
  const food = useFoodStore.getState()
  const act = useActivityStore.getState()
  if (food.dayKey === key && act.dayKey === key) return false

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

  // Вернулись в приложение из фона (утром, после сна телефона)
  const sub = AppState.addEventListener('change', (state) => {
    if (state === 'active') checkDayRollover()
  })

  // Приложение осталось открытым через полночь
  const timer = setInterval(checkDayRollover, 60 * 1000)

  return () => {
    offFood()
    offAct()
    sub.remove()
    clearInterval(timer)
  }
}

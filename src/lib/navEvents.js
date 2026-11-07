// Сквозное открытие окна «Записать вес» из любого места приложения.
// router.navigate('/bmi') сам по себе модалку не открывает, а вкладка Тело
// монтируется лениво — событие может прийти раньше, чем появится слушатель.
// Поэтому двойной механизм: живое событие DeviceEventEmitter для уже
// смонтированной вкладки и отложенный флаг, который WeightCard забирает
// своим первым маунтом.
import { DeviceEventEmitter } from 'react-native'

let pendingWeightModal = false

export function requestOpenWeightModal() {
  pendingWeightModal = true
  try {
    DeviceEventEmitter.emit('nutribear/open-weight')
  } catch {}
}

// Возвращает true, если открытие окна запрашивалось (и сбрасывает флаг)
export function consumeOpenWeightModal() {
  const was = pendingWeightModal
  pendingWeightModal = false
  return was
}

// ─── Скролл к графику веса на вкладке Тело ─────────────────────────
// Из отчётов (карточка «Вес») и других мест: открываем вкладку Тело и
// плавно докручиваем до «Динамики веса». Тот же двойной механизм:
// живое событие для смонтированной вкладки + отложенный флаг на случай,
// когда вкладка Тело ещё лениво не смонтирована.
let pendingWeightScroll = false

export function requestScrollToWeight() {
  pendingWeightScroll = true
  try {
    DeviceEventEmitter.emit('nutribear/goto-weight-chart')
  } catch {}
}

// Возвращает true, если скролл запрашивался (и сбрасывает флаг)
export function consumeScrollToWeight() {
  const was = pendingWeightScroll
  pendingWeightScroll = false
  return was
}

// ─── Окно «Записать сон» (Отчёты → тап по карточке «Сон») ───────────
// Тап по вечернему пинку «пора спать» ведёт на вкладку Активности и
// сразу открывает окно записи сна. Тот же двойной механизм, что у веса:
// живое событие для смонтированной секции + отложенный флаг, который
// секция забирает первым маунтом (вкладка монтируется лениво).
let pendingSleepModal = false

export function requestOpenSleepModal() {
  pendingSleepModal = true
  try {
    DeviceEventEmitter.emit('nutribear/open-sleep')
  } catch {}
}

// Возвращает true, если открытие окна запрашивалось (и сбрасывает флаг)
export function consumeOpenSleepModal() {
  const was = pendingSleepModal
  pendingSleepModal = false
  return was
}

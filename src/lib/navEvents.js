// Сквозное открытие окна «Записать вес» из любого места приложения.
// router.navigate('/bmi') сам по себе модалку не открывает, а вкладка ИМТ
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

// ─── Скролл к графику веса на вкладке ИМТ ────────────────────────────
// Из отчётов (карточка «Вес») и других мест: открываем вкладку ИМТ и
// плавно докручиваем до «Динамики веса». Тот же двойной механизм:
// живое событие для смонтированной вкладки + отложенный флаг на случай,
// когда вкладка ИМТ ещё лениво не смонтирована.
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

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

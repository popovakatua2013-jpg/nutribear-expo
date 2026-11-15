// Защита полей от клавиатуры внутри прозрачных RN-Modal на Android
// (Expo SDK 53+, edge-to-edge). Собственное окно Modal не ужмётся
// системой сама, а высота клавиатуры от RN не включает полосу
// навигации — нижние поля и закреплённая кнопка оставались под ней
// (скрин Кати 15.11: в «Записать вес» клавиатура закрывает поля).
// Считаем отступ сами: слушаем keyboardDidShow/keyboardDidHide и
// следим за высотой контейнера через onLayout — если контейнер
// всё же ужался (adjustResize на части устройств), ручной отступ
// не добавляем, чтобы не задвоить высоту. Тот же приём, что в
// app/ai-chat.jsx (там решает ту же задачу для обычного экрана).
import { useEffect, useRef, useState } from 'react'
import { Keyboard, Platform } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

export function useKeyboardGuard() {
  const insets = useSafeAreaInsets()
  const [kbPad, setKbPad] = useState(0)
  // true — контейнер ужался сам: система подняла контент, ручной
  // отступ не добавляем (иначе задвоим высоту)
  const [winShrunk, setWinShrunk] = useState(false)
  const lastH = useRef(null)

  useEffect(() => {
    if (Platform.OS !== 'android') return undefined
    const show = Keyboard.addListener('keyboardDidShow', (e) => setKbPad(e.endCoordinates.height))
    const hide = Keyboard.addListener('keyboardDidHide', () => setKbPad(0))
    return () => {
      show.remove()
      hide.remove()
    }
  }, [])

  // Следим за высотой обёртки: ужатие/возврат — клавиатуру обработала
  // сама система (adjustResize)
  const onLayout = (e) => {
    const h = Math.round(e.nativeEvent.layout.height)
    const prev = lastH.current
    lastH.current = h
    if (prev == null || Math.abs(h - prev) < 40) return
    setWinShrunk(h < prev)
    setKbPad(0)
  }

  // Высота клавиатуры от RN — без полосы навигации, добираем inset.
  // iOS отступ не нужен: KeyboardAvoidingView behavior="padding"
  return {
    onLayout,
    padBottom: Platform.OS !== 'android' || winShrunk || kbPad === 0 ? 0 : kbPad + insets.bottom,
  }
}

// Единый вибро-отклик приложения — одна точка входа вместо разрозненных
// прямых вызовов expo-haptics. Зачем: тумблер «Вибро-отклик» на «Ещё»
// раньше менял поведение только пары экранов (ИМТ), а плеер тренировок
// и карточки вибрировали всегда — казалось, что настройка «нигде не
// применяется» (отзыв Кати 16.11). Теперь ВСЕ касания идут через
// hapticFeedback(): тумблер выключен — приложение молчит, включён —
// отклик везде: меню, тумблеры, пилюли, плеер, кольца ИМТ.
// expo-haptics импортируется статично: файл используется только
// компонентами (в Node-тестах не импортируется), на web — no-op.

import * as Haptics from 'expo-haptics'
import { useUiPrefsStore } from '@/store/useUiPrefsStore'

// kind: 'light' — тап по строке/пилюле (по умолчанию), 'medium' —
// смена фазы упражнения, 'success' — финиш/достижение,
// 'selection' — переключение тумблера/выбора значения
export function hapticFeedback(kind = 'light') {
  if (!useUiPrefsStore.getState().haptics) return
  const call =
    kind === 'success'
      ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      : kind === 'medium'
        ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
        : kind === 'selection'
          ? Haptics.selectionAsync()
          : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  call.catch(() => {})
}

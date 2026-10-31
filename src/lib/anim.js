// Плавное разворачивание/сворачивание секций (LayoutAnimation).
// Вызов безопасен везде: если платформа не поддерживает анимацию
// (web или новая архитектура), изменение высоты происходит
// мгновенно, как раньше, — ничего не ломается.

import { LayoutAnimation, Platform, UIManager } from 'react-native'

let enabled = Platform.OS !== 'web'
// Классический Android-выключатель старой архитектуры; на новой arch
// и iOS метода нет — guard просто пропускает включение
if (enabled && Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}

export function animateExpandCollapse() {
  if (!enabled) return
  LayoutAnimation.configureNext({
    duration: 240,
    update: { type: LayoutAnimation.Types.spring, springDamping: 0.85 },
    create: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
    delete: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
  })
}

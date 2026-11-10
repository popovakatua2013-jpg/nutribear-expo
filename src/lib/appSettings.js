// Автоматический переход в настройки телефона — по отзыву Кати от 10.11
// («если где-то требуется переходить в настройки телефона — сразу делать,
// автоматический переход»). Раньше приложение только подсказывало тостом
// «разрешите … в настройках телефона» и ждало, пока пользователь сам
// найдёт нужную страницу; теперь тост показывается, и через короткую
// паузу (чтобы тост успели прочитать) настройки телефона открываются сами.
import { Linking, Platform } from 'react-native'

// Открыть настройки этого приложения на телефоне (Android и iOS).
// true — настройки открылись, false — не удалось (например, веб).
export async function openAppSettings() {
  if (Platform.OS === 'web') return false
  try {
    await Linking.openSettings()
    return true
  } catch {
    return false
  }
}

// Открыть настройки с паузой — по умолчанию 900 мс, чтобы тост успели
// прочитать до ухода приложения в фон
export function openSettingsSoon(delay = 900) {
  setTimeout(() => { openAppSettings() }, delay)
}

// Стандартная пара «тост про разрешение + автоматический переход»:
// показываем тост и сразу открываем настройки телефона
export function toastAndOpenSettings(toast, { title, description }) {
  toast({ title, description })
  openSettingsSoon()
}

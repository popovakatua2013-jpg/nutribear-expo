// Безопасный доступ к expo-notifications.
//
// В некоторых сборках Expo Go нативный модуль «ExpoApplication»
// отсутствует, а библиотека expo-notifications при самом импорте
// тянет expo-application, который на уровне модуля требует этот
// модуль жёстко — импорт бросает ошибку и валит весь экран.
// Поэтому загружаем библиотеку лениво и мягко: есть — работаем
// с уведомлениями, нет — приложение живёт без напоминаний.
// Экспортируем сам модуль или null.

let Notifications = null
try {
  Notifications = require('expo-notifications')
} catch (e) {
  console.warn('NutriBear: уведомления недоступны в этом окружении —', e?.message || e)
}

export default Notifications

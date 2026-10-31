// Реальные напоминания через локальные уведомления (expo-notifications):
// 1) вода — повторяющийся интервал, 2) приёмы пищи — ежедневно в
// выбранное время, 3) взвешивание — раз в неделю. Уведомления приходят,
// даже если приложение закрыто (пока Expo Go жив). Уведомление о воде
// показывается только если норма ещё не выпита и сейчас между 8:00 и
// 23:00 — это решается в обработчике в момент срабатывания, а не при
// планировании.
//
// Тап по уведомлению открывает нужное место приложения: вода — окно
// воды на главной, приём — окно добавления еды, вес — вкладку BMI.
//
// Планировщик (startReminderAgent) запускается один раз из корневого
// макета и следит за настройками стора: любое изменение reminder
// (тумблер, интервал, время приёмов) перепланирует уведомления.

import { DeviceEventEmitter, Platform } from 'react-native'
import Notifications from '@/lib/notifs'
import { router } from 'expo-router'
import { useActivityStore } from '@/store/useActivityStore'
import { useGoalsStore } from '@/store/useGoalsStore'
import { requestOpenWeightModal } from '@/lib/navEvents'

// Тихие часы для воды: напоминаем только с 8:00 до 23:00
const QUIET_FROM = 8
const QUIET_TO = 23

// Обработчик на момент срабатывания: показывать уведомление или нет
// (только если библиотека загрузилась — см. lib/notifs.js)
Notifications?.setNotificationHandler({
  handleNotification: async (n) => {
    const kind = n?.request?.content?.data?.kind
    let show = true
    if (kind === 'water') {
      const act = useActivityStore.getState()
      const goals = useGoalsStore.getState().goals
      const h = new Date().getHours()
      show =
        h >= QUIET_FROM &&
        h < QUIET_TO &&
        act.waterMl < Math.max(1, goals.waterMl || 0)
    }
    return {
      shouldShowBanner: show,
      shouldShowList: show,
      shouldPlaySound: show,
      shouldSetBadge: false,
    }
  },
})

// Спросить разрешение на уведомления (Android 13+ требует явно).
// false — пользователь отказал или платформа не поддерживается.
export async function requestNotifPermission() {
  if (Platform.OS === 'web' || !Notifications) return false
  try {
    const cur = await Notifications.getPermissionsAsync()
    if (cur?.granted) return true
    const req = await Notifications.requestPermissionsAsync()
    return Boolean(req?.granted)
  } catch {
    return false
  }
}

// «ЧЧ:ММ» → { hour, minute } или null
export function parseTime(t) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(t || '').trim())
  if (!m) return null
  const hour = Number(m[1])
  const minute = Number(m[2])
  if (hour > 23 || minute > 59) return null
  return { hour, minute }
}

async function ensureChannels() {
  if (Platform.OS !== 'android' || !Notifications) return
  try {
    await Notifications.setNotificationChannelAsync('water', {
      name: 'Напоминания о воде',
      importance: Notifications.AndroidImportance.HIGH,
    })
    await Notifications.setNotificationChannelAsync('meals', {
      name: 'Напоминания о приёмах пищи',
      importance: Notifications.AndroidImportance.HIGH,
    })
    await Notifications.setNotificationChannelAsync('weigh', {
      name: 'Напоминания о взвешивании',
      importance: Notifications.AndroidImportance.HIGH,
    })
  } catch {}
}

// Перепланировать все напоминания по текущим настройкам стора.
// Сначала отменяем всё и планируем заново только включённое.
let seq = 0
export async function rescheduleReminders() {
  if (!Notifications) return // уведомления недоступны — тихо пропускаем
  const my = ++seq
  const granted = await requestNotifPermission()
  if (my !== seq) return
  try {
    await Notifications.cancelAllScheduledNotificationsAsync()
  } catch {}
  if (!granted) return
  await ensureChannels()
  if (my !== seq) return

  const { reminder } = useActivityStore.getState()

  // Вода: повторяющийся интервал (5–720 минут, из окна «Вода»)
  if (reminder?.enabled) {
    const everyMin = Math.min(720, Math.max(5, Math.round(reminder.everyMin || 60)))
    try {
      await Notifications.scheduleNotificationAsync({
        identifier: 'water-loop',
        content: {
          title: '💧 Пора выпить воды',
          body: 'Сделайте пару глотков — мишка считает стаканы 🐻',
          sound: 'default',
          data: { kind: 'water' },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: everyMin * 60,
          repeats: true,
          channelId: 'water',
        },
      })
    } catch (e) {
      console.warn('Напоминание о воде не запланировано:', e)
    }
  }

  // Приёмы пищи: ежедневно в выбранное время
  const meals = reminder?.meals
  if (meals?.enabled) {
    const plan = [
      ['breakfast', '🌅 Завтрак', 'Самое время позавтракать — запишите приём в дневник 🐻'],
      ['lunch', '☀️ Обед', 'Обеденный перерыв: не забудьте поесть и записать 🐻'],
      ['dinner', '🌙 Ужин', 'Время ужина — внесите приём в дневник 🐻'],
    ]
    for (const [key, title, body] of plan) {
      const t = parseTime(meals[key])
      if (!t) continue
      try {
        await Notifications.scheduleNotificationAsync({
          identifier: `meal-${key}`,
          content: {
            title,
            body,
            sound: 'default',
            data: { kind: 'meal', mealId: key },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour: t.hour,
            minute: t.minute,
            channelId: 'meals',
          },
        })
      } catch (e) {
        console.warn(`Напоминание «${key}» не запланировано:`, e)
      }
    }
  }

  // Взвешивание: раз в неделю в выбранное время
  const weigh = reminder?.weigh
  if (weigh?.enabled) {
    const t = parseTime(weigh.time)
    // weekday хранится как 0=Пн…6=Вс, у expo-notifications 1=Вс…7=Сб
    const EXPO_WD = [2, 3, 4, 5, 6, 7, 1]
    const wd = EXPO_WD[Math.min(6, Math.max(0, Math.round(weigh.weekday ?? 5)))]
    if (t) {
      try {
        await Notifications.scheduleNotificationAsync({
          identifier: 'weigh-weekly',
          content: {
            title: '⚖️ Время взвешивания',
            body: 'Утро, натощак — самое точное время. Запишите вес в дневник 🐻',
            sound: 'default',
            data: { kind: 'weigh' },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
            weekday: wd,
            hour: t.hour,
            minute: t.minute,
            channelId: 'weigh',
          },
        })
      } catch (e) {
        console.warn('Напоминание о взвешивании не запланировано:', e)
      }
    }
  }
}

// Тап по уведомлению: открываем соответствующее место приложения
function handleNotificationTap(data) {
  const kind = data?.kind
  try {
    if (kind === 'water' || kind === 'meal') {
      // Окна живут на главной — сначала показываем её
      router.navigate('/')
      if (kind === 'water') {
        DeviceEventEmitter.emit('nutribear/open-water')
      } else {
        DeviceEventEmitter.emit('nutribear/open-food', {
          mealId: data.mealId || 'breakfast',
        })
      }
    } else if (kind === 'weigh') {
      router.navigate('/bmi')
      // И сразу окно записи веса — тапом по уведомлению пользователь
      // собрался взвешиваться, не заставляем искать кнопку «+»
      requestOpenWeightModal()
    }
  } catch (e) {
    console.warn('Не удалось открыть экран по тапу:', e)
  }
}

let started = false

// Фоновый агент напоминаний: как startRolloverWatcher, запускается один
// раз из корневого макета. Возвращает функцию остановки.
export function startReminderAgent() {
  if (started || Platform.OS === 'web' || !Notifications) return () => {}
  started = true

  rescheduleReminders()

  // Тап по уведомлению, когда приложение уже запущено
  let respSub = null
  try {
    respSub = Notifications.addNotificationResponseReceivedListener((resp) => {
      handleNotificationTap(resp?.notification?.request?.content?.data)
    })
  } catch {}

  // Любое изменение настроек напоминаний — перепланировать
  const unsub = useActivityStore.subscribe((s, prev) => {
    if (s.reminder !== prev.reminder) rescheduleReminders()
  })

  return () => {
    if (respSub) respSub.remove()
    unsub()
    started = false
  }
}

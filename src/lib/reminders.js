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

import { AppState, DeviceEventEmitter, Platform } from 'react-native'
import Notifications from '@/lib/notifs'
import { router } from 'expo-router'
import { useActivityStore, selectTotalSteps } from '@/store/useActivityStore'
import { useFoodStore } from '@/store/useFoodStore'
import { useHistoryStore, dayKeyOf } from '@/store/useHistoryStore'
import { useGoalsStore } from '@/store/useGoalsStore'
import { useOrganismGameStore } from '@/store/useOrganismGameStore'
import { useProfileStore } from '@/store/useProfileStore'
import { useExerciseStore } from '@/store/useExerciseStore'
import { totalConsumed } from '@/lib/data/diary'
import { formatNum } from '@/lib/format'
import { requestOpenWeightModal, requestOpenSleepModal } from '@/lib/navEvents'
import {
  mealPokeMessage,
  mealStreaks,
  pickTone,
  waterPokeMessage,
  weighPokeMessage,
  gonePokeBody,
  workoutPokeMessage,
  sleepPokeMessage,
} from '@/lib/bearPhrases'

// Тихие часы для воды: напоминаем только с 8:00 до 23:00
const QUIET_FROM = 8
const QUIET_TO = 23

// Во сколько утром приходит «Новый день» с итогами вчерашнего дня
const MORNING_HOUR = 8

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
    } else if (kind === 'meal') {
      // Медвежий пинок: приём уже записан — молчим, дёргать не нужно
      const mealId = n?.request?.content?.data?.mealId
      const today = dayKeyOf()
      const hist = useFoodStore.getState().history || []
      show = !hist.some((e) => e && e.day === today && e.mealId === mealId)
    } else if (kind === 'exercise') {
      // Пинок о тренировке: занятие уже записано сегодня — молчим
      const logs = useExerciseStore.getState().logs || {}
      show = !(logs[dayKeyOf()] || []).length
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

// Часовой пояс устройства для ежедневных/еженедельных триггеров:
// без явного пояса после перевода часов (DST) или перелёта время
// срабатывания может уплыть на час
function deviceTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined
  } catch {
    return undefined
  }
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
    await Notifications.setNotificationChannelAsync('workout', {
      name: 'Напоминания о тренировках',
      importance: Notifications.AndroidImportance.HIGH,
    })
    await Notifications.setNotificationChannelAsync('sleep', {
      name: 'Напоминания о сне',
      importance: Notifications.AndroidImportance.HIGH,
    })
    await Notifications.setNotificationChannelAsync('day', {
      name: 'Утро и итоги дня',
      importance: Notifications.AndroidImportance.HIGH,
    })
  } catch {}
}

// ── Утренний пуш «Новый день» с итогами вчерашнего дня ────────────────
// В 8:00 утра приходит «Вчера: 1 850 ккал, 6 400 шагов». Итоги берём
// из дневной истории (там лежат финальные значения за завершившийся
// день). Поскольку устройство может быть выключено в полночь, финал
// невозможно знать заранее — поэтому планируем ОДНОРАЗОВО на ближайшие
// 8:00 и перепланируем при каждом открытии приложения: содержимое —
// итоги дня, ПРЕДШЕСТВУЮЩЕГО утру срабатывания. Если это сегодня —
// вчерашний день уже заархивирован; если завтра — берём живые значения
// сегодняшнего дня (обновятся при следующем открытии приложения).
function summaryTotalsFor(key) {
  const row = useHistoryStore.getState().days?.[key]
  if (row && (row.kcal > 0 || row.steps > 0)) {
    return { kcal: row.kcal || 0, steps: row.steps || 0 }
  }
  if (key === dayKeyOf()) {
    const act = useActivityStore.getState()
    return { kcal: totalConsumed(useFoodStore.getState().entries || {}), steps: selectTotalSteps(act) }
  }
  return null
}

// Перепланировать одноразовое утреннее уведомление (безопасно звать
// сколько угодно раз — старое с тем же identifier отменяется)
export async function scheduleMorningSummary() {
  if (Platform.OS === 'web' || !Notifications) return
  try {
    const granted = await requestNotifPermission()
    if (!granted) return
    await ensureChannels()

    const fire = new Date()
    fire.setHours(MORNING_HOUR, 0, 0, 0)
    if (fire.getTime() <= Date.now()) fire.setDate(fire.getDate() + 1)

    // «Вчера» относительно утра срабатывания — день перед fire
    const yst = new Date(fire)
    yst.setDate(yst.getDate() - 1)
    const yKey = dayKeyOf(yst)
    const t = summaryTotalsFor(yKey)
    // Аудит организма вчера не проводился — Доктор Топтыгин мягко напоминает
    const auditMissed = useOrganismGameStore.getState().auditDays?.[yKey] == null
    // Вчера ни одной записи — фраза «пропал из приложения» (вторая серия);
    // в мягком стиле остаётся стандартный текст «Новый день…»
    const gone = t ? null : gonePokeBody({ style: useActivityStore.getState().reminder?.meals?.style || 'bear' })
    const tail = auditMissed ? 'Доктор Топтыгин ждёт вас на осмотр 🩺' : 'Хорошего дня! 🐻'
    const body = t
      ? `Вчера: ${formatNum(Math.round(t.kcal))} ккал, ${formatNum(Math.round(t.steps))} шагов. ${tail}`
      : gone
        ? auditMissed
          ? `${gone} И загляни к доктору Топтыгину 🩺`
          : `${gone} 🐻`
        : auditMissed
          ? 'Новый день! Доктор Топтыгин ждёт вас на осмотр 🩺🐻'
          : 'Новый день — запишите завтрак и не забудьте про воду 🐻'

    await Notifications.cancelScheduledNotificationAsync('morning-summary')
    await Notifications.scheduleNotificationAsync({
      identifier: 'morning-summary',
      content: {
        title: '🌅 Новый день',
        body,
        sound: 'default',
        data: { kind: 'day' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: fire,
        channelId: 'day',
      },
    })
  } catch (e) {
    console.warn('Утренняя сводка не запланирована:', e)
  }
}

// ── Медвежьи пинки: адаптивные напоминания о приёмах ────────────────────
// Текст выбирается при планировании по реальному поведению: пропускает
// приёмы — медведь подкалывает («Куда пропал? / Куда пропала?»),
// держит серию — хвалит. Триггер ежедневный (надёжно, даже если
// приложение не открывали), а проверка «записан ли приём» происходит
// в момент срабатывания в setNotificationHandler — записан: молчим.
function mealPokeText(mealId, meals) {
  const st = mealStreaks(useFoodStore.getState().history, mealId, dayKeyOf())
  const t = parseTime(meals?.[mealId]) || { hour: 0, minute: 0 }
  const now = new Date()
  const passed =
    now.getHours() > t.hour ||
    (now.getHours() === t.hour && now.getMinutes() >= t.minute)
  let tone = pickTone({
    loggedToday: st.loggedToday,
    missedToday: passed && !st.loggedToday,
    missedStreak: st.missedStreak,
    goodStreak: st.goodStreak,
    style: meals?.style || 'bear',
  })
  // Похвалу («Уже записано — оперативно!») нельзя показывать из
  // ежедневного пинка: к его срабатыванию приём либо уже записан (пинок
  // молчит), либо ещё нет — и похвала прозвучала бы ложью. Похвала живёт
  // отдельно — мгновенным пушем при ранней записи (maybePraiseNow),
  // здесь вместо неё — гордость за серию или мягкий тон
  if (tone === 'praise') tone = st.goodStreak >= 3 ? 'cheer' : 'soft'
  // Пол и имя из профиля: фразы подстраиваются («Куда пропал?» /
  // «Куда пропала?», «Катя, булочки?»)
  const { name, sex } = useProfileStore.getState()
  return mealPokeMessage({
    mealId,
    tone,
    // Серия — для cheer-фраз: «5 дней подряд», иначе выходило «,  подряд»
    streak: st.goodStreak,
    gender: sex === 'female' ? 'f' : 'm',
    name,
    style: meals?.style || 'bear',
  })
}

// ── Мгновенная похвала за оперативность ──────────────────────────────
// Приём записан РАНЬШЕ своего напоминания — мишка аплодирует сразу
// (one-shot через пару секунд, раз в день на приём). Правила:
//  • одиночная запись — массовое копирование дня («Повторить день»)
//    не оперативность, за неё не хвалим;
//  • стиль не «Мягко» — чип обещает спокойные напоминания «как раньше»;
//  • только встроенные приёмы с настроенным временем — для остальных
//    непонятно, что значит «раньше».
const MEAL_KEYS = ['breakfast', 'lunch', 'dinner']
const praisedAt = {} // mealId → dayKey последней похвалы

async function maybePraiseNow(state, prev) {
  if (Platform.OS === 'web' || !Notifications) return
  const meals = useActivityStore.getState().reminder?.meals
  if (!meals?.enabled || meals.style === 'soft') return
  const today = dayKeyOf()
  const prevIds = new Set((prev?.history || []).map((e) => e?.id))
  const added = (state.history || []).filter((e) => e && e.day === today && !prevIds.has(e.id))
  if (added.length !== 1) return
  const entry = added[0]
  if (!MEAL_KEYS.includes(entry.mealId) || praisedAt[entry.mealId] === today) return
  const t = parseTime(meals[entry.mealId])
  if (!t) return
  const now = new Date()
  const beforeReminder =
    now.getHours() < t.hour || (now.getHours() === t.hour && now.getMinutes() < t.minute)
  if (!beforeReminder) return // после своего времени — это уже не «оперативно»
  praisedAt[entry.mealId] = today
  const { name, sex } = useProfileStore.getState()
  const msg = mealPokeMessage({
    mealId: entry.mealId,
    tone: 'praise',
    gender: sex === 'female' ? 'f' : 'm',
    name,
    style: 'bear',
  })
  try {
    await Notifications.scheduleNotificationAsync({
      identifier: `meal-praise-${entry.mealId}`,
      content: {
        title: msg.title,
        body: msg.body,
        sound: 'default',
        data: { kind: 'meal-praise', mealId: entry.mealId },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(Date.now() + 2000),
        channelId: 'meals',
      },
    })
  } catch {}
}

// Запланировать 3 ежедневных напоминания (вызывается, когда разрешение
// уже получено — из rescheduleReminders/refreshDailyPokes)
async function scheduleMeals(meals) {
  for (const key of ['breakfast', 'lunch', 'dinner']) {
    const t = parseTime(meals[key])
    if (!t) continue
    const { title, body } = mealPokeText(key, meals)
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
          timezone: deviceTimeZone(),
          channelId: 'meals',
        },
      })
    } catch (e) {
      console.warn(`Напоминание «${key}» не запланировано:`, e)
    }
  }
}

// Перепланировать ТОЛЬКО приёмы пищи (вода и взвешивание не трогаются):
// зовём при каждой правке дневника и возврате в приложение — тексты
// пинков всегда отражают свежее поведение. С небольшим debounce,
// чтобы быстрые правки не заспамили планировщик.
let mealSeq = 0
let mealTimer = null
export async function rescheduleMeals() {
  if (Platform.OS === 'web' || !Notifications) return
  const my = ++mealSeq
  try {
    for (const id of ['meal-breakfast', 'meal-lunch', 'meal-dinner']) {
      await Notifications.cancelScheduledNotificationAsync(id)
    }
  } catch {}
  if (my !== mealSeq) return
  const meals = useActivityStore.getState().reminder?.meals
  if (meals?.enabled) await scheduleMeals(meals)
}

function queueRescheduleMeals() {
  if (mealTimer) return
  mealTimer = setTimeout(() => {
    mealTimer = null
    rescheduleMeals()
  }, 1500)
}

// Взвешивание: раз в неделю в выбранное время (общая для полного
// перепланирования и обновления пинков)
async function scheduleWeigh(reminder) {
  const weigh = reminder?.weigh
  if (!weigh?.enabled) return
  const t = parseTime(weigh.time)
  // weekday хранится как 0=Пн…6=Вс, у expo-notifications 1=Вс…7=Сб
  const EXPO_WD = [2, 3, 4, 5, 6, 7, 1]
  const wd = EXPO_WD[Math.min(6, Math.max(0, Math.round(weigh.weekday ?? 5)))]
  if (!t) return
  const weighMsg = weighPokeMessage({ style: reminder?.meals?.style || 'bear' })
  try {
    await Notifications.scheduleNotificationAsync({
      identifier: 'weigh-weekly',
      content: {
        title: weighMsg.title,
        body: weighMsg.body,
        sound: 'default',
        data: { kind: 'weigh' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: wd,
        hour: t.hour,
        minute: t.minute,
        timezone: deviceTimeZone(),
        channelId: 'weigh',
      },
    })
  } catch (e) {
    console.warn('Напоминание о взвешивании не запланировано:', e)
  }
}

// Тренировка: ежедневно в выбранное время. Занятие уже записано —
// обработчик молчит в момент срабатывания (как с приёмами пищи).
// Стиль «Мягко» — спокойный текст без мемов, как у воды и весов
async function scheduleWorkout(reminder) {
  const exercise = reminder?.exercise
  if (!exercise?.enabled) return
  const t = parseTime(exercise.time)
  if (!t) return
  const workoutMsg = workoutPokeMessage({ style: reminder?.meals?.style || 'bear' })
  try {
    await Notifications.scheduleNotificationAsync({
      identifier: 'workout-daily',
      content: {
        title: workoutMsg.title,
        body: workoutMsg.body,
        sound: 'default',
        data: { kind: 'exercise' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: t.hour,
        minute: t.minute,
        timezone: deviceTimeZone(),
        channelId: 'workout',
      },
    })
  } catch (e) {
    console.warn('Напоминание о тренировке не запланировано:', e)
  }
}

// Сон: ежедневно в выбранное время (по умолчанию 22:30). Проверки
// «уже записан?» нет — будущую ночь нельзя записать заранее, пинок
// всегда уместен. Тап открывает окно «Записать сон» (navEvents)
async function scheduleSleep(reminder) {
  const sleep = reminder?.sleep
  if (!sleep?.enabled) return
  const t = parseTime(sleep.time)
  if (!t) return
  const sleepMsg = sleepPokeMessage({ style: reminder?.meals?.style || 'bear' })
  try {
    await Notifications.scheduleNotificationAsync({
      identifier: 'sleep-daily',
      content: {
        title: sleepMsg.title,
        body: sleepMsg.body,
        sound: 'default',
        data: { kind: 'sleep' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: t.hour,
        minute: t.minute,
        timezone: deviceTimeZone(),
        channelId: 'sleep',
      },
    })
  } catch (e) {
    console.warn('Напоминание о сне не запланировано:', e)
  }
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
    // Текст — ротация из второй серии при каждом перепланировании;
    // стиль «Мягко» оставляет прежний спокойный текст
    const waterMsg = waterPokeMessage({ style: reminder?.meals?.style || 'bear' })
    try {
      await Notifications.scheduleNotificationAsync({
        identifier: 'water-loop',
        content: {
          title: waterMsg.title,
          body: waterMsg.body,
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

  // Приёмы пищи: ежедневно в выбранное время, тексты — медвежьи пинки
  const meals = reminder?.meals
  if (meals?.enabled) await scheduleMeals(meals)

  // Взвешивание: раз в неделю в выбранное время
  await scheduleWeigh(reminder)

  // Тренировка: ежедневно в выбранное время
  await scheduleWorkout(reminder)

  // Сон: ежедневно в выбранное время (вечерний пинок «пора спать»)
  await scheduleSleep(reminder)

  // Утренняя сводка «Новый день» — не зависит от тумблеров напоминаний
  if (my !== seq) return
  await scheduleMorningSummary()
}

// Обновить ежедневные/еженедельные пинки и утреннюю сводку, НЕ трогая
// интервальный триггер воды: раньше на каждый возврат в приложение
// звали полный cancelAll — отсчёт интервала воды начинался заново,
// и напоминания приходили реже настроенного. Здесь отменяются только
// пинки с известными identifier — интервал воды живёт дальше
async function refreshDailyPokes() {
  if (Platform.OS === 'web' || !Notifications) return
  const my = ++seq
  const granted = await requestNotifPermission()
  if (my !== seq || !granted) return
  try {
    for (const id of [
      'meal-breakfast',
      'meal-lunch',
      'meal-dinner',
      'weigh-weekly',
      'workout-daily',
      'sleep-daily',
    ]) {
      await Notifications.cancelScheduledNotificationAsync(id)
    }
  } catch {}
  if (my !== seq) return
  const { reminder } = useActivityStore.getState()
  await scheduleMeals(reminder?.meals)
  await scheduleWeigh(reminder)
  await scheduleWorkout(reminder)
  await scheduleSleep(reminder)
  await scheduleMorningSummary()
}

// Тап по уведомлению: открываем соответствующее место приложения
function handleNotificationTap(data) {
  const kind = data?.kind
  try {
    if (kind === 'water' || kind === 'meal' || kind === 'meal-praise') {
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
    } else if (kind === 'exercise') {
      // Тап по пинку о тренировке — сразу в дневник тренировок
      router.navigate('/activity')
    } else if (kind === 'sleep') {
      // Тап по пинку «пора спать» — сразу окно «Записать сон» (сон
      // за прошлую ночь удобно записать с утра, а вечером — просто лечь)
      router.navigate('/activity')
      requestOpenSleepModal()
    } else if (kind === 'day') {
      // Утренняя сводка: если в ней упоминался доктор — вела в аудит.
      // Открываем вкладку «Организм» — там Доктор Топтыгин и живёт
      router.navigate('/organism')
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

  // Вернулись в приложение — обновляем только пинки (приёмы, веса,
  // тренировка) и утреннюю сводку: тексты пересчитываются на свежих
  // данных дневника, фразы ротируются. Полное перепланирование (с
  // перезапуском интервала воды) — только при смене настроек/дня,
  // иначе каждое открытие приложения отодвигало напоминание о воде
  const appSub = AppState.addEventListener('change', (st) => {
    if (st === 'active') refreshDailyPokes()
  })

  // Любое изменение настроек напоминаний — перепланировать
  const unsub = useActivityStore.subscribe((s, prev) => {
    if (s.reminder !== prev.reminder) rescheduleReminders()
    // Переход на новый день: утренняя сводка должна показать только что
    // завершившийся день, а фразы серий — смениться на свежие
    else if (s.dayKey !== prev.dayKey) rescheduleReminders()
  })

  // Правка дневника (записали/удалили приём) — перепланируем пинки:
  // медведь должен знать, что приём уже не пропущен (debounce 1,5 с),
  // и похвалить за оперативность, если запись пришла раньше напоминания
  const foodUnsub = useFoodStore.subscribe((s, prev) => {
    queueRescheduleMeals()
    maybePraiseNow(s, prev)
  })

  // Сменилось имя или пол в профиле — пинки перетекстовываются
  // («Катя, куда пропала?» ↔ «Куда пропал?» / без имени)
  const profUnsub = useProfileStore.subscribe((s, prev) => {
    if (s.name !== prev.name || s.sex !== prev.sex) queueRescheduleMeals()
  })

  return () => {
    if (respSub) respSub.remove()
    try {
      appSub.remove()
    } catch {}
    unsub()
    try {
      foodUnsub()
    } catch {}
    try {
      profUnsub()
    } catch {}
    if (mealTimer) {
      clearTimeout(mealTimer)
      mealTimer = null
    }
    started = false
  }
}

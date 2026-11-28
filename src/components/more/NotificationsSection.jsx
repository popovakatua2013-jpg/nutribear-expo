// Секция «Напоминания» — один компактный список: тумблер вкл/выкл +
// окно времени у каждого типа. Порядок строк — отзыв Кати 19.11:
// блоки «от большого к маленькому» (от самого широкого чипа времени
// к узкому): еда, вода, взвешивание, мишка, тренировка, сон, вибро.
// Все окна времени выглядят ОДИНАКОВО (отзыв Кати 10.11): серый чип
// со значением и шевроном — тап раскрывает выбор под строкой.
// Всё в ОДНОМ блоке — отзыв Кати 16.11: «Время пинка, напоминание
// мишки, напоминание, стиль пинков — нужно объединить… не 100 строк
// и выбора, а компактно и все в одном месте»: дубли «Сон» и «Время
// пинка» из группы ЗДОРОВЬЕ удалены, «Напоминание мишки» и «Вибрация»
// переехали из ПРИЛОЖЕНИЯ сюда. Никаких подсказок и пояснений
// (отзыв Кати: «все подсказки убрать в напоминаниях»), никаких
// вложенных карточек и плиток — только список. «Возвращать калории»
// отсюда убрано: дубль настройки в строке «Дневник питания».

import { useEffect, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { ChevronDown } from 'lucide-react-native'
import { MiniToggle, PillPicker } from './MenuList'
import { TimeField } from './TimeField'
import { useActivityStore } from '@/store/useActivityStore'
import { useUiPrefsStore } from '@/store/useUiPrefsStore'
import { hapticFeedback } from '@/lib/haptics'
import {
  notifDiagnostics,
  requestAlarmPermission,
  requestIgnoreBatteryOptimizations,
  requestNotifPermission,
  rescheduleReminders,
  scheduleTestNotification,
} from '@/lib/reminders'
import { toastAndOpenSettings } from '@/lib/appSettings'
import { useToast } from '../ui/Toast'
import { useThemeColors } from '@/lib/use-theme'


const DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
const INTERVALS = [30, 60, 90, 120].map((n) => ({ key: n, label: `${n} мин` }))
const MEALS = [
  { key: 'breakfast', label: 'Завтрак' },
  { key: 'lunch', label: 'Обед' },
  { key: 'dinner', label: 'Ужин' },
]
// Порог «Мишка пинает»: сколько дней без записи веса (бывший блок
// «Напоминание мишки» из ПРИЛОЖЕНИЯ)
const NUDGE_OPTIONS = [5, 7, 10].map((n) => ({ key: n, label: `${n} дней` }))

// Чип «окно времени» — единый вид для всех пяти напоминаний:
// текущее значение + шеврон, тап раскрывает выбор под строкой
function TimeChip({ text, open, onPress }) {
  const themeColors = useThemeColors()
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      accessibilityLabel={`Окно времени: ${text}`}
      hitSlop={4}
      className="max-w-[180px] shrink-0 flex-row items-center gap-1 rounded-full border border-bear-line bg-bear-overlay px-2.5 py-1 active:opacity-70"
    >
      <Text
        numberOfLines={1}
        maxFontSizeMultiplier={1.1}
        className="min-w-0 font-sans text-[12.5px] text-bear-soft"
      >
        {text}
      </Text>
      <ChevronDown
        size={13}
        color={themeColors.sub}
        style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}
      />
    </Pressable>
  )
}

// Строка списка: иконка + название + окно времени + тумблер вкл/выкл.
// timeEl — элемент окна времени в самой строке (поле ввода или чип);
// expand — что показать под строкой после тапа по чипу.
function ReminderRow({ icon, title, enabled, onToggle, timeEl, expanded, expand }) {
  return (
    <View className="rounded-2xl bg-bear-overlay">
      <View className="flex-row items-center gap-2 px-3 py-2">
        <Text className="w-[24px] shrink-0 text-center text-[17px]">{icon}</Text>
        <Text
          numberOfLines={1}
          maxFontSizeMultiplier={1.1}
          className="min-w-0 flex-1 font-bold text-[15.5px] text-bear-text"
        >
          {title}
        </Text>
        {timeEl}
        <MiniToggle value={enabled} onChange={onToggle} label={title} />
      </View>
      {expanded && expand ? <View className="px-3 pb-2.5 pt-1">{expand}</View> : null}
    </View>
  )
}

// Строка без тумблера — для диагностики «уведомления не приходят»
// (отзыв Кати 28.11). Тап по чипу статуса раскрывает состояния и кнопки
function CheckRow({ icon, title, chip, open, onFlip, children }) {
  const themeColors = useThemeColors()
  const ok = chip === 'ок'
  return (
    <View className="rounded-2xl bg-bear-overlay">
      <View className="flex-row items-center gap-2 px-3 py-2">
        <Text className="w-[24px] shrink-0 text-center text-[17px]">{icon}</Text>
        <Text
          numberOfLines={1}
          maxFontSizeMultiplier={1.1}
          className="min-w-0 flex-1 font-bold text-[15.5px] text-bear-text"
        >
          {title}
        </Text>
        <Pressable
          onPress={onFlip}
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          accessibilityLabel={`Проверка уведомлений: ${chip}. Тап — подробности и кнопки исправления`}
          hitSlop={4}
          className="max-w-[180px] shrink-0 flex-row items-center gap-1 rounded-full border border-bear-line bg-bear-card2 px-2.5 py-1 active:opacity-70"
        >
          <View
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: ok ? themeColors.good : themeColors.bad }}
          />
          <Text
            numberOfLines={1}
            maxFontSizeMultiplier={1.1}
            className="min-w-0 font-sans text-[12.5px] text-bear-soft"
          >
            {chip}
          </Text>
          <ChevronDown
            size={13}
            color={themeColors.sub}
            style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}
          />
        </Pressable>
      </View>
      {open && children ? <View className="px-3 pb-2.5 pt-1">{children}</View> : null}
    </View>
  )
}

// Кнопка внутри диагностики — как пилюли выбора, но с явным текстом
function DiagButton({ label, onPress, accent }) {
  const themeColors = useThemeColors()
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={4}
      className="flex-row items-center rounded-xl bg-bear-card2 px-3 py-2 active:opacity-70"
      style={accent ? { backgroundColor: themeColors.accentFaint2 } : undefined}
    >
      <Text
        numberOfLines={1}
        className="font-semibold text-[14.5px]"
        style={{ color: accent ? themeColors.accentBright : themeColors.soft }}
      >
        {label}
      </Text>
    </Pressable>
  )
}

function DiagLine({ ok, children }) {
  const themeColors = useThemeColors()
  return (
    <View className="flex-row items-start gap-1.5 rounded-xl bg-bear-card2 px-3 py-2">
      <Text
        className="font-bold text-[14.5px]"
        style={{ color: ok === undefined ? themeColors.sub2 : ok ? themeColors.good : themeColors.bad }}
      >
        {ok === undefined ? '·' : ok ? '✓' : '✗'}
      </Text>
      <Text
        maxFontSizeMultiplier={1.15}
        className="min-w-0 flex-1 font-sans text-[14px] leading-snug text-bear-soft"
      >
        {children}
      </Text>
    </View>
  )
}

export function NotificationsSection() {
  const { toast } = useToast()
  const reminder = useActivityStore((s) => s.reminder)
  const setReminder = useActivityStore((s) => s.setReminder)
  // Вибро-отклик и «Мишка пинает» (тумблер + порог) — из prefs-стора:
  // раньше висели отдельно в ПРИЛОЖЕНИИ, теперь в общем блоке
  const haptics = useUiPrefsStore((s) => s.haptics)
  const setHaptics = useUiPrefsStore((s) => s.setHaptics)
  const weighNudgeOn = useUiPrefsStore((s) => s.weighNudgeOn !== false)
  const setWeighNudgeOn = useUiPrefsStore((s) => s.setWeighNudgeOn)
  const weighNudgeDays = useUiPrefsStore((s) => s.weighNudgeDays || 7)
  const setWeighNudgeDays = useUiPrefsStore((s) => s.setWeighNudgeDays)
  // Раскрытый чип окна времени (один за раз — список остаётся компактным)
  const [openKey, setOpenKey] = useState(null)
  const flip = (key) => setOpenKey((k) => (k === key ? null : key))

  // Запасные значения — если состояние восстановлено из старой копии
  const exercise = reminder.exercise || { enabled: false, time: '18:00' }
  const sleep = reminder.sleep || { enabled: false, time: '22:30' }
  const weigh = reminder.weigh || { enabled: false, weekday: 5, time: '08:00' }
  const meals =
    reminder.meals || { enabled: false, breakfast: '09:00', lunch: '13:00', dinner: '19:00' }

  // Включение напоминаний требует разрешения на уведомления
  async function toggle(patchFn, on) {
    if (on) {
      const ok = await requestNotifPermission()
      if (!ok) {
        // Тост + автоматический переход в настройки телефона
        toastAndOpenSettings(toast, {
          title: '🔔 Нужно разрешение',
          description: 'Разрешите уведомления NutriBear в настройках телефона',
        })
        return
      }
      // Точные будильники (Android 12+): без права пуши приходят
      // с задержкой или тонут в дремоте. Запрос один раз, тихо:
      // если право уже есть — ничего не откроется; если нет — откроется
      // системный экран «Будильники и напоминания» (отзыв Кати 28.11:
      // «уведомления не работают совсем» — чаще всего именно оно)
      requestAlarmPermission()
    }
    setReminder(patchFn(on))
  }

  // ── Диагностика «уведомления не приходят» (строка «Проверка») ──────
  const [diag, setDiag] = useState(null) // {supported, permission, alarms}
  const [checking, setChecking] = useState(false) // идёт отправка тестового пуша

  async function refreshDiag() {
    try {
      setDiag(await notifDiagnostics())
    } catch {
      setDiag(null)
    }
  }

  // Раскрыли строку проверки — читаем свежие состояния разрешений
  useEffect(() => {
    if (openKey === 'check') refreshDiag()
  }, [openKey])

  async function sendTest() {
    if (checking) return
    setChecking(true)
    try {
      const sent = await scheduleTestNotification()
      if (sent) {
        toast({
          title: '🔔 Проверка отправлена',
          description: 'Через 4 секунды придёт тестовое уведомление — дождитесь его',
        })
        rescheduleReminders() // вернулись с экрана разрешений — перепланируем
      } else {
        toastAndOpenSettings(toast, {
          title: '🔔 Нужно разрешение',
          description: 'Разрешите уведомления NutriBear в настройках телефона — и проверка дойдёт',
        })
      }
    } finally {
      setChecking(false)
      refreshDiag()
    }
  }

  async function enableAlarms() {
    await requestAlarmPermission()
    // Вернулись с системного экрана — перепланируем с точными будильниками
    rescheduleReminders()
    refreshDiag()
    toast({
      title: '⏰ Точные будильники',
      description: 'Если включили — напоминания будут приходить минута в минуту',
    })
  }

  async function unrestrictBattery() {
    const shown = await requestIgnoreBatteryOptimizations()
    if (!shown) {
      toastAndOpenSettings(toast, {
        title: '🔋 Фоновая работа',
        description: 'Откроем настройки телефона: приложение → Батарея → «Не ограничивать»',
      })
    } else {
      toast({
        title: '🔋 Фоновая работа',
        description: 'Выберите «Разрешить» — телефон не будет глушить напоминания',
      })
    }
  }

  // Короткий статус в чипе строки проверки
  const diagChip = !diag
    ? 'проверить'
    : !diag.supported
      ? 'недоступно'
      : diag.permission !== 'granted'
        ? 'нужно разрешение'
        : diag.alarms === 'granted'
          ? 'ок'
          : 'может опаздывать'

  return (
    <View accessibilityLabel="Уведомления" className="gap-1.5">
      {/* Проверка уведомлений: статус + тестовый пуш + исправления
          (отзыв Кати 28.11: «уведомления вода и т.д. не работают совсем»).
          Тап по чипу — состояния разрешений и кнопки исправления */}
      <CheckRow
        icon="🔔"
        title="Проверка уведомлений"
        chip={diagChip}
        open={openKey === 'check'}
        onFlip={() => flip('check')}
      >
        <View className="gap-1.5">
          <DiagLine ok={diag?.supported === false ? undefined : diag?.permission === 'granted'}>
            {diag?.permission === 'granted'
              ? 'Разрешение на уведомления есть'
              : diag?.permission === 'denied'
                ? 'Разрешение выключено — включите в настройках телефона'
                : 'Разрешение ещё не запрашивалось — включите любой тумблер ниже'}
          </DiagLine>
          <DiagLine ok={diag?.alarms === 'granted'}>
            {diag?.alarms === 'granted'
              ? 'Точные будильники включены — пуши минута в минуту'
              : diag?.alarms === 'denied'
                ? 'Точные будильники выключены — напоминания могут приходить с задержкой или не приходить вовсе'
                : 'Точные будильники: неизвестно (на этой сборке проверка недоступна)'}
          </DiagLine>
          <View className="flex-row flex-wrap gap-1.5">
            <DiagButton
              accent
              label={checking ? 'Отправляем…' : 'Пуш через 4 секунды — проверить'}
              onPress={sendTest}
            />
            {diag?.alarms === 'denied' && (
              <DiagButton label="Включить точные будильники" onPress={enableAlarms} />
            )}
            <DiagButton label="Не ограничивать в фоне" onPress={unrestrictBattery} />
          </View>
        </View>
      </CheckRow>

      {/* Порядок строк — отзыв Кати 19.11: блоки с окном времени «от
          большого к маленькому» — от самого широкого чипа к узкому,
          иначе список выглядит неаккуратно */}
      {/* Еда: три времени — самый широкий чип */}
      <ReminderRow
        icon="🍽"
        title="Еда"
        enabled={Boolean(meals.enabled)}
        onToggle={(on) => toggle((v) => ({ meals: { ...meals, enabled: v } }), on)}
        timeEl={
          <TimeChip
            text={`${meals.breakfast} · ${meals.lunch} · ${meals.dinner}`}
            open={openKey === 'meals'}
            onPress={() => flip('meals')}
          />
        }
        expanded={openKey === 'meals'}
        expand={
          <View className="gap-1.5">
            {MEALS.map((m) => (
              <View
                key={m.key}
                className="flex-row items-center justify-between gap-2 rounded-xl bg-bear-overlay px-2.5 py-1.5"
              >
                <Text
                  maxFontSizeMultiplier={1.1}
                  className="min-w-0 flex-1 font-semibold text-[14.5px] text-bear-text"
                >
                  {m.label}
                </Text>
                <TimeField
                  value={meals[m.key]}
                  onChange={(t) => setReminder({ meals: { ...meals, [m.key]: t } })}
                />
              </View>
            ))}
          </View>
        }
      />

      {/* Вода: интервал повторения — чип раскрывает выбор */}
      <ReminderRow
        icon="💧"
        title="Вода"
        enabled={Boolean(reminder.enabled)}
        onToggle={(on) => toggle((v) => ({ enabled: v }), on)}
        timeEl={
          <TimeChip
            text={`каждые ${reminder.everyMin || 60} мин`}
            open={openKey === 'water'}
            onPress={() => flip('water')}
          />
        }
        expanded={openKey === 'water'}
        expand={
          <PillPicker
            options={INTERVALS}
            value={reminder.everyMin || 60}
            onChange={(n) => setReminder({ everyMin: n })}
            accessibilityLabel="Интервал напоминаний о воде"
          />
        }
      />

      {/* Взвешивание: день недели + время — чип раскрывает выбор */}
      <ReminderRow
        icon="⚖️"
        title="Взвешивание"
        enabled={Boolean(weigh.enabled)}
        onToggle={(on) => toggle((v) => ({ weigh: { ...weigh, enabled: v } }), on)}
        timeEl={
          <TimeChip
            text={`${DAYS[weigh.weekday] || 'Сб'} · ${weigh.time}`}
            open={openKey === 'weigh'}
            onPress={() => flip('weigh')}
          />
        }
        expanded={openKey === 'weigh'}
        expand={
          <View className="gap-2">
            <PillPicker
              options={DAYS.map((d, i) => ({ key: i, label: d }))}
              value={weigh.weekday}
              onChange={(i) => setReminder({ weigh: { ...weigh, weekday: i } })}
              accessibilityLabel="День недели взвешивания"
            />
            <View className="flex-row items-center justify-end">
              <TimeField
                value={weigh.time}
                onChange={(t) => setReminder({ weigh: { ...weigh, time: t } })}
              />
            </View>
          </View>
        }
      />

      {/* Мишка пинает о весе: тумблер + порог дней без записи веса
          (переехало из группы ПРИЛОЖЕНИЕ — отзыв Кати 16.11: все
          напоминания в одном месте) */}
      <ReminderRow
        icon="🐻"
        title="Мишка пинает"
        enabled={weighNudgeOn}
        onToggle={(on) => setWeighNudgeOn(on)}
        timeEl={
          weighNudgeOn ? (
            <TimeChip
              text={`через ${weighNudgeDays} дн`}
              open={openKey === 'nudge'}
              onPress={() => flip('nudge')}
            />
          ) : null
        }
        expanded={openKey === 'nudge'}
        expand={
          <PillPicker
            options={NUDGE_OPTIONS}
            value={weighNudgeDays}
            onChange={setWeighNudgeDays}
            accessibilityLabel="Через сколько дней напомнить о весе"
          />
        }
      />

      {/* Тренировка: чип времени → раскрытие с полем — как у всех окон */}
      <ReminderRow
        icon="🏋️"
        title="Тренировка"
        enabled={Boolean(exercise.enabled)}
        onToggle={(on) => toggle((v) => ({ exercise: { ...exercise, enabled: v } }), on)}
        timeEl={
          <TimeChip
            text={exercise.time}
            open={openKey === 'exercise'}
            onPress={() => flip('exercise')}
          />
        }
        expanded={openKey === 'exercise'}
        expand={
          <View className="flex-row items-center justify-end">
            <TimeField
              value={exercise.time}
              onChange={(t) => setReminder({ exercise: { ...exercise, time: t } })}
            />
          </View>
        }
      />

      {/* Сон: чип времени → раскрытие с полем — как у всех окон */}
      <ReminderRow
        icon="🌙"
        title="Сон"
        enabled={Boolean(sleep.enabled)}
        onToggle={(on) => toggle((v) => ({ sleep: { ...sleep, enabled: v } }), on)}
        timeEl={
          <TimeChip
            text={sleep.time}
            open={openKey === 'sleep'}
            onPress={() => flip('sleep')}
          />
        }
        expanded={openKey === 'sleep'}
        expand={
          <View className="flex-row items-center justify-end">
            <TimeField
              value={sleep.time}
              onChange={(t) => setReminder({ sleep: { ...sleep, time: t } })}
            />
          </View>
        }
      />

      {/* Вибро-отклик: отклик приложения на касания (меню, тумблеры,
          пилюли, плеер тренировок, кольца ИМТ) — общая точка
          hapticFeedback. Включили — сразу тестовая вибрация: настройку
          можно проверить, не отходя от строки. Без окна времени —
          последней */}
      <ReminderRow
        icon="📳"
        title="Вибро-отклик"
        enabled={haptics}
        onToggle={(on) => {
          setHaptics(on)
          if (on) hapticFeedback('success')
        }}
      />
    </View>
  )
}

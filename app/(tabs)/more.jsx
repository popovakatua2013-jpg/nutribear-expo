// Экран «Ещё» — компактное групповое меню (как в настройках iOS и в
// «Ещё» у MyFitnessPal/Yazio). Структура по отзывам Кати:
//   Герой-профиль:   аватар, рост • вес, тап — редактирование
//   ЗДОРОВЬЕ:        Цикл / Сон / Время пинка
//   ДНЕВНИК:         Напоминания / Начать новый день
//                    («Мои цели» удалена — цели живут на вкладке «План»,
//                    дублировать больше не будем — отзыв Кати 09.11)
//   ПОДДЕРЖКА:       Поддержка и помощь — тап сразу открывает окно
//                    «Написать нам» (отзыв Кати от 10.11: «да, сразу
//                    открывалась»; кнопки-темы и адрес из строки
//                    убраны — выбор темы в самом окне)
//   ПРИЛОЖЕНИЕ:      Дневник питания / Шаги и здоровье / Вибрация /
//                    Стиль пинков / Напоминание мишки / Приватность
//                    (подсказки «экспорт · копия» и «политика ·
//                    соглашение» убраны — обрезались в строке)
//   Внизу — как в стандартных приложениях: три правовых документа
//   отдельными строками (тап — экран с названием в шапке и текстом),
//   красная строка «Стереть все данные» и строка версии с ID сборки
//   (как в чужом приложении по скринам Кати от 10.11; строка
//   «О приложении» удалена — версия теперь внизу экрана).
// Тумблер «Вибрация»: при включении сразу короткая вибрация — видно
// и слышно, что настройка работает (отзыв Кати 09.11).
// Дубли удалены (отзыв Кати: «данные и статистику удалить — дубль»):
// «Данные» и «Статистика» показывают то же, что вкладки Тело и
// Активность. «Возвращать калории» — только в «Дневнике питания».
// Напоминания — раскрывающийся список: тренировка, вода, взвешивание,
// еда, сон — тумблер вкл/выкл и окно времени, без подсказок.
// Хэш сборки для проверки обновления — в строке «ID: …» внизу экрана.
// Шапка экрана — с мягкой неоновой дымкой, как на вкладке «Тело»

import { useEffect, useState } from 'react'
import { DeviceEventEmitter, ScrollView, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import Constants from 'expo-constants'
import { Settings } from 'lucide-react-native'
import { MenuGroup, MenuRow, PillPicker } from '@/components/more/MenuList'
import { ProfileEditor } from '@/components/more/ProfileEditor'
import { CycleCard } from '@/components/more/CycleCard'
import { SleepDashboardCard, KickTimeCard } from '@/components/more/PokeCards'
import { NotificationsSection } from '@/components/more/NotificationsSection'
import { SupportModal } from '@/components/more/SupportModal'
import { DiarySettingsCard } from '@/components/more/DiarySettingsCard'
import { SyncCard } from '@/components/more/SyncCard'
import { DataPortability } from '@/components/more/DataPortability'
import { DataActions } from '@/components/more/DataActions'
import { LegalDocModal } from '@/components/more/LegalDocModal'
import { SoftGlow } from '@/components/ui/SoftGlow'
import { BodyChip } from '@/components/ui/BodyChip'
import { useCycleStore, daysToNext } from '@/store/useCycleStore'
import { useActivityStore } from '@/store/useActivityStore'
import { useGoalsStore } from '@/store/useGoalsStore'
import { useUiPrefsStore } from '@/store/useUiPrefsStore'
import { BUILD_HASH } from '@/lib/version'
import { consumeOpenReminders } from '@/lib/navEvents'
import { AiChat } from '@/components/home/AiChat'

// Стиль пинков медведя: мягко / с характером (дефолт) / с перцем
const STYLE_LABEL = { soft: 'Мягко', bear: 'С характером', spicy: 'С перцем' }
const STYLE_OPTIONS = [
  { key: 'soft', label: 'Мягко' },
  { key: 'bear', label: 'С характером 🐻' },
  { key: 'spicy', label: 'С перцем 🌶' },
]
// Порог «Напоминания мишки»: сколько дней без записи веса
const NUDGE_OPTIONS = [5, 7, 10].map((n) => ({ key: n, label: `${n} дней` }))

// Версия приложения из app.json — строкой внизу экрана «Ещё»
// (как в чужом приложении по скрину Кати: «Версия …» + «ID: …»)
const VERSION = Constants?.expoConfig?.version || '1.0'

export default function MoreScreen() {
  const insets = useSafeAreaInsets()
  // Правовые документы: каждый — отдельной строкой внизу «Ещё», тап
  // открывает экран с названием документа в шапке и его текстом
  const [legalDoc, setLegalDoc] = useState(null)

  // Окно «Написать нам»: открывается сразу по тапу на строку поддержки
  const [supportOpen, setSupportOpen] = useState(false)

  // «Напоминания» раскрыты извне: колокольчик в шапке «Плана» ведёт сюда
  // и сразу открывает строку (двойной механизм navEvents: событие для
  // смонтированной вкладки + отложенный флаг, т.к. вкладки монтируются
  // лениво). Пользователь может свернуть строку обратно тапом.
  const [remindersOpen, setRemindersOpen] = useState(false)
  useEffect(() => {
    if (consumeOpenReminders()) setRemindersOpen(true)
    const sub = DeviceEventEmitter.addListener('nutribear/open-reminders', () => {
      setRemindersOpen(true)
    })
    return () => sub.remove()
  }, [])

  // ── Живые значения строк меню — из тех же сторов, что и виджеты ──
  // Цикл: «через N дн» / «ожидается сегодня» / «задержка N дн»
  const cycleEnabled = useCycleStore((s) => s.enabled)
  const lastStart = useCycleStore((s) => s.lastStart)
  const cycleLength = useCycleStore((s) => s.length)
  const left = cycleEnabled && lastStart ? daysToNext(lastStart, cycleLength) : null
  const cycleValue = !cycleEnabled
    ? 'выключен'
    : left == null
      ? 'отметьте начало'
      : left < 0
        ? `задержка ${Math.abs(left)} дн`
        : left === 0
          ? 'ожидается сегодня'
          : `через ${left} дн`

  // Напоминания: сколько включено (вода, еда, взвешивание, тренировка, сон)
  const reminder = useActivityStore((s) => s.reminder)
  const setReminder = useActivityStore((s) => s.setReminder)
  const sleep = reminder?.sleep || { enabled: false, time: '22:30' }
  const exercise = reminder?.exercise || { enabled: false, time: '18:00' }
  const meals =
    reminder?.meals ||
    { enabled: false, breakfast: '09:00', lunch: '13:00', dinner: '19:00', style: 'bear' }
  const mealStyle = meals.style === 'soft' ? 'soft' : meals.style === 'spicy' ? 'spicy' : 'bear'
  const remCount = [
    reminder?.enabled,
    meals.enabled,
    reminder?.weigh?.enabled,
    exercise.enabled,
    sleep.enabled,
  ].filter(Boolean).length

  // Дневник питания: режим остатка
  const countBurned = useGoalsStore((s) => Boolean(s.goals.countBurned))

  // Шаги и здоровье: что подключено
  const pedometerEnabled = useActivityStore((s) => s.pedometerEnabled)
  const healthConnectEnabled = useActivityStore((s) => s.healthConnectEnabled)

  // Вибро-отклик, стиль пинков и порог «Напоминания мишки»
  const haptics = useUiPrefsStore((s) => s.haptics)
  const setHaptics = useUiPrefsStore((s) => s.setHaptics)
  // Включили тумблер — тут же короткая вибрация: настройку можно
  // проверить, не отходя от строки (отзыв Кати)
  const changeHaptics = (v) => {
    setHaptics(v)
    if (v) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
    }
  }
  const weighNudgeDays = useUiPrefsStore((s) => s.weighNudgeDays || 7)
  const setWeighNudgeDays = useUiPrefsStore((s) => s.setWeighNudgeDays)

  return (
    <View className="flex-1 bg-bear-bg">
      {/* Неоновая дымка в шапке — единый стиль страниц (как на «Теле») */}
      <SoftGlow id="glowMoreTR" w={190} h={160} peak={0.3} color="#7C3AED" style={{ top: -26, right: -46 }} />
      <SoftGlow id="glowMoreL" w={120} h={150} peak={0.12} color="#4D7CFE" style={{ top: 60, left: -40 }} />
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingHorizontal: 16,
          gap: 16,
          paddingBottom: 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Шапка экрана: иконка-чип (стиль «Тела») + заголовок + подзаголовок */}
        <View className="flex-row items-center gap-3">
          <BodyChip icon={<Settings size={21} />} size={42} />
          <View className="min-w-0 flex-1">
            <Text className="font-extrabold text-[24px] tracking-tight text-bear-text">
              Ещё
            </Text>
            <Text maxFontSizeMultiplier={1.25} className="font-sans text-[16px] text-bear-dim">
              Профиль, здоровье и настройки
            </Text>
          </View>
        </View>

        {/* ── Герой-профиль: аватар, рост • вес, тап — редактирование ── */}
        <ProfileEditor />

        {/* ── ЗДОРОВЬЕ ────────────────────────────────────────────────── */}
        <MenuGroup title="ЗДОРОВЬЕ">
          <MenuRow
            icon="🌸"
            iconBg="rgba(244,114,182,0.16)"
            title="Цикл"
            value={cycleValue}
          >
            <CycleCard embedded />
          </MenuRow>
          <MenuRow
            icon="🌙"
            iconBg="rgba(129,140,248,0.16)"
            title="Сон"
            value={sleep.enabled ? sleep.time : 'выкл'}
          >
            <SleepDashboardCard embedded />
          </MenuRow>
          <MenuRow
            icon="👣"
            iconBg="rgba(167,139,250,0.16)"
            title="Время пинка"
            value={exercise.enabled ? exercise.time : 'выкл'}
          >
            <KickTimeCard embedded />
          </MenuRow>
        </MenuGroup>

        {/* ── ДНЕВНИК («Мои цели» теперь только на вкладке «План») ─── */}
        <MenuGroup title="ДНЕВНИК">
          <MenuRow
            icon="🔔"
            iconBg="rgba(251,191,36,0.16)"
            title="Напоминания"
            value={remCount > 0 ? `${remCount} вкл` : 'выключены'}
            open={remindersOpen}
            onOpenChange={setRemindersOpen}
          >
            <NotificationsSection />
          </MenuRow>
          <MenuRow
            icon="🌅"
            iconBg="rgba(251,146,60,0.16)"
            title="Начать новый день"
            value="обнулить день"
          >
            <DataActions embedded variant="newday" />
          </MenuRow>
        </MenuGroup>

        {/* ── ПОДДЕРЖКА: тап по строке — сразу окно «Написать нам» ──── */}
        <MenuGroup title="ПОДДЕРЖКА">
          <MenuRow
            icon="💬"
            iconBg="rgba(52,211,153,0.16)"
            title="Поддержка и помощь"
            value="написать нам"
            onPress={() => setSupportOpen(true)}
          />
        </MenuGroup>

        {/* ── ПРИЛОЖЕНИЕ ──────────────────────────────────────────────── */}
        <MenuGroup title="ПРИЛОЖЕНИЕ">
          <MenuRow
            icon="🍽"
            iconBg="rgba(251,146,60,0.16)"
            title="Дневник питания"
            value={countBurned ? 'возврат ккал' : 'строгий остаток'}
          >
            <DiarySettingsCard embedded />
          </MenuRow>
          <MenuRow
            icon="👟"
            iconBg="rgba(56,189,248,0.16)"
            title="Шаги и здоровье"
            value={
              pedometerEnabled
                ? 'шагомер вкл'
                : healthConnectEnabled
                  ? 'Health Connect'
                  : 'выключено'
            }
          >
            <SyncCard embedded />
          </MenuRow>
          <MenuRow
            icon="📳"
            iconBg="rgba(167,139,250,0.16)"
            title="Вибрация"
            toggle={{ value: haptics, onChange: changeHaptics, label: 'Вибро-отклик' }}
          />
          <MenuRow
            icon="🐻"
            iconBg="rgba(139,92,246,0.16)"
            title="Стиль пинков"
            value={STYLE_LABEL[mealStyle]}
          >
            <PillPicker
              options={STYLE_OPTIONS}
              value={mealStyle}
              onChange={(k) => setReminder({ meals: { ...meals, style: k } })}
              accessibilityLabel="Стиль напоминаний"
            />
          </MenuRow>
          <MenuRow
            icon="🐾"
            iconBg="rgba(251,191,36,0.16)"
            title="Напоминание мишки"
            value={`через ${weighNudgeDays} дн`}
          >
            <PillPicker
              options={NUDGE_OPTIONS}
              value={weighNudgeDays}
              onChange={setWeighNudgeDays}
              accessibilityLabel="Через сколько дней напомнить о весе"
            />
          </MenuRow>
          <MenuRow
            icon="🛡"
            iconBg="rgba(74,222,128,0.16)"
            title="Приватность и данные"
          >
            <DataPortability embedded />
          </MenuRow>
        </MenuGroup>

        {/* ── Документы отдельными строками — внизу, как в стандартных
               приложениях; ниже — красная строка стирания данных и версия ── */}
        <MenuGroup>
          <MenuRow
            icon="🔒"
            iconBg="rgba(96,165,250,0.16)"
            title="Политика конфиденциальности"
            onPress={() => setLegalDoc('privacy')}
          />
          <MenuRow
            icon="📄"
            iconBg="rgba(96,165,250,0.16)"
            title="Пользовательское соглашение"
            onPress={() => setLegalDoc('terms')}
          />
          <MenuRow
            icon="🩺"
            iconBg="rgba(74,222,128,0.16)"
            title="Медицинский дисклеймер"
            onPress={() => setLegalDoc('medical')}
          />
        </MenuGroup>

        {/* Стереть все данные: красная строка отдельно, как в стандартных
            приложениях; подтверждение — в диалоге */}
        <DataActions embedded variant="wipe" />

        {/* Версия и ID сборки — маленькой строкой внизу экрана, как в
            стандартных приложениях (скрин Кати от 10.11) */}
        <View className="items-center" style={{ gap: 2 }}>
          <Text maxFontSizeMultiplier={1.25} className="font-sans text-[13px] text-bear-dim">
            Версия {VERSION}
          </Text>
          <Text
            maxFontSizeMultiplier={1.25}
            className="font-sans text-[12px] text-bear-dim"
            style={{ opacity: 0.7 }}
          >
            ID: {BUILD_HASH || 'dev'}
          </Text>
        </View>
      </ScrollView>

      {/* Правовой документ: экран с названием в шапке и текстом */}
      <LegalDocModal doc={legalDoc} onClose={() => setLegalDoc(null)} />

      {/* Окно «Написать нам»: выбор темы, сообщение, отправка на почту */}
      <SupportModal open={supportOpen} onClose={() => setSupportOpen(false)} />

      {/* Конвертик ИИ-чата — на всех вкладках (просьба Кати от 11.11) */}
      <AiChat />
    </View>
  )
}

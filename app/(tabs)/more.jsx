// Экран «Ещё» — компактное групповое меню (как в настройках iOS и в
// «Ещё» у MyFitnessPal/Yazio). Структура по отзывам Кати (перестройка
// 16.11: «напоминания в одном месте», «не 100 строк и выбора»;
// аудит дублей 16.11: «Привычки» и «Виджет дня» удалены — вода/шаги/
// дневник дублируют плитки и приёмы пищи на «Главной», сон — карточка
// в «Отчётах», вес — «Тело», серия — чип в сводке «Главной»):
//   Герой-профиль:   аватар, рост • вес, тап — редактирование
//   ПРЕМИУМ:         планы/код/статус (усиление Premium, 23.11)
//   ЗДОРОВЬЕ:        Цикл / Шаги и здоровье (переехало из ПРИЛОЖЕНИЯ —
//                    это здоровье, а не настройка приложения)
//   ПОМОЩНИК:        Напарник (стиль пинков теперь у медведей — отдельный
//                    блок «Стиль пинков» удалён, отзыв Кати 16.11)
//   НАПОМИНАНИЯ:     один блок: тренировка, вода, взвешивание, еда, сон,
//                    мишка пинает, вибро-отклик (дубли «Сон» и «Время
//                    пинка» из ЗДОРОВЬЯ удалены — управляли теми же
//                    полями стора, что и строки блока)
//   ДНЕВНИК:         Начать новый день
//   ПОДДЕРЖКА:       Поддержка — тап сразу открывает окно
//                    «Написать нам»
//   ПРИЛОЖЕНИЕ:      Настройки дневника / Оформление (темы — Premium,
//                    23.11) / Резервная копия
//                    («Вибрация», «Стиль пинков», «Напоминание мишки»
//                    переехали в блок НАПОМИНАНИЯ)
//   ДОКУМЕНТЫ:       один блок с выпадающим списком (отзыв Кати 16.11
//                    + расширение по отзыву 18.11: «добавь „О приложении“,
//                    соглашение и медицинский — тап открывает документ;
//                    стереть все данные — туда же»): о приложении,
//                    приватность и данные, соглашение, дисклеймер и
//                    красная строка «Стереть все данные» внутри блока
//   Внизу — строка версии с ID сборки.
// Тумблер «Вибро-отклик» теперь реально управляет вибрацией всего
// приложения — все касания идут через lib/haptics.js (отзыв Кати:
// «если положение включено это не где не применяется»). Тумблер и
// «Мишка пинает» живут в NotificationsSection (строка «Напоминания»).
// Дубли удалены (отзыв Кати: «данные и статистику удалить — дубль»):
// «Данные» и «Статистика» показывают то же, что вкладки Тело и
// Активность. «Возвращать калории» — только в «Дневнике питания».
// Хэш сборки для проверки обновления — в строке «ID: …» внизу экрана.
// Шапка экрана — с мягкой неоновой дымкой, как на вкладке «Тело»

import { useEffect, useState } from 'react'
import { DeviceEventEmitter, Pressable, ScrollView, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Constants from 'expo-constants'
import { ChevronRight, Settings } from 'lucide-react-native'
import { MenuGroup, MenuRow } from '@/components/more/MenuList'
import { ProfileEditor } from '@/components/more/ProfileEditor'
import { CycleCard } from '@/components/more/CycleCard'
import { NotificationsSection } from '@/components/more/NotificationsSection'
import { SupportModal } from '@/components/more/SupportModal'
import { DiarySettingsCard } from '@/components/more/DiarySettingsCard'
import { SyncCard } from '@/components/more/SyncCard'
import { CompanionCard } from '@/components/more/CompanionCard'
import { DataPortability } from '@/components/more/DataPortability'
import { DataActions } from '@/components/more/DataActions'
import { LegalDocModal } from '@/components/more/LegalDocModal'
import { PremiumCard, premiumStatusValue } from '@/components/more/PremiumCard'
import { ThemeCard } from '@/components/more/ThemeCard'
import { SoftGlow } from '@/components/ui/SoftGlow'
import { BodyChip } from '@/components/ui/BodyChip'
import { useCycleStore, daysToNext } from '@/store/useCycleStore'
import { useActivityStore } from '@/store/useActivityStore'
import { useGoalsStore } from '@/store/useGoalsStore'
import { useCompanionStore } from '@/store/useCompanionStore'
import { useProStore } from '@/store/useProStore'
import { useUiPrefsStore } from '@/store/useUiPrefsStore'
import { THEMES, resolveThemeId } from '@/lib/themes'
import { BUILD_HASH } from '@/lib/version'
import { consumeOpenReminders } from '@/lib/navEvents'
import { AiChat } from '@/components/home/AiChat'
import { useThemeColors } from '@/lib/use-theme'


// Версия приложения из app.json — строкой внизу экрана «Ещё»
// (как в чужом приложении по скрину Кати: «Версия …» + «ID: …»)
const VERSION = Constants?.expoConfig?.version || '1.0'

export default function MoreScreen() {
  const themeColors = useThemeColors()
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

  // Напоминания: сколько включено (вода, еда, взвешивание, тренировка, сон).
  // Значение строки «Напоминания» — счётчик не считает вибро-отклик и
  // «Мишку» (они не пушат уведомления по расписанию)
  const reminder = useActivityStore((s) => s.reminder)
  const sleep = reminder?.sleep || { enabled: false, time: '22:30' }
  const exercise = reminder?.exercise || { enabled: false, time: '18:00' }
  const remCount = [
    reminder?.enabled,
    reminder?.meals?.enabled,
    reminder?.weigh?.enabled,
    exercise.enabled,
    sleep.enabled,
  ].filter(Boolean).length

  // Дневник питания: режим остатка
  const countBurned = useGoalsStore((s) => Boolean(s.goals.countBurned))

  // Шаги и здоровье: что подключено
  const pedometerEnabled = useActivityStore((s) => s.pedometerEnabled)
  const healthConnectEnabled = useActivityStore((s) => s.healthConnectEnabled)

  // Помощник: имя текущего напарника для строки меню
  const companion = useCompanionStore((s) =>
    // простой хук без пересоздания объекта — берём только id и ищем сами
    s.companionId
  )
  const companionName =
    // лёгкий поиск без импорта COMPANIONS в этот файл (он в CompanionCard)
    ({ kedr: 'Кедр', kira: 'Кира', topaz: 'Топаз', businka: 'Бусинка', fit: 'Фит' })[companion] || 'Кедр'

  // Премиум: статус подписки для строки меню (проекция из useProStore —
  // раньше карточка была спрятана в модалках, теперь есть и здесь,
  // как и обещано на странице оплаты «Ещё → Премиум»)
  const pro = useProStore((s) => s.pro)
  const plan = useProStore((s) => s.plan)

  // Оформление: имя активной темы для значения строки (с учётом
  // подписки — без Premium всегда «Классика»)
  const themeId = useUiPrefsStore((s) => s.themeId)
  const themeTitle = THEMES[resolveThemeId(themeId, pro)].title

  return (
    <View className="flex-1 bg-bear-bg">
      {/* Неоновая дымка в шапке — единый стиль страниц (как на «Теле») */}
      <SoftGlow id="glowMoreTR" w={260} h={210} peak={0.44} color={themeColors.accent} style={{ top: -30, right: -60 }} />
      <SoftGlow id="glowMoreL" w={190} h={210} peak={0.18} color={themeColors.link} style={{ top: 80, left: -56 }} />
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

        {/* ── ПРЕМИУМ: планы, код активации, статус (решение Кати 23.11:
               «усилить Premium» — раньше карточка была спрятана в модалках
               ИИ-меню и разбора недели, а на странице оплаты обещан раздел
               «Ещё → Премиум») ───────────────────────────────────── */}
        <MenuGroup title="ПРЕМИУМ">
          <MenuRow
            icon="👑"
            iconBg="rgba(251,191,36,0.16)"
            title="Премиум"
            value={premiumStatusValue(pro, plan)}
          >
            <PremiumCard embedded />
          </MenuRow>
        </MenuGroup>

        {/* ── ЗДОРОВЬЕ: Цикл и Шаги — здоровье, а не настройка приложения
               («Шаги и здоровье» переехало из ПРИЛОЖЕНИЯ; «Сон» и «Время
               пинка» из ЗДОРОВЬЯ удалены — это напоминания, они в одном
               блоке ниже; отзыв Кати 16.11) ─────────────────────────────── */}
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
        </MenuGroup>

        {/* ── ПОМОЩНИК: выбор медведя-напарника ────────────────────── */}
        <MenuGroup title="ПОМОЩНИК">
          <MenuRow
            icon="🐻"
            iconBg="rgba(16,185,129,0.16)"
            title="Напарник"
            value={companionName}
          >
            <CompanionCard embedded />
          </MenuRow>
        </MenuGroup>

        {/* ── НАПОМИНАНИЯ: всё в одном блоке (отзыв Кати 16.11:
               «Время пинка, напоминание мишки, напоминание, стиль
               пинков — объединить… компактно и все в одном месте») —
               тренировка/вода/взвешивание/еда/сон + мишка и вибрация ── */}
        <MenuGroup title="НАПОМИНАНИЯ">
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
        </MenuGroup>

        {/* ── ДНЕВНИК ─────────────────────────────────────────────────── */}
        <MenuGroup title="ДНЕВНИК">
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
            title="Поддержка"
            value="написать нам"
            onPress={() => setSupportOpen(true)}
          />
        </MenuGroup>

        {/* ── ПРИЛОЖЕНИЕ: Дневник питания + Приватность. «Вибрация»,
               «Стиль пинков» и «Напоминание мишки» переехали в блок
               НАПОМИНАНИЯ; стиль пинков вообще стал свойством медведя ── */}
        <MenuGroup title="ПРИЛОЖЕНИЕ">
          <MenuRow
            icon="🍽"
            iconBg="rgba(251,146,60,0.16)"
            title="Настройки дневника"
            value={countBurned ? 'возврат ккал' : 'строгий остаток'}
          >
            <DiarySettingsCard embedded />
          </MenuRow>
          <MenuRow
            icon="🎨"
            iconBg={themeColors.accentFaint2}
            title="Оформление"
            value={themeTitle}
          >
            <ThemeCard embedded />
          </MenuRow>
          <MenuRow
            icon="🛡"
            iconBg="rgba(74,222,128,0.16)"
            title="Резервная копия"
            value="сохранить · восстановить"
          >
            <DataPortability embedded />
          </MenuRow>
        </MenuGroup>

        {/* ── ДОКУМЕНТЫ: один блок с выпадающим списком (отзыв Кати 16.11
               + расширение по отзыву 18.11: «добавь „О приложении“ — тап
               открыл документ, так же сделать соглашение и медицинский,
               и если можно стереть все данные туда же»): о приложении,
               приватность и данные, соглашение, дисклеймер + красная
               строка «Стереть все данные» внутри блока ──────────── */}
        <MenuGroup title="ДОКУМЕНТЫ">
          <MenuRow
            icon="📚"
            iconBg="rgba(96,165,250,0.16)"
            title="Документы"
            value="4 документа"
          >
            <View className="gap-1">
              {[
                ['О приложении', 'about'],
                ['Приватность и данные', 'privacy'],
                ['Пользовательское соглашение', 'terms'],
                ['Медицинский дисклеймер', 'medical'],
              ].map(([label, doc]) => (
                <Pressable
                  key={doc}
                  onPress={() => setLegalDoc(doc)}
                  accessibilityRole="button"
                  accessibilityLabel={label}
                  className="flex-row items-center gap-2 rounded-2xl bg-white/[0.03] px-4 py-3 active:opacity-70"
                >
                  <ChevronRight size={15} color={themeColors.sub} />
                  <Text maxFontSizeMultiplier={1.2} className="min-w-0 flex-1 font-sans text-[15.5px] text-bear-text">
                    {label}
                  </Text>
                </Pressable>
              ))}
              {/* Стереть все данные — в конце списка документов (отзыв
                  Кати 18.11: «если можно стереть все данные туда же»);
                  подтверждение — в диалоге как раньше */}
              <DataActions embedded variant="wipe" />
            </View>
          </MenuRow>
        </MenuGroup>

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

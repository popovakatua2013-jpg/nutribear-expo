// Экран «Ещё» — редизайн по отзыву Кати («сделай вкладку ещё полностью
// по другому, не нравится результат»). Вместо стены из 14 больших
// карточек — компактное групповое меню (как в настройках iOS и в «Ещё»
// у MyFitnessPal/Yazio):
//   Герой-профиль: аватар, рост • вес, тап — редактирование
//   ЗДОРОВЬЕ:      Цикл / Сон / Время пинка
//   ДНЕВНИК И ЦЕЛИ: Данные / Статистика / Мои цели / Напоминания
//   ПОДДЕРЖКА:     Поддержка и помощь
//   ПРИЛОЖЕНИЕ:    Дневник питания / Шаги и здоровье / Приватность /
//                  Сброс и удаление / О приложении
// Каждая строка показывает живое значение (время пинка, «через N дн»,
// норма ккал, «сборка …»); тап раскрывает прежний виджет внутри группы —
// все компоненты переиспользуются в режиме embedded, логика и данные
// не менялись. Хэш сборки для проверки обновления — в строке
// «О приложении» (и внутри неё).
// Шапка экрана — с мягкой неоновой дымкой, как на вкладке «Тело»

import { useState } from 'react'
import { ScrollView, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Settings } from 'lucide-react-native'
import { MenuGroup, MenuRow } from '@/components/more/MenuList'
import { ProfileEditor } from '@/components/more/ProfileEditor'
import { CycleCard } from '@/components/more/CycleCard'
import { SleepDashboardCard, KickTimeCard } from '@/components/more/PokeCards'
import { DataCard } from '@/components/more/DataCard'
import { StatsCard } from '@/components/more/StatsCard'
import { GoalPicker } from '@/components/more/GoalPicker'
import { NotificationsSection } from '@/components/more/NotificationsSection'
import { SupportCard } from '@/components/more/SupportCard'
import { DiarySettingsCard } from '@/components/more/DiarySettingsCard'
import { SyncCard } from '@/components/more/SyncCard'
import { DataPortability } from '@/components/more/DataPortability'
import { DataActions } from '@/components/more/DataActions'
import { AboutCard } from '@/components/more/AboutCard'
import { LegalModal } from '@/components/more/LegalModal'
import { SoftGlow } from '@/components/ui/SoftGlow'
import { BodyChip } from '@/components/ui/BodyChip'
import { useCycleStore, daysToNext } from '@/store/useCycleStore'
import { useActivityStore } from '@/store/useActivityStore'
import { useFoodStore } from '@/store/useFoodStore'
import { useGoalsStore } from '@/store/useGoalsStore'
import { useHistoryStore } from '@/store/useHistoryStore'
import { streakOf } from '@/lib/streak'
import { getDailyTarget } from '@/lib/data/goals'
import { formatNum } from '@/lib/format'
import { BUILD_HASH } from '@/lib/version'

export default function MoreScreen() {
  const insets = useSafeAreaInsets()
  // Окно «Правовые документы»: политика, соглашение и дисклеймер —
  // в одном месте, вместо длинных абзацев внутри карточек (отзыв Кати:
  // «если данные по закону нужны — перепиши их в документы»)
  const [legalOpen, setLegalOpen] = useState(false)

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

  // Данные: стрик дневника («N дн в ряду»)
  const days = useHistoryStore((s) => s.days)
  const streak = streakOf(days)

  // Напоминания: сколько включено (сон, тренировка, вода, взвешивание)
  const reminder = useActivityStore((s) => s.reminder)
  const sleep = reminder?.sleep || { enabled: false, time: '22:30' }
  const exercise = reminder?.exercise || { enabled: false, time: '18:00' }
  const remCount = [
    sleep.enabled,
    exercise.enabled,
    reminder?.enabled,
    reminder?.weigh?.enabled,
  ].filter(Boolean).length

  // Мои цели: дневная норма ккал по выбранной цели
  const goal = useFoodStore((s) => s.goal)
  const goalValue = `${formatNum(getDailyTarget(goal))} ккал`

  // Дневник питания: режим остатка
  const countBurned = useGoalsStore((s) => Boolean(s.goals.countBurned))

  // Шаги и здоровье: что подключено
  const pedometerEnabled = useActivityStore((s) => s.pedometerEnabled)
  const healthConnectEnabled = useActivityStore((s) => s.healthConnectEnabled)

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

        {/* ── ДНЕВНИК И ЦЕЛИ ──────────────────────────────────────────── */}
        <MenuGroup title="ДНЕВНИК И ЦЕЛИ">
          <MenuRow
            icon="📊"
            iconBg="rgba(77,124,254,0.16)"
            title="Данные"
            value={streak > 0 ? `${streak} дн в ряду` : 'вес и ккал'}
          >
            <DataCard embedded />
          </MenuRow>
          <MenuRow
            icon="📈"
            iconBg="rgba(232,121,249,0.16)"
            title="Статистика"
            value="За месяц"
          >
            <StatsCard embedded />
          </MenuRow>
          <MenuRow
            icon="🎯"
            iconBg="rgba(167,139,250,0.16)"
            title="Мои цели"
            value={goalValue}
          >
            <GoalPicker embedded />
          </MenuRow>
          <MenuRow
            icon="🔔"
            iconBg="rgba(251,191,36,0.16)"
            title="Напоминания"
            value={remCount > 0 ? `${remCount} вкл` : 'выключены'}
          >
            <NotificationsSection embedded />
          </MenuRow>
        </MenuGroup>

        {/* ── ПОДДЕРЖКА ───────────────────────────────────────────────── */}
        <MenuGroup title="ПОДДЕРЖКА">
          <MenuRow
            icon="💬"
            iconBg="rgba(52,211,153,0.16)"
            title="Поддержка и помощь"
            value="написать нам"
          >
            <SupportCard embedded />
          </MenuRow>
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
            icon="🛡"
            iconBg="rgba(74,222,128,0.16)"
            title="Приватность и данные"
            value="экспорт · копия"
          >
            <DataPortability embedded />
          </MenuRow>
          <MenuRow
            icon="🗑"
            iconBg="rgba(251,113,133,0.16)"
            title="Сброс и удаление"
            value="день · стереть всё"
          >
            <DataActions embedded />
          </MenuRow>
          <MenuRow
            icon="📄"
            iconBg="rgba(96,165,250,0.16)"
            title="Правовые документы"
            value="3 документа"
            onPress={() => setLegalOpen(true)}
          />
          <MenuRow
            icon="🐻"
            iconBg="rgba(139,92,246,0.16)"
            title="О приложении"
            value={`сборка ${BUILD_HASH || 'dev'}`}
          >
            <AboutCard embedded />
          </MenuRow>
        </MenuGroup>
      </ScrollView>

      {/* Правовые документы: политика конфиденциальности, пользовательское
          соглашение и медицинский дисклеймер — один документ-окно */}
      <LegalModal open={legalOpen} onClose={() => setLegalOpen(false)} />
    </View>
  )
}

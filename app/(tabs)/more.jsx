// Экран «Ещё»: дашборд В ТОЧНОСТИ по референсу Кати (скрин с фиолетовым
// дашбордом, отзыв: «сделай вкладку ещё в точности как на скриншоте,
// мой прогресс не делаем — туда вместо неё "данные"»). Порядок блоков:
//   Профиль (аватар, рост • вес, «Как тебя зовут?»)
//   Данные   ← вместо «Мой прогресс»: 3 метрики + кривая веса
//   Цикл     (кольцо «до след. цикла» + трекер + пресеты длины)
//   Сон / Время пинка (карточки с чипами времени 22:30 / 18:00)
//   Напоминания (плитки Тренировка / Пей воду / Взвешивание + «Все»)
//   Статистика (кривая активности + вес/талия/активность за месяц)
//   Мои цели (цель, норма ккал, полоса прогресса)
//   Поддержка и помощь (робот, темы письма)
// Ниже — сервисные блоки (настройки дневника, синхронизация, экспорт
// и удаление данных, «О приложении») — их на скриншоте нет, но они
// сохранены, чтобы не потерять настройки и юридические ссылки.
// Шапка экрана — с мягкой неоновой дымкой, как на вкладке «Тело»

import { ScrollView, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Settings } from 'lucide-react-native'
import { ProfileEditor } from '@/components/more/ProfileEditor'
import { GoalPicker } from '@/components/more/GoalPicker'
import { DiarySettingsCard } from '@/components/more/DiarySettingsCard'
import { NotificationsSection } from '@/components/more/NotificationsSection'
import { SupportCard } from '@/components/more/SupportCard'
import { SyncCard } from '@/components/more/SyncCard'
import { CycleCard } from '@/components/more/CycleCard'
import { DataCard } from '@/components/more/DataCard'
import { StatsCard } from '@/components/more/StatsCard'
import { SleepDashboardCard, KickTimeCard } from '@/components/more/PokeCards'
import { DataPortability } from '@/components/more/DataPortability'
import { DataActions } from '@/components/more/DataActions'
import { AboutCard } from '@/components/more/AboutCard'
import { SoftGlow } from '@/components/ui/SoftGlow'
import { BodyChip } from '@/components/ui/BodyChip'

export default function MoreScreen() {
  const insets = useSafeAreaInsets()

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
              Профиль, цикл, цели и напоминания
            </Text>
          </View>
        </View>

        {/* ── Дашборд строго по референсу ─────────────────────────────── */}
        {/* 1. Профиль */}
        <ProfileEditor />
        {/* 2. Данные — вместо «Мой прогресс» (решение Кати) */}
        <DataCard />
        {/* 3. Цикл: кольцо + трекер + пресеты длины */}
        <CycleCard />
        {/* 4–5. Сон и Время пинка: чипы времени 22:30 / 18:00 */}
        <SleepDashboardCard />
        <KickTimeCard />
        {/* 6. Напоминания: плитки Тренировка / Пей воду / Взвешивание */}
        <NotificationsSection />
        {/* 7. Статистика: кривая активности + вес/талия/активность */}
        <StatsCard />
        {/* 8. Мои цели */}
        <GoalPicker />
        {/* 9. Поддержка и помощь: робот, темы письма разработчику */}
        <SupportCard />

        {/* ── Сервисные блоки (на референсе их нет — сохранены для настроек
            и юридических ссылок) ─────────────────────────────────────── */}
        <DiarySettingsCard />
        <SyncCard />
        <DataPortability />
        <DataActions />
        <AboutCard />
      </ScrollView>
    </View>
  )
}

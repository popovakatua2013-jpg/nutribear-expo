// Дисциплина периода: сколько дней дневник вели. «День велся» —
// есть любая запись (шаги, еда, вода, тренировка): дни полного молчания
// не портят картину 30/90-дневных периодов. Данные — дневная история
// (те же rows, что у карточек итогов), цели — из хранилища целей.
// Разбивка «цель достигнута N из M дней» по шагам/воде/калориям —
// в карточках показателей ниже (ReportCards), а не здесь: плитки в этой
// карточке дублировали их и обрезались на узких экранах (отзыв Кати).
// Поверхность — NeonCard (градиентная кайма + ореолы свечения, как у
// всех блоков приложения — правка Кати 25.11 «блоки белые не перекрашены
// в градиент, всё одинаково на всех вкладках»), шапка — BodyChip.
// Правка Кати 25.11 («проверь замечания по всем темам»): тон чипа и
// полосы — цвета ТЕМЫ (хорошо/предупреждение/плохо), а не фиксированные
// зелёный/жёлтый/красный

import { Text, View } from 'react-native'
import { CalendarCheck } from 'lucide-react-native'
import { discipline } from '@/lib/data/reports'
import { useGoalsStore } from '@/store/useGoalsStore'
import { BodyChip } from '../../ui/BodyChip'
import { NeonCard } from '../../ui/NeonCard'
import { useThemeColors } from '@/lib/use-theme'

export function DisciplineCard({ rows }) {
  const themeColors = useThemeColors()
  const goals = useGoalsStore((s) => s.goals)
  const { days, recorded } = discipline(rows, goals)
  const pct = days > 0 ? Math.round((recorded / days) * 100) : 0

  // Тон полосы и чипа — по заполненности периода, цвет — из темы:
  // «хорошо» в неонах светится оттенком того же неона
  const tone =
    pct >= 67 ? themeColors.good : pct >= 34 ? themeColors.warn : themeColors.bad

  return (
    <NeonCard
      accessibilityLabel="Дисциплина периода"
      className="p-5"
    >
      <View className="flex-row items-center justify-between gap-2">
        <View className="min-w-0 flex-row items-center gap-2">
          <BodyChip icon={<CalendarCheck size={17} />} />
          <Text className="font-bold text-[20px] tracking-tight text-bear-text">
            Дисциплина
          </Text>
        </View>
        <View className="shrink-0 rounded-full bg-bear-accentFaint px-2.5 py-1.5">
          {/* Кратко «2/7 дн»: полная форма «2 из 7 дней» обрезалась
              на узких экранах (отзыв Кати) */}
          <Text className="font-semibold text-[15px]" style={{ color: tone }}>
            дней с записями {recorded}/{days}
          </Text>
        </View>
      </View>

      {/* Полоса заполненности дневника: доля дней с записями. Трек —
          line темы (белое 6% на светлой «Кремовой» не было видно) */}
      <View className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-bear-line">
        <View className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: tone }} />
      </View>

      <Text className="mt-3 font-sans text-[15px] leading-snug text-bear-dim">
        {recorded === 0
          ? 'Записей за период пока нет — добавьте шаги, воду или еду, и здесь появится статистика'
          : 'День считается заполненным, когда есть любая запись; пустые дни средние показатели не топят'}
      </Text>
    </NeonCard>
  )
}

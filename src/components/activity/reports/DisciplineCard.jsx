// Дисциплина периода: сколько дней дневник вели. «День велся» —
// есть любая запись (шаги, еда, вода, тренировка): дни полного молчания
// не портят картину 30/90-дневных периодов. Данные — дневная история
// (те же rows, что у карточек итогов), цели — из хранилища целей.
// Разбивка «цель достигнута N из M дней» по шагам/воде/калориям —
// в карточках показателей ниже (ReportCards), а не здесь: плитки в этой
// карточке дублировали их и обрезались на узких экранах (отзыв Кати).
// Поверхность и шапка — в стиле вкладки «Тело» (bear-bodyCard + BodyChip).

import { Text, View } from 'react-native'
import { CalendarCheck } from 'lucide-react-native'
import { discipline } from '@/lib/data/reports'
import { useGoalsStore } from '@/store/useGoalsStore'
import { BodyChip } from '../../ui/BodyChip'

export function DisciplineCard({ rows }) {
  const goals = useGoalsStore((s) => s.goals)
  const { days, recorded } = discipline(rows, goals)
  const pct = days > 0 ? Math.round((recorded / days) * 100) : 0

  // Тон полосы и чипа — по заполненности периода
  const tone =
    pct >= 67
      ? { chip: 'bg-emerald-400/10', text: 'text-emerald-300', bar: 'bg-emerald-400/70' }
      : pct >= 34
        ? { chip: 'bg-amber-400/10', text: 'text-amber-300', bar: 'bg-amber-400/70' }
        : { chip: 'bg-rose-400/10', text: 'text-rose-300', bar: 'bg-rose-400/70' }

  return (
    <View
      accessibilityLabel="Дисциплина периода"
      className="rounded-3xl border border-bear-bodyLine bg-bear-bodyCard p-5"
    >
      <View className="flex-row items-center justify-between gap-2">
        <View className="min-w-0 flex-row items-center gap-2">
          <BodyChip icon={<CalendarCheck size={17} />} />
          <Text className="font-bold text-[20px] tracking-tight text-bear-text">
            Дисциплина
          </Text>
        </View>
        <View className={`shrink-0 rounded-full px-2.5 py-1.5 ${tone.chip}`}>
          {/* Кратко «2/7 дн»: полная форма «2 из 7 дней» обрезалась
              на узких экранах (отзыв Кати) */}
          <Text className={`font-semibold text-[15px] ${tone.text}`}>
            вели дневник {recorded}/{days} дн
          </Text>
        </View>
      </View>

      {/* Полоса заполненности дневника: доля дней с записями */}
      <View className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
        <View className={`h-full rounded-full ${tone.bar}`} style={{ width: `${pct}%` }} />
      </View>

      <Text className="mt-3 font-sans text-[15px] leading-snug text-bear-dim">
        {recorded === 0
          ? 'Записей за период пока нет — добавьте шаги, воду или еду, и здесь появится статистика'
          : 'День считается заполненным, когда есть любая запись; пустые дни средние показатели не топят'}
      </Text>
    </View>
  )
}

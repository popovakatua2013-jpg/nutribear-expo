// Секция «Отчёты»: празднование цели по весу и карточки итогов за
// период (с Δ% к прошлому периоду). Период выбирается один раз —
// в шапке «Сводки» выше по экрану. «Сравнение по неделям» переехало
// в «Сводку» режимом «По неделям» — раньше два блока показывали
// похожие графики с одинаковыми переключателями.
// Кнопка «Итоги» открывает шеринговую карточку (медведь + цифры).

import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { Share2 } from 'lucide-react-native'
import { GoalCelebration } from './GoalCelebration'
import { ReportCards } from './ReportCards'
import { WeeklyShareCard } from './WeeklyShareCard'
import { periodTotals } from '@/lib/data/reports'
import { useHistoryStore } from '@/store/useHistoryStore'
import { streakOf } from '@/lib/streak'

export function ReportsSection({ today, days }) {
  const [shareOpen, setShareOpen] = useState(false)
  const historyDays = useHistoryStore((s) => s.days)
  const streak = streakOf(historyDays)
  // Итоги выбранного периода (включая живое «сегодня») для шеринга
  const totals = periodTotals(days, 0, today)

  return (
    <View accessibilityLabel="Отчёты" className="gap-3">
      <View className="flex-row items-center justify-between gap-2">
        <View className="min-w-0 flex-1">
          <Text className="font-extrabold text-[17px] tracking-tight text-bear-text">
            Отчёты
          </Text>
          <Text className="mt-0.5 font-sans text-[10.5px] leading-snug text-bear-sub">
            Итоги из твоего дневника за период — шаги, калории, вода, сожжено и опыт, со
            сравнением с прошлым периодом. Период выбирается в «Сводке» выше
          </Text>
        </View>
        <Pressable
          onPress={() => setShareOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Поделиться итогами периода"
          className="shrink-0 flex-row items-center gap-1.5 rounded-full bg-white/[0.06] px-3 py-1.5 active:opacity-70"
        >
          <Share2 size={13} color="#8DABFF" />
          <Text className="font-semibold text-[11.5px] text-[#8DABFF]">Итоги</Text>
        </Pressable>
      </View>

      <GoalCelebration />
      <ReportCards today={today} days={days} />

      <WeeklyShareCard
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        totals={totals}
        streak={streak}
        days={days}
      />
    </View>
  )
}

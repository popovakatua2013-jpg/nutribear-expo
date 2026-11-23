// Карточка «Экспорт отчёта в файл» на вкладке «Отчёты» (Premium-фича,
// задача Кати 23.11: «усилить Premium — экспорт отчётов в файл»).
// Premium: кнопка готовит HTML-файл периода (ккал, БЖУ, вода, шаги,
// вес, дисциплина — та же математика, что у карточек вкладки) и
// открывает «Поделиться»: файл можно сохранить в облако, отправить
// врачу или тренеру. Бесплатно: объяснение + paywall (паттерн
// AiMenuModal — карточка с объяснением и PremiumCard embedded).
// Период берётся из пилюль вкладки — отчёт повторяет то, что видно
// на экране.

import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { Crown, FileDown } from 'lucide-react-native'
import { useProStore } from '@/store/useProStore'
import { useGoalsStore } from '@/store/useGoalsStore'
import { useProfileStore } from '@/store/useProfileStore'
import { useFoodStore } from '@/store/useFoodStore'
import { nutrientsByDay, weightByDay } from '@/lib/data/reports'
import { buildReportHtml, shareReportFile } from '@/lib/data/report-export'
import { PremiumCard } from '@/components/more/PremiumCard'
import { useToast } from '../../ui/Toast'

const RANGE_LABEL = { '7d': 'неделя', '30d': '30 дней', '90d': '90 дней' }

function LockedContent() {
  return (
    <View className="gap-2" accessibilityLabel="Экспорт отчёта в файл — Premium">
      <View className="flex-row items-center gap-2">
        <Crown size={17} color="#FBBF24" />
        <Text className="font-bold text-[16px] text-amber-300">
          Экспорт отчёта в файл — Premium
        </Text>
      </View>
      <Text className="font-sans text-[14px] leading-snug text-bear-sub">
        Файл-отчёт за неделю, 30 или 90 дней: калории, БЖУ, вода, шаги, вес
        и дисциплина. Открывается в любом браузере — удобно отправить врачу
        или тренеру, можно сохранить в PDF.
      </Text>
      <Text className="mt-1 font-sans text-[13px] leading-snug text-bear-dim">
        PNG-карточки «Итоги» и «День» выше — бесплатны, ими можно делиться
        без подписки.
      </Text>
      <PremiumCard embedded />
    </View>
  )
}

export function ReportExportCard({ days, rows, today, rangeId = '7d' }) {
  const pro = useProStore((s) => s.pro)
  const goals = useGoalsStore((s) => s.goals)
  const weights = useProfileStore((s) => s.weights)
  const foodHistory = useFoodStore((s) => s.history)
  const { toast } = useToast()
  const [busy, setBusy] = useState(false)

  async function exportReport() {
    if (busy) return
    setBusy(true)
    try {
      const html = buildReportHtml({
        days,
        // rows уже содержат живое «сегодня» (секция подмешивает его
        // через history(days, today)) — отдельный today не нужен
        rows,
        goals,
        weightMap: weightByDay(weights),
        nutrients: nutrientsByDay(foodHistory),
      })
      await shareReportFile(html)
      toast({
        title: '📄 Отчёт готов',
        description: 'Выберите «Сохранить в файл» — или отправьте файл сразу',
      })
    } catch {
      toast({ title: 'Не удалось подготовить файл', description: 'Попробуйте ещё раз' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <View
      accessibilityLabel="Экспорт отчёта в файл"
      className="overflow-hidden rounded-3xl border border-bear-bodyLine bg-bear-bodyCard p-4"
    >
      {!pro ? (
        <LockedContent />
      ) : (
        <View className="gap-2">
          <View className="flex-row items-center gap-2">
            <FileDown size={17} color="#8DABFF" />
            <Text className="min-w-0 flex-1 font-bold text-[16px] text-bear-text">
              Экспорт отчёта в файл
            </Text>
            <Text className="font-semibold text-[13.5px] text-bear-sub">
              {RANGE_LABEL[rangeId] || `${days} дней`}
            </Text>
          </View>
          <Text className="font-sans text-[14px] leading-snug text-bear-sub">
            Один файл за выбранный период: средние за день, БЖУ, дисциплина,
            вес и сравнение по неделям. Откроется меню «Поделиться» — файл
            можно сохранить в облако или отправить врачу.
          </Text>
          <Pressable
            onPress={exportReport}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel="Подготовить файл отчёта"
            className={`mt-1 flex-row items-center justify-center gap-2 rounded-2xl border border-[#7B6CF6]/50 bg-[#7B6CF6]/15 py-3 active:opacity-80 ${
              busy ? 'opacity-60' : ''
            }`}
          >
            <FileDown size={17} color="#C4B5FD" />
            <Text className="font-semibold text-[15.5px] text-[#C4B5FD]">
              {busy ? 'Готовим файл…' : 'Подготовить файл'}
            </Text>
          </Pressable>
          <Text className="font-sans text-[12.5px] leading-snug text-bear-dim">
            Файл открывается в браузере. Для PDF: браузер → «Печать» →
            «Сохранить как PDF».
          </Text>
        </View>
      )}
    </View>
  )
}

// Карточка «Экспорт отчёта в файл» на вкладке «Отчёты» (Premium-фича,
// задача Кати 23.11: «усилить Premium — экспорт отчётов в файл»).
// Правка Кати 24.11: «экспорт отчёта в файл всегда свернуть» — карточка
// по умолчанию СВЁРНУТА в одну строку (длинное описание и платёжка не
// распирают вкладку «Отчёты», отзыв: «вкладка отчеты схлопнулась»);
// тап по строке раскрывает содержимое. Premium: кнопка готовит
// HTML-файл периода (ккал, БЖУ, вода, шаги, вес, дисциплина — та же
// математика, что у карточек вкладки) и открывает «Поделиться»: файл
// можно сохранить в облако, отправить врачу или тренеру. Бесплатно:
// объяснение + paywall (паттерн AiMenuModal — карточка с объяснением
// и PremiumCard embedded). Период берётся из пилюль вкладки — отчёт
// повторяет то, что видно на экране.

import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { ChevronDown, Crown, FileDown } from 'lucide-react-native'
import { useProStore } from '@/store/useProStore'
import { useGoalsStore } from '@/store/useGoalsStore'
import { useProfileStore } from '@/store/useProfileStore'
import { useFoodStore } from '@/store/useFoodStore'
import { nutrientsByDay, weightByDay } from '@/lib/data/reports'
import { buildReportHtml, shareReportFile } from '@/lib/data/report-export'
import { PremiumCard } from '@/components/more/PremiumCard'
import { NeonCard } from '../../ui/NeonCard'
import { useThemeColors } from '@/lib/use-theme'
import { useToast } from '../../ui/Toast'

const RANGE_LABEL = { '7d': 'неделя', '30d': '30 дней', '90d': '90 дней' }

function LockedContent() {
  // Хук внутри компонента (а не ссылка на чужую переменную): раньше здесь
  // использовался themeColors из родительской функции — в отдельной
  // функции его не существует, у не-Premium пользователя это был бы
  // ReferenceError-краш того же класса, что и «Property 'colors' doesn't
  // exist» (исправлен в 842f8f3)
  const themeColors = useThemeColors()
  return (
    <View className="gap-2" accessibilityLabel="Экспорт отчёта в файл — Premium">
      <View className="flex-row items-center gap-2">
        <Crown size={17} color={themeColors.warn} />
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
  const themeColors = useThemeColors()
  const { toast } = useToast()
  // Свёрнута по умолчанию (просьба Кати 24.11: «всегда свернуть») —
  // вкладка «Отчёты» не растёт на высоту описания и платёжки
  const [open, setOpen] = useState(false)
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
    // Правка Кати 25.11, пятый круг («все вкладки должны быть оформлены
    // одинаково»): карточка на NeonCard — кайма + градиент + свечение,
    // как у остальных блоков «Отчётов»
    <NeonCard accessibilityLabel="Экспорт отчёта в файл">
      {/* Шапка-строка: тап раскрывает/сворачивает содержимое */}
      <Pressable
        onPress={() => setOpen((v) => !v)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`Экспорт отчёта в файл — ${open ? 'свернуть' : 'раскрыть'}`}
        className="flex-row items-center gap-2 px-4 py-3.5 active:opacity-70"
      >
        <View
          className="h-9 w-9 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: themeColors.accentFaint2, borderWidth: 1, borderColor: themeColors.accentBorder }}
        >
          <FileDown size={17} color={themeColors.accentSoft} />
        </View>
        <View className="min-w-0 flex-1">
          <Text numberOfLines={1} className="font-bold text-[17px] tracking-tight text-bear-text">
            Экспорт отчёта в файл
          </Text>
          <Text
            numberOfLines={1}
            maxFontSizeMultiplier={1.2}
            className="mt-0.5 font-sans text-[13px] text-bear-dim"
          >
            {pro
              ? `Файл за ${RANGE_LABEL[rangeId] || `${days} дней`} — в «Поделиться»`
              : 'Готовить файл отчёта — в Premium'}
          </Text>
        </View>
        {!pro && <Crown size={15} color={themeColors.warn} />}
        <ChevronDown
          size={20}
          color={themeColors.sub}
          style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}
        />
      </Pressable>

      {/* Содержимое — только в раскрытом виде */}
      {open && (
        <View className="border-t border-bear-accentBorder px-4 pb-4 pt-3">
          {!pro ? (
            <LockedContent />
          ) : (
            <View className="gap-2">
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
                className={`mt-1 flex-row items-center justify-center gap-2 rounded-2xl border border-bear-accentBorder bg-bear-accentFaint2 py-3 active:opacity-80 ${
                  busy ? 'opacity-60' : ''
                }`}
              >
                <FileDown size={17} color={themeColors.accentSoft} />
                <Text
                  className="font-semibold text-[15.5px]"
                  style={{ color: themeColors.accentSoft }}
                >
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
      )}
    </NeonCard>
  )
}

// Карточка «Персональная подсказка» на Главной — совет по дневнику
// питания (отзыв Кати: «следующий шаг по подсказкам — персональные,
// например „за 3 дня белка меньше нормы — вес стоит“» — и с крестиком).
// Логика — чистая foodInsight() в lib/data/insights.js; данные — журнал
// питания (прошлые дни), живое «сегодня» (дневник + вода) и вес.
// Крестик прячет подсказку до конца дня — назавтра она может смениться
// другой (useUiPrefsStore.insightHiddenDay).

import { useMemo } from 'react'
import { Pressable, Text, View } from 'react-native'
import { Lightbulb, X } from 'lucide-react-native'
import { foodInsight } from '@/lib/data/insights'
import { nutrientsByDay } from '@/lib/data/reports'
import { dayKeyOf, useHistoryStore } from '@/store/useHistoryStore'
import { useFoodStore } from '@/store/useFoodStore'
import { useGoalsStore } from '@/store/useGoalsStore'
import { useProfileStore } from '@/store/useProfileStore'
import { useActivityStore } from '@/store/useActivityStore'
import { useUiPrefsStore } from '@/store/useUiPrefsStore'

const CARD = {
  backgroundColor: 'rgba(29,18,64,0.82)',
  borderColor: 'rgba(168,85,247,0.30)',
  borderWidth: 1,
}

export function FoodInsight() {
  const foodHistory = useFoodStore((s) => s.history)
  const goals = useGoalsStore((s) => s.goals)
  const weights = useProfileStore((s) => s.weights)
  const waterMl = useActivityStore((s) => s.waterMl)
  const historyDays = useHistoryStore((s) => s.days)
  const insightHiddenDay = useUiPrefsStore((s) => s.insightHiddenDay)
  const dismissInsight = useUiPrefsStore((s) => s.dismissInsight)

  const insight = useMemo(() => {
    // Прошлые 6 дней — из журнала питания (по ключу дня) и дневной
    // истории (вода, сон из трекера «лёг/встал»), сегодня — живые
    // значения сторов (сон сегодня уже лежит в истории дня)
    const byDay = nutrientsByDay(foodHistory)
    const todayKey = dayKeyOf()
    const rows = []
    for (let i = 6; i >= 0; i--) {
      const key = dayKeyOf(new Date(Date.now() - i * 86400000))
      const n = byDay[key] || {}
      rows.push({
        key,
        kcal: Number(n.kcal) || 0,
        p: Number(n.p) || 0,
        fib: Number(n.fib) || 0,
        waterMl: key === todayKey ? waterMl : historyDays[key]?.waterMl || 0,
        sleepMin: Number(historyDays[key]?.sleepMin) || 0,
      })
    }
    return foodInsight({ rows, goals, weights })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [foodHistory, goals, weights, waterMl, historyDays])

  // Скрыли крестиком сегодня — не показываем (завтра может прийти другая)
  if (!insight || insightHiddenDay === dayKeyOf()) return null

  return (
    <View
      accessibilityLabel={`Персональная подсказка: ${insight.title}`}
      className="overflow-hidden rounded-3xl p-3.5"
      style={CARD}
    >
      {/* Крестик — прячет подсказку до конца дня (отзыв Кати) */}
      <Pressable
        onPress={() => dismissInsight(dayKeyOf())}
        accessibilityRole="button"
        accessibilityLabel="Закрыть подсказку"
        hitSlop={10}
        className="absolute right-2.5 top-2.5 z-10 p-1 active:opacity-60"
      >
        <X size={17} color="#8B96B8" />
      </Pressable>
      <View className="flex-row items-center gap-2.5">
        <View
          className="h-9 w-9 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: 'rgba(77,124,254,0.16)' }}
        >
          <Lightbulb size={18} color="#8DABFF" />
        </View>
        <View className="min-w-0 flex-1 pr-5">
          <Text maxFontSizeMultiplier={1.2} className="font-bold text-[16.5px] text-bear-text">
            {insight.title}
          </Text>
          <Text
            maxFontSizeMultiplier={1.25}
            className="mt-0.5 font-sans text-[14.5px] leading-snug text-bear-sub"
          >
            {insight.text}
          </Text>
        </View>
      </View>
    </View>
  )
}

// Список «показатель по дням» — общий для панели истории «Отчётов».
// Дни с записями — полные строки (дата, полоска от максимума, значение),
// а подряд идущие дни без записей сворачиваются в одну строку-пролёт
// «— нет записей · 7 авг – 27 авг —»: вместо десятка одинаковых строк
// виден только период простоя (запрос пользователя).
// Если за весь период нет ни одной записи — вместо списка спокойное
// уведомление по центру: мишка, «Нет записей» и подсказка, откуда
// возьмутся данные. Сегменты считает чистая функция compressDayRows
// из lib/data/reports.js — она покрыта тестами.
// onPickDay — необязательный тап по дню (в «Отчётах» открывает сводку
// дня, как тап по клетке календаря).

import { Pressable, ScrollView, Text, View } from 'react-native'
import { compressDayRows, dayHasRecords, gapLabel } from '@/lib/data/reports'

export function MetricDayList({
  rows,
  metric,
  onPickDay,
  maxHeight = 400,
  emptyTitle = 'Нет записей',
  emptyHint = 'За выбранный период дневник ничего не фиксировал — запишите шаги, воду, еду или тренировку, и здесь появится история',
}) {
  const values = rows.map((r) => r[metric.key] || 0)
  const max = Math.max(...values, 1)
  const hasAny = rows.some(dayHasRecords)
  const segs = compressDayRows(rows)

  // Пустой период: уведомление по центру вместо списка дней
  if (!hasAny) {
    return (
      <View
        accessibilityLabel={`${metric.label}: за период нет записей`}
        className="items-center justify-center px-4 py-7"
      >
        <Text className="text-[30px]">🐻</Text>
        <Text maxFontSizeMultiplier={1.2} className="mt-2 font-bold text-[13.5px] text-bear-text">
          {emptyTitle}
        </Text>
        <Text
          maxFontSizeMultiplier={1.25}
          className="mt-1 text-center font-sans text-[11px] leading-snug text-bear-sub"
        >
          {emptyHint}
        </Text>
      </View>
    )
  }

  return (
    <ScrollView
      style={{ maxHeight, flexShrink: 1 }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingTop: 4, paddingBottom: 2 }}
    >
      {segs.map((seg) => {
        // Пролёт без записей: одна строка вместо дня за днём
        if (seg.type === 'gap') {
          return (
            <View
              key={`gap-${seg.from.key}`}
              accessibilityLabel={gapLabel(seg.from, seg.to)}
              className="mt-2.5 mb-1 flex-row items-center gap-2"
            >
              <View className="h-px flex-1 bg-white/[0.07]" />
              <Text
                numberOfLines={1}
                maxFontSizeMultiplier={1.1}
                className="font-sans text-[9.5px] text-bear-dim"
              >
                {gapLabel(seg.from, seg.to)}
              </Text>
              <View className="h-px flex-1 bg-white/[0.07]" />
            </View>
          )
        }

        const { row, index } = seg
        const v = row[metric.key] || 0
        const w = Math.max(2, Math.round((v / max) * 100))
        const isToday = index === rows.length - 1
        const emptyDay = !dayHasRecords(row)
        const label = `${row.label}${isToday ? ', сегодня' : ''}: ${emptyDay ? 'нет записей' : metric.fmt(v)}`
        const Body = (
          <>
            <Text
              numberOfLines={1}
              maxFontSizeMultiplier={1.1}
              className={`w-[74px] shrink-0 font-sans text-[11px] ${isToday ? 'font-bold text-[#A78BFA]' : 'text-bear-sub'}`}
            >
              {row.label}
            </Text>
            <View className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
              <View
                style={{
                  width: `${w}%`,
                  height: '100%',
                  borderRadius: 999,
                  backgroundColor: metric.color,
                  opacity: v > 0 ? 0.9 : 0,
                }}
              />
            </View>
            <Text
              numberOfLines={1}
              maxFontSizeMultiplier={1.1}
              className={`w-[76px] shrink-0 text-right ${
                emptyDay
                  ? 'font-sans text-[10.5px] text-bear-dim'
                  : `font-semibold text-[11.5px] ${isToday ? 'text-bear-text' : 'text-bear-soft'}`
              }`}
            >
              {emptyDay ? 'нет записей' : metric.fmt(v)}
            </Text>
          </>
        )
        return onPickDay ? (
          <Pressable
            key={row.key}
            onPress={() => onPickDay(row.key)}
            accessibilityRole="button"
            accessibilityLabel={`${label}. Тап — сводка дня`}
            className={`mt-1.5 flex-row items-center gap-2 ${isToday ? '' : 'active:opacity-70'}`}
          >
            {Body}
          </Pressable>
        ) : (
          <View key={row.key} accessibilityLabel={label} className="mt-1.5 flex-row items-center gap-2">
            {Body}
          </View>
        )
      })}
    </ScrollView>
  )
}

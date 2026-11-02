// Окно «показатель по дням» из «Отчётов»: тап по карточке показателя
// (Шаги, Калории, Вода, Сожжено) открывает сохранённую по дням историю
// выбранного периода — «тап на шаги — видно, сколько прошёл в каждый
// день», «тап на воду — сколько выпито за день» и т.д.
// Данные — дневная история useHistoryStore (каждый день пишется сам),
// с живым «сегодня» поверх истории; строка «сегодня» подсвечена.

import { useMemo } from 'react'
import { Modal, Pressable, ScrollView, Text, View } from 'react-native'
import { X } from 'lucide-react-native'
import { history } from '@/lib/data/activity'

export function MetricDaysModal({ open, onClose, metric, days, today }) {
  // Дни периода (последний — сегодня); пересчитываем при открытии,
  // смене показателя или периода
  const rows = useMemo(
    () => (open && metric ? history(days, today) : []),
    [open, metric, days, today]
  )

  const stats = useMemo(() => {
    const values = rows.map((r) => r[metric?.key] || 0)
    const total = values.reduce((s, v) => s + v, 0)
    return {
      values,
      total,
      avg: days > 0 ? total / days : 0,
      max: Math.max(...values, 1),
    }
  }, [rows, metric, days])

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/60 px-3 pb-3">
        {open && metric && (
          <View className="overflow-hidden rounded-3xl border border-white/10 bg-bear-pop p-5">
            {/* Шапка: показатель + закрыть */}
            <View className="flex-row items-center justify-between">
              <View className="min-w-0 flex-1 flex-row items-center gap-2">
                <View
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    backgroundColor: `${metric.color}22`,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <metric.Icon size={17} color={metric.color} />
                </View>
                <View className="min-w-0 flex-1">
                  <Text
                    numberOfLines={1}
                    maxFontSizeMultiplier={1.2}
                    className="font-bold text-[15px] text-bear-text"
                  >
                    {metric.label} по дням
                  </Text>
                  <Text
                    numberOfLines={1}
                    maxFontSizeMultiplier={1.2}
                    className="mt-0.5 font-sans text-[10.5px] text-bear-sub"
                  >
                    {`${days} дн. · всего ${metric.fmt(stats.total)} · в среднем ${metric.fmt(Math.round(stats.avg))} в день`}
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={onClose}
                accessibilityLabel="Закрыть историю по дням"
                className="p-1"
              >
                <X size={20} color="#A5AECB" />
              </Pressable>
            </View>

            {/* День за днём: подпись, полоска от максимума периода, значение */}
            <ScrollView
              style={{ maxHeight: 400 }}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 4 }}
            >
              {rows.map((r, i) => {
                const v = stats.values[i]
                const w = Math.max(2, Math.round((v / stats.max) * 100))
                const isToday = i === rows.length - 1
                return (
                  <View
                    key={i}
                    accessibilityLabel={`${r.label}${isToday ? ', сегодня' : ''}: ${metric.fmt(v)}`}
                    className="mt-1.5 flex-row items-center gap-2"
                  >
                    <Text
                      numberOfLines={1}
                      maxFontSizeMultiplier={1.1}
                      className={`w-[74px] shrink-0 font-sans text-[11px] ${isToday ? 'font-bold text-[#A78BFA]' : 'text-bear-sub'}`}
                    >
                      {r.label}
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
                      className={`w-[76px] shrink-0 text-right font-semibold text-[11.5px] ${isToday ? 'text-bear-text' : 'text-bear-soft'}`}
                    >
                      {metric.fmt(v)}
                    </Text>
                  </View>
                )
              })}
            </ScrollView>

            <Text className="mt-2.5 font-sans text-[10px] leading-snug text-bear-dim">
              Дни записаны сами, пока вы пользовались дневником.
              Период меняется пилюлями 7/30/90 в графиках выше
            </Text>
          </View>
        )}
      </View>
    </Modal>
  )
}

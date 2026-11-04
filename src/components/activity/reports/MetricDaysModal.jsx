// Окно «показатель по дням» из «Отчётов»: кнопка «История» под графиком
// открывает сохранённую по дням историю выбранного показателя за период —
// «сколько прошёл в каждый день», «сколько выпито за день» и т.д.
// rows (дни периода, последний — сегодня) приходят готовыми из
// ReportsSection — history() на экране строится один раз; строка
// «сегодня» подсвечена. Дни, когда дневник не вели, показываются
// как «нет записей» вместо ложных нулей; среднее считается только
// по дням с записями.

import { useMemo } from 'react'
import { Modal, Pressable, ScrollView, Text, View } from 'react-native'
import { X } from 'lucide-react-native'

export function MetricDaysModal({ open, onClose, metric, days, rows }) {
  const stats = useMemo(() => {
    const values = rows.map((r) => r[metric?.key] || 0)
    const total = values.reduce((s, v) => s + v, 0)
    // Дни с записями — дневник хоть что-то фиксировал (как в стрике).
    // Среднее считаем только по ним: простои «нет записей» на 30/90
    // днях не должны тянуть среднее вниз (9398 за 30 дней — это не
    // «313 в день», если записи были только в восьми)
    const recorded = rows.filter((r) => r.steps || r.kcal || r.waterMl || r.burned)
    return {
      values,
      total,
      recorded: recorded.length,
      avg: recorded.length ? total / recorded.length : 0,
      max: Math.max(...values, 1),
    }
  }, [rows, metric])

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
                    {stats.recorded > 0
                      ? `${days} дн. · всего ${metric.fmt(stats.total)} · в среднем ${metric.fmt(Math.round(stats.avg))} в день`
                      : `${days} дн. — записей пока нет`}
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
                // День без записей: дневник ничего не фиксировал — вместо
                // «0» честно пишем «нет записей» (нулевой показатель дня
                // с записями остаётся честным «0»)
                const emptyDay = !(r.steps || r.kcal || r.waterMl || r.burned)
                return (
                  <View
                    key={i}
                    accessibilityLabel={`${r.label}${isToday ? ', сегодня' : ''}: ${emptyDay ? 'нет записей' : metric.fmt(v)}`}
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
                      className={`w-[76px] shrink-0 text-right ${
                        emptyDay
                          ? 'font-sans text-[10.5px] text-bear-dim'
                          : `font-semibold text-[11.5px] ${isToday ? 'text-bear-text' : 'text-bear-soft'}`
                      }`}
                    >
                      {emptyDay ? 'нет записей' : metric.fmt(v)}
                    </Text>
                  </View>
                )
              })}
            </ScrollView>

            <Text className="mt-2.5 font-sans text-[10px] leading-snug text-bear-dim">
              {stats.recorded < rows.length
                ? 'Дни, когда дневник не вели, помечены «нет записей» — в среднее они не входят. Период меняется пилюлями 7/30/90 в графиках выше'
                : 'Дни записаны сами, пока вы пользовались дневником. Период меняется пилюлями 7/30/90 в графиках выше'}
            </Text>
          </View>
        )}
      </View>
    </Modal>
  )
}

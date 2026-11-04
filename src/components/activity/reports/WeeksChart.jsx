// «Сравнение по неделям» — режим «По неделям» внутри «Отчётов»:
// график показателя за 6 недель, тап по неделе открывает панель со
// значениями всех показателей и Δ% к прошлой неделе. Текущая неделя
// помечена «идёт». Показатель выбирается общими пилюлями «Отчётов»
// и приходит пропсом — у блока один metricId на оба режима
// («По дням» и «По неделям»); реестр — lib/data/metrics.js.
// Раньше здесь были свои пилюли показателя (дубль общих) и отдельная
// карточка с заголовком «Сравнение по неделям» — обе ветки удалены
// как неиспользуемые: блок живёт только внутри «Отчётов».

import { useMemo, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react-native'
import { SvgAreaChart } from '@/components/ui/SvgAreaChart'
import { changePct, deltaTone, weeksComparison } from '@/lib/data/reports'
import { METRICS } from '@/lib/data/metrics'

const WEEKS = 6
const MONTHS = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']

// Период недели i (0 — самая старая): сегодня минус N дней
function weekRange(i, now) {
  const back = (WEEKS - 1 - i) * 7
  const end = new Date(now)
  end.setDate(end.getDate() - back)
  const start = new Date(now)
  start.setDate(start.getDate() - back - 6)
  const d = (dt) => `${dt.getDate()} ${MONTHS[dt.getMonth()]}`
  return `${d(start)} – ${d(end)}`
}

export function WeeksChart({ today, metric }) {
  const rows = useMemo(() => weeksComparison(WEEKS, today), [today])
  const [sel, setSel] = useState(WEEKS - 1) // по умолчанию — текущая неделя

  const hasData = rows.some((r) => r.steps || r.kcal || r.waterMl || r.burned || r.xp)
  const row = rows[sel] || rows[rows.length - 1]
  const prev = sel > 0 ? rows[sel - 1] : null
  const isCurrent = sel === rows.length - 1

  return (
    <>
      {!hasData ? (
        <View className="items-center justify-center py-8" accessibilityLabel="Нет данных">
          <Text className="text-[12.5px] text-bear-sub">Пока мало данных</Text>
          <Text className="mt-1 text-[11px] text-bear-sub2">
            Заполняйте дневник — здесь появится динамика по неделям
          </Text>
        </View>
      ) : (
        <>
          {/* График выбранного показателя; тап по колонке выбирает неделю */}
          <View style={{ position: 'relative' }}>
            <SvgAreaChart
              data={rows.map((r) => ({ label: r.label, value: r[metric.key] || 0 }))}
              color={metric.color}
              height={170}
              yFmt={metric.yFmt}
              activeIndex={sel}
            />
            <View style={{ position: 'absolute', left: 24, right: 0, top: 0, bottom: 18 }} className="flex-row">
              {rows.map((_, i) => (
                <Pressable
                  key={i}
                  style={{ flex: 1 }}
                  accessibilityLabel={`Неделя ${i + 1}`}
                  onPress={() => setSel(i)}
                />
              ))}
            </View>
          </View>

          {/* Панель выбранной недели: все показатели + Δ% к прошлой неделе */}
          <View className="mt-2 rounded-xl bg-white/[0.04] p-3" accessibilityLabel="Значения недели">
            <View className="flex-row items-center justify-between">
              <Text className="font-semibold text-[12px] text-bear-text">
                {isCurrent ? 'Эта неделя' : weekRange(sel, new Date())}
              </Text>
              {isCurrent && (
                <View className="rounded-full bg-[#7B6CF6]/15 px-2 py-0.5">
                  <Text className="font-semibold text-[9.5px] text-[#A78BFA]">идёт</Text>
                </View>
              )}
            </View>
            <View className="mt-2 flex-row flex-wrap gap-2">
              {METRICS.map((m) => {
                const pct = prev ? changePct(row[m.key] || 0, prev[m.key] || 0) : 0
                // булевы флаги вместо «числовых» — иначе при нуле в обеих
                // неделях React рендерит 0 как ребёнка View и RN падает
                // с «Text strings must be rendered within a <Text>»
                const shown = !!(prev && (row[m.key] || prev[m.key]))
                const tone = !shown ? '#7c87a8' : deltaTone(pct, m.invert)
                const Arrow = pct < 0 ? ArrowDownRight : ArrowUpRight
                return (
                  <View key={m.key} className="min-w-0 rounded-lg bg-white/[0.03] px-2 py-1.5" style={{ width: '48.5%' }}>
                    <View className="flex-row items-center gap-1">
                      <m.Icon size={12} color={m.color} />
                      <Text className="font-sans text-[9.5px] text-bear-sub2">{m.label}</Text>
                    </View>
                    <View className="mt-0.5 flex-row items-center gap-1.5">
                      <Text numberOfLines={1} maxFontSizeMultiplier={1.2} className="flex-1 font-bold text-[13px] text-bear-text">
                        {m.fmt(row[m.key] || 0)}
                      </Text>
                      {shown && <Arrow size={11} color={tone} />}
                      <Text className="font-semibold text-[9.5px]" style={{ color: tone }}>
                        {!shown ? '—' : `${pct > 0 ? '+' : ''}${pct}%`}
                      </Text>
                    </View>
                  </View>
                )
              })}
            </View>
          </View>
        </>
      )}
    </>
  )
}

// Окно «показатель · история» — открывается тапом по карточке-итогу
// «Отчётов» (шаги, калории, вода, сожжено). Оформление — по референсу
// пользователя: пилюли периода (7/30/90), карточка «В среднем за день»
// с Δ% к прошлому такому же периоду, столбики по дням с подписью
// максимума, «Лучшие дни» (топ-3) и точечная теплокарта по дням недели
// (столбцы Пн…Вс, строки — недели периода) с легендой выполнения цели.
// Тап по столбику (7/30 дней — клетки широкие) и по точке теплокарты
// открывает сводку дня. Период у окна свой: открывается с периода
// секции и дальше меняется независимо — карточки и дисциплина остаются
// на своём. Совсем пустой период — спокойное уведомление с мишкой
// по центру (как было в списке «по дням»). Окно трёхзонное: шапка,
// прокручиваемое содержимое и закреплённая внизу «Закрыть» — на
// небольшом экране кнопка всегда на виду. Панель истории (разворачивалась
// под карточками) заменена этим окном по решению пользователя.

import { useMemo, useState } from 'react'
import { Modal, Pressable, ScrollView, Text, View } from 'react-native'
import { ArrowDownRight, ArrowUpRight, X } from 'lucide-react-native'
import { RANGES, history } from '@/lib/data/activity'
import { METRICS } from '@/lib/data/metrics'
import {
  bestDay,
  bestDays,
  changePct,
  dailyAverage,
  dayHasRecords,
  dayLevel,
  deltaTone,
  prevLabel,
  weekdayMatrix,
} from '@/lib/data/reports'
import { dayKeyOf, useHistoryStore } from '@/store/useHistoryStore'
import { useGoalsStore } from '@/store/useGoalsStore'
import { useProfileStore } from '@/store/useProfileStore'
import { pluralDays } from '@/lib/format'
import { BodyChip } from '../../ui/BodyChip'
import { Pills } from '../../ui/Pills'
import { DayDetailsModal } from '../../home/DayDetailsModal'

// Ключ цели в useGoalsStore для каждого показателя реестра
const GOAL_KEY = { steps: 'steps', kcal: 'kcal', waterMl: 'waterMl', burned: 'burnKcal' }
const WD = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'] // столбцы теплокарты
const DOT = 13 // размер точки теплокарты
const GAP = 3 // промежуток
const CHART_H = 112 // высота графика по дням
const BUBBLE_H = 18 // запас сверху под подпись максимума

// Цвет клетки/точки по уровню дня (как в календаре-теплокарте)
function levelColor(metric, level) {
  if (level === 'met') return metric.color
  if (level === 'mid') return `${metric.color}99`
  if (level === 'low') return `${metric.color}40`
  if (level === 'over') return '#f87171'
  return 'rgba(255,255,255,0.07)'
}

// Легенда: у калорий «больше» не значит «лучше» — своя шкала
function legendOf(metric) {
  return metric.key === 'kcal'
    ? [
        ['met', 'в норме'],
        ['mid', 'до +15%'],
        ['over', 'перебор'],
        ['none', 'нет записей'],
      ]
    : [
        ['met', 'цель'],
        ['mid', 'больше половины'],
        ['low', 'были записи'],
        ['none', 'нет записей'],
      ]
}

// Метки под столбиками: неделя — каждый день, месяц и больше —
// только начало, середина и конец периода
function labelIndexes(len) {
  if (len <= 7) return null // каждая колонка подписана
  const mid = Math.floor((len - 1) / 2)
  return new Set([0, mid, len - 1])
}

export function MetricHistoryModal({
  open,
  onClose = () => {},
  metricId = 'steps',
  initialRangeId = '30d',
  today,
}) {
  const goals = useGoalsStore((s) => s.goals)
  const savedDays = useHistoryStore((s) => s.days) // подписка: сводка дня живо видит записи
  const weights = useProfileStore((s) => s.weights)
  const metric = METRICS.find((m) => m.key === metricId) || METRICS[0]
  // Период окна: открывается с периода секции, дальше живёт своей жизнью
  const [rangeId, setRangeId] = useState(initialRangeId)
  const [dayKey, setDayKey] = useState(null) // сводка дня (тап по столбику/точке)
  const days = RANGES.find((r) => r.id === rangeId)?.days || 30
  const todayKey = dayKeyOf()

  // rows текущего периода (последний день — сегодня) и прошлого (для Δ%):
  // один обход истории на двойной период, режем пополам
  const { rows, prevRows } = useMemo(() => {
    const all = history(days * 2, today)
    return { rows: all.slice(days), prevRows: all.slice(0, days) }
  }, [days, today])

  const hasAny = rows.some(dayHasRecords)
  // По конкретной метрике: если её не вели в периоде — показываем
  // медвежонка вместо «фальшивой аналитики» из нулей (среднее 0,
  // «0% к прошлому месяцу», пустые «Лучшие дни»)
  const hasMetric = rows.some((r) => (r?.[metric.key] || 0) > 0)
  const avg = dailyAverage(rows, metric.key)
  const prevAvg = dailyAverage(prevRows, metric.key)
  const pct = changePct(avg, prevAvg)
  const tone = deltaTone(pct, metric.invert)
  const Arrow = pct < 0 ? ArrowDownRight : ArrowUpRight

  const maxVal = Math.max(bestDay(rows, metric.key), 1)
  const top = bestDays(rows, metric.key, 3)
  const grid = weekdayMatrix(rows)
  const sparse = labelIndexes(rows.length)

  function pickRange(id) {
    setRangeId(id)
    setDayKey(null) // сводка дня от другого периода не нужна
  }

  return (
    <>
      <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
        <View className="flex-1 justify-end bg-black/60 px-3 pb-3">
          <View className="max-h-[85%] overflow-hidden rounded-3xl border border-white/10 bg-bear-pop">
            {/* Шапка: показатель + подзаголовок + крестик */}
            <View className="flex-row items-center gap-2.5 border-b border-bear-line px-5 pb-3 pt-4">
              <BodyChip icon={<metric.Icon size={17} />} />
              <View className="min-w-0 flex-1">
                <Text className="font-bold text-[18px] tracking-tight text-bear-text">
                  {`${metric.label} · история`}
                </Text>
                <Text numberOfLines={1} maxFontSizeMultiplier={1.2} className="mt-0.5 font-sans text-[12.5px] leading-snug text-bear-sub">
                  {`Динамика ${metric.gen} за ${days} ${pluralDays(days)}`}
                </Text>
              </View>
              <Pressable
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel={`Закрыть историю: ${metric.label}`}
                className="h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/5 active:opacity-70"
              >
                <X size={20} color="#A5AECB" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ flexShrink: 1 }}>
              <View className="gap-3.5 px-5 pb-4 pt-3">
                {/* Период — активная пилюля в цвете показателя */}
                <Pills
                  items={RANGES.map((r) => ({ id: r.id, label: r.label, color: metric.color }))}
                  value={rangeId}
                  onChange={pickRange}
                  accessibilityLabel="Период истории"
                />

                {hasAny && hasMetric ? (
                  <>
                    {/* «В среднем за день» + Δ% к прошлому периоду.
                        Среднее делится только на ведённые дни — простои
                        его не топят (dailyAverage) */}
                    <View
                      accessibilityLabel={`В среднем за день: ${metric.fmt(avg)}`}
                      className="rounded-2xl border border-bear-bodyLine bg-white/[0.04] p-4"
                    >
                      <Text className="font-sans text-[12px] font-semibold uppercase tracking-wide text-bear-sub">
                        В среднем за день
                      </Text>
                      <Text className="mt-1 font-extrabold text-[24px] leading-tight tracking-tight text-bear-text">
                        {metric.fmt(avg)}
                      </Text>
                      <View className="mt-1 flex-row items-center gap-1">
                        {pct !== 0 && <Arrow size={15} color={tone} />}
                        <Text className="font-medium text-[13px]" style={{ color: tone }}>
                          {`${pct > 0 ? '+' : ''}${pct}% ${prevLabel(days)}`}
                        </Text>
                      </View>
                    </View>

                    {/* Столбики по дням: высота — от максимума периода,
                        максимум подписан, сегодня — самый яркий. Тап по
                        столбику (7/30 дней) — сводка дня; на 90 днях
                        клетки тоньше 3px — день там выбирается точками
                        теплокарты и «Лучшие дни» */}
                    <View>
                      <Text className="mb-1.5 px-1 font-sans text-[12px] font-semibold uppercase tracking-wide text-bear-sub">
                        {`По дням · ${days} дн.`}
                      </Text>
                      <View
                        style={{ height: BUBBLE_H + CHART_H, flexDirection: 'row', alignItems: 'flex-end', gap: days > 30 ? 1 : 3 }}
                      >
                        {rows.map((row, i) => {
                          const v = row[metric.key] || 0
                          const isMax = v > 0 && v >= maxVal && v === maxVal
                          const isToday = row.key === todayKey
                          const h = v > 0 ? Math.max(3, Math.round((v / maxVal) * CHART_H)) : 2
                          const opacity = isMax ? 1 : isToday ? 0.85 : v > 0 ? 0.55 : 1
                          const bar = (
                            <View
                              style={{
                                width: '100%',
                                height: h,
                                borderRadius: 2,
                                backgroundColor: v > 0 ? metric.color : 'rgba(255,255,255,0.08)',
                                opacity,
                              }}
                            />
                          )
                          return (
                            <View key={row.key} style={{ flex: 1, height: '100%', justifyContent: 'flex-end' }}>
                              {isMax && (
                                <Text
                                  numberOfLines={1}
                                  className="mb-0.5 text-center font-sans text-[10.5px] font-bold"
                                  style={{ color: metric.color }}
                                >
                                  {metric.fmt(v)}
                                </Text>
                              )}
                              {days <= 30 ? (
                                <Pressable
                                  onPress={() => setDayKey(row.key)}
                                  accessibilityRole="button"
                                  accessibilityLabel={`${row.label}: ${v > 0 ? metric.fmt(v) : 'нет записей'}. Тап — сводка дня`}
                                  hitSlop={{ top: 2, bottom: 2, left: 1, right: 1 }}
                                  style={{ justifyContent: 'flex-end' }}
                                >
                                  {bar}
                                </Pressable>
                              ) : (
                                bar
                              )}
                            </View>
                          )
                        })}
                      </View>
                      {/* Подписи дат: неделя — все, дальше — начало/середина/конец */}
                      <View style={{ flexDirection: 'row', gap: days > 30 ? 1 : 3 }} className="mt-1.5">
                        {rows.map((row, i) => (
                          <Text
                            key={row.key}
                            numberOfLines={1}
                            className={`flex-1 text-center font-sans text-[10.5px] ${
                              row.key === todayKey ? 'font-bold text-[#A78BFA]' : 'text-bear-dim'
                            }`}
                          >
                            {!sparse || sparse.has(i) ? row.label : ' '}
                          </Text>
                        ))}
                      </View>
                    </View>

                    {/* Лучшие дни + теплокарта по дням недели */}
                    <View className="flex-row gap-4">
                      <View className="min-w-0 flex-1">
                        <Text className="mb-1.5 px-1 font-sans text-[12px] font-semibold uppercase tracking-wide text-bear-sub">
                          Лучшие дни
                        </Text>
                        {top.map(({ row, value }, i) => (
                          <Pressable
                            key={row.key}
                            onPress={() => setDayKey(row.key)}
                            accessibilityRole="button"
                            accessibilityLabel={`${row.label}: ${metric.fmt(value)}. Тап — сводка дня`}
                            className="mt-1 flex-row items-center gap-2 active:opacity-70"
                          >
                            <View
                              style={{
                                width: 20,
                                height: 20,
                                borderRadius: 10,
                                backgroundColor: `${metric.color}1f`,
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <Text className="font-bold text-[12px]" style={{ color: metric.color }}>
                                {i + 1}
                              </Text>
                            </View>
                            <Text numberOfLines={1} className="min-w-0 flex-1 font-sans text-[13px] text-bear-sub">
                              {row.label}
                            </Text>
                            <Text
                              numberOfLines={1}
                              className={`shrink-0 font-semibold text-[14px] ${row.key === todayKey ? 'text-bear-text' : 'text-bear-soft'}`}
                            >
                              {metric.fmt(value)}
                            </Text>
                          </Pressable>
                        ))}
                      </View>

                      <View className="shrink-0">
                        <Text className="mb-1.5 px-1 font-sans text-[12px] font-semibold uppercase tracking-wide text-bear-sub">
                          По дням недели
                        </Text>
                        <View style={{ width: 7 * DOT + 6 * GAP }}>
                          <View style={{ flexDirection: 'row', gap: GAP }}>
                            {WD.map((w) => (
                              <Text
                                key={w}
                                className="text-center font-sans text-[10px] text-bear-dim"
                                style={{ width: DOT }}
                              >
                                {w}
                              </Text>
                            ))}
                          </View>
                          {grid.map((week, ri) => (
                            <View key={ri} style={{ flexDirection: 'row', gap: GAP, marginTop: GAP }}>
                              {week.map((cell, ci) =>
                                cell ? (
                                  <Pressable
                                    key={cell.key}
                                    onPress={() => setDayKey(cell.key)}
                                    accessibilityRole="button"
                                    accessibilityLabel={`${cell.label}: ${metric.fmt(cell[metric.key] || 0)}. Тап — сводка дня`}
                                    style={{
                                      width: DOT,
                                      height: DOT,
                                      borderRadius: 4,
                                      backgroundColor: levelColor(
                                        metric,
                                        dayLevel(metric.key, cell[metric.key] || 0, goals[GOAL_KEY[metric.key]] || 0)
                                      ),
                                      borderWidth: cell.key === todayKey ? 1 : 0,
                                      borderColor: 'rgba(255,255,255,0.35)',
                                    }}
                                  />
                                ) : (
                                  <View key={`${ri}-${ci}`} style={{ width: DOT, height: DOT }} />
                                )
                              )}
                            </View>
                          ))}
                        </View>
                      </View>
                    </View>

                    {/* Легенда теплокарты */}
                    <View className="flex-row flex-wrap items-center gap-x-3 gap-y-1">
                      {legendOf(metric).map(([level, label]) => (
                        <View key={level} className="flex-row items-center gap-1">
                          <View
                            style={{
                              width: 9,
                              height: 9,
                              borderRadius: 3,
                              backgroundColor: levelColor(metric, level),
                            }}
                          />
                          <Text className="font-sans text-[11.5px] text-bear-dim">{label}</Text>
                        </View>
                      ))}
                    </View>
                  </>
                ) : (
                  // Пустой период: спокойное уведомление по центру
                  <View
                    accessibilityLabel={`${metric.label}: за период нет записей`}
                    className="items-center justify-center px-4 py-7"
                  >
                    <Text className="text-[30px]">🐻</Text>
                    <Text maxFontSizeMultiplier={1.2} className="mt-2 font-bold text-[16px] text-bear-text">
                      Нет записей
                    </Text>
                    <Text
                      maxFontSizeMultiplier={1.25}
                      className="mt-1 text-center font-sans text-[13px] leading-snug text-bear-sub"
                    >
                      За выбранный период дневник ничего не фиксировал — запишите шаги, воду, еду
                      или тренировку, и здесь появится история
                    </Text>
                  </View>
                )}
              </View>
            </ScrollView>

            {/* Закрыть — закреплено внизу: на небольшом экране кнопка
                не уезжает за край вместе с содержимым */}
            <View className="border-t border-bear-line px-5 pb-4 pt-3">
              <Pressable
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Закрыть историю показателя"
                className="items-center rounded-2xl bg-white/10 py-3 active:opacity-70"
              >
                <Text className="font-bold text-[15.5px] text-bear-text">Закрыть</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Сводка дня поверх окна истории (тап по столбику, точке или
          строке «Лучшие дни») */}
      <DayDetailsModal
        open={Boolean(dayKey)}
        onClose={() => setDayKey(null)}
        dayKey={dayKey}
        history={savedDays}
        goals={goals}
        weights={weights}
      />
    </>
  )
}

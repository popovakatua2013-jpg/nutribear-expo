// Окно «Вода» по макету пользователя: hero-карточка «Выпито сегодня»
// (крупная цифра, цель, полоса прогресса + кольцо «% цели»), пилюли
// напоминаний, «Динамика за 7 дней» — линия с золотым пунктиром цели
// и плашкой значения над последней точкой, «Быстро добавить» —
// горизонтальные плитки ёмкостей 2×2, внизу пара карточек:
// «Последние 7 дней» (среднее, Δ к прошлой неделе, мини-бары) и
// маскот-поддержка капельки. Записи за сегодня по умолчанию свёрнуты,
// тап по записи — правка мл/времени прямо в строке, корзина — удаление.

import { useEffect, useMemo, useState } from 'react'
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import Svg, { Circle, Text as SvgText } from 'react-native-svg'
import {
  ChartColumn,
  Check,
  ChevronDown,
  ChevronUp,
  CirclePlus,
  Droplets,
  Pencil,
  Target,
  Trash2,
  Trophy,
  X,
} from 'lucide-react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { VesselCard } from './VesselCard'
import { ReminderToggle, ReminderIntervals } from './WaterReminder'
import { useActivityStore } from '@/store/useActivityStore'
import { useGoalsStore } from '@/store/useGoalsStore'
import { useHistoryStore, dayKeyOf } from '@/store/useHistoryStore'
import { useToast } from '../ui/Toast'
import { formatNum } from '@/lib/format'
import { SvgAreaChart } from '../ui/SvgAreaChart'
import { ProgressBar } from '../ui/ProgressBar'
import { BodyChip } from '../ui/BodyChip'
import { fontFamilies } from './ring-font'

const nowTime = () =>
  new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })

// «14:30», «14.30», «1430», «9» → «ЧЧ:ММ»; не разобрали — null
function normalizeTime(text) {
  const t = String(text).trim().replace(/[.,]/g, ':')
  const m = t.match(/^(\d{1,2}):?(\d{0,2})$/)
  if (!m) return null
  const h = Math.min(23, Number(m[1]))
  const min = Math.min(59, Number(m[2] || 0))
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
}

// Кольцо «% цели»: голубая дуга поверх тёмного трека, в центре —
// процент (крупно) и слово «цели» — как кольцо на макете
function GoalRing({ pct }) {
  const R = 33
  const CIRC = 2 * Math.PI * R
  const len = (Math.max(0, Math.min(100, pct)) / 100) * CIRC
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={`Выпито ${pct}% дневной цели`}
      className="h-[84px] w-[84px] shrink-0"
    >
      <Svg width={84} height={84} viewBox="0 0 84 84">
        <Circle
          cx="42"
          cy="42"
          r={R}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="8.5"
        />
        {pct > 0 && (
          <Circle
            cx="42"
            cy="42"
            r={R}
            fill="none"
            stroke="#38BDF8"
            strokeWidth="8.5"
            strokeLinecap="round"
            strokeDasharray={`${len} ${CIRC}`}
            transform="rotate(-90 42 42)"
          />
        )}
        <SvgText
          x="42"
          y="44"
          fill="#EEF2FB"
          fontSize="17"
          fontWeight="800"
          fontFamily={fontFamilies.extrabold}
          textAnchor="middle"
        >
          {`${pct}%`}
        </SvgText>
        <SvgText
          x="42"
          y="57"
          fill="#A5AECB"
          fontSize="8.5"
          fontFamily={fontFamilies.regular}
          textAnchor="middle"
        >
          цели
        </SvgText>
      </Svg>
    </View>
  )
}

export function WaterModal({ open, onClose, goalMl, ml }) {
  const vessels = useActivityStore((s) => s.vessels)
  const addWater = useActivityStore((s) => s.addWater)
  const editWaterLog = useActivityStore((s) => s.editWaterLog)
  const removeWaterLog = useActivityStore((s) => s.removeWaterLog)
  const waterLog = useActivityStore((s) => s.waterLog)
  const reminder = useActivityStore((s) => s.reminder)
  const goals = useGoalsStore((s) => s.goals)
  const historyDays = useHistoryStore((s) => s.days)
  const { toast } = useToast()

  const [editingId, setEditingId] = useState(null) // запись журнала на изменении
  const [editMl, setEditMl] = useState('')
  const [editTime, setEditTime] = useState('')
  const [logOpen, setLogOpen] = useState(false) // записи за сегодня по умолчанию свёрнуты

  // Окно закрыто — черновик правки записи сбрасывается: повторное
  // открытие показывает журнал, а не застаревшую строку в режиме правки
  useEffect(() => {
    if (!open) {
      setEditingId(null)
      setEditMl('')
      setEditTime('')
    }
  }, [open])

  const pct = Math.min(100, Math.round((ml / Math.max(1, goalMl)) * 100))

  // Последние 7 дней (из дневной истории) — линия динамики и мини-бары
  const week = useMemo(() => {
    const labels = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
    const out = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000)
      const key = dayKeyOf(d)
      out.push({
        key,
        label: labels[d.getDay()],
        value: historyDays[key]?.waterMl || 0,
        today: i === 0,
      })
    }
    return out
  }, [historyDays])
  const weekMax = Math.max(500, ...week.map((d) => d.value))
  const weekAvg = Math.round(week.reduce((s, d) => s + d.value, 0) / 7)

  // Δ к прошлой неделе: среднее за предыдущие 7 дней (8–14 дней назад)
  const prevAvg = useMemo(() => {
    let sum = 0
    for (let i = 13; i >= 7; i--) {
      const key = dayKeyOf(new Date(Date.now() - i * 86400000))
      sum += historyDays[key]?.waterMl || 0
    }
    return Math.round(sum / 7)
  }, [historyDays])
  const delta = prevAvg > 0 ? Math.round(((weekAvg - prevAvg) / prevAvg) * 100) : null

  // Поддержка капельки — по проценту от цели
  const pep =
    pct >= 100
      ? { title: 'Цель выполнена!', sub: 'Норма выпита — так держать! 💙' }
      : pct >= 60
        ? { title: 'Отличный результат!', sub: 'Продолжайте в том же духе 💙' }
        : pct >= 25
          ? { title: 'Хороший темп!', sub: 'Ещё немного до цели 💪' }
          : { title: 'Начало положено!', sub: 'Каждый стакан — шаг к цели 💧' }

  // Ёмкости по 2 в ряд (на узком экране 4 в ряд не читаются)
  const vesselRows = vessels.reduce((rows, v) => {
    if (rows.length === 0 || rows[rows.length - 1].length === 2) rows.push([])
    rows[rows.length - 1].push(v)
    return rows
  }, [])

  function drink(v) {
    addWater(v.ml)
    toast({
      title: `💧 ${v.label} — ${v.ml} мл · ${nowTime()}`,
      description: `${pct}% → ${Math.min(100, Math.round(((ml + v.ml) / Math.max(1, goals.waterMl)) * 100))}% нормы`,
    })
  }

  // Тап по записи журнала — править объём и время прямо в строке
  function startEdit(w) {
    setEditingId(w.id)
    setEditMl(String(w.ml))
    setEditTime(w.time)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditMl('')
    setEditTime('')
  }

  function saveEdit() {
    const mlNum = Math.round(Number(String(editMl).replace(',', '.')) || 0)
    if (mlNum < 10) {
      toast({ title: '💧 Укажите объём', description: 'От 10 мл, например 200' })
      return
    }
    const safeMl = Math.min(2000, mlNum)
    const time = normalizeTime(editTime) || nowTime()
    editWaterLog(editingId, { ml: safeMl, time })
    toast({ title: '✏️ Изменено', description: `${formatNum(safeMl)} мл · ${time}` })
    cancelEdit()
  }

  function removeEntry(w) {
    removeWaterLog(w.id)
    if (editingId === w.id) cancelEdit()
    toast({ title: '🗑 Удалено', description: `Минус ${formatNum(w.ml)} мл воды за сегодня` })
  }

  return (
    <Modal visible={open} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      {/* Тап по затемнению закрывает окно, тап по самой шторке — нет */}
      <Pressable
        className="flex-1 justify-end bg-black/60 px-3 pb-3"
        onPress={onClose}
        accessibilityLabel="Закрыть окно"
      >
        <Pressable onPress={() => {}} className="max-h-[92%] overflow-hidden rounded-3xl border border-white/10">
          <LinearGradient
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            colors={['#16234A', '#131E3A', '#101A36']}
          >
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 14 }}>
              {/* Шапка: чип-иконка + название, колокольчик напоминаний, крестик */}
              <View className="flex-row items-center justify-between border-b border-bear-line px-4 pb-2.5 pt-3.5">
                <View className="flex-row items-center gap-2.5">
                  <BodyChip icon={<Droplets />} size={34} />
                  <Text className="font-bold text-[18px] text-bear-text">Вода</Text>
                </View>
                <View className="flex-row items-center gap-2">
                  <ReminderToggle />
                  <Pressable onPress={onClose} accessibilityLabel="Закрыть" className="p-1">
                    <X hitSlop={10} size={22} color="#A5AECB" />
                  </Pressable>
                </View>
              </View>

              <View className="px-4 pt-3">
                {/* Hero: выпито сегодня, цель, полоса прогресса, кольцо «% цели» */}
                <View className="flex-row items-center gap-3 rounded-2xl border border-bear-bodyLine bg-bear-bodyCard px-3.5 py-3">
                  <View className="min-w-0 flex-1">
                    <Text className="font-sans text-[13px] text-bear-sub">Выпито сегодня</Text>
                    <Text className="mt-0.5 font-extrabold text-[25px] tracking-tight text-bear-text">
                      {formatNum(ml)}{' '}
                      <Text className="font-semibold text-[15.5px] text-bear-sub">мл</Text>
                    </Text>
                    <View className="mt-1 flex-row items-center gap-1">
                      <Target size={15} color="#A5AECB" />
                      <Text className="font-sans text-[13px] text-bear-sub">
                        Цель: {formatNum(goalMl)} мл
                      </Text>
                    </View>
                    <View className="mt-2.5 flex-row items-center gap-2">
                      <View className="min-w-0 flex-1">
                        <ProgressBar pct={pct} h={7} color="#38BDF8" />
                      </View>
                      <Text className="font-semibold text-[13px] text-bear-text">{pct}%</Text>
                    </View>
                  </View>
                  <GoalRing pct={pct} />
                </View>

                {reminder.enabled && (
                  <View className="pt-3">
                    <ReminderIntervals />
                  </View>
                )}

                {/* Динамика за 7 дней: линия + золотой пунктир цели */}
                <View className="mt-3 rounded-2xl border border-bear-line bg-bear-card2/70 px-3 pb-1 pt-2.5">
                  <View className="flex-row items-center gap-1.5">
                    <ChartColumn size={15} color="#7DD3FC" />
                    <Text className="min-w-0 flex-1 font-semibold text-[14.5px] text-bear-text">
                      Динамика за 7 дней
                    </Text>
                    <View className="rounded-full bg-white/5 px-2 py-0.5">
                      <Text className="font-sans text-[12.5px] text-bear-sub">мл</Text>
                    </View>
                  </View>
                  <SvgAreaChart
                    data={week}
                    color="#38BDF8"
                    height={150}
                    goalLine={goalMl > 0 ? goalMl : null}
                    lastBadge
                    yFmt={(v) => formatNum(v)}
                  />
                </View>

                {/* Быстро добавить: ёмкости по 2 в ряд, карандашик — правка */}
                <View className="mt-3 flex-row items-center gap-1.5">
                  <CirclePlus size={16} color="#7DD3FC" />
                  <Text className="min-w-0 flex-1 font-semibold text-[14.5px] text-bear-text">
                    Быстро добавить
                  </Text>
                </View>
                <View className="mt-2 gap-2">
                  {vesselRows.map((row) => (
                    <View key={row[0].id} className="flex-row gap-2">
                      {row.map((v) => (
                        <VesselCard key={v.id} vessel={v} onDrink={drink} />
                      ))}
                    </View>
                  ))}
                </View>

                {/* Низ: статистика недели + поддержка капельки */}
                <View className="mt-3 flex-row items-stretch gap-2">
                  <View className="min-w-0 flex-1 rounded-2xl border border-bear-bodyLine bg-bear-bodyCard px-3 py-2.5">
                    <View className="flex-row items-center gap-1.5">
                      <Trophy size={15} color="#FBBF24" />
                      <Text numberOfLines={1} className="min-w-0 flex-1 font-semibold text-[13px] text-bear-sub">
                        Последние 7 дней
                      </Text>
                    </View>
                    <View className="mt-1.5 flex-row flex-wrap items-center gap-x-1.5 gap-y-1">
                      <Text className="font-extrabold text-[19px] tracking-tight text-bear-text">
                        {formatNum(weekAvg)}
                      </Text>
                      <Text className="font-sans text-[13px] text-bear-sub">мл/день</Text>
                      {delta != null && Math.abs(delta) >= 1 && (
                        <View
                          className="rounded-md px-1.5 py-0.5"
                          style={{
                            backgroundColor:
                              delta > 0 ? 'rgba(52,211,153,0.15)' : 'rgba(248,113,113,0.15)',
                          }}
                        >
                          <Text
                            className="font-semibold text-[12.5px]"
                            style={{ color: delta > 0 ? '#34D399' : '#F87171' }}
                          >
                            {delta > 0 ? '↑' : '↓'} {delta > 0 ? '+' : '−'}
                            {Math.abs(delta)}%
                          </Text>
                        </View>
                      )}
                    </View>
                    <View className="mt-2 flex-row items-end gap-1" style={{ height: 40 }}>
                      {week.map((d) => (
                        <View
                          key={d.key}
                          accessibilityLabel={
                            d.today
                              ? `Сегодня: ${formatNum(d.value)} мл`
                              : `${d.label}: ${formatNum(d.value)} мл`
                          }
                          className="flex-1 items-center justify-end"
                          style={{ height: '100%' }}
                        >
                          <View
                            className="w-full rounded-t-[3px]"
                            style={{
                              height: `${Math.max(8, Math.round((d.value / weekMax) * 100))}%`,
                              backgroundColor: '#38BDF8',
                              opacity: d.today ? 1 : 0.4,
                            }}
                          />
                        </View>
                      ))}
                    </View>
                    <View className="mt-1 flex-row gap-1">
                      {week.map((d) => (
                        <Text
                          key={d.key}
                          className={`flex-1 text-center font-sans text-[11px] ${
                            d.today ? 'font-semibold text-bear-bright' : 'text-bear-dim'
                          }`}
                        >
                          {d.label}
                        </Text>
                      ))}
                    </View>
                  </View>
                  <View className="min-w-0 flex-1 rounded-2xl border border-bear-bodyLine bg-bear-bodyCard p-3">
                    <View className="flex-row items-center gap-2">
                      <Text
                        style={{ fontSize: 30, lineHeight: 36 }}
                        accessibilityLabel="Маскот: капля воды"
                      >
                        💧
                      </Text>
                      <View className="min-w-0 flex-1">
                        <Text className="font-bold text-[15.5px] leading-tight text-bear-text">
                          {pep.title}
                        </Text>
                        <Text maxFontSizeMultiplier={1.25} className="mt-0.5 font-sans text-[13px] leading-snug text-bear-sub">
                          {pep.sub}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Журнал за сегодня: по умолчанию свёрнут; тап по шапке —
                    развернуть, тап по записи — правка в строке, корзина — удалить */}
                <Pressable
                  onPress={() => setLogOpen((v) => !v)}
                  accessibilityRole="button"
                  accessibilityLabel={
                    logOpen ? 'Свернуть записи за сегодня' : 'Развернуть записи за сегодня'
                  }
                  className="mt-3 flex-row items-center justify-between active:opacity-80"
                >
                  <View className="flex-row items-center gap-1.5">
                    <Text className="font-sans text-[13px] font-semibold uppercase text-bear-sub">
                      Записи за сегодня
                    </Text>
                    {waterLog.length > 0 && (
                      <View
                        className="rounded-full bg-white/10 px-1.5 py-0.5"
                        accessibilityLabel={`Всего записей: ${waterLog.length}`}
                      >
                        <Text className="font-semibold text-[12.5px] text-bear-sub">
                          {waterLog.length}
                        </Text>
                      </View>
                    )}
                  </View>
                  {logOpen ? (
                    <ChevronUp size={17} color="#8B96B8" />
                  ) : (
                    <ChevronDown size={17} color="#8B96B8" />
                  )}
                </Pressable>
                {logOpen &&
                  (waterLog.length === 0 ? (
                    <Text className="mt-1.5 font-sans text-[13px] text-bear-dim">
                      Пока ничего. Нажмите на ёмкость выше.
                    </Text>
                  ) : (
                    <View className="mt-1.5 gap-1.5">
                    {waterLog.map((w) => {
                      const isEditing = editingId === w.id
                      if (isEditing) {
                        return (
                          <View
                            key={w.id}
                            className="flex-row items-center gap-1.5 rounded-2xl border border-sky-400/40 bg-sky-400/10 px-2.5 py-2"
                          >
                            <TextInput
                              value={editMl}
                              onChangeText={setEditMl}
                              keyboardType="number-pad"
                              maxLength={4}
                              accessibilityLabel="Объём в миллилитрах"
                              className="min-w-0 flex-1 rounded-lg bg-white/5 px-2 py-1.5 text-center font-semibold text-[15.5px] text-bear-text"
                            />
                            <Text className="shrink-0 font-sans text-[13px] text-bear-sub">мл в</Text>
                            <TextInput
                              value={editTime}
                              onChangeText={setEditTime}
                              keyboardType="numbers-and-punctuation"
                              maxLength={5}
                              accessibilityLabel="Время в формате часы:минуты"
                              className="w-[56px] shrink-0 rounded-lg bg-white/5 px-1 py-1.5 text-center font-semibold text-[15.5px] text-bear-text"
                            />
                            <Pressable
                              onPress={saveEdit}
                              accessibilityRole="button"
                              accessibilityLabel="Сохранить изменения"
                              className="shrink-0 rounded-lg p-1.5 active:opacity-80"
                              style={{ backgroundColor: '#22C55E' }}
                            >
                              <Check size={17} color="#fff" strokeWidth={2.5} />
                            </Pressable>
                            <Pressable
                              onPress={cancelEdit}
                              accessibilityRole="button"
                              accessibilityLabel="Отменить изменение"
                              className="shrink-0 rounded-lg bg-white/10 p-1.5 active:opacity-80"
                            >
                              <X hitSlop={10} size={17} color="#A5AECB" />
                            </Pressable>
                          </View>
                        )
                      }
                      return (
                        <Pressable
                          key={w.id}
                          onPress={() => startEdit(w)}
                          accessibilityRole="button"
                          accessibilityLabel={`Изменить запись ${w.ml} мл`}
                          className="flex-row items-center gap-2.5 rounded-2xl border border-white/10 bg-white/[0.05] px-3.5 py-2 active:opacity-80"
                        >
                          <Droplets size={16} color="#38BDF8" />
                          <Text className="min-w-0 flex-1 font-semibold text-[15.5px] text-bear-text">
                            {formatNum(w.ml)} мл
                          </Text>
                          <Text className="shrink-0 font-sans text-[14.5px] text-bear-sub">
                            {w.time}
                          </Text>
                          <View className="shrink-0 flex-row items-center gap-0.5">
                            <View className="p-1">
                              <Pencil size={15} color="#8B96B8" />
                            </View>
                            <Pressable
                              onPress={() => removeEntry(w)}
                              accessibilityRole="button"
                              accessibilityLabel={`Удалить запись ${w.ml} мл`}
                              className="p-1"
                            >
                              <Trash2 size={16} color="#8B96B8" />
                            </Pressable>
                          </View>
                        </Pressable>
                      )
                    })}
                    </View>
                  ))}
              </View>
            </ScrollView>
          </LinearGradient>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

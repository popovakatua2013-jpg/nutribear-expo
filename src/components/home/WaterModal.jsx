// Окно «Вода»: hero-карточка «Выпито сегодня» (крупная цифра, цель,
// полоса прогресса + кольцо «% цели»), пилюли напоминаний, «Быстро
// добавить» — плитки ёмкостей 2×2, сразу под ними записи за сегодня
// (развёрнуты по умолчанию; тап по записи — правка мл/времени прямо
// в строке, корзина — удаление), внизу «Последние 7 дней» — среднее,
// Δ к прошлой неделе и мини-бары. Дубль-график «Динамика за 7 дней»
// и плашка-поддержка («Хороший темп!») удалены по запросу пользователя.
// Строка правки записи — карточкой в два ряда: поля сверху, явные
// кнопки «Сохранить»/«Отмена» снизу (отзыв Кати: галочка уезжала
// за край, кнопку «Сохранить» было не видно); при старте правки
// журнал докручивается к строке, клавиатура её не перекрывает.

import { useEffect, useMemo, useRef, useState } from 'react'
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import Svg, { Circle, Text as SvgText } from 'react-native-svg'
import {
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
import { ProgressBar } from '../ui/ProgressBar'
import { BodyChip } from '../ui/BodyChip'
import { fontFamilies } from './ring-font'

const nowTime = () =>
  new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })

// Цвет столба за день (отзыв Кати): норма выпита — зелёный, половина и
// больше — оранжевый, мало — красный, нет статистики — серый
function dayBarColor(value, goalMl) {
  if (!value || value <= 0) return 'rgba(139,150,184,0.38)'
  if (goalMl > 0 && value >= goalMl) return '#4ADE80'
  if (goalMl > 0 && value >= goalMl / 2) return '#FB923C'
  return '#F87171'
}

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
  const [logOpen, setLogOpen] = useState(true) // записи за сегодня сразу на виду
  const [weekOpen, setWeekOpen] = useState(true) // «Последние 7 дней»
  const scrollRef = useRef(null)
  const editRowY = useRef(0) // Y строки правки в содержимом журнала

  // Окно закрыто — черновик правки записи сбрасывается: повторное
  // открытие показывает журнал, а не застаревшую строку в режиме правки
  useEffect(() => {
    if (!open) {
      setEditingId(null)
      setEditMl('')
      setEditTime('')
      // При следующем открытии записи снова на виду — не заставляем
      // искать их в конце списка
      setLogOpen(true)
      return
    }
    // «Последние 7 дней» больше НЕ схлопывается сам (отзыв Кати:
    // «раздел по дням недели по-прежнему схлопнут») — окно каждый раз
    // открывается с развёрнутой неделей, даже пока вода не ведётся;
    // свернуть можно тапом по шапке вручную
    setWeekOpen(true)
  }, [open])

  // Старт правки — докручиваем журнал так, чтобы строка правки и
  // кнопка «Сохранить» были на виду (и не уезжали под клавиатуру)
  useEffect(() => {
    if (!editingId) return
    const t = setTimeout(() => {
      scrollRef.current?.scrollTo({ y: Math.max(0, editRowY.current - 80), animated: true })
    }, 260)
    return () => clearTimeout(t)
  }, [editingId])

  const pct = Math.min(100, Math.round((ml / Math.max(1, goalMl)) * 100))

  // Последние 7 дней (из дневной истории) — среднее и мини-бары
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
      {/* Клавиатура не перекрывает журнал и кнопки правки (iOS); на
          Android окно ресайзится само */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
        pointerEvents="box-none"
      >
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
            <ScrollView
              ref={scrollRef}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 14 }}
            >
              {/* Шапка: чип-иконка + название, колокольчик напоминаний, крестик */}
              <View className="flex-row items-center justify-between border-b border-bear-line px-4 pb-2.5 pt-3.5">
                <View className="flex-row items-center gap-2.5">
                  <BodyChip icon={<Droplets />} size={34} />
                  <Text className="font-bold text-[20px] text-bear-text">Вода</Text>
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
                    <Text className="font-sans text-[15px] text-bear-sub">Выпито сегодня</Text>
                    <Text className="mt-0.5 font-extrabold text-[27px] tracking-tight text-bear-text">
                      {formatNum(ml)}{' '}
                      <Text className="font-semibold text-[17.5px] text-bear-sub">мл</Text>
                    </Text>
                    <View className="mt-1 flex-row items-center gap-1">
                      <Target size={15} color="#A5AECB" />
                      <Text className="font-sans text-[15px] text-bear-sub">
                        Цель: {formatNum(goalMl)} мл
                      </Text>
                    </View>
                    <View className="mt-2.5 flex-row items-center gap-2">
                      <View className="min-w-0 flex-1">
                        <ProgressBar pct={pct} h={7} color="#38BDF8" />
                      </View>
                      <Text className="font-semibold text-[15px] text-bear-text">{pct}%</Text>
                    </View>
                  </View>
                  <GoalRing pct={pct} />
                </View>

                {reminder.enabled && (
                  <View className="pt-3">
                    <ReminderIntervals />
                  </View>
                )}

                {/* Быстро добавить: ёмкости по 2 в ряд, карандашик — правка */}
                <View className="mt-3 flex-row items-center gap-1.5">
                  <CirclePlus size={16} color="#7DD3FC" />
                  <Text className="min-w-0 flex-1 font-semibold text-[16.5px] text-bear-text">
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

                {/* Журнал за сегодня: развёрнут по умолчанию и стоит сразу
                    после «Быстро добавить» — записи всегда на виду; тап по
                    шапке — свернуть, тап по записи — правка в строке */}
                <Pressable
                  onPress={() => setLogOpen((v) => !v)}
                  accessibilityRole="button"
                  accessibilityLabel={
                    logOpen ? 'Свернуть записи за сегодня' : 'Развернуть записи за сегодня'
                  }
                  className="mt-3 flex-row items-center justify-between active:opacity-80"
                >
                  <View className="flex-row items-center gap-1.5">
                    <Text className="font-sans text-[15px] font-semibold uppercase text-bear-sub">
                      Записи за сегодня
                    </Text>
                    {waterLog.length > 0 && (
                      <View
                        className="rounded-full bg-white/10 px-1.5 py-0.5"
                        accessibilityLabel={`Всего записей: ${waterLog.length}`}
                      >
                        <Text className="font-semibold text-[14.5px] text-bear-sub">
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
                    <Text className="mt-1.5 font-sans text-[15px] text-bear-dim">
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
                            onLayout={(e) => {
                              editRowY.current = e.nativeEvent.layout.y
                            }}
                            className="rounded-2xl border border-sky-400/40 bg-sky-400/10 px-2.5 py-2"
                          >
                            {/* Поля: объём и время. Времени дали место —
                                теперь поле объёма сужается, а не толкает
                                кнопки за край экрана */}
                            <View className="flex-row items-center gap-1.5">
                              <TextInput
                                value={editMl}
                                onChangeText={setEditMl}
                                keyboardType="number-pad"
                                maxLength={4}
                                autoFocus
                                accessibilityLabel="Объём в миллилитрах"
                                className="min-w-0 flex-1 rounded-lg bg-white/5 px-2 py-1.5 text-center font-semibold text-[17.5px] text-bear-text"
                              />
                              <Text
                                maxFontSizeMultiplier={1.1}
                                className="shrink-0 font-sans text-[15px] text-bear-sub"
                              >
                                мл в
                              </Text>
                              <TextInput
                                value={editTime}
                                onChangeText={setEditTime}
                                keyboardType="numbers-and-punctuation"
                                maxLength={5}
                                accessibilityLabel="Время в формате часы:минуты"
                                className="w-[58px] shrink-0 rounded-lg bg-white/5 px-1 py-1.5 text-center font-semibold text-[17.5px] text-bear-text"
                              />
                            </View>
                            {/* «Сохранить» — явная кнопка на всю ширину
                                половины: видна всегда, не уезжает за край
                                и не прячется под клавиатурой (отзыв Кати) */}
                            <View className="mt-1.5 flex-row gap-1.5">
                              <Pressable
                                onPress={saveEdit}
                                accessibilityRole="button"
                                accessibilityLabel="Сохранить изменения"
                                className="min-w-0 flex-1 flex-row items-center justify-center gap-1 rounded-lg py-2 active:opacity-80"
                                style={{ backgroundColor: '#22C55E' }}
                              >
                                <Check size={16} color="#fff" strokeWidth={2.5} />
                                <Text className="font-bold text-[15px] text-white">Сохранить</Text>
                              </Pressable>
                              <Pressable
                                onPress={cancelEdit}
                                accessibilityRole="button"
                                accessibilityLabel="Отменить изменение"
                                className="min-w-0 flex-1 items-center justify-center rounded-lg bg-white/10 py-2 active:opacity-80"
                              >
                                <Text className="font-bold text-[15px] text-bear-sub">Отмена</Text>
                              </Pressable>
                            </View>
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
                          <Text className="min-w-0 flex-1 font-semibold text-[17.5px] text-bear-text">
                            {formatNum(w.ml)} мл
                          </Text>
                          <Text className="shrink-0 font-sans text-[16.5px] text-bear-sub">
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

                {/* Последние 7 дней: среднее за неделю, Δ к прошлой неделе
                    и мини-бары по дням — единственный график недели
                    (дубль «Динамика за 7 дней» убран по запросу).
                    Сворачивается тапом по шапке; без данных за неделю
                    свёрнуто по умолчанию (отзыв Кати) */}
                <Pressable
                  onPress={() => setWeekOpen((v) => !v)}
                  accessibilityRole="button"
                  accessibilityLabel={
                    weekOpen ? 'Свернуть статистику по дням' : 'Развернуть статистику по дням'
                  }
                  className="mt-3 rounded-2xl border border-bear-bodyLine bg-bear-bodyCard px-3 py-2.5 active:opacity-80"
                >
                  <View className="flex-row items-center gap-1.5">
                    <Trophy size={15} color="#FBBF24" />
                    <Text className="min-w-0 flex-1 font-semibold text-[16.5px] text-bear-text">
                      Последние 7 дней
                    </Text>
                    {weekOpen ? (
                      <ChevronUp size={17} color="#8B96B8" />
                    ) : (
                      <ChevronDown size={17} color="#8B96B8" />
                    )}
                  </View>
                  {weekOpen && (
                    <>
                  <View className="mt-1.5 flex-row flex-wrap items-center gap-x-1.5 gap-y-1">
                    <Text className="font-extrabold text-[21px] tracking-tight text-bear-text">
                      {formatNum(weekAvg)}
                    </Text>
                    <Text className="font-sans text-[15px] text-bear-sub">мл/день</Text>
                    {delta != null && Math.abs(delta) >= 1 && (
                      <View
                        className="rounded-md px-1.5 py-0.5"
                        style={{
                          backgroundColor:
                            delta > 0 ? 'rgba(52,211,153,0.15)' : 'rgba(248,113,113,0.15)',
                        }}
                      >
                        <Text
                          className="font-semibold text-[14.5px]"
                          style={{ color: delta > 0 ? '#34D399' : '#F87171' }}
                        >
                          {delta > 0 ? '↑' : '↓'} {delta > 0 ? '+' : '−'}
                          {Math.abs(delta)}%
                        </Text>
                      </View>
                    )}
                  </View>
                  <View className="mt-2 flex-row items-end gap-1" style={{ height: 44 }}>
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
                          className="w-full rounded-t-[4px]"
                          style={{
                            height: d.value > 0 ? `${Math.max(10, Math.round((d.value / weekMax) * 100))}%` : '10%',
                            backgroundColor: dayBarColor(d.value, goalMl),
                            opacity: d.today ? 1 : 0.55,
                          }}
                        />
                      </View>
                    ))}
                  </View>
                  <View className="mt-1 flex-row gap-1">
                    {week.map((d) => (
                      <Text
                        key={d.key}
                        className={`flex-1 text-center font-sans text-[13px] ${
                          d.today ? 'font-semibold text-bear-bright' : 'text-bear-dim'
                        }`}
                      >
                        {d.label}
                      </Text>
                    ))}
                  </View>
                    </>
                  )}
                </Pressable>
              </View>
            </ScrollView>
          </LinearGradient>
        </Pressable>
      </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  )
}

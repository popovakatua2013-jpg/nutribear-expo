// Окно «Вода»: hero-карточка «Выпито сегодня» (крупная цифра, цель,
// полоса прогресса + кольцо «% цели»), «Быстро добавить» — плитки
// ёмкостей 2×2, записи за сегодня (раскрываются сами, если записи
// есть — отзыв Кати 28.11: «не видно историю, нет возможности
// удалить»; тап по записи — правка мл/времени прямо в строке,
// корзина — удаление). Защита от случайных нажатий (отзыв Кати):
//  1) двойной тап по ёмкости быстрее 700 мс — игнорируется;
//  2) после добавления в тосте есть кнопка «Отменить» — вода
//     убирается одним тапом (медведь вернул полный стакан).
// По отзыву Кати от 10.11 убрано: колокольчик и пилюли интервала
// напоминаний (настройки уже есть в «Ещё → Уведомления») и блок
// «Последние 7 дней» (дубль графика воды в «Отчётах» дневника).
// Тосты внутри окна видны: в модалке отрисован свой слой ToastLayer
// (нативное окно Modal перекрывает слой корня — раньше тост
// «добавлено» всплывал ПОД окном и был не виден).
// Строка правки записи — карточкой в два ряда: поля сверху, явные
// кнопки «Сохранить»/«Отмена» снизу (отзыв Кати: галочка уезжала
// за край, кнопку «Сохранить» было не видно); при старте правки
// журнал докручивается к строке, клавиатура её не перекрывает.
// Шторка не доходит до «шторы» телефона: зазор сверху — высота
// статус-бара (notch не накрывает шапку окна, отзыв Кати 28.11).

import { useEffect, useRef, useState } from 'react'
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
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
  X,
} from 'lucide-react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { VesselCard } from './VesselCard'
import { useActivityStore } from '@/store/useActivityStore'
import { useGoalsStore } from '@/store/useGoalsStore'
import { useToast, ToastLayer } from '../ui/Toast'
import { formatNum } from '@/lib/format'
import { ProgressBar } from '../ui/ProgressBar'
import { BodyChip } from '../ui/BodyChip'
import { fontFamilies } from './ring-font'
import { useThemeColors } from '@/lib/use-theme'


const nowTime = () =>
  new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })

// Цвет столба за день (отзыв Кати) — убран вместе с блоком
// «Последние 7 дней» (дубль графика в «Отчётах»)

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
  const themeColors = useThemeColors()
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
        {/* Трек — рамка темы (белый rgba был невидим на «Кремовой» —
            кольцо воды «не отрисовывалось», отзыв Кати 25.11) */}
        <Circle
          cx="42"
          cy="42"
          r={R}
          fill="none"
          stroke={themeColors.line}
          strokeWidth="8.5"
        />
        {pct > 0 && (
          <Circle
            cx="42"
            cy="42"
            r={R}
            fill="none"
            stroke={themeColors.accentSoft}
            strokeWidth="8.5"
            strokeLinecap="round"
            strokeOpacity={0.9}
            strokeDasharray={`${len} ${CIRC}`}
            transform="rotate(-90 42 42)"
          />
        )}
        <SvgText
          x="42"
          y="44"
          fill={themeColors.text}
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
          fill={themeColors.sub}
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
  const themeColors = useThemeColors()
  const insets = useSafeAreaInsets()
  const vessels = useActivityStore((s) => s.vessels)
  const addWater = useActivityStore((s) => s.addWater)
  const editWaterLog = useActivityStore((s) => s.editWaterLog)
  const removeWaterLog = useActivityStore((s) => s.removeWaterLog)
  const waterLog = useActivityStore((s) => s.waterLog)
  const goals = useGoalsStore((s) => s.goals)
  const { toast } = useToast()

  const [editingId, setEditingId] = useState(null) // запись журнала на изменении
  const [editMl, setEditMl] = useState('')
  const [editTime, setEditTime] = useState('')
  // Записи за сегодня: раскрыты сами, если записи есть (отзыв Кати
  // 28.11: «не видно историю»), пустые — скрыты
  const [logOpen, setLogOpen] = useState(false)
  const scrollRef = useRef(null)
  const editRowY = useRef(0) // Y строки правки в содержимом журнала
  // Защита от случайного добавления: последний тап по ёмкости
  const lastAddAt = useRef(0)

  // Окно открыто — журнал сразу раскрыт, если есть записи; окно
  // закрыто — черновик правки сбрасывается, журнал сворачивается
  useEffect(() => {
    if (open) {
      setLogOpen(useActivityStore.getState().waterLog.length > 0)
    } else {
      setEditingId(null)
      setEditMl('')
      setEditTime('')
      setLogOpen(false)
    }
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

  // Ёмкости по 2 в ряд (на узком экране 4 в ряд не читаются)
  const vesselRows = vessels.reduce((rows, v) => {
    if (rows.length === 0 || rows[rows.length - 1].length === 2) rows.push([])
    rows[rows.length - 1].push(v)
    return rows
  }, [])

  function drink(v) {
    // Защита от случайного нажатия: двойной тап быстрее 700 мс —
    // второй тап игнорируется (отзыв Кати 28.11: «добавила воду
    // несколько раз нечаянно»)
    const now = Date.now()
    if (now - lastAddAt.current < 700) {
      toast({
        title: '💧 Уже записали',
        description: `${v.label} — только что. Лишние тапы не считаются`,
      })
      return
    }
    lastAddAt.current = now
    const id = addWater(v.ml)
    toast({
      title: `💧 ${v.label} — ${v.ml} мл · ${nowTime()}`,
      description: `${pct}% → ${Math.min(100, Math.round(((ml + v.ml) / Math.max(1, goals.waterMl)) * 100))}% нормы`,
      // Кнопка «Отменить»: убирает случайно добавленную воду одним тапом
      action: {
        label: 'Отменить',
        onPress: () => {
          removeWaterLog(id)
          toast({ title: '↩️ Отменено', description: `Минус ${formatNum(v.ml)} мл — случайный тап убран` })
        },
      },
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
        <Pressable
          onPress={() => {}}
          className="max-h-[88%] overflow-hidden rounded-3xl border border-bear-line"
          // Шторка не уходит под «штору» телефона: зазор сверху —
          // высота статус-бара (notch/вырез не накрывает шапку окна)
          style={{ marginTop: insets.top }}
        >
          <LinearGradient
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            colors={['#16234A', themeColors.pop, '#101A36']}
          >
            <ScrollView
              ref={scrollRef}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 14 }}
            >
              {/* Шапка: чип-иконка + название, крестик. Колокольчик и
                  интервал напоминаний убраны (отзыв Кати от 10.11):
                  настройки уведомлений — в «Ещё → Уведомления» */}
              <View className="flex-row items-center justify-between border-b border-bear-line px-4 pb-2.5 pt-3.5">
                <View className="flex-row items-center gap-2.5">
                  <BodyChip icon={<Droplets />} size={34} />
                  <Text className="font-bold text-[20px] text-bear-text">Вода</Text>
                </View>
                <Pressable onPress={onClose} accessibilityLabel="Закрыть" className="p-1">
                  <X hitSlop={10} size={22} color={themeColors.sub} />
                </Pressable>
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
                      <Target size={15} color={themeColors.sub} />
                      <Text className="font-sans text-[15px] text-bear-sub">
                        Цель: {formatNum(goalMl)} мл
                      </Text>
                    </View>
                    <View className="mt-2.5 flex-row items-center gap-2">
                      <View className="min-w-0 flex-1">
                        <ProgressBar pct={pct} h={7} color={themeColors.accentSoft} />
                      </View>
                      <Text className="font-semibold text-[15px] text-bear-text">{pct}%</Text>
                    </View>
                  </View>
                  <GoalRing pct={pct} />
                </View>

                {/* Быстро добавить: ёмкости по 2 в ряд, карандашик — правка */}
                <View className="mt-3 flex-row items-center gap-1.5">
                  <CirclePlus size={16} color={themeColors.mWater} />
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

                {/* Журнал за сегодня: ВСЕГДА свёрнут при открытии окна
                    (отзыв Кати от 10.11); тап по шапке — развернуть,
                    тап по записи — правка в строке */}
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
                        className="rounded-full bg-bear-card2 px-1.5 py-0.5"
                        accessibilityLabel={`Всего записей: ${waterLog.length}`}
                      >
                        <Text className="font-semibold text-[14.5px] text-bear-sub">
                          {waterLog.length}
                        </Text>
                      </View>
                    )}
                  </View>
                  {logOpen ? (
                    <ChevronUp size={17} color={themeColors.dim} />
                  ) : (
                    <ChevronDown size={17} color={themeColors.dim} />
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
                                className="min-w-0 flex-1 rounded-lg bg-bear-card2 px-2 py-1.5 text-center font-semibold text-[17.5px] text-bear-text"
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
                                className="w-[58px] shrink-0 rounded-lg bg-bear-card2 px-1 py-1.5 text-center font-semibold text-[17.5px] text-bear-text"
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
                                className="min-w-0 flex-1 items-center justify-center rounded-lg bg-bear-card2 py-2 active:opacity-80"
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
                          className="flex-row items-center gap-2.5 rounded-2xl border border-bear-line bg-bear-card2 px-3.5 py-2 active:opacity-80"
                        >
                          <Droplets size={16} color={themeColors.accentSoft} />
                          <Text className="min-w-0 flex-1 font-semibold text-[17.5px] text-bear-text">
                            {formatNum(w.ml)} мл
                          </Text>
                          <Text className="shrink-0 font-sans text-[16.5px] text-bear-sub">
                            {w.time}
                          </Text>
                          <View className="shrink-0 flex-row items-center gap-1">
                            <View className="p-1.5">
                              <Pencil size={16} color={themeColors.dim} />
                            </View>
                            <Pressable
                              onPress={() => removeEntry(w)}
                              accessibilityRole="button"
                              accessibilityLabel={`Удалить запись ${w.ml} мл`}
                              hitSlop={8}
                              className="rounded-full bg-bear-card2 p-1.5"
                            >
                              <Trash2 size={17} color={themeColors.sub} />
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
      </KeyboardAvoidingView>
      {/* Слой тостов внутри окна: нативное окно Modal перекрывает
          слой корня — без этого тост «добавлено» не виден
          (отзыв Кати от 10.11) */}
      <ToastLayer />
    </Modal>
  )
}

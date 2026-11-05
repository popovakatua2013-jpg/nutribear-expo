// Карточка «Измерения тела» на вкладке «Тело» — оформление по макету
// пользователя: шапка-секция (иконка + заголовок + подзаголовок + кнопка
// «+ Добавить») — по решению пользователя секция по умолчанию СВЁРНУТА,
// тап по шапке разворачивает/сворачивает. Внутри: ряд плиток замеров
// (цветная иконка, последний замер и Δ к предыдущему, свои замеры —
// рядом), карточка «Общий прогресс» (полукруглый датчик ScoreGauge,
// подпись и звёзды — оценка bodyProgressScore из lib/data/bmi) и
// таблица «Измерение / Сегодня / Изменение». Таблица по решению
// пользователя ВСЕГДА свёрнута: шапка таблицы — тап-переключатель с
// шевроном, при каждом открытии секции снова свёрнута (не храним).
// Поверхность карточек —
// фиолетовая, одинаковая с ИМТ-блоком выше. Тап по плитке или строке
// открывает окно записи: значения подставлены последними, меняем то,
// что измерили; в окне — «+ Свой замер».

import { useEffect, useMemo, useState } from 'react'
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  Donut,
  Heart,
  Hourglass,
  Info,
  Ruler,
  Shirt,
  Star,
  StarHalf,
  Trash2,
  Waves,
  X,
} from 'lucide-react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { BASE_MEASUREMENTS, useProfileStore } from '@/store/useProfileStore'
import { bodyProgressScore, fmtDecimal } from '@/lib/data/bmi'
import { ScoreGauge } from './ScoreGauge'
import { useToast } from '../ui/Toast'

const CUSTOM_COLOR = '#4ADE80'
const MIN_CM = 20
const MAX_CM = 300

// Поверхность карточек — та же, что у ИМТ-блока выше (фиолетовая
// bodyCard с фиолетовой обводкой): цвета блока выровнены с ИМТ
const CARD = {
  backgroundColor: 'rgba(29,18,64,0.82)',
  borderColor: 'rgba(168,85,247,0.30)',
  borderWidth: 1,
}

// Иконки плиток: весёлые «прозвища» замеров (шрифт-стайл мишки NutriBear)
const MEAS_ICONS = {
  chest: Shirt, // грудь
  waist: Hourglass, // талия
  belly: Donut, // живот
  glutes: Heart, // попа
  hips: Waves, // бёдра
}

// Полный список пунктов: встроенные + свои замеры
function allItems(customs) {
  return [
    ...BASE_MEASUREMENTS.map((m) => ({ ...m, custom: false })),
    ...customs.map((m) => ({ key: m.id, label: m.name, color: CUSTOM_COLOR, custom: true })),
  ]
}

// Русская запятая — тоже десятичный разделитель
const parseNum = (v) => Number(String(v).trim().replace(',', '.'))

// «24.10» из ISO-даты
const shortDay = (iso) =>
  new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })

// Тон дельты: талия/живот — минус это прогресс (зелёный), плюс — красный;
// остальные замеры и «нет изменений» — нейтральный серый
function deltaTone(m, d) {
  if (d == null || d === 0 || !m.slimGood) return '#8B96B8'
  return d < 0 ? '#34D399' : '#FB7185'
}

export function MeasurementsCard() {
  const measurements = useProfileStore((s) => s.measurements)
  const customs = useProfileStore((s) => s.customMeasurements)
  const weightKg = useProfileStore((s) => s.weightKg)
  const heightCm = useProfileStore((s) => s.heightCm)
  const goalWeightKg = useProfileStore((s) => s.goalWeightKg)
  const weights = useProfileStore((s) => s.weights)
  const [open, setOpen] = useState(false)
  // Секция свёрнута по умолчанию (как «Динамика веса») — не храним
  // в сторe: при каждом запуске снова свёрнуто
  const [secOpen, setSecOpen] = useState(false)
  // Таблица «Измерение / Сегодня / Изменение» — всегда свёрнута
  // (решение пользователя): шапка таблицы раскрывает строки, состояние
  // не храним — при каждом открытии секции снова свёрнута
  const [tableOpen, setTableOpen] = useState(false)
  const items = useMemo(() => allItems(customs), [customs])

  // Оценка общего прогресса: вес к цели + динамика талии/живота +
  // регулярность замеров (формула в lib/data/bmi.js)
  const { score, caption, stars } = bodyProgressScore({
    weightKg,
    weights,
    goalWeightKg,
    heightCm,
    measurements,
  })

  return (
    <View accessibilityLabel="Замеры тела" className="gap-2.5">
      {/* Шапка-секция: тап разворачивает/сворачивает блок; иконка +
          заголовок с подзаголовком + «+ Добавить» */}
      <Pressable
        onPress={() => setSecOpen((v) => !v)}
        accessibilityRole="button"
        accessibilityState={{ expanded: secOpen }}
        accessibilityLabel={secOpen ? 'Свернуть измерения тела' : 'Развернуть измерения тела'}
        className="flex-row items-center gap-2.5 active:opacity-80"
      >
        <View className="h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.06]">
          <Ruler size={20} color="#A78BFA" />
        </View>
        <View className="min-w-0 flex-1">
          <Text className="font-bold text-[20px] tracking-tight text-bear-text">
            Измерения тела
          </Text>
          <Text
            numberOfLines={1}
            maxFontSizeMultiplier={1.2}
            className="mt-0.5 font-sans text-[12.5px] text-bear-sub"
          >
            Сантиметром — тап по чипу или «Добавить»
          </Text>
        </View>
        <Pressable
          onPress={() => setOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Записать замеры"
          className="shrink-0 rounded-full border border-white/10 bg-white/[0.06] px-3 py-[7px] active:opacity-70"
        >
          <Text className="font-bold text-[13px] text-[#8DABFF]">+ Добавить</Text>
        </Pressable>
        {/* Шеврон состояния секции — по умолчанию свёрнута */}
        {secOpen ? (
          <ChevronUp size={17} color="#A5AECB" />
        ) : (
          <ChevronDown size={17} color="#A5AECB" />
        )}
      </Pressable>

      {secOpen && (
        <>
      {/* Плитки замеров: последний замер + Δ к предыдущему; ряд
          прокручивается, если замеров больше, чем влезает */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingRight: 4 }}
      >
        {items.map((m) => {
          const list = measurements[m.key] || []
          const last = list[0] || null
          const prev = list[1] || null
          const d = last && prev ? Math.round((last.cm - prev.cm) * 10) / 10 : null
          const tone = deltaTone(m, d)
          const Icon = m.custom ? Ruler : MEAS_ICONS[m.key] || Ruler

          return (
            <Pressable
              key={m.key}
              onPress={() => setOpen(true)}
              accessibilityRole="button"
              accessibilityLabel={`${m.label}: ${last ? `${fmtDecimal(last.cm)} сантиметров` : 'нет замеров'} — записать замеры`}
              className="w-[112px] shrink-0 rounded-2xl p-3 active:opacity-70"
              style={CARD}
            >
              <View
                className="h-8 w-8 items-center justify-center rounded-lg"
                style={{ backgroundColor: `${m.color}22` }}
              >
                <Icon size={17} color={m.color} />
              </View>

              <Text
                numberOfLines={1}
                maxFontSizeMultiplier={1.2}
                className="mt-1.5 font-sans text-[12px] text-bear-sub"
              >
                {m.label}
              </Text>
              <Text
                numberOfLines={1}
                maxFontSizeMultiplier={1.2}
                className="mt-0.5 font-extrabold text-[18px] tracking-tight text-bear-text"
              >
                {last ? `${fmtDecimal(last.cm)} см` : '—'}
              </Text>

              <View
                className="mt-1.5 self-start rounded-full px-1.5 py-[2px]"
                style={{ backgroundColor: `${tone}1f` }}
              >
                <Text numberOfLines={1} maxFontSizeMultiplier={1.2} className="font-bold text-[11px]" style={{ color: tone }}>
                  {d == null
                    ? last
                      ? `от ${shortDay(last.date)}`
                      : 'нет данных'
                    : d === 0
                      ? 'без измен.'
                      : `${d > 0 ? '+' : '−'}${fmtDecimal(Math.abs(d))} см`}
                </Text>
              </View>
            </Pressable>
          )
        })}
      </ScrollView>

      {/* Общий прогресс: датчик + подпись + звёзды (85 → 4.5★, как на макете) */}
      <View className="flex-row items-center gap-2 rounded-2xl p-3.5" style={CARD}>
        <ScoreGauge score={score} />
        <View className="min-w-0 flex-1">
          <Text maxFontSizeMultiplier={1.2} className="font-sans text-[12.5px] text-bear-sub">
            Общий прогресс
          </Text>
          <Text
            numberOfLines={1}
            maxFontSizeMultiplier={1.2}
            className="mt-0.5 font-bold text-[17.5px] text-bear-text"
          >
            {caption}
          </Text>
          <Stars value={stars} />
          <Text
            numberOfLines={2}
            maxFontSizeMultiplier={1.25}
            className="mt-1 font-sans text-[11.5px] leading-snug text-bear-dim"
          >
            Вес к цели, динамика талии и регулярность замеров
          </Text>
        </View>
      </View>

      {/* Таблица «Измерение / Сегодня / Изменение» — всегда свёрнута:
          шапка — тап-переключатель (шеврон у колонки «Измерение»),
          тап разворачивает строки; тап по строке — окно записи */}
      <View className="rounded-2xl px-4 py-2" style={CARD}>
        <Pressable
          onPress={() => setTableOpen((v) => !v)}
          accessibilityRole="button"
          accessibilityState={{ expanded: tableOpen }}
          accessibilityLabel={
            tableOpen
              ? 'Свернуть таблицу замеров'
              : 'Таблица замеров: измерение, сегодня, изменение — открыть'
          }
          className="flex-row items-center border-b border-white/[0.06] py-2.5 active:opacity-70"
        >
          <View className="min-w-0 flex-1 flex-row items-center gap-1">
            <Text className="font-sans text-[11.5px] font-semibold uppercase tracking-wide text-bear-dim">
              Измерение
            </Text>
            {tableOpen ? (
              <ChevronUp size={13} color="#8B96B8" />
            ) : (
              <ChevronDown size={13} color="#8B96B8" />
            )}
          </View>
          <Text className="w-[72px] text-right font-sans text-[11.5px] font-semibold uppercase tracking-wide text-bear-dim">
            Сегодня
          </Text>
          <Text className="w-[84px] text-right font-sans text-[11.5px] font-semibold uppercase tracking-wide text-bear-dim">
            Изменение
          </Text>
        </Pressable>
        {tableOpen &&
          items.map((m, i) => {
          const list = measurements[m.key] || []
          const last = list[0] || null
          const prev = list[1] || null
          const d = last && prev ? Math.round((last.cm - prev.cm) * 10) / 10 : null
          const tone = deltaTone(m, d)
          const Arrow = d > 0 ? ArrowUpRight : ArrowDownRight

          return (
            <Pressable
              key={m.key}
              onPress={() => setOpen(true)}
              accessibilityRole="button"
              accessibilityLabel={`${m.label}: ${last ? `${fmtDecimal(last.cm)} сантиметров` : 'нет замеров'} — записать замеры`}
              className={`flex-row items-center py-2.5 active:opacity-70 ${
                i < items.length - 1 ? 'border-b border-white/[0.05]' : ''
              }`}
            >
              <View className="min-w-0 flex-1 flex-row items-center gap-2">
                <View
                  style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: m.color }}
                />
                <Text
                  numberOfLines={1}
                  maxFontSizeMultiplier={1.2}
                  className="min-w-0 flex-1 font-semibold text-[14.5px] text-bear-text"
                >
                  {m.label}
                </Text>
                {m.custom && <Info size={13} color="#8B96B8" />}
              </View>
              <Text
                maxFontSizeMultiplier={1.2}
                className="w-[72px] text-right font-bold text-[14.5px] text-bear-text"
              >
                {last ? `${fmtDecimal(last.cm)} см` : '—'}
              </Text>
              <View className="w-[84px] flex-row items-center justify-end gap-0.5">
                {d != null && d !== 0 && <Arrow size={13} color={tone} />}
                <Text
                  numberOfLines={1}
                  maxFontSizeMultiplier={1.2}
                  className="font-semibold text-[12.5px]"
                  style={{ color: tone }}
                >
                  {d == null
                    ? '—'
                    : d === 0
                      ? 'без изм.'
                      : `${d > 0 ? '+' : '−'}${fmtDecimal(Math.abs(d))} см`}
                </Text>
              </View>
            </Pressable>
          )
        })}
      </View>
        </>
      )}

      <MeasurementsModal open={open} onClose={() => setOpen(false)} />
    </View>
  )
}

// Звёзды 0…5 с половинками: 4.5 — четыре золотых + пол-звезды
function Stars({ value }) {
  const full = Math.floor(value)
  const half = value - full >= 0.5
  const DIM = 'rgba(255,255,255,0.14)'
  return (
    <View className="mt-1 flex-row items-center gap-0.5" accessibilityLabel={`Оценка: ${value} из 5 звёзд`}>
      {[0, 1, 2, 3, 4].map((i) => {
        if (i < full) return <Star key={i} size={15} color="#FACC15" fill="#FACC15" />
        if (i === full && half) {
          return (
            <View key={i} className="h-[13px] w-[13px] items-center justify-center">
              <Star size={15} color={DIM} fill={DIM} style={{ position: 'absolute' }} />
              <StarHalf size={15} color="#FACC15" fill="#FACC15" />
            </View>
          )
        }
        return <Star key={i} size={15} color={DIM} fill={DIM} />
      })}
    </View>
  )
}

// Окно записи замеров: поля предзаполнены последними значениями —
// меняем то, что измерили; «Сохранить» пишет только изменённые поля.
// Внизу — создание своего замера (появляется в списке сразу).
function MeasurementsModal({ open, onClose }) {
  const { toast } = useToast()
  const measurements = useProfileStore((s) => s.measurements)
  const customs = useProfileStore((s) => s.customMeasurements)
  const addMeasurement = useProfileStore((s) => s.addMeasurement)
  const addCustomMeasurement = useProfileStore((s) => s.addCustomMeasurement)
  const removeCustomMeasurement = useProfileStore((s) => s.removeCustomMeasurement)

  const items = useMemo(() => allItems(customs), [customs])
  // Значения полей { [key]: string }; собираем при каждом открытии
  const [vals, setVals] = useState({})
  const [newName, setNewName] = useState('')

  useEffect(() => {
    if (!open) return
    const init = {}
    items.forEach((m) => {
      const last = (measurements[m.key] || [])[0]
      init[m.key] = last ? String(last.cm) : ''
    })
    setVals(init)
    setNewName('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const hasBad = items.some((m) => {
    const txt = String(vals[m.key] ?? '').trim()
    if (txt === '') return false
    const n = parseNum(txt)
    return !Number.isFinite(n) || n < MIN_CM || n > MAX_CM
  })

  function handleAddCustom() {
    const item = addCustomMeasurement(newName)
    if (!item) {
      toast({
        title: '⚠️ Не получилось',
        description: 'Пустое имя, дубль или уже 10 своих замеров',
      })
      return
    }
    setVals((s) => ({ ...s, [item.id]: '' }))
    setNewName('')
    toast({ title: '➕ Замер добавлен', description: `«${item.name}» появился в списке` })
  }

  function confirmRemoveCustom(m) {
    Alert.alert(
      `Удалить «${m.label}»?`,
      'Замер исчезнет из карточки — вместе со всеми своими записями.',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: () => {
            removeCustomMeasurement(m.key)
            toast({ title: '🗑 Замер удалён', description: `«${m.label}» и его записи` })
          },
        },
      ]
    )
  }

  function handleSave() {
    if (hasBad) return
    const savedNames = []
    items.forEach((m) => {
      const txt = String(vals[m.key] ?? '').trim()
      if (txt === '') return
      const n = parseNum(txt)
      if (!Number.isFinite(n) || n < MIN_CM || n > MAX_CM) return
      const last = (measurements[m.key] || [])[0]
      // Значение совпадает с последним — новую запись не создаём
      if (last && Math.round(n * 10) / 10 === last.cm) return
      if (addMeasurement(m.key, n)) savedNames.push(m.label)
    })

    if (!savedNames.length) {
      toast({ title: '📏 Ничего не изменилось', description: 'Значения совпадают с последними' })
    } else {
      const head = savedNames.slice(0, 3).join(', ')
      const rest = savedNames.length > 3 ? ` и ещё ${savedNames.length - 3}` : ''
      toast({
        title: '📏 Замеры записаны!',
        description: `${head}${rest} — видны в плитках карточки`,
      })
    }
    onClose()
  }

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      {/* Клавиатура не перекрывает поля и кнопку «Сохранить» (iOS) */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 justify-end bg-black/60 px-3 pb-3"
      >
        {open && (
          <View className="overflow-hidden rounded-3xl border border-white/10 bg-bear-pop p-5">
            <View className="flex-row items-center justify-between">
              <View className="min-w-0 flex-1">
                <Text className="font-bold text-[18px] text-bear-text">Записать замеры</Text>
                <Text className="mt-0.5 font-sans text-[13px] text-bear-sub">
                  Сантиметровая лента; заполните то, что измерили
                </Text>
              </View>
              <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Закрыть" className="p-1">
                <X size={22} color="#A5AECB" />
              </Pressable>
            </View>

            <ScrollView
              style={{ maxHeight: 400 }}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 4 }}
            >
              {items.map((m) => {
                const txt = String(vals[m.key] ?? '')
                const n = parseNum(txt)
                const bad =
                  txt.trim() !== '' &&
                  (!Number.isFinite(n) || n < MIN_CM || n > MAX_CM)

                return (
                  <View key={m.key} className="mt-2.5">
                    <View className="flex-row items-center gap-2">
                      <View
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: m.color,
                        }}
                      />
                      <Text
                        numberOfLines={1}
                        maxFontSizeMultiplier={1.2}
                        className="min-w-0 flex-1 font-medium text-[14px] text-bear-sub"
                      >
                        {m.label}
                      </Text>
                      {m.custom && (
                        <Pressable
                          onPress={() => confirmRemoveCustom(m)}
                          accessibilityRole="button"
                          accessibilityLabel={`Удалить свой замер ${m.label}`}
                          className="shrink-0 rounded p-1 active:opacity-60"
                        >
                          <Trash2 size={16} color="#98A2C2" />
                        </Pressable>
                      )}
                      <TextInput
                        value={txt}
                        onChangeText={(v) => setVals((s) => ({ ...s, [m.key]: v }))}
                        keyboardType="decimal-pad"
                        maxLength={6}
                        placeholder="—"
                        placeholderTextColor="#8B96B8"
                        textAlign="center"
                        accessibilityLabel={`${m.label} в сантиметрах`}
                        className={`w-[96px] shrink-0 rounded-2xl border bg-white/5 px-3 py-2.5 font-semibold text-[15.5px] text-white ${
                          bad ? 'border-rose-400/60' : 'border-white/10'
                        }`}
                      />
                    </View>
                    {bad && (
                      <Text className="mt-0.5 font-sans text-[12px] text-rose-300">
                        От {MIN_CM} до {MAX_CM} см, например 78,5
                      </Text>
                    )}
                  </View>
                )
              })}

              {/* Свой замер: имя → появляется в списке и в плитках карточки */}
              <View
                className="mt-4 rounded-2xl border border-dashed border-white/15 p-3"
                accessibilityLabel="Добавить свой замер"
              >
                <Text className="font-semibold text-[14px] text-bear-soft">
                  + Свой замер
                </Text>
                <View className="mt-2 flex-row gap-2">
                  <TextInput
                    value={newName}
                    onChangeText={setNewName}
                    maxLength={24}
                    placeholder="Например: Шея, бицепс"
                    placeholderTextColor="#8B96B8"
                    returnKeyType="done"
                    onSubmitEditing={handleAddCustom}
                    accessibilityLabel="Название своего замера"
                    className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 font-medium text-[15.5px] text-white"
                  />
                  <Pressable
                    onPress={handleAddCustom}
                    accessibilityRole="button"
                    accessibilityLabel="Добавить свой замер в список"
                    className="shrink-0 justify-center rounded-xl bg-white/10 px-3 active:opacity-70"
                  >
                    <Text className="font-bold text-[14.5px] text-[#8DABFF]">Добавить</Text>
                  </Pressable>
                </View>
              </View>
            </ScrollView>

            <Pressable
              onPress={handleSave}
              disabled={hasBad}
              accessibilityRole="button"
              accessibilityLabel="Сохранить замеры"
              className={`mt-4 overflow-hidden rounded-2xl ${hasBad ? 'opacity-50' : ''}`}
            >
              <LinearGradient
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                colors={['#4D7CFE', '#8B5CF6', '#A45BFF']}
              >
                <Text className="py-3.5 text-center font-bold text-[17px] text-white">
                  Сохранить
                </Text>
              </LinearGradient>
            </Pressable>
          </View>
        )}
      </KeyboardAvoidingView>
    </Modal>
  )
}

// Карточка «Измерения тела» на вкладке «Тело» — оформление по макету
// пользователя: компактный ряд чипов (цветная точка, название,
// последний замер и Δ к предыдущему), прокручивается по горизонтали,
// свои замеры — в том же ряду; справа в шапке — кнопка «Добавить».
// Чип или «Добавить» открывают окно записи: значения подставлены
// последними, меняем то, что измерили; в окне — «+ Свой замер».

import { useEffect, useMemo, useState } from 'react'
import { Alert, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { ArrowDownRight, ArrowUpRight, Trash2, X } from 'lucide-react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { BASE_MEASUREMENTS, useProfileStore } from '@/store/useProfileStore'
import { fmtDecimal } from '@/lib/data/bmi'
import { useToast } from '../ui/Toast'

const CUSTOM_COLOR = '#4ADE80'
const MIN_CM = 20
const MAX_CM = 300

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

export function MeasurementsCard() {
  const measurements = useProfileStore((s) => s.measurements)
  const customs = useProfileStore((s) => s.customMeasurements)
  const [open, setOpen] = useState(false)
  const items = useMemo(() => allItems(customs), [customs])

  return (
    <View
      accessibilityLabel="Замеры тела"
      className="rounded-3xl border border-white/5 bg-bear-card p-5"
    >
      <View className="flex-row items-center justify-between gap-2">
        <View className="min-w-0 flex-1">
          <Text className="font-bold text-[15px] tracking-tight text-bear-text">
            Измерения тела
          </Text>
          <Text className="mt-0.5 font-sans text-[10.5px] leading-snug text-bear-sub">
            Сантиметром — тап по чипу или «Добавить»
          </Text>
        </View>
        <Pressable
          onPress={() => setOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Записать замеры"
          className="shrink-0 rounded-full bg-white/10 px-3 py-1.5 active:opacity-70"
        >
          <Text className="font-bold text-[11.5px] text-[#8DABFF]">+ Добавить</Text>
        </Pressable>
      </View>

      {/* Чипы: последний замер + изменение к предыдущему; ряд прокручивается,
          если замеров больше, чем влезает (свои — рядом с встроенными) */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="mt-3"
        contentContainerStyle={{ gap: 8, paddingRight: 4 }}
      >
        {items.map((m) => {
          const list = measurements[m.key] || []
          const last = list[0] || null
          const prev = list[1] || null
          const d = last && prev ? Math.round((last.cm - prev.cm) * 10) / 10 : null
          // Талия/живот: минус — прогресс (зелёный), плюс — красный.
          // Остальные замеры (грудь/попа/бёдра/свои) — нейтральный серый
          const tone =
            d == null || d === 0 || !m.slimGood
              ? '#8B96B8'
              : d < 0
                ? '#34D399'
                : '#FB7185'
          const Arrow = d > 0 ? ArrowUpRight : ArrowDownRight

          return (
            <Pressable
              key={m.key}
              onPress={() => setOpen(true)}
              accessibilityRole="button"
              accessibilityLabel={`${m.label}: ${last ? `${fmtDecimal(last.cm)} сантиметров` : 'нет замеров'} — записать замеры`}
              className="rounded-2xl border border-white/5 bg-white/[0.04] px-3 py-2.5 active:opacity-70"
              style={{ width: 106 }}
            >
              <View className="flex-row items-center gap-1.5">
                <View
                  style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: m.color }}
                />
                <Text
                  numberOfLines={1}
                  maxFontSizeMultiplier={1.2}
                  className="min-w-0 flex-1 font-sans text-[10.5px] text-bear-sub"
                >
                  {m.label}
                </Text>
              </View>

              <Text
                numberOfLines={1}
                maxFontSizeMultiplier={1.2}
                className="mt-1 font-extrabold text-[15.5px] tracking-tight text-bear-text"
              >
                {last ? `${fmtDecimal(last.cm)} см` : '—'}
              </Text>

              <View className="mt-0.5 flex-row items-center gap-0.5">
                {d != null && d !== 0 && <Arrow size={10} color={tone} />}
                <Text
                  numberOfLines={1}
                  maxFontSizeMultiplier={1.2}
                  className="min-w-0 flex-1 font-semibold text-[10px]"
                  style={{ color: tone }}
                >
                  {d == null
                    ? last
                      ? `от ${shortDay(last.date)}`
                      : 'нет замеров'
                    : d === 0
                      ? 'без измен.'
                      : `${d > 0 ? '+' : '−'}${fmtDecimal(Math.abs(d))} см`}
                </Text>
              </View>
            </Pressable>
          )
        })}
      </ScrollView>

      <MeasurementsModal open={open} onClose={() => setOpen(false)} />
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
      <View className="flex-1 justify-end bg-black/60 px-3 pb-3">
        {open && (
          <View className="overflow-hidden rounded-3xl border border-white/10 bg-bear-pop p-5">
            <View className="flex-row items-center justify-between">
              <View className="min-w-0 flex-1">
                <Text className="font-bold text-[15px] text-bear-text">Записать замеры</Text>
                <Text className="mt-0.5 font-sans text-[11px] text-bear-sub">
                  Сантиметровая лента; заполните то, что измерили
                </Text>
              </View>
              <Pressable onPress={onClose} accessibilityLabel="Закрыть" className="p-1">
                <X size={20} color="#A5AECB" />
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
                        className="min-w-0 flex-1 font-medium text-xs text-bear-sub"
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
                          <Trash2 size={14} color="#98A2C2" />
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
                        className={`w-[96px] shrink-0 rounded-2xl border bg-white/5 px-3 py-2.5 font-semibold text-[13px] text-white ${
                          bad ? 'border-rose-400/60' : 'border-white/10'
                        }`}
                      />
                    </View>
                    {bad && (
                      <Text className="mt-0.5 font-sans text-[10px] text-rose-300">
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
                <Text className="font-semibold text-[11.5px] text-bear-soft">
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
                    className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 font-medium text-[13px] text-white"
                  />
                  <Pressable
                    onPress={handleAddCustom}
                    accessibilityRole="button"
                    accessibilityLabel="Добавить свой замер в список"
                    className="shrink-0 justify-center rounded-xl bg-white/10 px-3 active:opacity-70"
                  >
                    <Text className="font-bold text-[12px] text-[#8DABFF]">Добавить</Text>
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
                <Text className="py-3.5 text-center font-bold text-sm text-white">
                  Сохранить
                </Text>
              </LinearGradient>
            </Pressable>
          </View>
        )}
      </View>
    </Modal>
  )
}

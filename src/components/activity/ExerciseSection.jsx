// Секция «Тренировки»: список за сегодня, сумма сожжённых калорий
// и окно добавления/изменения тренировки (каталог + СВОИ тренировки).
// Свою тренировку пользователь создаёт сам: название, иконка,
// интенсивность — приложение запоминает её между сессиями.
// Сожжённые калории считаются по формуле MET, но значение можно
// исправить вручную (например, по цифре с тренажёра или смарт-часов).
// Тап по записи — изменение, корзина — удаление.

import { useMemo, useState } from 'react'
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { Dumbbell, Pencil, Plus, RotateCcw, Trash2, X } from 'lucide-react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useExerciseStore, todayKey, dayBurned } from '@/store/useExerciseStore'
import { useProfileStore } from '@/store/useProfileStore'
import {
  EXERCISES,
  QUICK_MINUTES,
  CUSTOM_EMOJIS,
  INTENSITY_LEVELS,
  intensityMet,
  kcalBurned,
} from '@/lib/data/exercises'
import { useToast } from '../ui/Toast'
import { Pills } from '../ui/Pills'
import { formatNum, makeId } from '@/lib/format'

const KCAL_MAX = 10000

export function ExerciseSection() {
  const logs = useExerciseStore((s) => s.logs)
  const addLog = useExerciseStore((s) => s.addLog)
  const updateLog = useExerciseStore((s) => s.updateLog)
  const removeLog = useExerciseStore((s) => s.removeLog)
  const custom = useExerciseStore((s) => s.custom)
  const addCustom = useExerciseStore((s) => s.addCustom)
  const removeCustom = useExerciseStore((s) => s.removeCustom)
  const weightKg = useProfileStore((s) => s.weightKg)
  const { toast } = useToast()

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null) // запись на изменение
  const [exId, setExId] = useState(null)
  const [minutes, setMinutes] = useState(null)
  // Сожжённые калории: null — «по формуле», число — ручная правка
  const [kcalManual, setKcalManual] = useState(null)
  const [kcalEditing, setKcalEditing] = useState(false)
  const [kcalDraft, setKcalDraft] = useState('')
  // Форма своей тренировки
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newEmoji, setNewEmoji] = useState('🔥')
  const [newLevel, setNewLevel] = useState('mid')

  const key = todayKey()
  const items = logs[key] || []
  const burned = dayBurned(logs, key)

  // Каталог + запомненные свои тренировки (пересобирается при изменениях)
  const allExercises = useMemo(() => [...EXERCISES, ...custom], [custom])

  // Открыть окно: без записи — «добавить», с записью — «изменить»
  function openModal(entry) {
    if (entry) {
      setEditing(entry)
      setExId(entry.exId)
      setMinutes(entry.minutes)
      // Если калории правили вручную — открываем с этим значением
      setKcalManual(entry.manual ? entry.kcal : null)
    } else {
      setEditing(null)
      setExId(null)
      setMinutes(null)
      setKcalManual(null)
    }
    setKcalEditing(false)
    setCreating(false)
    setOpen(true)
  }

  function closeModal() {
    setOpen(false)
    setEditing(null)
  }

  const ex = allExercises.find((e) => e.id === exId)
  const autoKcal = ex && minutes ? kcalBurned(ex.met, weightKg, minutes) : 0
  const kcalShow = kcalManual != null ? Math.round(kcalManual) : autoKcal

  function startKcalEdit() {
    setKcalDraft(String(kcalShow || ''))
    setKcalEditing(true)
  }

  function applyKcal() {
    const n = Math.round(Number(String(kcalDraft).replace(',', '.')) || 0)
    if (!n || n < 1) {
      toast({
        title: '❗ Неверное значение',
        description: `Введите число от 1 до ${formatNum(KCAL_MAX)}`,
      })
      return
    }
    setKcalManual(Math.min(n, KCAL_MAX))
    setKcalEditing(false)
  }

  // Вернуться к автоматическому расчёту по MET
  function resetKcal() {
    setKcalManual(null)
    setKcalEditing(false)
  }

  function save() {
    const payload = { exId: ex.id, name: ex.name, emoji: ex.emoji, minutes, kcal: kcalShow }
    if (kcalManual != null) payload.manual = true
    if (editing) {
      updateLog(key, editing.id, payload)
      toast({
        title: `${ex.emoji} ${ex.name} — изменено`,
        description: `${minutes} мин · ${formatNum(kcalShow)} ккал${
          kcalManual != null ? ' · вручную' : ''
        }`,
      })
    } else {
      addLog(key, payload)
      toast({
        title: `${ex.emoji} ${ex.name} — ${minutes} мин`,
        description: `Сожжено ${formatNum(kcalShow)} ккал · записано`,
      })
    }
    closeModal()
  }

  function remove(entry) {
    removeLog(key, entry.id)
    if (editing && editing.id === entry.id) closeModal()
    toast({ title: '🗑 Удалено', description: `${entry.name} убрана из дневника` })
  }

  // Создать свою тренировку — сохраняется навсегда, попадает в каталог
  function saveCustom() {
    const name = newName.trim()
    if (!name) {
      toast({ title: '❗ Нужно название', description: 'Например: Бокс, скакалка, падел' })
      return
    }
    const exObj = { id: `custom-${makeId()}`, name, emoji: newEmoji, met: intensityMet(newLevel) }
    addCustom(exObj)
    setExId(exObj.id)
    setCreating(false)
    setNewName('')
    setNewEmoji('🔥')
    setNewLevel('mid')
    toast({
      title: `${exObj.emoji} «${name}» запомнена`,
      description: 'Теперь она всегда в списке тренировок',
    })
  }

  // Удалить свою тренировку из списка (записи дневника не пропадают)
  function forgetCustom() {
    if (!ex) return
    removeCustom(ex.id)
    setExId(null)
    toast({ title: '🗑 Удалено', description: `«${ex.name}» больше не в списке` })
  }

  return (
    <View accessibilityLabel="Тренировки" className="rounded-3xl border border-white/5 bg-bear-card p-5">
      <View className="flex-row items-center justify-between gap-3">
        <View className="flex-row items-center gap-2">
          <Dumbbell size={18} color="#f472b6" />
          <Text className="font-bold text-[15px] tracking-tight text-bear-text">
            Тренировки
          </Text>
        </View>
        <Pressable
          onPress={() => openModal(null)}
          className="flex-row items-center gap-1 rounded-full bg-white/5 px-3 py-1.5 active:opacity-70"
        >
          <Plus size={14} color="#AEB9D9" />
          <Text className="font-bold text-[12px] text-bear-soft">Добавить</Text>
        </Pressable>
      </View>

      {items.length === 0 ? (
        <Text className="mt-3 font-sans text-[12px] leading-relaxed text-bear-sub2">
          Добавьте прогулку или тренировку — отмечайте активность дня.
        </Text>
      ) : (
        <View className="mt-3 gap-2">
          {items.map((e) => (
            <Pressable
              key={e.id}
              onPress={() => openModal(e)}
              accessibilityRole="button"
              accessibilityLabel={`Изменить ${e.name}`}
              className="flex-row items-center gap-3 rounded-2xl bg-white/[0.03] px-3.5 py-2.5 active:opacity-70"
            >
              <Text className="text-[18px]">{e.emoji}</Text>
              <View className="min-w-0 flex-1">
                <Text className="font-bold text-[13px] text-bear-text">{e.name}</Text>
                <Text className="font-sans text-[11px] text-bear-sub2">
                  {e.minutes} мин · {formatNum(e.kcal)} ккал{e.manual ? ' · вручную' : ''}
                </Text>
              </View>
              <View className="shrink-0 flex-row items-center gap-1">
                <View className="h-8 w-8 items-center justify-center rounded-full bg-white/5">
                  <Pencil size={13} color="#A5AECB" />
                </View>
                <Pressable
                  onPress={() => remove(e)}
                  accessibilityLabel={`Удалить ${e.name}`}
                  className="h-8 w-8 items-center justify-center rounded-full bg-white/5"
                >
                  <Trash2 size={14} color="#98A2C2" />
                </Pressable>
              </View>
            </Pressable>
          ))}
        </View>
      )}

      {burned > 0 && (
        <Text className="mt-3 rounded-2xl bg-[#f87171]/[0.07] px-3.5 py-2.5 font-semibold text-[12px] text-[#f87171]">
          🔥 Сожжено за сегодня: {formatNum(burned)} ккал
        </Text>
      )}

      {/* Окно добавления/изменения тренировки */}
      <Modal visible={open} transparent animationType="fade" onRequestClose={closeModal}>
        <View className="flex-1 justify-end bg-black/60 px-3 pb-3">
          <View className="max-h-[85%] overflow-hidden rounded-3xl border border-white/10 bg-bear-pop">
            {/* Шапка */}
            <View className="flex-row items-center justify-between border-b border-bear-line px-5 pb-3 pt-4">
              <View className="flex-1">
                <Text className="font-bold text-[15px] text-bear-text">
                  {creating ? 'Своя тренировка' : editing ? 'Изменить тренировку' : 'Новая тренировка'}
                </Text>
                <Text className="mt-0.5 font-sans text-[11px] text-bear-sub">
                  {creating
                    ? 'Запомним её — будет всегда в списке'
                    : `Расчёт по формуле MET для веса ${weightKg} кг`}
                </Text>
              </View>
              <Pressable onPress={closeModal} accessibilityLabel="Закрыть" className="p-1">
                <X size={20} color="#A5AECB" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 24 }}>
              {creating ? (
                /* Форма своей тренировки: название + иконка + интенсивность */
                <View className="gap-3.5">
                  <View>
                    <Text className="mb-1.5 font-sans text-[11px] text-bear-sub2">Название</Text>
                    <TextInput
                      value={newName}
                      onChangeText={setNewName}
                      maxLength={24}
                      placeholder="Например: Бокс, скакалка, падел"
                      placeholderTextColor="#8B96B8"
                      accessibilityLabel="Название своей тренировки"
                      className="rounded-2xl border border-white/10 bg-white/5 px-3.5 py-2.5 font-sans text-[13px] text-bear-text"
                    />
                  </View>

                  <View>
                    <Text className="mb-1.5 font-sans text-[11px] text-bear-sub2">Иконка</Text>
                    <View className="flex-row flex-wrap gap-1.5">
                      {CUSTOM_EMOJIS.map((em) => (
                        <Pressable
                          key={em}
                          onPress={() => setNewEmoji(em)}
                          accessibilityLabel={`Иконка ${em}`}
                          accessibilityRole="button"
                          className={`h-9 w-9 items-center justify-center rounded-xl border ${
                            newEmoji === em
                              ? 'border-[#6c8cff]/60 bg-[#6c8cff]/10'
                              : 'border-white/5 bg-white/[0.03]'
                          }`}
                        >
                          <Text className="text-[17px]">{em}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>

                  <View>
                    <Text className="mb-1.5 font-sans text-[11px] text-bear-sub2">
                      Интенсивность
                    </Text>
                    <Pills
                      items={INTENSITY_LEVELS}
                      value={newLevel}
                      onChange={setNewLevel}
                      size="md"
                      accessibilityLabel="Интенсивность"
                    />
                  </View>

                  <Text className="font-sans text-[11.5px] leading-relaxed text-bear-sub2">
                    Пример: 30 минут этой активности — ≈{' '}
                    <Text className="font-bold text-[#f87171]">
                      {formatNum(kcalBurned(intensityMet(newLevel), weightKg, 30))} ккал
                    </Text>{' '}
                    при весе {weightKg} кг
                  </Text>

                  <View className="mt-1 flex-row gap-2">
                    <Pressable
                      onPress={() => setCreating(false)}
                      accessibilityLabel="Отменить создание"
                      className="flex-1 items-center rounded-2xl bg-white/5 py-3 active:opacity-70"
                    >
                      <Text className="font-bold text-[12.5px] text-bear-soft">Отмена</Text>
                    </Pressable>
                    <Pressable
                      onPress={saveCustom}
                      accessibilityRole="button"
                      accessibilityLabel="Запомнить тренировку"
                      className="flex-1 items-center rounded-2xl py-3 active:opacity-80"
                      style={{ backgroundColor: '#7B6CF6' }}
                    >
                      <Text className="font-bold text-[12.5px] text-white">Запомнить</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <>
                  {/* Каталог упражнений + свои: сетка 2 колонки */}
                  <View className="gap-2">
                    {allExercises.reduce((rows, e, i) => {
                      if (i % 2 === 0) rows.push([])
                      rows[rows.length - 1].push(e)
                      return rows
                    }, []).map((row) => (
                      <View key={row[0].id} className="flex-row gap-2">
                        {row.map((e) => (
                          <ExButton key={e.id} e={e} exId={exId} setExId={setExId} />
                        ))}
                        {row.length === 1 && <View className="flex-1" />}
                      </View>
                    ))}

                    {/* Своя тренировка: создаётся один раз, запоминается */}
                    <Pressable
                      onPress={() => setCreating(true)}
                      accessibilityRole="button"
                      accessibilityLabel="Создать свою тренировку"
                      className="mt-1 flex-row items-center justify-center gap-1.5 rounded-2xl border border-white/15 py-2.5 active:opacity-70"
                      style={{ borderStyle: 'dashed' }}
                    >
                      <Plus size={14} color="#A5AECB" />
                      <Text className="font-bold text-[12px] text-bear-soft">
                        Своя тренировка
                      </Text>
                    </Pressable>
                  </View>

                  {ex && (
                    <View className="mt-3 gap-2.5 rounded-2xl border border-white/5 bg-white/[0.03] p-3.5">
                      <Pills
                        items={QUICK_MINUTES.map((m) => ({ id: m, label: `${m} мин` }))}
                        value={minutes}
                        onChange={setMinutes}
                        size="md"
                        accessibilityLabel="Минуты"
                      />

                      {kcalEditing ? (
                        /* Ручной ввод сожжённых калорий */
                        <View className="gap-2">
                          <Text className="font-sans text-[11px] text-bear-sub2">
                            Сожжено за эту тренировку, ккал
                          </Text>
                          <View className="flex-row items-center gap-2">
                            <TextInput
                              value={kcalDraft}
                              onChangeText={setKcalDraft}
                              keyboardType="number-pad"
                              maxLength={5}
                              autoFocus
                              accessibilityLabel="Сожжённые калории вручную"
                              className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/5 py-2 text-center font-bold text-[14px] text-bear-text"
                            />
                            <Text className="shrink-0 font-sans text-[12px] text-bear-sub">ккал</Text>
                          </View>
                          <View className="flex-row gap-2">
                            <Pressable
                              onPress={resetKcal}
                              accessibilityLabel="Вернуть расчёт по формуле"
                              className="flex-row flex-1 items-center justify-center gap-1.5 rounded-xl bg-white/5 py-2 active:opacity-70"
                            >
                              <RotateCcw size={12} color="#A5AECB" />
                              <Text className="font-bold text-[11.5px] text-bear-soft">По формуле</Text>
                            </Pressable>
                            <Pressable
                              onPress={applyKcal}
                              accessibilityLabel="Применить значение"
                              className="flex-1 items-center rounded-xl bg-white/10 py-2 active:opacity-70"
                            >
                              <Text className="font-bold text-[11.5px] text-bear-text">Готово</Text>
                            </Pressable>
                          </View>
                          <Text className="font-sans text-[10.5px] leading-relaxed text-bear-dim">
                            Точнее формулы: цифра с тренажёра, пульсометра или смарт-часов.
                          </Text>
                        </View>
                      ) : (
                        <View className="flex-row items-center justify-between">
                          <Text className="min-w-0 flex-1 font-sans text-[12px] text-bear-sub2">
                            Сожжено:{' '}
                            <Text className="font-bold text-[#f87171]">
                              {formatNum(kcalShow)} ккал
                            </Text>
                            {kcalManual != null && (
                              <Text className="text-bear-dim"> · вручную</Text>
                            )}
                          </Text>
                          <Pressable
                            onPress={startKcalEdit}
                            accessibilityLabel="Исправить калории вручную"
                            className="h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/5"
                          >
                            <Pencil size={13} color="#A5AECB" />
                          </Pressable>
                        </View>
                      )}
                    </View>
                  )}

                  {/* Своя тренировка выбрана — можно удалить её из списка */}
                  {ex && ex.id.startsWith('custom-') && (
                    <Pressable
                      onPress={forgetCustom}
                      accessibilityRole="button"
                      accessibilityLabel={`Удалить ${ex.name} из моих тренировок`}
                      className="mt-2 flex-row items-center justify-center gap-1.5 active:opacity-70"
                    >
                      <Trash2 size={12} color="#98A2C2" />
                      <Text className="font-sans text-[11px] text-bear-sub2">
                        Удалить «{ex.name}» из моих тренировок
                      </Text>
                    </Pressable>
                  )}

                  <Pressable
                    onPress={save}
                    disabled={!ex || !minutes}
                    className={`mt-4 overflow-hidden rounded-2xl ${!ex || !minutes ? 'opacity-40' : ''}`}
                  >
                    <LinearGradient start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} colors={['#4D7CFE', '#8B5CF6', '#A45BFF']}>
                      <Text className="w-full py-3.5 text-center font-bold text-[14px] text-white">
                        {editing ? 'Сохранить' : 'Добавить тренировку'}
                      </Text>
                    </LinearGradient>
                  </Pressable>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  )
}

function ExButton({ e, exId, setExId }) {
  const active = exId === e.id
  const isCustom = e.id.startsWith('custom-')
  return (
    <Pressable
      onPress={() => setExId(e.id)}
      className={`min-w-0 flex-1 flex-row items-center gap-2 rounded-2xl border p-3 ${
        active ? 'border-[#6c8cff]/60 bg-[#6c8cff]/10' : 'border-white/5 bg-white/[0.03]'
      }`}
    >
      <Text className="text-[20px]">{e.emoji}</Text>
      <View className="min-w-0 flex-1">
        <Text numberOfLines={1} className="font-bold text-[12px] text-bear-text">
          {e.name}
        </Text>
        <Text numberOfLines={1} className="font-sans text-[10px] text-bear-sub2">
          {`MET ${e.met}${isCustom ? ' · моё' : ''}`}
        </Text>
      </View>
    </Pressable>
  )
}

// Окно «Вода»: фоновая сцена с мишкой, прогресс-кольцо, карточки
// ёмкостей (4 в ряд, карандашик у каждой), своя порция с выбором времени
// и журнал записей за сегодня (тап по записи — изменение, корзина — удаление).
// Тумблер напоминаний — в шапке

import { useState } from 'react'
import { Image, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { Droplets, Pencil, Trash2, X } from 'lucide-react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { VesselCard } from './VesselCard'
import { WaterRing } from './WaterRing'
import { ReminderToggle, ReminderIntervals } from './WaterReminder'
import { useActivityStore } from '@/store/useActivityStore'
import { useGoalsStore } from '@/store/useGoalsStore'
import { useToast } from '../ui/Toast'
import { WATER_GLASS } from '@/lib/data/activity'
import { formatNum } from '@/lib/format'

const SCENE = require('../../../assets/images/water-bear.png')

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

export function WaterModal({ open, onClose, goalMl, ml }) {
  const vessels = useActivityStore((s) => s.vessels)
  const addWater = useActivityStore((s) => s.addWater)
  const editWaterLog = useActivityStore((s) => s.editWaterLog)
  const removeWaterLog = useActivityStore((s) => s.removeWaterLog)
  const waterLog = useActivityStore((s) => s.waterLog)
  const reminder = useActivityStore((s) => s.reminder)
  const goals = useGoalsStore((s) => s.goals)
  const { toast } = useToast()

  const [customMl, setCustomMl] = useState('')
  const [customTime, setCustomTime] = useState(nowTime())
  const [editingId, setEditingId] = useState(null) // запись журнала на изменении

  const glasses = Math.round(ml / WATER_GLASS)
  const glassesGoal = Math.max(1, Math.round(goalMl / WATER_GLASS))
  const pct = Math.min(100, Math.round((ml / Math.max(1, goalMl)) * 100))

  function drink(v) {
    addWater(v.ml)
    toast({
      title: `💧 ${v.label} — ${v.ml} мл · ${nowTime()}`,
      description: `${pct}% → ${Math.min(100, Math.round(((ml + v.ml) / Math.max(1, goals.waterMl)) * 100))}% нормы`,
    })
  }

  // Записать новую порцию — или сохранить изменения выбранной записи
  function submitCustom() {
    const mlNum = Math.round(Number(String(customMl).replace(',', '.')) || 0)
    if (mlNum < 10) {
      toast({ title: '💧 Укажите объём', description: 'От 10 мл, например 200' })
      return
    }
    const time = normalizeTime(customTime) || nowTime()
    const safeMl = Math.min(2000, mlNum)

    if (editingId) {
      editWaterLog(editingId, { ml: safeMl, time })
      toast({ title: '✏️ Изменено', description: `${formatNum(safeMl)} мл · ${time}` })
      setEditingId(null)
    } else {
      addWater(safeMl, time)
      toast({ title: `💧 ${safeMl} мл · ${time}`, description: 'Записано в журнал воды' })
    }
    setCustomMl('')
    setCustomTime(nowTime())
  }

  // Тап по записи журнала — подставить её в форму «Своя порция»
  function startEdit(w) {
    setEditingId(w.id)
    setCustomMl(String(w.ml))
    setCustomTime(w.time)
  }

  function cancelEdit() {
    setEditingId(null)
    setCustomMl('')
    setCustomTime(nowTime())
  }

  function removeEntry(w) {
    removeWaterLog(w.id)
    if (editingId === w.id) cancelEdit()
    toast({ title: '🗑 Удалено', description: `Минус ${formatNum(w.ml)} мл воды за сегодня` })
  }

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/60 px-3 pb-3">
        <View className="max-h-[85%] overflow-hidden rounded-3xl border border-white/10">
          {/* Градиентный фон окна */}
          <LinearGradient
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            colors={['#16234A', '#131E3A', '#101A36']}
          >
            {/* Сцена с мишкой прибита к низу окна */}
            <View pointerEvents="none" className="absolute inset-x-0 bottom-0 h-[200px]">
              <Image
                source={SCENE}
                style={{ width: '100%', height: '100%', resizeMode: 'cover', opacity: 0.9 }}
              />
              <LinearGradient
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                colors={['#131E3A', 'rgba(19,30,58,0.3)', 'transparent']}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 90 }}
              />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>
              <View className="flex-row items-center justify-between border-b border-bear-line px-5 pb-3 pt-4">
                <View className="flex-1">
                  <View className="flex-row items-center gap-2">
                    <Droplets size={18} color="#38BDF8" />
                    <Text className="font-bold text-[15px] text-bear-text">Вода</Text>
                  </View>
                  <Text className="mt-0.5 font-sans text-xs text-bear-sub">
                    Выпито {formatNum(ml)} из {formatNum(goalMl)} мл
                  </Text>
                </View>
                <View className="flex-row items-center gap-2">
                  <ReminderToggle />
                  <Pressable onPress={onClose} accessibilityLabel="Закрыть" className="p-1">
                    <X size={20} color="#8A94B3" />
                  </Pressable>
                </View>
              </View>

              {reminder.enabled && (
                <View className="px-5 pt-3">
                  <ReminderIntervals />
                </View>
              )}

              <View className="px-5 pt-4">
                <View className="flex-row items-center gap-4">
                  <WaterRing pct={pct} glasses={glasses} glassesGoal={glassesGoal} />
                  <Text className="flex-1 font-sans text-[12px] leading-relaxed text-bear-sub">
                    Нажмите на ёмкость — вода запишется с текущим временем.{'\n'}
                    Выпили раньше? Впишите своё время ниже.
                  </Text>
                </View>

                <View className="mt-4 flex-row gap-2">
                  {vessels.map((v) => (
                    <VesselCard key={v.id} vessel={v} onDrink={drink} />
                  ))}
                </View>

                {/* Своя порция / изменение записи: объём + время */}
                <View className="mt-4 flex-row items-center justify-between">
                  <Text className="font-sans text-[11px] font-semibold uppercase text-bear-sub">
                    {editingId ? 'Изменение записи' : 'Своя порция'}
                  </Text>
                  {editingId && (
                    <Pressable onPress={cancelEdit} accessibilityLabel="Отменить изменение" hitSlop={6}>
                      <Text className="font-sans text-[11px] text-[#8DABFF]">отмена</Text>
                    </Pressable>
                  )}
                </View>
                <View className="mt-1.5 flex-row items-center gap-2">
                  <TextInput
                    value={customMl}
                    onChangeText={setCustomMl}
                    keyboardType="number-pad"
                    maxLength={4}
                    placeholder="250"
                    placeholderTextColor="#5C668A"
                    accessibilityLabel="Объём порции в миллилитрах"
                    className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/5 py-2.5 text-center text-[14px] text-bear-text"
                  />
                  <Text className="shrink-0 font-sans text-xs text-bear-sub">мл в</Text>
                  <TextInput
                    value={customTime}
                    onChangeText={setCustomTime}
                    keyboardType="numbers-and-punctuation"
                    maxLength={5}
                    placeholder="14:30"
                    placeholderTextColor="#5C668A"
                    accessibilityLabel="Время в формате часы:минуты"
                    className="w-[64px] shrink-0 rounded-2xl border border-white/10 bg-white/5 py-2.5 text-center text-[14px] text-bear-text"
                  />
                  <Pressable
                    onPress={submitCustom}
                    accessibilityRole="button"
                    accessibilityLabel={editingId ? 'Сохранить изменения' : 'Записать свою порцию воды'}
                    className="shrink-0 rounded-2xl px-4 py-2.5 active:opacity-80"
                    style={{ backgroundColor: editingId ? '#22C55E' : '#0EA5E9' }}
                  >
                    <Text className="font-bold text-[13px] text-white">
                      {editingId ? 'Сохранить' : 'Записать'}
                    </Text>
                  </Pressable>
                </View>

                {/* Журнал за сегодня */}
                <View className="mt-4 flex-row items-center justify-between">
                  <Text className="font-sans text-[11px] font-semibold uppercase text-bear-sub">
                    Записи за сегодня
                  </Text>
                  {waterLog.length > 0 && (
                    <Text className="font-sans text-[10px] text-bear-dim">
                      всего {waterLog.length}
                    </Text>
                  )}
                </View>
                {waterLog.length === 0 ? (
                  <Text className="mt-1.5 font-sans text-[11px] text-bear-dim">
                    Пока ничего. Нажмите на ёмкость или запишите свою порцию.
                  </Text>
                ) : (
                  <View className="mt-1.5 gap-1.5">
                    {waterLog.map((w) => {
                      const isEditing = editingId === w.id
                      return (
                        <Pressable
                          key={w.id}
                          onPress={() => startEdit(w)}
                          accessibilityRole="button"
                          accessibilityLabel={`Изменить запись ${w.ml} мл`}
                          className={`flex-row items-center gap-2.5 rounded-2xl border px-3.5 py-2.5 active:opacity-80 ${
                            isEditing
                              ? 'border-sky-400/40 bg-sky-400/10'
                              : 'border-white/10 bg-white/[0.05]'
                          }`}
                        >
                          <Droplets size={14} color="#38BDF8" />
                          <Text className="min-w-0 flex-1 font-semibold text-[13px] text-bear-text">
                            {formatNum(w.ml)} мл
                          </Text>
                          <Text className="shrink-0 font-sans text-[12px] text-bear-sub">
                            {w.time}
                          </Text>
                          <View className="shrink-0 flex-row items-center gap-0.5">
                            <View className="p-1">
                              <Pencil size={13} color={isEditing ? '#38BDF8' : '#5C668A'} />
                            </View>
                            <Pressable
                              onPress={() => removeEntry(w)}
                              accessibilityRole="button"
                              accessibilityLabel={`Удалить запись ${w.ml} мл`}
                              className="p-1"
                            >
                              <Trash2 size={14} color="#5C668A" />
                            </Pressable>
                          </View>
                        </Pressable>
                      )
                    })}
                  </View>
                )}
              </View>
            </ScrollView>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  )
}

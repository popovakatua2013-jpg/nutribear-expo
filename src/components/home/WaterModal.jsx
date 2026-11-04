// Окно «Вода»: компактное, без сцены, кольца и «своей порции» —
// тап по ёмкости записывает воду, карандашик у ёмкости меняет её объём.
// Напоминания — только колокольчик в шапке (перечёркнутый — выкл).
// Статистика 7 дней — тонкие «свечи»: зелёная — норма выпита,
// красная — нет. Записи за сегодня по умолчанию свёрнуты,
// тап по записи — правка мл/времени прямо в строке, корзина — удаление.

import { useMemo, useState } from 'react'
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { Check, ChevronDown, ChevronUp, Droplets, Pencil, Trash2, X } from 'lucide-react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { VesselCard } from './VesselCard'
import { ReminderToggle, ReminderIntervals } from './WaterReminder'
import { useActivityStore } from '@/store/useActivityStore'
import { useGoalsStore } from '@/store/useGoalsStore'
import { useHistoryStore, dayKeyOf } from '@/store/useHistoryStore'
import { useToast } from '../ui/Toast'
import { formatNum } from '@/lib/format'

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
  const historyDays = useHistoryStore((s) => s.days)
  const { toast } = useToast()

  const [editingId, setEditingId] = useState(null) // запись журнала на изменении
  const [editMl, setEditMl] = useState('')
  const [editTime, setEditTime] = useState('')
  const [logOpen, setLogOpen] = useState(false) // записи за сегодня по умолчанию свёрнуты

  const pct = Math.min(100, Math.round((ml / Math.max(1, goalMl)) * 100))

  // Последние 7 дней (из дневной истории) — мини-график выпитого
  const week = useMemo(() => {
    const labels = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
    const out = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000)
      const key = dayKeyOf(d)
      out.push({
        key,
        label: labels[d.getDay()],
        ml: historyDays[key]?.waterMl || 0,
        today: i === 0,
      })
    }
    return out
  }, [historyDays])
  const weekMax = Math.max(500, ...week.map((d) => d.ml))
  const weekAvg = Math.round(week.reduce((s, d) => s + d.ml, 0) / 7)

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
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/60 px-3 pb-3">
        <View className="max-h-[85%] overflow-hidden rounded-3xl border border-white/10">
          <LinearGradient
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            colors={['#16234A', '#131E3A', '#101A36']}
          >
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 14 }}>
              {/* Шапка: название, итог, тумблер напоминаний, крестик */}
              <View className="flex-row items-center justify-between border-b border-bear-line px-4 pb-2.5 pt-3.5">
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
                    <X size={20} color="#A5AECB" />
                  </Pressable>
                </View>
              </View>

              {reminder.enabled && (
                <View className="px-4 pt-2.5">
                  <ReminderIntervals />
                </View>
              )}

              <View className="px-4 pt-3">
                <View className="flex-row gap-2">
                  {vessels.map((v) => (
                    <VesselCard key={v.id} vessel={v} onDrink={drink} />
                  ))}
                </View>

                {/* Последние 7 дней — тонкие «свечи»: зелёная — норма выпита,
                    красная — норма не сделана (сравнение с целью) */}
                <View className="mt-3">
                  <View className="flex-row items-center justify-between">
                    <Text className="font-sans text-[11px] font-semibold uppercase text-bear-sub">
                      Последние 7 дней
                    </Text>
                    <Text className="font-sans text-[10.5px] text-bear-sub">
                      {`в среднем ${formatNum(weekAvg)} мл/день`}
                    </Text>
                  </View>
                  <View className="mt-1.5 h-[58px] flex-row items-end gap-1.5">
                    {week.map((d) => (
                      <View key={d.key} className="min-w-0 flex-1 items-center gap-1">
                        <View
                          style={{
                            width: 6,
                            height: Math.max(4, Math.round((d.ml / weekMax) * 42)),
                            borderRadius: 3,
                            backgroundColor:
                              d.ml >= goalMl ? '#34D399' : '#f87171',
                            opacity: d.today ? 1 : 0.55,
                          }}
                        />
                        <Text
                          className={`text-[10px] ${
                            d.today ? 'font-bold text-bear-text' : 'font-sans text-bear-sub'
                          }`}
                        >
                          {d.label}
                        </Text>
                      </View>
                    ))}
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
                    <Text className="font-sans text-[11px] font-semibold uppercase text-bear-sub">
                      Записи за сегодня
                    </Text>
                    {waterLog.length > 0 && (
                      <View
                        className="rounded-full bg-white/10 px-1.5 py-0.5"
                        accessibilityLabel={`Всего записей: ${waterLog.length}`}
                      >
                        <Text className="font-semibold text-[9.5px] text-bear-sub">
                          {waterLog.length}
                        </Text>
                      </View>
                    )}
                  </View>
                  {logOpen ? (
                    <ChevronUp size={15} color="#8B96B8" />
                  ) : (
                    <ChevronDown size={15} color="#8B96B8" />
                  )}
                </Pressable>
                {logOpen &&
                  (waterLog.length === 0 ? (
                    <Text className="mt-1.5 font-sans text-[11px] text-bear-dim">
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
                              className="min-w-0 flex-1 rounded-lg bg-white/5 px-2 py-1 text-center font-semibold text-[13px] text-bear-text"
                            />
                            <Text className="shrink-0 font-sans text-[10px] text-bear-sub">мл в</Text>
                            <TextInput
                              value={editTime}
                              onChangeText={setEditTime}
                              keyboardType="numbers-and-punctuation"
                              maxLength={5}
                              accessibilityLabel="Время в формате часы:минуты"
                              className="w-[56px] shrink-0 rounded-lg bg-white/5 px-1 py-1 text-center font-semibold text-[13px] text-bear-text"
                            />
                            <Pressable
                              onPress={saveEdit}
                              accessibilityRole="button"
                              accessibilityLabel="Сохранить изменения"
                              className="shrink-0 rounded-lg p-1.5 active:opacity-80"
                              style={{ backgroundColor: '#22C55E' }}
                            >
                              <Check size={15} color="#fff" strokeWidth={2.5} />
                            </Pressable>
                            <Pressable
                              onPress={cancelEdit}
                              accessibilityRole="button"
                              accessibilityLabel="Отменить изменение"
                              className="shrink-0 rounded-lg bg-white/10 p-1.5 active:opacity-80"
                            >
                              <X size={15} color="#A5AECB" />
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
                          <Droplets size={14} color="#38BDF8" />
                          <Text className="min-w-0 flex-1 font-semibold text-[13px] text-bear-text">
                            {formatNum(w.ml)} мл
                          </Text>
                          <Text className="shrink-0 font-sans text-[12px] text-bear-sub">
                            {w.time}
                          </Text>
                          <View className="shrink-0 flex-row items-center gap-0.5">
                            <View className="p-1">
                              <Pencil size={13} color="#8B96B8" />
                            </View>
                            <Pressable
                              onPress={() => removeEntry(w)}
                              accessibilityRole="button"
                              accessibilityLabel={`Удалить запись ${w.ml} мл`}
                              className="p-1"
                            >
                              <Trash2 size={14} color="#8B96B8" />
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
        </View>
      </View>
    </Modal>
  )
}

// Модалка редактирования целей: калории, вода, шаги, активность

import { useState } from 'react'
import { Modal, Pressable, Text, TextInput, View } from 'react-native'
import { X } from 'lucide-react-native'
import { useGoalsStore } from '@/store/useGoalsStore'
import { useToast } from '../ui/Toast'

const FIELDS = [
  { key: 'kcal', label: 'Калории', unit: 'ккал', min: 800, max: 6000 },
  { key: 'waterMl', label: 'Вода', unit: 'мл', min: 500, max: 6000 },
  { key: 'steps', label: 'Шаги', unit: 'шагов', min: 1000, max: 50000 },
  { key: 'minutes', label: 'Активность', unit: 'минут', min: 10, max: 480 },
]

const num = (v, min, max) => {
  const n = Math.round(Number(String(v).replace(',', '.')) || 0)
  return Math.max(min, Math.min(max, n))
}

export function GoalsEditModal({ open, onClose }) {
  const goals = useGoalsStore((s) => s.goals)
  const setGoals = useGoalsStore((s) => s.setGoals)
  const { toast } = useToast()
  const [draft, setDraft] = useState(null)

  // Копия целей заполняется при первом вводе — черновик сбрасывается при закрытии
  const values = draft ?? goals

  function save() {
    const patch = {}
    for (const f of FIELDS) patch[f.key] = num(values[f.key], f.min, f.max)
    setGoals(patch)
    toast({
      title: '🎯 Цели обновлены',
      description: `Норма: ${patch.kcal} ккал · ${patch.waterMl} мл · ${patch.steps} шагов · ${patch.minutes} мин`,
    })
    setDraft(null)
    onClose()
  }

  function close() {
    setDraft(null)
    onClose()
  }

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
      <View className="flex-1 justify-end bg-black/60 px-3 pb-3">
        <View className="rounded-3xl border border-white/10 bg-bear-pop">
          {/* Заголовок */}
          <View className="flex-row items-start justify-between border-b border-bear-line px-5 pb-3 pt-4">
            <View className="flex-1 pr-2">
              <Text className="font-bold text-[15px] text-bear-text">
                Редактировать цели
              </Text>
              <Text className="mt-0.5 font-sans text-[11px] text-bear-sub">
                Нормы на день — применятся во всём приложении
              </Text>
            </View>
            <Pressable onPress={close} accessibilityLabel="Закрыть" className="p-1">
              <X size={20} color="#8A94B3" />
            </Pressable>
          </View>

          <View className="gap-3 px-5 pb-4 pt-4">
            {FIELDS.map((f) => (
              <View key={f.key}>
                <Text className="font-medium text-xs text-bear-sub">
                  {f.label}, {f.unit}
                </Text>
                <TextInput
                  accessibilityLabel={`${f.label}, ${f.unit}`}
                  keyboardType="number-pad"
                  value={String(values[f.key])}
                  onFocus={() => setDraft((s) => s ?? { ...goals })}
                  onChangeText={(v) =>
                    setDraft((s) => ({ ...s, [f.key]: v.replace(/[^\d]/g, '') }))
                  }
                  className="mt-1.5 rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 text-center font-semibold text-sm text-bear-text"
                />
              </View>
            ))}

            <View className="flex-row gap-2 pt-1">
              <Pressable
                onPress={close}
                accessibilityRole="button"
                className="flex-1 rounded-2xl bg-white/5 py-3 active:bg-white/10"
              >
                <Text className="text-center font-semibold text-[13px] text-bear-soft">
                  Отмена
                </Text>
              </Pressable>
              <Pressable
                onPress={save}
                accessibilityRole="button"
                className="flex-[1.5] rounded-2xl py-3 active:opacity-80"
                style={{ backgroundColor: '#7B6CF6' }}
              >
                <Text className="text-center font-bold text-[13px] text-white">
                  Сохранить
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  )
}

// Модалка записи веса и роста: Сохранить → история веса + пересчёт ИМТ.

import { useState } from 'react'
import { Modal, Pressable, Text, TextInput, View } from 'react-native'
import { X } from 'lucide-react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useToast } from '../ui/Toast'
import { fmtDecimal } from '@/lib/data/bmi'

export function WeightModal({ open, onClose, height, weight, onSave }) {
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/60 px-3 pb-3">
        {open && (
          <WeightBody
            key={`${height}-${weight}`}
            height={height}
            weight={weight}
            onSave={onSave}
            onClose={onClose}
          />
        )}
      </View>
    </Modal>
  )
}

function WeightBody({ height, weight, onSave, onClose }) {
  const { toast } = useToast()
  const [heightCm, setHeightCm] = useState(String(height))
  const [kg, setKg] = useState(String(weight))

  // Русская запятая тоже десятичный разделитель: «72,5» → 72.5
  const parseNum = (v) => Number(String(v).trim().replace(',', '.'))
  const hRaw = parseNum(heightCm)
  const wRaw = parseNum(kg)
  const valid =
    Number.isFinite(hRaw) && hRaw >= 80 && hRaw <= 250 &&
    Number.isFinite(wRaw) && wRaw >= 25 && wRaw <= 300
  const h = Math.round(hRaw)
  const w = Math.round(wRaw * 10) / 10

  function handleSave() {
    if (!valid) return
    const weightChanged = w !== weight
    onSave({ heightCm: h, weightKg: w, weightChanged })
    toast(
      weightChanged
        ? {
            title: '⚖️ Вес записан!',
            description: `${fmtDecimal(w)} кг · ИМТ обновлён`,
          }
        : { title: '📏 Рост сохранён', description: `${h} см` }
    )
    onClose()
  }

  return (
    <View className="overflow-hidden rounded-3xl border border-white/10 bg-bear-pop p-5">
      <View className="flex-row items-center justify-between">
        <View className="flex-1">
          <Text className="font-bold text-[15px] text-bear-text">Записать вес</Text>
          <Text className="mt-0.5 font-sans text-[11px] text-bear-sub">
            Обновите рост и текущий вес — ИМТ пересчитается сам
          </Text>
        </View>
        <Pressable onPress={onClose} accessibilityLabel="Закрыть" className="p-1">
          <X size={20} color="#A5AECB" />
        </Pressable>
      </View>

      <Text className="mt-4 font-medium text-xs text-bear-sub">Рост, см</Text>
      <TextInput
        value={heightCm}
        onChangeText={setHeightCm}
        keyboardType="number-pad"
        textAlign="center"
        className="mt-1.5 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 font-semibold text-[14px] text-white"
      />

      <Text className="mt-3 font-medium text-xs text-bear-sub">Вес, кг</Text>
      <TextInput
        value={kg}
        onChangeText={setKg}
        keyboardType="decimal-pad"
        textAlign="center"
        className="mt-1.5 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 font-semibold text-[14px] text-white"
      />

      <Pressable
        onPress={handleSave}
        disabled={!valid}
        className={`mt-5 overflow-hidden rounded-2xl ${!valid ? 'opacity-50' : ''}`}
      >
        <LinearGradient start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} colors={['#4D7CFE', '#8B5CF6', '#A45BFF']}>
          <Text className="py-3.5 text-center font-bold text-sm text-white">Сохранить</Text>
        </LinearGradient>
      </Pressable>
    </View>
  )
}

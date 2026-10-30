// Редактор профиля: имя, рост, вес — общие данные с разделом «ИМТ»

import { useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { UserRound } from 'lucide-react-native'
import { useProfileStore } from '@/store/useProfileStore'
import { useToast } from '../ui/Toast'
import { fmtDecimal } from '@/lib/data/bmi'

const FIELD =
  'mt-1.5 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 font-semibold text-[14px] text-white'

export function ProfileEditor() {
  const name = useProfileStore((s) => s.name)
  const heightCm = useProfileStore((s) => s.heightCm)
  const weightKg = useProfileStore((s) => s.weightKg)
  const setProfile = useProfileStore((s) => s.setProfile)
  const addWeight = useProfileStore((s) => s.addWeight)
  const { toast } = useToast()

  const [form, setForm] = useState(null)

  const current = form || {
    name: name || '',
    heightCm: String(heightCm),
    weightKg: String(weightKg),
  }
  const patch = (p) => setForm({ ...current, ...p })

  function save() {
    // Русская запятая тоже десятичный разделитель: «72,5» → 72.5
    const parseNum = (v) => Number(String(v).trim().replace(',', '.'))
    const hRaw = parseNum(current.heightCm)
    const wRaw = parseNum(current.weightKg)
    if (!Number.isFinite(hRaw) || hRaw < 80 || hRaw > 250) return
    if (!Number.isFinite(wRaw) || wRaw < 25 || wRaw > 300) return
    const h = Math.round(hRaw)
    const w = Math.round(wRaw * 10) / 10
    const weightChanged = w !== weightKg
    setProfile({ name: current.name.trim().slice(0, 24), heightCm: h })
    if (weightChanged) addWeight(w)
    setForm(null)
    toast({
      title: '✅ Профиль сохранён',
      description:
        weightChanged
          ? `Вес ${fmtDecimal(w)} кг`
          : `${current.name.trim() || 'Без имени'} · ${h} см · ${fmtDecimal(weightKg)} кг`,
    })
  }

  return (
    <View accessibilityLabel="Профиль" className="rounded-3xl border border-white/5 bg-bear-card p-5">
      <View className="flex-row items-center gap-2">
        <UserRound size={18} color="#7da2ff" />
        <Text className="font-bold text-[15px] tracking-tight text-bear-text">Профиль</Text>
      </View>

      <Text className="mt-3 font-medium text-xs text-bear-sub">Имя</Text>
      <TextInput
        value={current.name}
        onChangeText={(v) => patch({ name: v })}
        placeholder="Как тебя зовут?"
        placeholderTextColor="#8B96B8"
        className={FIELD}
      />
      <View className="mt-3 flex-row gap-3">
        <View className="flex-1">
          <Text className="font-medium text-xs text-bear-sub">Рост, см</Text>
          <TextInput
            value={current.heightCm}
            onChangeText={(v) => patch({ heightCm: v })}
            keyboardType="number-pad"
            className={FIELD}
          />
        </View>
        <View className="flex-1">
          <Text className="font-medium text-xs text-bear-sub">Вес, кг</Text>
          <TextInput
            value={current.weightKg}
            onChangeText={(v) => patch({ weightKg: v })}
            keyboardType="decimal-pad"
            className={FIELD}
          />
        </View>
      </View>

      <Pressable onPress={save} className="mt-4 overflow-hidden rounded-2xl">
        <LinearGradient start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} colors={['#4D7CFE', '#8B5CF6', '#A45BFF']}>
          <Text className="py-3 text-center font-bold text-[13px] text-white">
            Сохранить профиль
          </Text>
        </LinearGradient>
      </Pressable>
    </View>
  )
}

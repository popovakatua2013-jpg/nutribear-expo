// Редактор профиля: имя, рост, вес — общие данные с разделом «Тело»

import { useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { UserRound } from 'lucide-react-native'
import { CollapsibleCard } from '../ui/CollapsibleCard'
import { useProfileStore } from '@/store/useProfileStore'
import { useToast } from '../ui/Toast'
import { fmtDecimal } from '@/lib/data/bmi'

const FIELD =
  'mt-1.5 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 font-semibold text-[17px] text-white'

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
    if (
      !Number.isFinite(hRaw) || hRaw < 80 || hRaw > 250 ||
      !Number.isFinite(wRaw) || wRaw < 25 || wRaw > 300
    ) {
      toast({
        title: '⚠️ Проверьте данные',
        description: 'Рост 80–250 см, вес 25–300 кг — например 72,5',
      })
      return
    }
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
    <CollapsibleCard
      storageKey="profile"
      accessibilityLabel="Профиль"
      icon={<UserRound size={20} color="#7da2ff" />}
      title="Профиль"
      summary={`${name ? `${name} · ` : ''}${heightCm} см · ${fmtDecimal(weightKg)} кг`}
    >
      <Text className="font-medium text-[14px] text-bear-sub">Имя</Text>
      <TextInput
        value={current.name}
        onChangeText={(v) => patch({ name: v })}
        placeholder="Как тебя зовут?"
        placeholderTextColor="#8B96B8"
        className={FIELD}
      />
      <View className="mt-3 flex-row gap-3">
        <View className="flex-1">
          <Text className="font-medium text-[14px] text-bear-sub">Рост, см</Text>
          <TextInput
            value={current.heightCm}
            onChangeText={(v) => patch({ heightCm: v })}
            keyboardType="number-pad"
            className={FIELD}
          />
        </View>
        <View className="flex-1">
          <Text className="font-medium text-[14px] text-bear-sub">Вес, кг</Text>
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
          <Text className="py-3 text-center font-bold text-[15.5px] text-white">
            Сохранить профиль
          </Text>
        </LinearGradient>
      </Pressable>
    </CollapsibleCard>
  )
}

// Карточка «Профиль» — hero-блок вкладки «Ещё» (редизайн по шаблону
// Катиного референса: большой круглый аватар, «178 см • 99,0 кг» и чип
// «Как тебя зовут?» с карандашом). Тап по карточке раскрывает прежнюю
// форму (имя, рост, вес) — логика сохранения не менялась.

import { useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { ChevronDown, Pencil, UserRound } from 'lucide-react-native'
import { useProfileStore } from '@/store/useProfileStore'
import { useToast } from '../ui/Toast'
import { fmtDecimal } from '@/lib/data/bmi'

const FIELD =
  'mt-1.5 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 font-semibold text-[19px] text-white'

export function ProfileEditor() {
  const name = useProfileStore((s) => s.name)
  const heightCm = useProfileStore((s) => s.heightCm)
  const weightKg = useProfileStore((s) => s.weightKg)
  const setProfile = useProfileStore((s) => s.setProfile)
  const addWeight = useProfileStore((s) => s.addWeight)
  const { toast } = useToast()

  const [form, setForm] = useState(null)
  const [open, setOpen] = useState(false)

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

  // Буква имени в аватаре, пока имени нет — человечек
  const initial = (name || '').trim().charAt(0).toUpperCase()

  return (
    <View accessibilityLabel="Профиль" className="overflow-hidden rounded-3xl border border-bear-bodyLine bg-bear-bodyCard">
      {/* Шапка-герой: аватар + «Профиль» + рост • вес + чип с именем */}
      <Pressable
        onPress={() => setOpen((s) => !s)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={open ? 'Свернуть профиль' : 'Редактировать профиль'}
        className="flex-row items-center gap-3.5 px-4 py-4 active:opacity-80"
      >
        <View className="h-16 w-16 items-center justify-center overflow-hidden rounded-full">
          <LinearGradient start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} colors={['#8B5CF6', '#6D28D9']}>
            <View className="h-16 w-16 items-center justify-center">
              {initial ? (
                <Text className="font-extrabold text-[26px] text-white">{initial}</Text>
              ) : (
                <UserRound size={28} color="#FFFFFF" />
              )}
            </View>
          </LinearGradient>
        </View>

        <View className="min-w-0 flex-1">
          <Text className="font-extrabold text-[21px] tracking-tight text-bear-text">Профиль</Text>
          <Text
            maxFontSizeMultiplier={1.2}
            className="font-sans text-[15.5px] text-bear-sub"
          >
            {heightCm} см • {fmtDecimal(weightKg)} кг
          </Text>
          {/* Чип с именем: как на шаблоне — «Как тебя зовут? ✏️» */}
          <View className="mt-2 flex-row items-center gap-1.5 self-start rounded-full bg-white/[0.08] px-3 py-1.5">
            <Text
              numberOfLines={1}
              maxFontSizeMultiplier={1.15}
              className="max-w-[150px] font-semibold text-[13.5px] text-bear-bright"
            >
              {name ? name : 'Как тебя зовут?'}
            </Text>
            <Pencil size={12.5} color="#C4B5FD" />
          </View>
        </View>

        <ChevronDown
          size={20}
          color="#A5AECB"
          style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}
        />
      </Pressable>

      {open && (
        <View className="px-4 pb-4">
          <Text className="font-medium text-[16px] text-bear-sub">Имя</Text>
          <TextInput
            value={current.name}
            onChangeText={(v) => patch({ name: v })}
            placeholder="Как тебя зовут?"
            placeholderTextColor="#8B96B8"
            className={FIELD}
          />
          <View className="mt-3 flex-row gap-3">
            <View className="flex-1">
              <Text className="font-medium text-[16px] text-bear-sub">Рост, см</Text>
              <TextInput
                value={current.heightCm}
                onChangeText={(v) => patch({ heightCm: v })}
                keyboardType="number-pad"
                className={FIELD}
              />
            </View>
            <View className="flex-1">
              <Text className="font-medium text-[16px] text-bear-sub">Вес, кг</Text>
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
              <Text className="py-3 text-center font-bold text-[17.5px] text-white">
                Сохранить профиль
              </Text>
            </LinearGradient>
          </Pressable>
        </View>
      )}
    </View>
  )
}

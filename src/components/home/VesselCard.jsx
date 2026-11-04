// Плитка ёмкости «Быстро добавить» (горизонтальная, по 2 в ряд):
// иконка слева, название и объём справа. Тап — записать воду,
// карандашик — правка названия и объёма прямо в карточке (инлайн-редактор)

import { useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'
import { Check, Pencil } from 'lucide-react-native'
import { useActivityStore } from '@/store/useActivityStore'
import { vesselIcon } from './vesselIcons'

export function VesselCard({ vessel, onDrink }) {
  const setVessels = useActivityStore((s) => s.setVessels)
  const vessels = useActivityStore((s) => s.vessels)
  const [edit, setEdit] = useState(false)
  const [label, setLabel] = useState(vessel.label)
  const [ml, setMl] = useState(String(vessel.ml))
  const Icon = vesselIcon(vessel.label)

  function save() {
    const mlNum = Math.max(50, Math.min(2000, Math.round(Number(ml) || vessel.ml)))
    const clean = (label.trim() || vessel.label).slice(0, 14)
    setVessels(
      vessels.map((v) => (v.id === vessel.id ? { ...v, label: clean, ml: mlNum } : v))
    )
    setEdit(false)
  }

  if (edit) {
    return (
      <View className="flex-1 rounded-2xl border border-sky-400/40 bg-[#122544] p-2">
        <TextInput
          accessibilityLabel="Название ёмкости"
          value={label}
          onChangeText={setLabel}
          maxLength={14}
          className="rounded-lg bg-white/5 px-1.5 py-1 font-semibold text-[11px] text-bear-text"
        />
        <View className="mt-1 flex-row items-center gap-1">
          <TextInput
            accessibilityLabel="Объём в миллилитрах"
            value={ml}
            onChangeText={setMl}
            keyboardType="number-pad"
            maxLength={4}
            className="min-w-0 flex-1 rounded-lg bg-white/5 px-1.5 py-1 font-semibold text-[11px] text-bear-text"
          />
          <Text className="font-sans text-[9px] text-bear-sub">мл</Text>
        </View>
        <Pressable
          onPress={save}
          accessibilityRole="button"
          accessibilityLabel="Сохранить ёмкость"
          className="mt-1.5 h-7 items-center justify-center rounded-lg"
          style={{ backgroundColor: '#7B6CF6' }}
        >
          <Check size={14} color="#fff" strokeWidth={2.5} />
        </Pressable>
      </View>
    )
  }

  return (
    <View className="relative min-w-0 flex-1">
      <Pressable
        onPress={() => onDrink(vessel)}
        accessibilityRole="button"
        accessibilityLabel={`Добавить ${vessel.label}, ${vessel.ml} мл`}
        className="flex-row items-center gap-2.5 rounded-2xl border border-bear-bodyLine bg-bear-bodyCard px-3 py-2.5 active:border-sky-400/40 active:bg-[#122544]"
      >
        <Icon size={20} color="#7DD3FC" />
        <View className="min-w-0 flex-1 pr-4">
          <Text numberOfLines={1} className="font-semibold text-[12px] text-bear-text">
            {vessel.label}
          </Text>
          <Text className="font-sans text-[9.5px] text-bear-sub2">+{vessel.ml} мл</Text>
        </View>
      </Pressable>
      <Pressable
        onPress={() => setEdit(true)}
        accessibilityRole="button"
        accessibilityLabel={`Редактировать «${vessel.label}»`}
        className="absolute right-1 top-1 rounded-full bg-white/10 p-1"
      >
        <Pencil size={9} color="#AEB9D9" />
      </Pressable>
    </View>
  )
}

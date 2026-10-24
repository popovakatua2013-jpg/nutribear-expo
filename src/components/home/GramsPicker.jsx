// Выбор граммовки: поле ввода + быстрые кнопки (50/100/150/200/250 г)

import { Text, TextInput, View } from 'react-native'
import { QUICK_GRAMS } from '@/lib/data/foods'

export function GramsPicker({ grams, onChange }) {
  const gramsNum = Math.round(Number(grams) || 0)

  return (
    <View>
      <Text className="font-medium text-xs text-bear-sub">Сколько съедите (граммы)?</Text>
      <View className="mt-2 flex-row items-center gap-2">
        <TextInput
          accessibilityLabel="Граммовка"
          keyboardType="number-pad"
          maxLength={4}
          value={String(grams)}
          onChangeText={onChange}
          className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-center font-bold text-xl text-bear-text"
        />
        <Text className="font-sans text-lg text-bear-sub">г</Text>
      </View>
      <View className="mt-2 flex-row flex-wrap gap-1.5">
        {QUICK_GRAMS.map((g) => (
          <PressPill key={g} g={g} active={gramsNum === g} onChange={onChange} />
        ))}
      </View>
    </View>
  )
}

function PressPill({ g, active, onChange }) {
  return (
    <Text
      onPress={() => onChange(String(g))}
      accessibilityRole="button"
      className={`rounded-full px-3 py-1.5 font-semibold text-xs ${
        active ? 'text-white' : 'bg-white/5 text-bear-sub'
      }`}
      style={active ? { backgroundColor: '#7B6CF6' } : null}
    >
      {g} г
    </Text>
  )
}
// Числовое поле онбординга: текстовый ввод с суффиксом единицы
// и подписью. Запятая преобразуется в точку на уровне шагов.

import { Text, TextInput, View } from 'react-native'

export function ObField({ label, value, onChange, suffix, placeholder, keyboardType = 'decimal-pad' }) {
  return (
    <View>
      <Text className="mb-1.5 font-semibold text-[12px] text-bear-sub2">{label}</Text>
      <View>
        <TextInput
          value={value === undefined || value === null ? '' : String(value)}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor="#8B96B8"
          keyboardType={keyboardType}
          className="rounded-2xl border border-white/10 bg-white/[0.04] py-3 pl-4 pr-14 font-sans text-[15px] text-white"
        />
        {suffix ? (
          <Text
            pointerEvents="none"
            className="absolute right-4 top-1/2 -translate-y-1/2 font-semibold text-[12px] text-bear-sub2"
          >
            {suffix}
          </Text>
        ) : null}
      </View>
    </View>
  )
}

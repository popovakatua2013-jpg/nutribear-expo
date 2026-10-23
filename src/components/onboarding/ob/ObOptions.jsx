// Общие элементы выбора онбординга: карточки-опции, пилюли и чипы.

import { Pressable, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'

const GRAD = ['#4D7CFE', '#8B5CF6', '#A45BFF']

export function OptionGrid({ options, value, onChange, columns = 1 }) {
  // Сетка 1 или 2 колонки без CSS grid: разбиваем на ряды вручную
  const rows = []
  for (let i = 0; i < options.length; i += columns) {
    rows.push(options.slice(i, i + columns))
  }

  return (
    <View className="gap-2.5" accessibilityLabel="Варианты">
      {rows.map((row, ri) => (
        <View key={ri} className="flex-row gap-2.5">
          {row.map((o) => {
            const active = value === o.id
            const body = (
              <>
                {o.emoji ? <Text className="text-[22px]">{o.emoji}</Text> : null}
                <View className="min-w-0 flex-1">
                  <Text className={`font-bold text-[14px] ${active ? 'text-white' : 'text-bear-text'}`}>
                    {o.label}
                  </Text>
                  {o.hint ? (
                    <Text className={`font-sans text-[11px] ${active ? 'text-white/75' : 'text-bear-sub2'}`}>
                      {o.hint}
                    </Text>
                  ) : null}
                </View>
              </>
            )
            return (
              <Pressable
                key={o.id}
                onPress={() => onChange(o.id)}
                accessibilityLabel={o.label}
                className={`min-w-0 flex-1 overflow-hidden rounded-2xl border ${
                  active ? 'border-[#6c8cff]/60' : 'border-white/5'
                }`}
              >
                {active ? (
                  <LinearGradient start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} colors={['rgba(108,140,255,0.16)', 'rgba(108,140,255,0.08)']} style={{ minHeight: 66 }}>
                    <View className="flex-row items-center gap-3 p-3.5">{body}</View>
                  </LinearGradient>
                ) : (
                  <View className="flex-row items-center gap-3 border-white/5 bg-white/[0.03] p-3.5">
                    {body}
                  </View>
                )}
              </Pressable>
            )
          })}
        </View>
      ))}
    </View>
  )
}

// options: [{ value, label }] или пары [value, label]
export function PillRow({ options, value, onChange, label }) {
  return (
    <View>
      {label ? (
        <Text className="mb-2 font-semibold text-[12px] text-bear-sub2">{label}</Text>
      ) : null}
      <View className="flex-row flex-wrap gap-2">
        {options.map((o) => {
          const v = Array.isArray(o) ? o[0] : o.value
          const text = Array.isArray(o) ? o[1] : o.label
          const active = value === v
          return (
            <Pressable key={String(v)} onPress={() => onChange(v)} className="overflow-hidden rounded-full">
              {active ? (
                <LinearGradient start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} colors={GRAD}>
                  <Text className="px-3.5 py-2 font-semibold text-[12px] text-white">{text}</Text>
                </LinearGradient>
              ) : (
                <View className="bg-white/5">
                  <Text className="px-3.5 py-2 font-semibold text-[12px] text-bear-soft">{text}</Text>
                </View>
              )}
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

// Мультивыбор чипами (options: [{ id, label, emoji? }])
export function ChipMulti({ options, values, onToggle }) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {options.map((o) => {
        const on = values.includes(o.id)
        return (
          <Pressable
            key={o.id}
            onPress={() => onToggle(o.id)}
            className={`flex-row items-center gap-1.5 rounded-full border px-3.5 py-2 ${
              on ? 'border-[#6c8cff]/60 bg-[#6c8cff]/10' : 'border-white/5 bg-white/[0.03]'
            }`}
          >
            {o.emoji ? <Text className="text-[13px]">{o.emoji}</Text> : null}
            <Text className={`font-semibold text-[12px] ${on ? 'text-white' : 'text-bear-soft'}`}>
              {o.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}
